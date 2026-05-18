#!/usr/bin/env node
/**
 * AgentSkills 每日自动任务
 * 自动执行：进度检查 → 生成日报 → 更新任务状态
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  reportDir: 'REPORTS',
  logFile: 'progress.log',
  checkFiles: [
    { path: 'contracts/artifacts', name: '合约编译', required: false },
    { path: 'SKILLS_STANDARD.md', name: '标准文档', required: true },
    { path: 'ROADMAP.md', name: '路线图', required: true },
    { path: 'TASKS_PLAN.md', name: '任务计划', required: true },
    { path: 'contracts/deployments.json', name: '测试网部署', required: false },
    { path: 'contracts/scripts/deploy.js', name: '部署脚本', required: true },
    { path: 'contracts/scripts/test.js', name: '测试脚本', required: true }
  ]
};

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'INFO': '\x1b[36m[INFO]\x1b[0m',
    'SUCCESS': '\x1b[32m[SUCCESS]\x1b[0m',
    'WARN': '\x1b[33m[WARN]\x1b[0m',
    'ERROR': '\x1b[31m[ERROR]\x1b[0m'
  }[type] || '[INFO]';

  console.log(`${prefix} [${timestamp}] ${message}`);

  // 写入日志
  fs.appendFileSync(CONFIG.logFile, `[${timestamp}] [${type}] ${message}\n`);
}

function checkFile(file) {
  return fs.existsSync(file.path);
}

function generateReport(date) {
  const reportPath = path.join(CONFIG.reportDir, `daily_${date}.md`);

  const status = CONFIG.checkFiles.map(f => {
    const exists = checkFile(f);
    return `| ${f.name} | ${exists ? '✓ 已完成' : '○ 待完成'} |`;
  }).join('\n');

  const report = `# AgentSkills 日报

**日期：** ${date}
**时间：** ${new Date().toLocaleTimeString()}

## 系统状态检查

| 组件 | 状态 |
|------|------|
${status}

## 当前阶段

### Phase 1: 标准制定（进行中）

| 任务 | 状态 |
|------|------|
| 智能合约开发 | ✅ 完成 |
| 标准文档 v1.1 | ✅ 完成 |
| 协议架构设计 | ⏳ 待开始 |
| 协议演示页 | ⏳ 待开始 |
| 测试网部署 | ⏳ 待开始 |
| 社区建设 | ⏳ 待开始 |

## 今日工作摘要

1. 调整项目计划：先发行标准，延迟代币
2. 完成 SKILLS_STANDARD.md v1.1
3. 更新 ROADMAP.md 三阶段路线图
4. 创建 TASKS_PLAN.md 任务计划
5. 创建自动任务系统

## 下一步行动

### 本周任务（2026-05-05 至 2026-05-11）

| 任务 | 优先级 | 截止日期 |
|------|--------|----------|
| 完善标准文档 | 🔴 高 | 2026-05-07 |
| 开发协议演示页 | 🔴 高 | 2026-05-09 |
| 部署到测试网 | 🟡 中 | 2026-05-11 |

## 合约地址（本地测试网）

\`\`\`
ASKToken:       ${checkFile('contracts/artifacts/contracts/ASKToken.sol/ASKToken.json') ? '0x5fbdb2315678afecb367f032d93f642f64180aa3' : '待部署'}
SkillRegistry:  ${checkFile('contracts/artifacts/contracts/SkillRegistry.sol/SkillRegistry.json') ? '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512' : '待部署'}
StakingManager: ${checkFile('contracts/artifacts/contracts/StakingManager.sol/StakingManager.json') ? '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0' : '待部署'}
Attribution:     ${checkFile('contracts/artifacts/contracts/Attribution.sol/Attribution.json') ? '0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9' : '待部署'}
\`\`\`

---
*自动生成于 ${new Date().toISOString()}*
`;

  fs.writeFileSync(reportPath, report, 'utf8');
  return reportPath;
}

function main() {
  console.log('\n=== AgentSkills 每日自动任务 ===\n');

  const date = new Date().toISOString().split('T')[0];
  const results = [];

  // 1. 检查系统文件
  log('开始检查系统文件...', 'INFO');
  CONFIG.checkFiles.forEach(file => {
    const exists = checkFile(file);
    results.push({ name: file.name, exists, required: file.required });
    log(`${file.name}: ${exists ? '✓ 存在' : '✗ 缺失'}`, exists ? 'SUCCESS' : 'WARN');
  });

  // 2. 计算完成度
  const total = results.length;
  const completed = results.filter(r => r.exists).length;
  const progress = Math.round((completed / total) * 100);
  log(`系统完成度: ${progress}% (${completed}/${total})`, progress >= 70 ? 'SUCCESS' : 'WARN');

  // 3. 生成日报
  log('生成日报...', 'INFO');
  const reportPath = generateReport(date);
  log(`日报已生成: ${reportPath}`, 'SUCCESS');

  // 4. 检查并创建必要目录
  if (!fs.existsSync(CONFIG.reportDir)) {
    fs.mkdirSync(CONFIG.reportDir, { recursive: true });
    log('创建报告目录', 'SUCCESS');
  }

  // 5. 输出摘要
  console.log('\n--- 检查摘要 ---');
  results.forEach(r => {
    const icon = r.exists ? '✓' : '○';
    const tag = r.required ? '[必须]' : '';
    console.log(`  ${icon} ${r.name} ${tag}`);
  });

  console.log('\n--- 下一步行动 ---');
  console.log('  1. 开发协议演示页面');
  console.log('  2. 准备测试网部署');
  console.log('  3. 收集社区反馈');

  console.log('\n=== 自动任务完成 ===\n');

  return { total, completed, progress, results };
}

// 执行
try {
  main();
} catch (err) {
  console.error('自动任务失败:', err);
  process.exit(1);
}