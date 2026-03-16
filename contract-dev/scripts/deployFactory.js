const { ethers } = require("hardhat");

async function main() {
  const Factory = await ethers.getContractFactory("ElectionFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("ElectionFactory deployed to:", await factory.getAddress());
}

main().catch((err) => { console.error(err); process.exitCode = 1; });