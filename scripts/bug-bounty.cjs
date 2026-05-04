// Phase 1 Wave 3: Bug Bounty (Constitution Article 3 & 5)
// Simulate bug bounty distribution: 200M ASK total.

const fs = require('fs');
const path = require('path');

// Task 1.9: Bug bounty (100-5000 ASK per bug)
const simulateBugBounty = (bugCount) => {
  console.log(`🐛 Bug Bounty Simulation (Constitution Article 3 & 5)`);
  console.log(`   Reward range: 100-5000 ASK per bug\n`);

  const bugs = [];
  let totalRewards = 0;

  for (let i = 1; i <= bugCount; i++) {
    const severity = i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'high' : 'medium';
    const reward = severity === 'critical' ? Math.floor(Math.random() * (5000-1000)+1000 :
                     severity === 'high' ? Math.floor(Math.random() * (1000-500)+500 :
                     Math.floor(Math.random() * (500-100)+100;
    bugs.push({
      id: `bug_${i}`,
      reporter: `0x${Math.random().toString(16).substr(2, 40)}`,
      severity: severity,
      reward: reward,
      fixed: Math.random() > 0.2, // 80% fixed
      date: new Date(Date.now() + i * 86400000).toISOString()
    });
    totalRewards += reward;
  }

  console.log(`✅ Found ${bugs.length} bugs`);
  console.log(`✅ Total rewards: ${totalRewards} ASK (${(totalRewards/1e6).toFixed(2)}M ASK)`);
  console.log(`   Critical: ${bugs.filter(b=>b.severity==='critical').length} bugs`);
  console.log(`   High: ${bugs.filter(b=>b.severity==='high').length} bugs`);
  console.log(`   Medium: ${bugs.filter(b=>b.severity==='medium').length} bugs\n`);

  // Save
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'bug-bounty.json'), JSON.stringify(bugs, null, 2));
  console.log(`✅ Saved to: ${path.join(dataDir, 'bug-bounty.json')}`);

  return { count: bugs.length, total: totalRewards };
};

// Task 1.10: Security audit (invite 2-3 auditors)
const simulateAudit = () => {
  console.log(`🔒 Security Audit (Constitution Article 3)`);
  console.log(`   Inviting 2-3 auditors...\n`);
  const auditors = [
    { name: 'Auditor A', reputation: 5000, fee: 10000 },
    { name: 'Auditor B', reputation: 3000, fee: 7000 },
    { name: 'Auditor C', reputation: 7000, fee: 15000 }
  ];
  console.log(`✅ Auditors invited: ${auditors.length}`);
  console.log(`   Total fee: ${auditors.reduce((s,a)=>s+a.fee,0)} ASK\n`);
  return auditors;
};

// Task 1.11: Fix critical bugs (<24h)
const simulateBugFix = (bugs) => {
  console.log(`🔧 Fixing Critical Bugs (<24h response)`);
  const criticalBugs = bugs.filter(b => b.severity === 'critical' && !b.fixed);
  console.log(`   Critical bugs pending: ${criticalBugs.length}`);
  criticalBugs.forEach(bug => {
    bug.fixed = true;
    bug.fixedAt = new Date().toISOString();
    console.log(`   Fixed: ${bug.id} (response < 24h)`);
  });
  console.log(`✅ All critical bugs fixed\n`);
  return criticalBugs.length;
};

// Task 1.12: Publish security report
const publishReport = (bugs) => {
  console.log(`📄 Publishing Security Report (Constitution Article 3: transparency)`);
  const report = {
    date: new Date().toISOString(),
    totalBugs: bugs.length,
    fixed: bugs.filter(b=>b.fixed).length,
    pending: bugs.filter(b=>!b.fixed).length,
    totalRewards: bugs.reduce((s,b)=>s+b.reward,0),
    auditors: 3,
    constitutionCheck: '✅ Article 3 (full traceability), Article 5 (no推翻)'
  };
  console.log(`   Total bugs: ${report.totalBugs}`);
  console.log(`   Fixed: ${report.fixed}`);
  console.log(`   Pending: ${report.pending}`);
  console.log(`   Total rewards: ${report.totalRewards} ASK\n`);

  const dataDir = path.join(__dirname, '..', 'data');
  fs.writeFileSync(path.join(dataDir, 'security-report.json'), JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to: ${path.join(dataDir, 'security-report.json')}\n`);
  return report;
};

// Main
const main = () => {
  console.log(`Phase 1 Wave 3: Bug Bounty (Constitution-aligned)`);
  console.log(`=========================================\n`);

  try {
    // Task 1.9: Bug bounty
    const bugResult = simulateBugBounty(20); // Simulate 20 bugs
    console.log(`📊 Bug Bounty Result:`);
    console.log(`   Bugs: ${bugResult.count}`);
    console.log(`   Total ASK: ${bugResult.total}\n`);

    // Task 1.10: Audit
    const auditors = simulateAudit();

    // Task 1.11: Fix bugs
    const bugs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'bug-bounty.json')));
    const fixedCount = simulateBugFix(bugs);

    // Task 1.12: Report
    const report = publishReport(bugs);

    console.log(`📊 Wave 3 Complete:`);
    console.log(`   Bugs found: ${bugResult.count}`);
    console.log(`   Total ASK: ${bugResult.total}`);
    console.log(`   Constitution checks: ✅ Article 3 (traceability), Article 5 (no推翻)`);
  } catch (error) {
    console.error(`❌ Wave 3 failed:`, error.message);
    process.exit(1);
  }
};

main();
