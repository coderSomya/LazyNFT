// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTStaking is Ownable {
    IERC721 public nftCollection;
    ERC20 public rewardToken;

    struct Stake {
        uint256 tokenId;
        uint256 stakedAt;
        bool isActive;
    }

    error AlreadyStaked();


    mapping(address => mapping (uint256 => Stake)) public stakedNFTs;
    mapping(address => mapping(uint256 => uint256)) public rewards;

    uint256[4] public rewardCurve;

    uint256 public lockPeriod = 7 days;
    uint256 public rewardPeriod = 1 days;

    event Staked(address indexed user, uint256 tokenId, uint256 timestamp);
    event Unstaked(address indexed user, uint256 tokenId, uint256 timestamp);
    event Claimed(address indexed user, uint256 reward);

    constructor(IERC721 _nftCollection, ERC20 _rewardToken, uint256[4] memory _rewardCurve) Ownable(msg.sender) {
        nftCollection = _nftCollection;
        rewardToken = _rewardToken;
        rewardCurve = _rewardCurve;
    }

    function setLockPeriod(uint256 _newLockPeriod) external onlyOwner {
        lockPeriod = _newLockPeriod;
    }

    function stake(uint256 tokenId) external {
      // require(nftCollection.ownerOf(tokenId) == msg.sender, "You don't own this NFT");
        // require(!stakedNFTs[msg.sender][tokenId].isActive, "Already staked");

        if (stakedNFTs[msg.sender][tokenId].isActive) revert ("Already staked");
        if (nftCollection.ownerOf(tokenId) != msg.sender) revert ("You don't own this NFT");

        nftCollection.transferFrom(msg.sender, address(this), tokenId);

        stakedNFTs[msg.sender][tokenId] = Stake({
            tokenId: tokenId,
            stakedAt: block.timestamp,
            isActive: true
        });

        emit Staked(msg.sender, tokenId, block.timestamp);
    }

    function unstake(uint256 tokenId) external {
        Stake storage userStake = stakedNFTs[msg.sender][tokenId];
        require(userStake.isActive, "No active stake");
        require(block.timestamp - userStake.stakedAt >= lockPeriod, "Cannot unstake before lock period");

        nftCollection.transferFrom(address(this), msg.sender, tokenId);
        userStake.isActive = false;

        claimRewards(tokenId, msg.sender);
        emit Unstaked(msg.sender, tokenId, block.timestamp);
    }

    function calculateAreaUnderCurve(uint256 x, uint256[4] memory rc) view private returns (uint256) {
        uint256 totalArea = 0;
        
        // First interval: 0 < x <= 7, f(x) = 7
        if (x <= 7) {
            totalArea += x * rc[0]; 
            return totalArea;
        } else {
            totalArea += 7 * rc[0]; 
        }

        // Second interval: 7 < x <= 14, f(x) = x
        if (x <= 14) {
            totalArea += ((x - 7) * (x + 7)) / 2;
            return totalArea;
        } else {
            totalArea+= 73; //((14 - 7) * (14 + 7)) / 2;
        }

        // Third interval: 14 < x <= 21, f(x) = 14
        if (x <= 21) {
            totalArea += rewardCurve[2] * (x - 14); 
            return totalArea;
        } else {
            totalArea += rewardCurve[2] * (21 - 14); 
        }

        // Fourth interval: 21 < x <= 28, f(x) = x - 7
        if (x <= 28) {
            totalArea += ((x - 21) * (x - rewardCurve[3] + 14)) / 2; 
            return totalArea;
        } else {
            totalArea += ((28 - 21) * (28 - rewardCurve[3] + 14)) / 2;
        }

        return totalArea;
    }

    function calculateRewards(address user, uint256 tokenId) internal {
        Stake storage userStake = stakedNFTs[user][tokenId];
        uint256 daysStaked = (block.timestamp - userStake.stakedAt) / rewardPeriod;

        uint256 reward = 0;

        reward = calculateAreaUnderCurve(daysStaked, rewardCurve);
        
        rewards[user][tokenId] += reward;
    }

    function claimRewards(uint256 tokenId, address caller) public {
        calculateRewards(caller, tokenId);
        uint256 reward = rewards[caller][tokenId];
        require(reward > 0, "No rewards to claim");
        
        rewards[msg.sender][tokenId] = 0;
        rewardToken.transfer(msg.sender, reward);

        emit Claimed(msg.sender, reward);
    }
}
