const { ethers } = require("hardhat");

async function main() {
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log("Verifier deployed to:", verifierAddr);

  const Factory = await ethers.getContractFactory("ElectionFactory");
  const factory = await Factory.deploy(verifierAddr);
  await factory.waitForDeployment();
  console.log("ElectionFactory deployed to:", await factory.getAddress());
}

main().catch((err) => { console.error(err); process.exitCode = 1; });