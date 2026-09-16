const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");
const { deployContracts } = require("../fixtures.cjs");

describe("Governance", function() {
  /**
   * Governance voting power: (rep / 1000) * 1e18, capped at 10% of total.
   * Quorum = 60% of totalVotingPower.
   * MAJORITY = 5001 / 10000 (50.01%).
   * To pass: need >= 6 voters (each capped at 10%) voting YES.
   *
   * Setup: 6 users each with reputation = 100_000
   *   → totalReputation = 600_000
   *   → totalVotingPower = (600_000 / 1000) * 1e18 = 6e20
   *   → cap per voter = 6e20 / 10 = 6e19
   *   → each voter weight = min(100 * 1e18 = 1e20, 6e19) = 6e19
   *   → 6 YES votes = 3.6e20
   *   → quorumVotes = 6e20 * 0.6 = 3.6e20 ✓ (exactly meets quorum)
   *   → forPercent = 100% ✓
   */
  async function deploy() {
    const { staking, owner, user1, user2, accounts } =
      await loadFixture(deployContracts);

    const Governance = await ethers.getContractFactory("Governance");
    const gov = await Governance.deploy(staking);
    await gov.waitForDeployment();

    // Deploy real SSE as target for UPDATE_REWARD_CONFIG proposals
    const SSE = await ethers.getContractFactory("SelfSustainingEcosystem");
    const sse = await SSE.deploy();
    await sse.waitForDeployment();
    await sse.setStakingManager(staking);
    // SSE.setGovernance(gov.address) → Governance.execute can call sse.setRoleBaseReward
    await sse.setGovernance(gov.target);

    // Setup 6 voters (user1, user2, accounts[0..3]) each with reputation 100_000
    // setEffectiveReputation is onlyOwner (owner is governance == owner from fixture)
    const voters = [user1, user2, accounts[0], accounts[1], accounts[2], accounts[3]];
    for (const v of voters) {
      await staking.setEffectiveReputation(v.address, 100_000);
    }

    return { gov, staking, sse, owner, user1, user2, accounts, voters };
  }

  describe("Proposal Lifecycle", function() {
    it("should create a proposal (voter with >= 100 voting units)", async function() {
      const { gov, staking, user1 } = await deploy();

      // user1 reputation 100_000 → voting power 6e19 > MIN_VOTING_POWER (100)
      await expect(
        gov.connect(user1).createProposal(
          "Update CREATOR base reward to 150",
          0, // ProposalAction.UPDATE_REWARD_CONFIG
          staking, // target (ethers v6: pass contract as Addressable)
          150, // value
          ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [0]) // data: ReputationRole.CREATOR
        )
      ).to.emit(gov, "ProposalCreated");

      const count = await gov.getProposalCount();
      expect(count).to.equal(1);
    });

    it("should revert createProposal from non-voter (rep = 0)", async function() {
      const { gov, accounts } = await deploy();
      const noRepUser = accounts[5]; // no reputation set

      await expect(
        gov.connect(noRepUser).createProposal(
          "Should fail", 0, gov.target, 0, "0x"
        )
      ).to.be.revertedWith("Insufficient voting power");
    });

    it("should allow voting and record weight correctly", async function() {
      const { gov, staking, user1, user2 } = await deploy();

      await gov.connect(user1).createProposal(
        "Test vote", 0, staking, 0, "0x"
      );

      await expect(gov.connect(user1).vote(0, true))
        .to.emit(gov, "VoteCast")
        .withArgs(0, user1.address, true, ethers.parseUnits("60", "ether"));

      await expect(gov.connect(user2).vote(0, false))
        .to.emit(gov, "VoteCast");

      const p = await gov.getProposal(0);
      expect(p.forVotes).to.equal(ethers.parseUnits("60", "ether"));
      expect(p.againstVotes).to.equal(ethers.parseUnits("60", "ether"));
    });

    it("should revert double voting", async function() {
      const { gov, staking, user1 } = await deploy();
      await gov.connect(user1).createProposal("Double", 0, staking, 0, "0x");
      await gov.connect(user1).vote(0, true);

      await expect(gov.connect(user1).vote(0, true))
        .to.be.revertedWith("Already voted");
    });
  });

  describe("Execution", function() {
    it("should execute a passed proposal after timelock (48h) + voting period (7 days)", async function() {
      const { gov, staking, sse, owner, voters } = await deploy();

      // Create proposal targeting SSE (UPDATE_REWARD_CONFIG writes to IReputationIncentives)
      await gov.connect(voters[0]).createProposal(
        "Increase CREATOR reward",
        0, // ProposalAction.UPDATE_REWARD_CONFIG
        sse, // real target → sse.setRoleBaseReward will be called
        150,
        ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [0]) // ReputationRole.CREATOR = 0
      );

      // All 6 voters vote YES
      for (const v of voters) {
        await gov.connect(v).vote(0, true);
      }

      // Advance time past voting period (7 days) + timelock (48h after voting end = 9d)
      await time.increase(10 * 24 * 60 * 60);
      await mine(1);

      // Execute
      await expect(gov.connect(owner).execute(0))
        .to.emit(gov, "ProposalExecuted");
    });

    it("should revert execute when timelock not elapsed (post-voting, pre-timelock)", async function() {
      const { gov, staking, owner, voters } = await deploy();

      await gov.connect(voters[0]).createProposal(
        "Too early", 0, staking, 0, "0x"
      );
      for (const v of voters) {
        await gov.connect(v).vote(0, true);
      }

      // Advance 8 days: > 7d (voting ended ✓) but < 9d (7d + 48h timelock, not elapsed)
      await time.increase(8 * 24 * 60 * 60);

      await expect(gov.connect(owner).execute(0))
        .to.be.revertedWithCustomError(gov, "TimelockNotElapsed");
    });

    it("should revert execute when quorum not reached", async function() {
      const { gov, staking, owner, accounts } = await deploy();

      // Only give 1 voter some rep, creating a small quorum scenario
      // We need a different setup: totalRep high, few votes → quorum fails
      await staking.setEffectiveReputation(accounts[4].address, 1_000_000);
      // totalVotingPower = 1e21, quorum = 6e20, accounts[4] cap = 1e20 (10% of total)
      // accounts[4] votes YES → 1e20 < 6e20 quorum → fails

      await gov.connect(accounts[4]).createProposal(
        "Quorum fail", 0, staking, 0, "0x"
      );
      await gov.connect(accounts[4]).vote(0, true);

      // Advance past voting (7d) + timelock (9d) so QuorumNotReached is the failing check
      await time.increase(10 * 24 * 60 * 60);

      await expect(gov.connect(owner).execute(0))
        .to.be.revertedWithCustomError(gov, "QuorumNotReached");
    });
  });

  describe("Cancel and Pause", function() {
    it("should allow proposer to cancel", async function() {
      const { gov, staking, user1 } = await deploy();
      await gov.connect(user1).createProposal("Cancel me", 0, staking, 0, "0x");

      await expect(gov.connect(user1).cancelProposal(0))
        .to.emit(gov, "ProposalCanceled");

      const p = await gov.getProposal(0);
      expect(p.canceled).to.equal(true);
    });

    it("should revert cancel from non-proposer", async function() {
      const { gov, staking, user1, user2 } = await deploy();
      await gov.connect(user1).createProposal("Not yours", 0, staking, 0, "0x");

      await expect(gov.connect(user2).cancelProposal(0))
        .to.be.revertedWith("Not proposer");
    });

    it("owner pause/unpause should gate proposal creation and voting", async function() {
      const { gov, staking, owner, user1 } = await deploy();

      await gov.connect(owner).pause();
      expect(await gov.paused()).to.equal(true);

      // Create proposal reverts when paused
      await expect(
        gov.connect(user1).createProposal("Paused", 0, staking, 0, "0x")
      ).to.be.revertedWithCustomError(gov, "PausedError");

      await gov.connect(owner).unpause();
      expect(await gov.paused()).to.equal(false);

      // Now create succeeds
      await expect(
        gov.connect(user1).createProposal("Unpaused", 0, staking, 0, "0x")
      ).to.emit(gov, "ProposalCreated");
    });

    it("owner pause reverts when already paused", async function() {
      const { gov, owner } = await deploy();
      await gov.connect(owner).pause();

      await expect(gov.connect(owner).pause())
        .to.be.revertedWith("Already paused");
    });

    it("owner unpause reverts when not paused", async function() {
      const { gov, owner } = await deploy();

      await expect(gov.connect(owner).unpause())
        .to.be.revertedWith("Not paused");
    });
  });

  describe("View Functions", function() {
    it("getProposal returns all fields", async function() {
      const { gov, staking, user1 } = await deploy();
      await gov.connect(user1).createProposal("View test", 0, staking, 0, "0x");

      const p = await gov.getProposal(0);
      expect(p.proposer).to.equal(user1.address);
      expect(p.description).to.equal("View test");
      expect(p.executed).to.equal(false);
      expect(p.canceled).to.equal(false);
    });

    it("hasVoted returns true after voting", async function() {
      const { gov, staking, user1, accounts } = await deploy();
      await gov.connect(user1).createProposal("Vote check", 0, staking, 0, "0x");
      await gov.connect(user1).vote(0, true);

      expect(await gov.hasVoted(0, user1.address)).to.equal(true);
      expect(await gov.hasVoted(0, accounts[5].address)).to.equal(false);
    });

    it("getVotingPower returns 0 for user with no reputation", async function() {
      const { gov, accounts } = await deploy();
      expect(await gov.getVotingPower(accounts[5].address)).to.equal(0);
    });
  });

  describe("Access Control", function() {
    it("constructor reverts on zero staking manager", async function() {
      const Governance = await ethers.getContractFactory("Governance");
      await expect(Governance.deploy(ethers.ZeroAddress))
        .to.be.revertedWith("Zero staking manager");
    });
  });
});
