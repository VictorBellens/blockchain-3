import hre from "hardhat";
import { expect } from "chai";

const { ethers } = await hre.network.connect();

describe("EventTickets", function () {
  let contract;
  let admin, user1, user2;
  const TICKET_PRICE = ethers.parseEther("0.05");

  async function deployFixture() {
    const [_admin, _user1, _user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EventTickets");
    const c = await factory.deploy();
    await c.waitForDeployment();

    // Create two events
    await c.createEvent("Blockchain Summit", "2026-06-15", "Convention Center", TICKET_PRICE, 5);
    await c.createEvent("Web3 Music Fest", "2026-08-20", "City Park", ethers.parseEther("0.1"), 3);

    return { contract: c, admin: _admin, user1: _user1, user2: _user2 };
  }

  beforeEach(async function () {
    ({ contract, admin, user1, user2 } = await deployFixture());
  });

  // ---- 1. Event creation by admin ----
  it("should allow admin to create events", async function () {
    const [name, date, venue, price, total, sold] = await contract.getEventInfo(0);
    expect(name).to.equal("Blockchain Summit");
    expect(total).to.equal(5);
    expect(sold).to.equal(0);
  });

  // ---- 2. Non-admin cannot create events ----
  it("should reject event creation by non-admin", async function () {
    await expect(
      contract.connect(user1).createEvent("Hack Day", "2026-09-01", "Lab", TICKET_PRICE, 10)
    ).to.be.revertedWith("Only admin can perform this action");
  });

  // ---- 3. Successful ticket purchase ----
  it("should allow user to buy a ticket", async function () {
    const tx = await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });
    await expect(tx).to.emit(contract, "TicketPurchased");

    const [eventId, owner, forSale, resalePrice] = await contract.getTicket(0);
    expect(eventId).to.equal(0);
    expect(owner).to.equal(user1.address);
    expect(forSale).to.equal(false);
  });

  // ---- 4. Reject purchase with insufficient payment ----
  it("should reject ticket purchase with insufficient payment", async function () {
    await expect(
      contract.connect(user1).buyTicket(0, { value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Insufficient payment");
  });

  // ---- 5. Reject purchase when sold out ----
  it("should reject purchase when event is sold out", async function () {
    // Event 1 has only 3 tickets
    const price = ethers.parseEther("0.1");
    await contract.connect(user1).buyTicket(1, { value: price });
    await contract.connect(user1).buyTicket(1, { value: price });
    await contract.connect(user2).buyTicket(1, { value: price });

    await expect(
      contract.connect(user2).buyTicket(1, { value: price })
    ).to.be.revertedWith("Event is sold out");
  });

  // ---- 6. Direct ticket transfer ----
  it("should allow owner to transfer a ticket", async function () {
    await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });
    const tx = await contract.connect(user1).transferTicket(0, user2.address);
    await expect(tx).to.emit(contract, "TicketTransferred").withArgs(0, user1.address, user2.address);

    const [, owner] = await contract.getTicket(0);
    expect(owner).to.equal(user2.address);
  });

  // ---- 7. Non-owner cannot transfer ----
  it("should reject transfer by non-owner", async function () {
    await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });
    await expect(
      contract.connect(user2).transferTicket(0, admin.address)
    ).to.be.revertedWith("Not the ticket owner");
  });

  // ---- 8. List ticket for resale and buy it ----
  it("should support full resale flow: list → buy", async function () {
    await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });

    const resalePrice = ethers.parseEther("0.08");
    await contract.connect(user1).listForSale(0, resalePrice);

    const [, , forSale, rp] = await contract.getTicket(0);
    expect(forSale).to.equal(true);
    expect(rp).to.equal(resalePrice);

    const sellerBalBefore = await ethers.provider.getBalance(user1.address);
    const tx = await contract.connect(user2).buyResale(0, { value: resalePrice });
    await tx.wait();

    const [, newOwner, forSaleAfter] = await contract.getTicket(0);
    expect(newOwner).to.equal(user2.address);
    expect(forSaleAfter).to.equal(false);

    const sellerBalAfter = await ethers.provider.getBalance(user1.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(resalePrice);
  });

  // ---- 9. Cannot buy own resale listing ----
  it("should reject buying own resale listing", async function () {
    await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });
    await contract.connect(user1).listForSale(0, ethers.parseEther("0.08"));

    await expect(
      contract.connect(user1).buyResale(0, { value: ethers.parseEther("0.08") })
    ).to.be.revertedWith("Already the owner");
  });

  // ---- 10. Cancel resale listing ----
  it("should allow owner to cancel a resale listing", async function () {
    await contract.connect(user1).buyTicket(0, { value: TICKET_PRICE });
    await contract.connect(user1).listForSale(0, ethers.parseEther("0.08"));
    await contract.connect(user1).cancelSale(0);

    const [, , forSale] = await contract.getTicket(0);
    expect(forSale).to.equal(false);
  });
});
