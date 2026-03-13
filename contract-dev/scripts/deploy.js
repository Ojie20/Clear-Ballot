const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  const electionName = process.env.ELECTION_NAME ?? "Student Union Election 2025";

  console.log(`\nDeploying Election contract: "${electionName}"...`);

  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(electionName);
  await election.waitForDeployment();

  const address = await election.getAddress();
  console.log("✅ Election deployed to:", address);
  console.log("\nNext steps:");
  console.log("  1. Copy this address into src/constants/contract.js");
  console.log("  2. Copy ABI from artifacts/contracts/Election.sol/Election.json");
  console.log(`  3. Verify on Etherscan:\n     npx hardhat verify --network sepolia ${address} "${electionName}"`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});