#### TL;DR 
```
cd tests
npm i
npx hardhat test
```

## NFT Staking DApp

A decentralized application (DApp) that allows users to stake their NFTs and claim rewards interacting with smart contracts on the Ethereum blockchain.

## Smart Contract Details

### NFT Staking Contract

1) ERC20 contract -> Handles the rewards

2) ERC721 contract -> NFT contract

3) Staking contract -> The NFT Staking contract is responsible for managing the staking of NFTs and handling reward distributions. Below are the key components of the contract:


#### ABI (Application Binary Interface)

The ABI is a JSON array that describes the contract's methods and events. This is essential for interacting with the smart contract from the DApp.

- **ABI File**: `src/abi.ts` 

#### Key Functions

1. **stake(tokenId: string)**

   - **Description**: Allows users to stake their NFTs by providing the token ID.
   - **Parameters**: 
     - `tokenId`: The unique identifier of the NFT to stake.
   - **Returns**: A transaction receipt upon successful staking.

2. **claimRewards()**

   - **Description**: Allows users to claim rewards for the NFTs they have staked.
   - **Returns**: The amount of rewards earned.

3. **getRewards(address user)**

   - **Description**: Retrieves the total rewards available for a specific user.
   - **Parameters**:
     - `user`: The address of the user.
   - **Returns**: The total rewards accumulated by the user.

4. **isStaked(address user)**

   - **Description**: Checks if a user has staked NFTs.
   - **Parameters**:
     - `user`: The address of the user.
   - **Returns**: A boolean indicating whether the user has staked NFTs.

### Events

The following events are emitted by the contract:

1. **NFTStaked**

   - **Description**: Emitted when an NFT is successfully staked.
   - **Parameters**:
     - `user`: The address of the user who staked the NFT.
     - `tokenId`: The unique identifier of the staked NFT.

2. **RewardsClaimed**

   - **Description**: Emitted when a user claims their rewards.
   - **Parameters**:
     - `user`: The address of the user who claimed the rewards.
     - `amount`: The amount of rewards claimed.

### Security Considerations

- Ensure that only authorized users can stake or claim rewards.
- Implement checks to prevent reentrancy attacks.
- Validate input parameters to prevent invalid operations.

### Deployment

- Uses scripts/deploy.js to deploy the contract using Hardhat and docker for containerization.

## Frontend Integration

### Technologies Used

- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A superset of JavaScript that provides static typing.
- **Ethers.js**: A library for interacting with the Ethereum blockchain and its ecosystem.

### Connect Wallet

The DApp utilizes MetaMask to connect users' wallets. The `connectWallet` function is used to prompt the user to connect their wallet and authorize the DApp to interact with their Ethereum account.

### Staking NFTs

Users can stake NFTs by entering the token ID in the input field. The `stakeNFT` function interacts with the smart contract to stake the specified NFT.

### Claiming Rewards

Users can claim rewards by clicking the "Claim Rewards" button. The `claimRewards` function retrieves the rewards amount from the smart contract and updates the frontend state.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)


```bash
   git clone https://github.com/coderSomya/LazyNFT.git
```


