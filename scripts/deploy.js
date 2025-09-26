const hre = require("hardhat");

async function main() {
  console.log("Deploying AgriChain contracts...");

  // Deploy BatchToken contract
  const BatchToken = await hre.ethers.getContractFactory("BatchToken");
  const batchToken = await BatchToken.deploy();
  await batchToken.deployed();
  console.log("BatchToken deployed to:", batchToken.address);

  // Deploy AgriChain contract
  const AgriChain = await hre.ethers.getContractFactory("AgriChain");
  const agriChain = await AgriChain.deploy(batchToken.address);
  await agriChain.deployed();
  console.log("AgriChain deployed to:", agriChain.address);

  // Set AgriChain as the authorized contract for BatchToken
  await batchToken.setAgriChainContract(agriChain.address);
  console.log("BatchToken configured with AgriChain address");

  // Deploy Authentication contract
  const Authentication = await hre.ethers.getContractFactory("Authentication");
  const authentication = await Authentication.deploy();
  await authentication.deployed();
  console.log("Authentication deployed to:", authentication.address);

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });