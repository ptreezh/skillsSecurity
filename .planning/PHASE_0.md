# GSD Phase 0: 产品验证（0-3月）

**依据宪法：** CONSTITUTION.md（零启动原则）  
**开始日期：** 2026-05-04  
**截止日期：** 2026-08-04  
**预算上限：** $500（宪法第一条）  

---

## Wave 1: 智能合约开发（并行，Month 1）

### Task 0.1: ASKToken 基础合约
- **描述：** 部署 ERC20 代币，测试网铸造 600M ASK
- **宪法对齐：** 第一条（零启动，代币代替现金）
- **依赖：** 无
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Create ASKToken.sol based on B-technical-implementation.md §2.1. Deploy to Polygon Mumbai testnet. Mint 600M to treasury. Verify: totalSupply=1B, treasury balance=600M. Cost: $0 (testnet).")`
- **验证：** `npx hardhat test test/ASKToken.js — 覆盖率 ≥ 80%`
- **交付物：** `contracts/ASKToken.sol`, 测试网地址

### Task 0.2: SkillRegistry 扩展（增加指纹）
- **描述：** 扩展 SkillRegistry，增加 `bytes32 fingerprint` 字段（keccak256）
- **宪法对齐：** 第三条（全链条追溯）
- **依赖：** Task 0.1 完成
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Extend SkillRegistry.sol (B-technical-implementation.md §2.2) to add: bytes32 fingerprint field, function computeFingerprint(string _ipfsHash, address _creator, uint256 _timestamp) returns (bytes32). Emit event FingerprintGenerated(skillId, fingerprint). Verify: fingerprint stored on-chain.")`
- **验证：** `npx hardhat test test/SkillRegistry.js`
- **交付物：** 更新后的 `contracts/SkillRegistry.sol`

### Task 0.3: Attribution 扩展（增加测试/点赞）
- **描述：** 扩展 Attribution 合约，增加测试记录和点赞机制
- **宪法对齐：** 第三条（测试积分 + 反噬机制）
- **依赖：** Task 0.2 完成
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Extend Attribution.sol (B-technical-implementation.md §2.3) to add: 1) Test report struct (reporter, severity, score), 2) Like struct (user, skillId, timestamp), 3) Function likeSkill(uint256 skillId) with slash penalty if skill.flagged. Verify: test reports stored, likes tracked, anti-slashing works.")`
- **验证：** `npx hardhat test test/Attribution.js`
- **交付物：** 更新后的 `contracts/Attribution.sol`

### Task 0.4: StakingManager 扩展（增加反噬）
- **描述：** 扩展 StakingManager，增加点赞反噬机制
- **宪法对齐：** 第三条（反噬机制）
- **依赖：** Task 0.3 完成
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Extend StakingManager.sol (B-technical-implementation.md §2.4) to add: 1) Function slashLiker(address liker, int256 penalty) for anti-slashing, 2) Event AntiSlash(liker, penalty, reason). Verify: slashing reduces reputation, emit event.")`
- **验证：** `npx hardhat test test/StakingManager.js`
- **交付物：** 更新后的 `contracts/StakingManager.sol`

---

## Wave 2: 前端 MVP 开发（并行，Month 2）

### Task 0.5: 技能浏览器（搜索/排序/详情）
- **描述：** React/Vue 前端，展示技能列表、搜索、按声誉排序
- **宪法对齐：** 第二条（用户优先，99% 免费）
- **依赖：** 无（独立前端）
- **执行：** `task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=true, prompt="Build skill browser UI (React/Vue): 1) Skill list with search/filter, 2) Sort by reputation (from SkillRegistry), 3) Skill detail page with fingerprint display, 4) Like button (5/day free, anti-slash check). Use embedded wallet (no user friction). Cost: $0 (local dev). Verify: can search, sort, like (limited).")`
- **验证：** 浏览器访问 localhost:3000，手动测试搜索/排序/点赞
- **交付物：** `frontend/src/components/SkillBrowser.jsx`

