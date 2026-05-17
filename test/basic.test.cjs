const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Basic Test", function() {
  async function deploy() {
    const [owner] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("ASKToken");
    const token = await Token.deploy();
    return { token, owner };
  }

  it("should work", async function() {
    const { token } = await loadFixture(deploy);
    const AddressZero = "0x0000000000000000000000000000000000000000";
    expect(token.address).to.not.equal(AddressZero);
  });
});