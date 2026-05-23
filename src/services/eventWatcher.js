/**
 * EventWatcher - Contract event monitoring service
 * Phase 25: Product Completion
 */

const { ethers } = require('ethers');

class EventWatcher {
  constructor(contracts, provider) {
    this.contracts = contracts;
    this.provider = provider;
    this.filters = this.createFilters();
    this.handlers = this.createHandlers();
    this.activeListeners = [];
  }

  createFilters() {
    const stakingManager = this.contracts.stakingManager;
    const skillRegistry = this.contracts.skillRegistry;
    const attribution = this.contracts.attribution;

    const filters = {};

    if (stakingManager) {
      filters.Staked = stakingManager.filters.Staked();
      filters.Unstaked = stakingManager.filters.Unstaked();
      filters.Slash = stakingManager.filters.Slash();
      filters.AntiSlash = stakingManager.filters.AntiSlash();
      filters.ReputationLocked = stakingManager.filters.ReputationLocked();
      filters.RecoveryClaimed = stakingManager.filters.RecoveryClaimed();
      filters.PositiveContributionSet = stakingManager.filters.PositiveContributionSet();
    }

    if (skillRegistry) {
      filters.SkillRegistered = skillRegistry.filters.SkillRegistered();
      filters.SkillVerified = skillRegistry.filters.SkillVerified();
      filters.SkillSlashed = skillRegistry.filters.SkillSlashed();
    }

    if (attribution) {
      filters.SkillLiked = attribution.filters.SkillLiked();
      filters.ContributionAdded = attribution.filters.ContributionAdded();
      filters.TestReportAdded = attribution.filters.TestReportAdded();
    }

    return filters;
  }

  createHandlers() {
    return {
      Staked: async (user, skillId, amount, event) => {
        console.log(`[Stake] ${user} staked ${amount} on skill #${skillId}`);
      },
      Unstaked: async (user, skillId, amount, event) => {
        console.log(`[Unstake] ${user} unstaked ${amount} from skill #${skillId}`);
      },
      Slash: async (user, amount, skillId, event) => {
        console.log(`[Slash] ${user} slashed ${amount} on skill #${skillId}`);
        if (this.alertCallback) {
          await this.alertCallback('SLASH', `User ${user} slashed ${amount}`, 'HIGH');
        }
      },
      AntiSlash: async (user, penalty, event) => {
        console.log(`[AntiSlash] ${user} penalized ${penalty}`);
        if (this.alertCallback) {
          await this.alertCallback('ANTI_SLASH', `User ${user} penalized ${penalty}`, 'MEDIUM');
        }
      },
      SkillRegistered: async (owner, skillId, name, event) => {
        console.log(`[SkillReg] ${name} registered by ${owner} (#${skillId})`);
      },
      SkillVerified: async (skillId, verifier, event) => {
        console.log(`[SkillVerify] Skill #${skillId} verified by ${verifier}`);
      },
      SkillSlashed: async (skillId, amount, event) => {
        console.log(`[SkillSlash] Skill #${skillId} slashed ${amount}`);
      },
      SkillLiked: async (user, skillId, event) => {
        console.log(`[Like] ${user} liked skill #${skillId}`);
      },
      ReputationLocked: async (user, amount, event) => {
        console.log(`[RepLock] ${user} locked ${amount} reputation`);
      },
      RecoveryClaimed: async (user, amount, event) => {
        console.log(`[Recovery] ${user} claimed ${amount} reputation`);
      },
      ContributionAdded: async (skillId, contributor, event) => {
        console.log(`[Contribution] ${contributor} added to skill #${skillId}`);
      },
      TestReportAdded: async (skillId, reporter, severity, event) => {
        console.log(`[TestReport] ${reporter} reported on skill #${skillId} (severity: ${severity})`);
      }
    };
  }

  async start() {
    for (const [name, filter] of Object.entries(this.filters)) {
      const contract = this.getContractForFilter(name);
      if (!contract) continue;

      const handler = this.handlers[name];
      if (!handler) continue;

      const listener = (...args) => {
        // Event is last argument
        const event = args[args.length - 1];
        const parsedArgs = this.parseEventArgs(filter, args);
        handler(...Object.values(parsedArgs), event);
      };

      contract.on(filter, listener);
      this.activeListeners.push({ contract, filter, listener });
      console.log(`[EventWatcher] Listening for ${name}`);
    }
    console.log('[EventWatcher] Started');
  }

  getContractForFilter(filterName) {
    if (this.contracts.stakingManager) {
      const stakingEvents = ['Staked', 'Unstaked', 'Slash', 'AntiSlash', 'ReputationLocked', 'RecoveryClaimed', 'PositiveContributionSet'];
      if (stakingEvents.includes(filterName)) return this.contracts.stakingManager;
    }
    if (this.contracts.skillRegistry) {
      const skillEvents = ['SkillRegistered', 'SkillVerified', 'SkillSlashed'];
      if (skillEvents.includes(filterName)) return this.contracts.skillRegistry;
    }
    if (this.contracts.attribution) {
      const attrEvents = ['SkillLiked', 'ContributionAdded', 'TestReportAdded'];
      if (attrEvents.includes(filterName)) return this.contracts.attribution;
    }
    return null;
  }

  parseEventArgs(filter, args) {
    // Remove event from args
    const event = args.pop();
    const result = {};

    // Map indexed and non-indexed args based on filter
    if (event.args) {
      const keys = Object.keys(event.args);
      keys.forEach((key, index) => {
        result[key] = event.args[key];
      });
    }

    return result;
  }

  async stop() {
    for (const { contract, filter, listener } of this.activeListeners) {
      contract.removeListener(filter, listener);
    }
    this.activeListeners = [];
    console.log('[EventWatcher] Stopped');
  }

  setAlertCallback(callback) {
    this.alertCallback = callback;
  }
}

module.exports = { EventWatcher };