### Task 0.6: 嵌入式钱包集成
- **描述：** 集成嵌入式钱包，用户无感知注册
- **宪法对齐：** 第二条（低摩擦参与）
- **依赖：** Task 0.5 完成
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Integrate embedded wallet (e.g., WalletConnect, Magic.link): 1) Auto-generate on registration (private key encrypted locally), 2) User signs transactions in background (no popup), 3) Gas paid by platform (from treasury). Verify: user can register with email only, sign tx automatically.")`
- **验证：** 注册新用户 → 自动生成钱包 → 签名交易无感知
- **交付物：** `frontend/src/services/WalletService.js`

### Task 0.7: 用户声誉页面
- **描述：** 用户 Profile 页面，显示声誉积分/排行榜位置
- **宪法对齐：** 第二条（渐进变现，声誉 ≥ 1000 才可变现）
- **依赖：** Task 0.5 完成
- **执行：** `task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=true, prompt="Build user reputation page: 1) Display user's reputation points (non-transferable), 2) Global ranking position (like GitHub stars), 3) Level indicator (L1-L4 based on CONSTITUTION.md §2.1), 4) Vesting progress bar (reputation ≥ 1000 unlocks 30% cashout). Verify: shows correct rep, ranking, level.")`
- **验证：** 访问用户页面，检查声誉/排名/等级显示
- **交付物：** `frontend/src/pages/UserProfile.jsx`

### Task 0.8: 全球排行榜页面
- **描述：** 全球声誉排行榜，类似 GitHub Trending
- **宪法对齐：** 第三条（声誉优先排序）
- **依赖：** Task 0.5 完成
- **执行：** `task(category="visual-engineering", load_skills=["frontend-ui-ux"], run_in_background=true, prompt="Build global leaderboard page: 1) Sort all users by reputation (top 1000), 2) Filter by category (creator/auditor/tester), 3) Highlight top 50 with 'Featured' badge (traffic skew), 4) Real-time update on new reputation events. Verify: shows top users, filters work, real-time update.")`
- **验证：** 访问排行榜页面，检查排序/筛选/实时更新
- **交付物：** `frontend/src/pages/Leaderboard.jsx`

---

## Wave 3: 种子技能 + 测试网部署（并行，Month 3）

### Task 0.9: 创建 10 个种子技能
- **描述：** 自己创建 10 个基础技能（邮件/日历/搜索等）
- **宪法对齐：** 第一条（代币激励代替现金）
- **依赖：** Task 0.2 完成（SkillRegistry 有指纹）
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Create 10 seed skills (email-sender, calendar-helper, web-search, etc.) following AgentSkills.io spec: 1) Write SKILL.md for each (name, description, trigger, metadata), 2) Upload to IPFS (get QmHash), 3) Register on-chain via SkillRegistry (pay gas ~$0.01), 4) Verify: 10 skills listed on-chain with fingerprints. Reward: 500 ASK each (from Content Rewards pool).")`
- **验证：** `npx hardhat run scripts/check-seeds.js` → 10 skills registered
- **交付物：** `skills/ （10 个 SKILL.md + IPFS 哈希）`

### Task 0.10: 部署至 Polygon Mumbai 测试网
- **描述：** 部署所有合约到测试网
- **宪法对齐：** 第五条（现实可行，测试网免费）
- **依赖：** Wave 1 全部完成
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Deploy all contracts to Polygon Mumbai testnet: 1) ASKToken (mint 600M), 2) SkillRegistry, 3) Attribution, 4) StakingManager. Use Hardhat (B-technical-implementation.md §3.1). Verify: all contracts deployed, treasury balance=600M ASK. Cost: ~$0 (testnet gas).")`
- **验证：** `npx hardhat run scripts/verify-deployment.js` → 所有合约地址打印
- **交付物：** `deployments/mumbai.json`

