const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStaking", function () {
  let NFTStaking, nftStaking, MyNFT, myNFT, RewardToken, rewardToken;
  let owner, user1, user2;
  const rewardCurve = [7, 0, 14, 7];

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    MyNFT = await ethers.getContractFactory("MyNFT");
    myNFT = await MyNFT.deploy(owner.address);

    RewardToken = await ethers.getContractFactory("RewardToken");
    rewardToken = await RewardToken.deploy(owner.address);

    // Deploy NFTStaking
    NFTStaking = await ethers.getContractFactory("NFTStaking");
    nftStaking = await NFTStaking.deploy(
      await myNFT.getAddress(),
      await rewardToken.getAddress(),
      rewardCurve
    );

    // Mint NFTs to users for testing, 
    await myNFT.connect(owner).safeMint(user1.address, 1, "");
    await myNFT.connect(owner).safeMint(user1.address, 2, "");
    await myNFT.connect(owner).safeMint(user2.address, 3, "");

    // Approve NFTStaking contract to transfer NFTs
    await myNFT.connect(user1).approve(await nftStaking.getAddress(), 1);
    await myNFT.connect(user1).approve(await nftStaking.getAddress(), 2);
    await myNFT.connect(user2).approve(await nftStaking.getAddress(), 3);

    // Mint reward tokens to NFTStaking contract
    await rewardToken.mint(await nftStaking.getAddress(), ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct NFT collection address", async function () {
      const nftCollectionAddress = await myNFT.getAddress();
      const stakedNFTAddress = await nftStaking.nftCollection();
      expect(stakedNFTAddress).to.equal(nftCollectionAddress);
    });

    it("Should set the correct reward token address", async function () {
      expect(await nftStaking.rewardToken()).to.equal(await rewardToken.getAddress());
    });

    it("Should set the correct reward curve", async function () {
      for (let i = 0; i < rewardCurve.length; i++) {
        expect(await nftStaking.rewardCurve(i)).to.equal(rewardCurve[i]);
      }
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake their NFTs", async function () {
      await nftStaking.connect(user1).stake(1);
      const stake = await nftStaking.stakedNFTs(user1.address, 1);
      expect(stake.isActive).to.be.true;
      expect(stake.tokenId).to.equal(1);
    });

    it("Should not allow staking of NFTs the user doesn't own", async function () {
      await expect(nftStaking.connect(user2).stake(1)).to.be.revertedWith("You don't own this NFT");
    });

    it("Should not allow staking of already staked NFTs", async function () {
      await nftStaking.connect(user1).stake(1);
      await expect(nftStaking.connect(user1).stake(1)).to.be.revertedWith("Already staked");
    });
  });

  describe("Unstaking", function () {
    it("Should not allow unstaking before lock period", async function () {
      await nftStaking.connect(user1).stake(1);
      await expect(nftStaking.connect(user1).unstake(1)).to.be.revertedWith("Cannot unstake before lock period");
    });

    it("Should allow unstaking after lock period", async function () {
      await nftStaking.connect(user1).stake(1);
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine");
      await nftStaking.connect(user1).unstake(1);
      const stake = await nftStaking.stakedNFTs(user1.address, 1);
      expect(stake.isActive).to.be.false;
    });
  });

  describe("Owner functions", function () {
    it("Should allow owner to change lock period", async function () {
      const newLockPeriod = 14 * 24 * 60 * 60; // 14 days
      await nftStaking.connect(owner).setLockPeriod(newLockPeriod);
      expect(await nftStaking.lockPeriod()).to.equal(newLockPeriod);
    });

    it("Should not allow non-owner to change lock period", async function () {
      const newLockPeriod = 14 * 24 * 60 * 60; // 14 days
      await expect(nftStaking.connect(user1).setLockPeriod(newLockPeriod)).to.be.reverted;
    });
  });

  describe("Reward Calculation", function () {
    const DAY = 24 * 60 * 60;
    async function stakeAndAdvanceTime(user, tokenId, days) {
      await nftStaking.connect(user).stake(tokenId);
      await ethers.provider.send("evm_increaseTime", [days * DAY]);
      await ethers.provider.send("evm_mine");
    }

    async function getReward(user, tokenId) {
      await nftStaking.connect(user).unstake(tokenId);
      const reward = await rewardToken.balanceOf(user.address);
      await rewardToken.connect(user).transfer(owner.address, reward); // Reset balance for next test
      return reward;
    }

    it("Should calculate correct reward for 7 days (end of first segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 7);
      const reward = await getReward(user1, 1);
      expect(reward).to.equal(7 * 7); // 7 days * 7 tokens per day
    });

    it("Should calculate correct reward for 10 days (middle of second segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 10);
      const reward = await getReward(user1, 1);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10)); // 7 days * 7 + sum of days 8, 9, 10
    });

    it("Should calculate correct reward for 14 days (end of second segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 14);
      const reward = await getReward(user1, 1);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14)); // 7 days * 7 + sum of days 8 to 14
    });

    it("Should calculate correct reward for 18 days (middle of third segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 18);
      const reward = await getReward(user1, 1);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14) + (4 * 14)); // First two segments + 4 days * 14
    });

    it("Should calculate correct reward for 21 days (end of third segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 21);
      const reward = await getReward(user1, 1);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14) + (7 * 14)); // First two segments + 7 days * 14
    });

    it("Should calculate correct reward for 25 days (middle of fourth segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 25);
      const reward = await getReward(user1, 1);
      const fourthSegmentReward = (22 - 7) + (23 - 7) + (24 - 7) + (25 - 7);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14) + (7 * 14) + fourthSegmentReward);
    });

    it("Should calculate correct reward for 28 days (end of fourth segment)", async function () {
      await stakeAndAdvanceTime(user1, 1, 28);
      const reward = await getReward(user1, 1);
      const fourthSegmentReward = (22 - 7) + (23 - 7) + (24 - 7) + (25 - 7) + (26 - 7) + (27 - 7) + (28 - 7);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14) + (7 * 14) + fourthSegmentReward);
    });

    it("Should cap rewards at 28 days", async function () {
      await stakeAndAdvanceTime(user1, 1, 35);
      const reward = await getReward(user1, 1);
      const fourthSegmentReward = (22 - 7) + (23 - 7) + (24 - 7) + (25 - 7) + (26 - 7) + (27 - 7) + (28 - 7);
      expect(reward).to.equal(7 * 7 + (8 + 9 + 10 + 11 + 12 + 13 + 14) + (7 * 14) + fourthSegmentReward);
    });
  });

});