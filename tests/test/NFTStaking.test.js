const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStaking", function () {
  let NFTStaking, nftStaking, MyNFT, myNFT, RewardToken, rewardToken;
  let owner, user1, user2;
  const rewardCurve = [7, 14, 14, 7];

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

  describe("Rewards", function () {
    it("Should calculate rewards correctly", async function () {
      await nftStaking.connect(user1).stake(1);
      await ethers.provider.send("evm_increaseTime", [14 * 24 * 60 * 60]); // 14 days
      await ethers.provider.send("evm_mine");
      await nftStaking.connect(user1).unstake(1);
      const expectedReward = 7 * 7 + 73; // 7 days at 7 tokens/day + 7 days with increasing reward
      expect(await rewardToken.balanceOf(user1.address)).to.equal(expectedReward);
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
});