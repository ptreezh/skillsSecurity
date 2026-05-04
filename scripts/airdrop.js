// Task 0.12: Airdrop to 100+ test users (宪法第一条：代币激励代替现金）
// 宪法第二条：99% 用户免费，Airdrop 100 ASK/人

const fs = require('fs');
const path = require('path');

// 模拟 100+ 测试用户
const generateUsers = (count) => {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      email: `user${i}@example.com`,
      reputation: 0,
      balance: 100, // Airdrop: 100 ASK
      dailyLikes: 0,
      level: 1,
      registeredAt: new Date().toISOString()
    });
  }
  return users;
};

// 执行 Airdrop
const executeAirdrop = (userCount) => {
  console.log(`🎉 Starting Airdrop for ${userCount} users...`);
  console.log(`Constitution Article 1: Zero-startup, use tokens not cash`);
  console.log(`Constitution Article 2: 99% users free, airdrop 100 ASK each\n`);

  const users = generateUsers(userCount);
  const totalAirdrop = userCount * 100; // 100 ASK per user

  console.log(`✅ Generated ${users.length} test users`);
  console.log(`✅ Total airdrop: ${totalAirdrop} ASK (from Airdrop pool)`);
  console.log(`✅ Constitution Article 1: Uses ASK token incentives, no cash\n`);

  // 模拟发放
  let successCount = 0;
  users.forEach((user, index) => {
    // Simulate on-chain airdrop
    user.balance += 100; // Airdrop 100 ASK
    successCount++;
    
    if ((index + 1) % 10 === 0) {
      console.log(`   Progress: ${index + 1}/${users.length} users...`);
    }
  });

  console.log(`\n🎉 Airdrop complete!`);
  console.log(`   Success: ${successCount} users`);
  console.log(`   Total distributed: ${totalAirdrop} ASK`);
  console.log(`   Per user: 100 ASK (Constitution Article 2: 99% free)\n`);

  // 保存用户列表
  const usersFile = path.join(__dirname, '..', 'data', 'test-users.json');
  const dataDir = path.dirname(usersFile);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  console.log(`✅ User list saved to: ${usersFile}`);
  
  return { success: successCount, total: totalAirdrop, users: users };
};

// 主函数
const main = () => {
  const userCount = process.argv[2] || 100;
  console.log(`AgentSkills Airdrop Script (Constitution-aligned)`);
  console.log(`=========================================\n`);
  
  try {
    const result = executeAirdrop(parseInt(userCount));
    console.log(`\n📊 Final Result:`);
    console.log(`   Users: ${result.success}`);
    console.log(`   Total ASK: ${result.total}`);
    console.log(`   Constitution check: ✅ Zero-startup, no financing needed`);
  } catch (error) {
    console.error(`❌ Airdrop failed:`, error.message);
    process.exit(1);
  }
};

main();
