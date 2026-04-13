import hre from "hardhat";

async function main() {
  const networkName = process.argv[2] || "ganache";
  const { ethers } = await hre.network.connect(networkName);
  const [deployer] = await ethers.getSigners();

  console.log("Deploying with account:", deployer.address);

  const factory = await ethers.getContractFactory("VendingMachine");
  const vm = await factory.deploy();
  await vm.waitForDeployment();
  const addr = await vm.getAddress();
  console.log("VendingMachine deployed to:", addr);

  // Seed products
  let tx;
  tx = await vm.addProduct("Cola", ethers.parseEther("0.01"), 50);
  await tx.wait();
  tx = await vm.addProduct("Chips", ethers.parseEther("0.02"), 30);
  await tx.wait();
  tx = await vm.addProduct("Candy", ethers.parseEther("0.005"), 100);
  await tx.wait();

  console.log("Seeded 3 products. Deployment complete.");
  console.log("\nUpdate your app/index.html CONTRACT_ADDRESS to:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
