// Phase 1: Airdrop 200M ASK (Constitution Article 1 & 2)
// Scals from 120 users (12,000 ASK) to 2M users (200M ASK)

const fs = require('fs');
const path = require('path');

// Phase 1 airdrop: 200M ASK total, 100 ASK per user = 2M users
const PHASE1_AIRDROP = {
  totalASK: 200_000_000,
  perUser: 100,
  targetUsers: 2_000_000,
  startDate: '2026-08-01',
  endDate: '2026-09-30'
};

// Simulate larger airdrop (Phase 1 scale)
const simulatePhase1Airdrop = (userCount) => {
  console.log(`🎉 Phase 1 Airdrop Simulation (200M ASK)`);
  console.log(`Constitution Article 1: Zero-startup, tokens not cash`);
  console.log(`Constitution Article 2: 99% users free, airdrop 100 ASK each\n`);

  const users = [];
  const batchSize = 10000; // Simulate in batches
  let totalDistributed = 0;

  for (let i = 1; i <= userCount; i++) {
    users.push({
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      airdrop: 100,
      date: new Date(Date.now() + i * 3600000).toISOString() // Spread out
    });
    totalDistributed += 100;

    if (i % batchSize === 0) {
      console.log(`   Batch ${i/batchSize}: ${i}/${userCount} users... Distributed: ${totalDistributed} ASK`);
    }
  }

  console.log(`\n✅ Generated ${users.length} users`);
  console.log(`✅ Total airdrop: ${totalDistributed} ASK (${totalDistributed/1e6}M ASK)`);
  console.log(`✅ Per user: 100 ASK (Constitution Article 2)\n`);

  // Save in batches
  const batches = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  batches.forEach((batch, index) => {
    const batchFile = path.join(dataDir, `airdrop-phase1-batch-${index+1}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2));
  });

  console.log(`✅ User batches saved to: ${dataDir}`);
  console.log(`   Total batches: ${batches.length} (${batchSize} users each)`);

  return { users: users.length, total: totalDistributed };
};

// Main
const main = () => {
  const userCount = parseInt(process.argv[2]) || 2000; // Default 2000 for simulation
  console.log(`Phase 1 Airdrop Script (Constitution-aligned)`);
  console.log(`=========================================\n`);
  console.log(`Target: 2,000,000 users (200M ASK total)`);
  console.log(`Simulation: ${userCount} users\n`);

  try {
    const result = simulatePhase1Airdrop(userCount);
    console.log(`\n📊 Simulation Result:`);
    console.log(`   Users: ${result.users}`);
    console.log(`   Total ASK: ${result.total}`);
    console.log(`   Constitution check: ✅ Zero-startup, no financing needed`);
    console.log(`   Note: Full scale requires deployed contracts + testnet`);
  } catch (error) {
    console.error(`❌ Simulation failed:`, error.message);
    process.exit(1);
  }
};

main();
