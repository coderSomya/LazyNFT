// test/NFTStaking.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTStaking", function () {
    let NFTStaking, nftStaking, NFTCollection, nftCollection, RewardToken, rewardToken;
    let owner, user1, user2;

    const REWARD_CURVE = [7, 7, 14, 14]; // Example reward curve

    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy ERC721 Mock
        const MockNFT = await ethers.getContractFactory("MyNFT");
        nftCollection = await MockNFT.deploy();
        await nftCollection.deployed();

        // Deploy ERC20 Mock
        const MockToken = await ethers.getContractFactory("RewardToken");
        rewardToken = await MockToken.deploy();
        await rewardToken.deployed();

        // Deploy NFTStaking contract
        NFTStaking = await ethers.getContractFactory("NFTStaking");
        nftStaking = await NFTStaking.deploy(nftCollection.address, rewardToken.address, REWARD_CURVE);
        await nftStaking.deployed();

        // Mint NFTs to user1
        await nftCollection.mint(user1.address, 1);
        await nftCollection.mint(user1.address, 2);
    });

    describe("Staking", function () {
        it("should allow user to stake NFT", async function () {
            await nftCollection.connect(user1).approve(nftStaking.address, 1);
            await nftStaking.connect(user1).stake(1);
            const stakedNFTs = await nftStaking.stakedNFTs(user1.address);
            expect(stakedNFTs.length).to.equal(1);
            expect(stakedNFTs[0].tokenId).to.equal(1);
            expect(stakedNFTs[0].isActive).to.equal(true);
        });

        it("should not allow user to stake if they don't own the NFT", async function () {
            await nftCollection.connect(user1).approve(nftStaking.address, 1);
            await nftStaking.connect(user1).stake(1);
            await nftCollection.connect(user2).approve(nftStaking.address, 2);
            await expect(nftStaking.connect(user2).stake(1)).to.be.revertedWith("You don't own this NFT");
        });

        it("should not allow double staking", async function () {
            await nftCollection.connect(user1).approve(nftStaking.address, 1);
            await nftStaking.connect(user1).stake(1);
            await expect(nftStaking.connect(user1).stake(2)).to.be.revertedWith("Already staked");
        });
    });

    describe("Unstaking", function () {
        beforeEach(async () => {
            await nftCollection.connect(user1).approve(nftStaking.address, 1);
            await nftStaking.connect(user1).stake(1);
            await nftCollection.connect(user1).approve(nftStaking.address, 2);
            await nftStaking.connect(user1).stake(2);
        });

        it("should allow user to unstake NFT after lock period", async function () {
            // Fast forward time to unlock period
            await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
            await ethers.provider.send("evm_mine"); // mine a block

            await nftStaking.connect(user1).unstake(1);
            const stakedNFTs = await nftStaking.stakedNFTs(user1.address);
            expect(stakedNFTs[0].isActive).to.equal(false);
        });

        it("should not allow unstaking before lock period", async function () {
            await expect(nftStaking.connect(user1).unstake(1)).to.be.revertedWith("Cannot unstake before lock period");
        });

        it("should not allow unstaking if no NFTs are staked", async function () {
            await nftStaking.connect(user1).unstake(1); // Unstake 1
            await nftStaking.connect(user1).unstake(2); // Unstake 2
            await expect(nftStaking.connect(user1).unstake(1)).to.be.revertedWith("No NFTs staked");
        });
    });

    describe("Rewards", function () {
        beforeEach(async () => {
            await nftCollection.connect(user1).approve(nftStaking.address, 1);
            await nftStaking.connect(user1).stake(1);
            // Fast forward time to accumulate rewards
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine"); // mine a block
        });

        it("should calculate rewards correctly", async function () {
            await nftStaking.calculateRewards(user1.address);
            const rewards = await nftStaking.rewards(user1.address);
            expect(rewards).to.be.gt(0);
        });

        it("should allow user to claim rewards", async function () {
            await nftStaking.calculateRewards(user1.address);
            const rewardsBefore = await nftStaking.rewards(user1.address);
            await rewardToken.mint(user1.address, rewardsBefore); // Minting rewards to the user
            await nftStaking.claimRewards();
            const rewardsAfter = await nftStaking.rewards(user1.address);
            expect(rewardsAfter).to.equal(0);
        });

        it("should not allow claiming rewards if there are none", async function () {
            await expect(nftStaking.claimRewards()).to.be.revertedWith("No rewards to claim");
        });
    });
});
