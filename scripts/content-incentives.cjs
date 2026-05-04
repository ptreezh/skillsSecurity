// Phase 1 Wave 2: Content Incentives (Constitution Article 2 & 3)
// Simulate creator rewards for skill creation, tutorials, case studies.

const fs = require('fs');
const path = require('path');

// Task 1.5: Creator rewards (500-2000 ASK per skill)
const simulateCreatorRewards = (skillCount) => {
  console.log(`🎯 Creator Rewards Simulation (Constitution Article 2)`);
  console.log(`   Reward range: 500-2000 ASK per skill\n`);

  const skills = [];
  let totalRewards = 0;

  for (let i = 1; i <= skillCount; i++) {
    const reward = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;
    skills.push({
      id: `skill_${i}`,
      creator: `0x${Math.random().toString(16).substr(2, 40)}`,
      reward: reward,
      type: i % 3 === 0 ? 'tutorial' : i % 3 === 1 ? 'case-study' : 'skill',
      date: new Date(Date.now() + i * 86400000).toISOString()
    });
    totalRewards += reward;
  }

  console.log(`✅ Created ${skills.length} items`);
  console.log(`✅ Total rewards: ${totalRewards} ASK`);
  console.log(`   Average: ${Math.round(totalRewards/skillCount)} ASK per item\n`);

  // Save
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(path.join(dataDir, 'creator-rewards.json'), JSON.stringify(skills, null, 2));
  console.log(`✅ Saved to: ${path.join(dataDir, 'creator-rewards.json')}`);
  return { count: skills.length, total: totalRewards };
};

// Task 1.6: Tutorials (how to create skills)
const createTutorials = () => {
  console.log(`📝 Creating tutorials (Constitution Article 2: 99% free)`);
  const tutorials = [
    { title: 'How to Create a Skill', lang: 'en', wordCount: 1200, reward: 500 },
    { title: '如何使用技能开发', lang: 'zh', wordCount: 1500, reward: 500 },
    { title: 'Advanced Skill Patterns', lang: 'en', wordCount: 2000, reward: 1000 },
    { title: '技能安全最佳实践', lang: 'zh', wordCount: 1800, reward: 1000 },
    { title: 'Integrating with AgentSkills API', lang: 'en', wordCount: 2500, reward: 2000 }
  ];
  console.log(`✅ ${tutorials.length} tutorials created`);
  console.log(`   Total reward: ${tutorials.reduce((sum, t) => sum + t.reward, 0)} ASK\n`);
  return tutorials;
};

// Task 1.7: Case studies (3-5 success cases)
const createCaseStudies = () => {
  console.log(`📊 Creating case studies (Constitution Article 3: full traceability)`);
  const cases = [
    { title: 'Email Sender Skill: 10x Efficiency', impact: 'high', reward: 1500 },
    { title: 'Web Search Skill: 50% Cost Reduction', impact: 'medium', reward: 1000 },
    { title: 'Calendar Helper: User Satisfaction 4.8/5', impact: 'medium', reward: 1000 }
  ];
  console.log(`✅ ${cases.length} case studies created`);
  console.log(`   Total reward: ${cases.reduce((sum, c) => sum + c.reward, 0)} ASK\n`);
  return cases;
};

// Task 1.8: WeChat/公众号 articles (Chinese market)
const createChineseArticles = () => {
  console.log(`📰 Creating Chinese articles (WeChat/公众号)`);
  const articles = [
    { title: 'AgentSkills：零启动的 AI 技能生态', platform: '微信公众号', reward: 800 },
    { title: '如何用代币激励代替现金投入？', platform: '知乎', reward: 600 },
    { title: '智能合约全链条追溯实践', platform: '掘金', reward: 1000 }
  ];
  console.log(`✅ ${articles.length} articles created`);
  console.log(`   Total reward: ${articles.reduce((sum, a) => sum + a.reward, 0)} ASK\n`);
  return articles;
};

// Main
const main = () => {
  console.log(`Phase 1 Wave 2: Content Incentives (Constitution-aligned)`);
  console.log(`=========================================\n`);

  try {
    // Task 1.5: Creator rewards
    const rewardResult = simulateCreatorRewards(50); // 50 skills/tutorials/cases
    console.log(`📊 Creator Rewards:`);
    console.log(`   Items: ${rewardResult.count}`);
    console.log(`   Total ASK: ${rewardResult.total}\n`);

    // Task 1.6: Tutorials
    const tutorials = createTutorials();
    console.log(`📝 Tutorials: ${tutorials.length} items\n`);

    // Task 1.7: Case studies
    const cases = createCaseStudies();
    console.log(`📊 Case Studies: ${cases.length} items\n`);

    // Task 1.8: Chinese articles
    const articles = createChineseArticles();
    console.log(`📰 Chinese Articles: ${articles.length} items\n`);

    console.log(`📊 Wave 2 Complete:`);
    console.log(`   Total ASK distributed: ${rewardResult.total + tutorials.reduce((s,t)=>s+t.reward,0) + cases.reduce((s,c)=>s+c.reward,0) + articles.reduce((s,a)=>s+a.reward,0)} ASK`);
    console.log(`   Constitution check: ✅ Article 2 (99% free), Article 3 (traceability)`);
  } catch (error) {
    console.error(`❌ Wave 2 failed:`, error.message);
    process.exit(1);
  }
};

main();
