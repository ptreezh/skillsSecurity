const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("ASKToken", function() {
  const fixture = deployContracts;

  async function deploy() {
    const { token, owner, user1, user2, accounts } = await loadFixture(fixture);
    const user3 = accounts[0];
    return { token, owner, user1, user2, user3 };
  }

  describe("Mint", function() {
    it("should mint tokens to address", async function() {
      const { token, owner, user1 } = await deploy();
      const amount = ethers.parseEther("1000");

      // Burn some tokens first to make room for minting
      await token.burn(ethers.parseEther("10000"));

      await expect(token.mint(user1, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);

      expect(await token.balanceOf(user1.address)).to.equal(amount);
    });

    it("should mint tokens to owner directly", async function() {
      const { token, owner } = await deploy();
      const amount = ethers.parseEther("500");

      // Burn some tokens first to make room for minting
      await token.burn(ethers.parseEther("10000"));

      const initialBalance = await token.balanceOf(owner.address);

      await token.mint(owner, amount);

      expect(await token.balanceOf(owner.address)).to.equal(initialBalance + amount);
    });

    it("should update totalSupply after mint", async function() {
      const { token, owner, user1 } = await deploy();
      const amount = ethers.parseEther("100");

      // Burn some tokens first to make room for minting
      await token.burn(ethers.parseEther("10000"));

      const initialSupply = await token.totalSupply();

      await token.mint(user1, amount);

      expect(await token.totalSupply()).to.equal(initialSupply + amount);
    });

    it("should revert when non-owner tries to mint", async function() {
      const { token, user1, user2 } = await deploy();
      const amount = ethers.parseEther("1000");

      // Ownable v5 uses revertedWith for access control errors
      await expect(
        token.connect(user1).mint(user2, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when minting exceeds max supply", async function() {
      const { token, owner, user1 } = await deploy();
      // Try to mint more than remaining supply
      const maxSupply = await token.MAX_SUPPLY();
      const currentSupply = await token.totalSupply();
      const excessAmount = maxSupply - currentSupply + ethers.parseEther("1");

      await expect(
        token.mint(user1, excessAmount)
      ).to.be.revertedWith("Max supply exceeded");
    });
  });

  describe("Burn", function() {
    it("should burn tokens and reduce total supply", async function() {
      const { token, owner, user1 } = await deploy();
      const burnAmount = ethers.parseEther("300");

      // Owner already has tokens, transfer some to user1 first
      await token.transfer(user1, ethers.parseEther("1000"));
      const initialSupply = await token.totalSupply();

      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);

      expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("1000") - burnAmount);
      expect(await token.totalSupply()).to.equal(initialSupply - burnAmount);
    });

    it("should allow owner to burn tokens", async function() {
      const { token, owner } = await deploy();
      const initialBalance = await token.balanceOf(owner.address);
      const burnAmount = ethers.parseEther("100");

      await token.burn(burnAmount);

      expect(await token.balanceOf(owner.address)).to.equal(initialBalance - burnAmount);
    });

    it("should burn entire balance", async function() {
      const { token, owner, user1 } = await deploy();
      const mintAmount = ethers.parseEther("100");

      // Transfer tokens to user1
      await token.transfer(user1, mintAmount);
      const balance = await token.balanceOf(user1.address);

      await token.connect(user1).burn(balance);

      expect(await token.balanceOf(user1.address)).to.equal(0);
    });

    it("should revert when burning more than balance", async function() {
      const { token, owner, user1 } = await deploy();
      const mintAmount = ethers.parseEther("500");
      const burnAmount = ethers.parseEther("1000");

      // Transfer some tokens to user1
      await token.transfer(user1, mintAmount);

      await expect(
        token.connect(user1).burn(burnAmount)
      ).to.be.reverted;
    });
  });

  describe("Delegate", function() {
    it("should delegate votes and update vote weight", async function() {
      const { token, owner, user1, user2 } = await deploy();
      const mintAmount = ethers.parseEther("1000");

      // Transfer tokens to user1 and delegate to user2
      await token.transfer(user1, mintAmount);
      await token.connect(user1).delegate(user2.address);

      expect(await token.getVotes(user2.address)).to.equal(mintAmount);
      // user1's own vote weight should be 0 after delegating
      expect(await token.getVotes(user1.address)).to.equal(0);
    });

    it("should track multiple delegators' votes", async function() {
      const { token, owner, user1, user2, user3 } = await deploy();

      // Transfer tokens to user1 and user2
      await token.transfer(user1, ethers.parseEther("500"));
      await token.transfer(user2, ethers.parseEther("300"));

      await token.connect(user1).delegate(user3.address);
      await token.connect(user2).delegate(user3.address);

      expect(await token.getVotes(user3.address))
        .to.equal(ethers.parseEther("800"));
    });

    it("should maintain vote weight when balance changes after delegation", async function() {
      // Vote weight is set at delegation time based on current balance
      // IMPORTANT: This tests that votes are captured at delegation, not updated dynamically
      const { token, owner, user1, user2 } = await deploy();
      const mintAmount = ethers.parseEther("1000");

      // Transfer tokens to user1
      await token.transfer(user1, mintAmount);

      // Delegate first
      await token.connect(user1).delegate(user2.address);
      const votesAfterDelegate = await token.getVotes(user2.address);
      expect(votesAfterDelegate).to.equal(mintAmount);

      // Transfer some tokens (vote weight stays the same - snapshot at delegation)
      await token.connect(user1).transfer(owner, ethers.parseEther("500"));

      // Vote weight should remain unchanged (snapshot)
      expect(await token.getVotes(user2.address)).to.equal(mintAmount);
    });

    it("should return zero votes for non-delegate address", async function() {
      const { token, owner, user1 } = await deploy();
      const mintAmount = ethers.parseEther("1000");

      // Transfer tokens to user1 (no delegation)
      await token.transfer(user1, mintAmount);
      // user1 did not delegate, so user1's own votes should be 0
      // and owner (never delegated to) should have 0 votes

      expect(await token.getVotes(user1.address)).to.equal(0);
      expect(await token.getVotes(owner.address)).to.equal(0);
    });
  });

  describe("Events", function() {
    it("should emit Transfer with correct parameters on mint", async function() {
      const { token, owner, user1 } = await deploy();
      const amount = ethers.parseEther("1000");

      // Burn some tokens first to make room for minting
      await token.burn(ethers.parseEther("10000"));

      await expect(token.mint(user1, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });

    it("should emit Transfer with correct parameters on burn", async function() {
      const { token, owner, user1 } = await deploy();
      const burnAmount = ethers.parseEther("400");

      // Transfer tokens to user1 first
      await token.transfer(user1, ethers.parseEther("1000"));

      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });

    it("should emit Transfer with correct parameters on transfer", async function() {
      const { token, owner, user1, user2 } = await deploy();
      const mintAmount = ethers.parseEther("1000");
      const transferAmount = ethers.parseEther("300");

      // Transfer tokens to user1 first
      await token.transfer(user1, mintAmount);

      await expect(token.connect(user1).transfer(user2.address, transferAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
    });

    it("should verify Transfer event from address is ZeroAddress for mint", async function() {
      const { token, owner, user1 } = await deploy();
      const amount = ethers.parseEther("500");

      // Burn some tokens first to make room for minting
      await token.burn(ethers.parseEther("10000"));

      await expect(token.mint(user1, amount))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, amount);
    });

    it("should verify Transfer event to address is ZeroAddress for burn", async function() {
      const { token, owner, user1 } = await deploy();
      const burnAmount = ethers.parseEther("200");

      // Transfer tokens to user1 first
      await token.transfer(user1, ethers.parseEther("500"));

      await expect(token.connect(user1).burn(burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, ethers.ZeroAddress, burnAmount);
    });
  });
});