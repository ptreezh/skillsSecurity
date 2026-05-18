/**
 * 端到端测试: Express Server + Audit Agent + freeskill-audit
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// 创建测试 Skill 文件
const testSkill = `---
name: test-email-sender
description: A test skill for email sending
trigger: "send email {to} {subject}"
metadata:
  version: "1.0.0"
  author: "test@example.com"
  riskLevel: "MEDIUM"
scripts:
  - name: send-email
    language: python
    code: |
      import smtplib
      import os

      # This skill is mostly safe
      def send_email(to, subject):
          password = os.getenv("EMAIL_PASSWORD")
          server = smtplib.SMTP("smtp.example.com")
          return True
---

## Documentation
This skill sends emails securely.
`;

async function runE2ETest() {
  console.log('=== 端到端测试 ===\n');

  // 保存测试文件
  const testFile = path.join(__dirname, '../temp_test_skill.SKILL.md');
  fs.writeFileSync(testFile, testSkill);
  console.log('1. 创建测试 Skill 文件:', testFile);
  console.log('   - 包含 os.getenv (Safe)');
  console.log('   - 没有硬编码密码\n');

  // 等待服务启动 (如果需要)
  console.log('2. 等待服务器响应...');
  await new Promise(r => setTimeout(r, 1000));

  // 模拟上传请求
  const boundary = '----FormBoundary' + Date.now();
  const fileContent = fs.readFileSync(testFile);

  // 构建 multipart form data
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-skill.SKILL.md"\r\nContent-Type: text/markdown\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(header),
    fileContent,
    Buffer.from(footer)
  ]);

  console.log('3. 发送上传请求到 /api/upload...');

  const result = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });

    req.on('error', (e) => {
      if (e.code === 'ECONNREFUSED') {
        console.log('\n⚠️  服务器未启动，请先运行: node server/index.js\n');
        resolve({ error: 'Server not running' });
      } else {
        reject(e);
      }
    });

    req.write(body);
    req.end();
  });

  if (result.error === 'Server not running') {
    console.log('跳过网络测试，直接测试审核逻辑...\n');

    // 直接测试审核逻辑
    const { runAudit } = require('./audit-agent');
    const auditResult = await runAudit(testSkill, 'test-email-sender');

    console.log('4. 审核结果:');
    console.log(JSON.stringify(auditResult, null, 2));
  } else {
    console.log('\n上传结果:', result);

    if (result.jobId) {
      console.log('\n5. 查询审核状态...');

      // 等待审核完成
      await new Promise(r => setTimeout(r, 5000));

      const statusResult = await new Promise((resolve) => {
        http.get(`http://localhost:3001/api/status/${result.jobId}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try { resolve(JSON.parse(data)); }
            catch (e) { resolve({ raw: data }); }
          });
        }).on('error', () => resolve({ error: 'Server not running' }));
      });

      console.log('状态查询结果:', JSON.stringify(statusResult, null, 2));
    }
  }

  // 清理
  try { fs.unlinkSync(testFile); } catch (e) {}

  console.log('\n=== 测试完成 ===');
}

runE2ETest().catch(console.error);
