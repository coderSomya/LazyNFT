async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    const NFTStaking = await ethers.getContractFactory("NFTStaking");
    const nftCollectionAddress = "0xd9145CCE52D386f254917e481eB44e9943F39138";
    const rewardTokenAddress = "0xd9145CCE52D386f254917e481eB44e9943F39138";
    const rewardCurve = [7, 0, 14, 7];
  
    const nftStaking = await NFTStaking.deploy(nftCollectionAddress, rewardTokenAddress, rewardCurve);
  
    console.log("NFTStaking deployed to:", nftStaking.address);
  }
  
main()
.then(() => process.exit(0))
.catch((error) => {
    console.error(error);
    process.exit(1);
});
  