import React, { useState } from "react";
import { ethers } from "ethers";
import NFTStakingABI from "./abi";

const NFTStakingAddress = "YOUR_DEPLOYED_CONTRACT_ADDRESS";

const App: React.FC = () => {
  const [tokenId, setTokenId] = useState<string>("");
  const [rewards, setRewards] = useState<string>("0");
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(web3Provider);
        await web3Provider.send("eth_requestAccounts", []);
        const newSigner = await web3Provider.getSigner();
        setSigner(newSigner);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        alert("Failed to connect wallet. See console for details.");
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  const stakeNFT = async () => {
    if (signer && tokenId) {
      try {
        const contract = new ethers.Contract(NFTStakingAddress, NFTStakingABI, signer);
        const tx = await contract.stake(tokenId);
        await tx.wait();
        alert("NFT Staked!");
      } catch (error) {
        console.error("Error staking NFT:", error);
        alert("Failed to stake NFT. See console for details.");
      }
    } else {
      alert("Please connect your wallet and enter a valid token ID.");
    }
  };

  const claimRewards = async () => {
    if (signer) {
      try {
        const contract = new ethers.Contract(NFTStakingAddress, NFTStakingABI, signer);
        const tx = await contract.claimRewards();
        await tx.wait();
        const rewardAmount = await contract.getRewards();
        setRewards(ethers.formatEther(rewardAmount));
      } catch (error) {
        console.error("Error claiming rewards:", error);
        alert("Failed to claim rewards. See console for details.");
      }
    } else {
      alert("Please connect your wallet first.");
    }
  };

  return (
    <div className="flex justify-center">
      <h1>NFT Staking DApp</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      <div>
        <input
          type="text"
          placeholder="NFT Token ID"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
        />
        <button onClick={stakeNFT}>Stake NFT</button>
      </div>
      <button onClick={claimRewards}>Claim Rewards</button>
      <div>Your Rewards: {rewards} ETH</div>
    </div>
  );
};

export default App;