import hre from "hardhat";
import { expect } from "chai";

const { ethers } = await hre.network.connect();

describe("VendingMachine", function () {
  let vendingMachine;
  let admin, buyer1, buyer2;

  async function deployFixture() {
    const [_admin, _buyer1, _buyer2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("VendingMachine");
    const vm = await factory.deploy();
    await vm.waitForDeployment();

    // Seed three products
    await vm.addProduct("Cola", ethers.parseEther("0.01"), 10);
    await vm.addProduct("Chips", ethers.parseEther("0.02"), 5);
    await vm.addProduct("Candy", ethers.parseEther("0.005"), 20);

    return { vm, admin: _admin, buyer1: _buyer1, buyer2: _buyer2 };
  }

  beforeEach(async function () {
    ({ vm: vendingMachine, admin, buyer1, buyer2 } = await deployFixture());
  });

  // ---- Test 1: Successful purchase ----
  it("should allow a user to purchase an item with exact payment", async function () {
    const price = ethers.parseEther("0.01");
    const tx = await vendingMachine.connect(buyer1).purchase(0, 1, { value: price });
    await expect(tx)
      .to.emit(vendingMachine, "ItemPurchased")
      .withArgs(buyer1.address, 0, 1, price);

    const [, , stock] = await vendingMachine.getProduct(0);
    expect(stock).to.equal(9);
  });

  // ---- Test 2: Failed purchase due to insufficient payment ----
  it("should reject purchase with insufficient payment", async function () {
    const lowPayment = ethers.parseEther("0.001");
    await expect(
      vendingMachine.connect(buyer1).purchase(0, 1, { value: lowPayment })
    ).to.be.revertedWith("Insufficient payment");
  });

  // ---- Test 3: Failed purchase due to out of stock ----
  it("should reject purchase when stock is insufficient", async function () {
    const price = ethers.parseEther("0.02");
    // Chips stock is 5, try to buy 6
    await expect(
      vendingMachine.connect(buyer1).purchase(1, 6, { value: price * 6n })
    ).to.be.revertedWith("Not enough stock available");
  });

  // ---- Test 4: Permission failure — non-admin tries to restock ----
  it("should reject restock from non-admin user", async function () {
    await expect(
      vendingMachine.connect(buyer1).restock(0, 10)
    ).to.be.revertedWith("Only admin can perform this action");
  });

  // ---- Test 5: State changes after a successful transaction ----
  it("should record purchase in buyer's history and decrease stock", async function () {
    const price = ethers.parseEther("0.005");
    await vendingMachine.connect(buyer2).purchase(2, 3, { value: price * 3n });

    // Stock decreased from 20 to 17
    const [, , stock] = await vendingMachine.getProduct(2);
    expect(stock).to.equal(17);

    // Purchase history updated
    const purchases = await vendingMachine.getPurchases(buyer2.address);
    expect(purchases.length).to.equal(1);
    expect(purchases[0].productId).to.equal(2);
    expect(purchases[0].quantity).to.equal(3);
    expect(purchases[0].totalPaid).to.equal(price * 3n);
  });

  // ---- Test 6: Overpayment refund ----
  it("should refund excess ETH on overpayment", async function () {
    const price = ethers.parseEther("0.01");
    const overpay = ethers.parseEther("0.05");

    const balanceBefore = await ethers.provider.getBalance(buyer1.address);
    const tx = await vendingMachine.connect(buyer1).purchase(0, 1, { value: overpay });
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(buyer1.address);

    // Buyer should have paid exactly price + gas, not overpay + gas
    expect(balanceBefore - balanceAfter).to.equal(price + gasUsed);
  });

  // ---- Test 7: Admin can restock successfully ----
  it("should allow admin to restock a product", async function () {
    const tx = await vendingMachine.connect(admin).restock(0, 15);
    await expect(tx)
      .to.emit(vendingMachine, "ProductRestocked")
      .withArgs(0, 15, 25); // 10 original + 15 added

    const [, , stock] = await vendingMachine.getProduct(0);
    expect(stock).to.equal(25);
  });

  // ---- Test 8: Cannot purchase non-existent product ----
  it("should reject purchase of non-existent product", async function () {
    await expect(
      vendingMachine.connect(buyer1).purchase(99, 1, { value: ethers.parseEther("1") })
    ).to.be.revertedWith("Product does not exist");
  });

  // ---- Test 9: Non-admin cannot add products ----
  it("should reject addProduct from non-admin", async function () {
    await expect(
      vendingMachine.connect(buyer1).addProduct("Water", ethers.parseEther("0.01"), 10)
    ).to.be.revertedWith("Only admin can perform this action");
  });

  // ---- Test 10: Admin can withdraw funds ----
  it("should allow admin to withdraw contract balance after sales", async function () {
    const price = ethers.parseEther("0.01");
    await vendingMachine.connect(buyer1).purchase(0, 2, { value: price * 2n });

    const adminBalBefore = await ethers.provider.getBalance(admin.address);
    const tx = await vendingMachine.connect(admin).withdraw();
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const adminBalAfter = await ethers.provider.getBalance(admin.address);

    expect(adminBalAfter - adminBalBefore + gasUsed).to.equal(price * 2n);
  });
});
