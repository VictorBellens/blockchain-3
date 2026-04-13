import hre from "hardhat";

async function main() {
  const networkName = process.argv[2] || "ganache";
  const { ethers } = await hre.network.connect(networkName);
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const factory = await ethers.getContractFactory("EventTickets");
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("EventTickets deployed to:", addr);

  // Seed two events
  let tx;
  tx = await contract.createEvent(
    "Blockchain Summit 2026", "2026-06-15", "Convention Center",
    ethers.parseEther("0.05"), 100
  );
  await tx.wait();
  tx = await contract.createEvent(
    "Web3 Music Festival", "2026-08-20", "City Park Arena",
    ethers.parseEther("0.1"), 200
  );
  await tx.wait();

  console.log("Seeded 2 events. Deployment complete.");
  console.log("\nUpdate your app/web3/index.html CONTRACT_ADDRESS to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
