const hre = require("hardhat");

async function main() {
  console.log("Deploying VotingSystem contract...");
  
  // Get the contract factory
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  
  // Deploy the contract
  const votingSystem = await VotingSystem.deploy();
  
  // Wait for deployment to finish
  await votingSystem.waitForDeployment();
  
  const address = await votingSystem.getAddress();
  console.log("VotingSystem deployed to:", address);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 