### Task 0.11: 创建 Twitter/Discord 社区
- **描述：** 社交媒体账号 + 社区运营
- **宪法对齐：** 第一条（$100 推广预算）
- **依赖：** 无（独立运营）
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Setup community: 1) Create Twitter account (@AgentSkills), 2) Create Discord server (invite link), 3) Write 5 promotional posts (Chinese + English), 4) Post to Reddit/technical communities. Budget: $100 (from CONSTITUTION.md budget). Verify: Twitter has 100+ followers, Discord has 50+ members.")`
- **验证：** 检查 Twitter 粉丝数 ≥ 100，Discord 成员 ≥ 50
- **交付物：** Twitter/Discord 账号 + 5 篇宣传文案

### Task 0.12: 招募 100+ 测试用户
- **描述：** Airdrop 活动，送 100 ASK 给每个新用户
- **宪法对齐：** 第一条（Airdrop 200M ASK 激励）
- **依赖：** Task 0.11 完成（社区已建立）
- **执行：** `task(category="quick", load_skills=[], run_in_background=true, prompt="Launch Airdrop: 1) Tweet: 'Get 100 ASK free!' with Discord link, 2) User registers → auto-receive 100 ASK (from Airdrop pool), 3) Track: 100+ users registered within 2 weeks, 4) Verify: user balances show 100 ASK. Cost: 10,000 ASK (from 200M pool).")`
- **验证：** `npx hardhat run scripts/check-users.js` → 100+ 用户注册，余额 = 100 ASK
- **交付物：** 用户列表 + Airdrop 交易哈希

---

## 完成标准（Phase 0）

✅ MVP 可运行（测试网）  
✅ 10+ 个种子技能上架  
✅ 100+ 注册用户  
✅ 1,000+ 技能调用次数  
✅ 用户满意度 ≥ 70%  
✅ 现金投入 ≤ $500  

---

## 鞭策检查机制（宪法第七条）

### 每周一 09:00 自动检查

```bash
# check-progress.sh (cron job)
#!/bin/bash
PHASE="0"
TOTAL=$(grep -c "\[ \]" .planning/PHASE_0.md)
DONE=$(grep -c "\[x\]" .planning/PHASE_0.md)
PROGRESS=$(echo "scale=2; $DONE / $TOTAL * 100" | bc)

echo "Phase $PHASE Progress: $PROGRESS% ($DONE/$TOTAL)"

if (( $(echo "$PROGRESS < 80" | bc -l) )); then
    echo "⚠️ 警告：进度 < 80%，加速开发！"
    # 发送 Discord 通知
fi

if (( $(echo "$PROGRESS < 60" | bc -l) )); then
    echo "🚨 严重警告：进度 < 60%，砍掉非核心功能！"
fi

if (( $(echo "$PROGRESS < 40" | bc -l) )); then
    echo "❌ 失败：进度 < 40%，重新评估宪法可行性！"
    exit 1
fi
```

---

## 并行执行图（Worktree 风格）

```
Wave 1 (Month 1) - 并行 4 个 agents:
├── Task 0.1: ASKToken → task(category="quick", ...)
├── Task 0.2: SkillRegistry → task(category="quick", ...)
├── Task 0.3: Attribution → task(category="quick", ...)
└── Task 0.4: StakingManager → task(category="quick", ...)

Wave 2 (Month 2) - 并行 4 个 agents:
├── Task 0.5: SkillBrowser → task(category="visual-engineering", ...)
├── Task 0.6: Wallet → task(category="quick", ...)
├── Task 0.7: UserProfile → task(category="visual-engineering", ...)
└── Task 0.8: Leaderboard → task(category="visual-engineering", ...)

Wave 3 (Month 3) - 并行 4 个 agents:
├── Task 0.9: Seed Skills → task(category="quick", ...)
├── Task 0.10: Deploy → task(category="quick", ...)
├── Task 0.11: Community → task(category="quick", ...)
└── Task 0.12: Airdrop → task(category="quick", ...)
```

---

*本计划严格对齐 CONSTITUTION.md，预算 ≤ $500，零融资，代币激励代替现金。*
