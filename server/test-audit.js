/**
 * 测试 freeskill-audit 审核逻辑
 */

const { spawn } = require('child_process');
const yaml = require('js-yaml');
const fs = require('fs');

// 读取 freeskill-audit 的代码
const content = fs.readFileSync('./skills/freeskill-audit.FREESKILL.md', 'utf-8');
const parsed = yaml.load(content);
const auditCode = parsed.scripts[0].code;

// 测试用的 skill 内容
const testSkill = `---
name: test-skill
description: A test skill for auditing
trigger: "do something {param}"
metadata:
  version: "1.0.0"
  author: "test@example.com"
  riskLevel: "MEDIUM"
scripts:
  - name: main
    language: python
    code: |
      import os
      import subprocess

      # This skill has some security issues for testing

      api_key = "sk-secret-12345678"

      def unsafe_function(user_input):
          eval(user_input)

      def another():
          os.system("ls")

      password = "hunter2"
---

## Documentation
This is a test skill.
`;

// 创建测试脚本
const testScript = `
import yaml
import json
import re

# === Inline audit functions ===

REQUIRED_BASE_FIELDS = ['name', 'description', 'trigger', 'metadata']
REQUIRED_METADATA_FIELDS = ['version', 'author', 'riskLevel']
VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

SECURITY_PATTERNS = [
    (r'eval', 'CRITICAL', 'Command injection: eval()'),
    (r'exec', 'CRITICAL', 'Command injection: exec()'),
    (r'os.system', 'CRITICAL', 'Command injection: os.system()'),
    (r'password', 'CRITICAL', 'Hardcoded password'),
    (r'api_key', 'CRITICAL', 'Hardcoded API key'),
]

def check_agentskills_base(skill_data):
    errors, warnings = [], []
    for field in REQUIRED_BASE_FIELDS:
        if field not in skill_data or not skill_data.get(field):
            errors.append(f"Missing required field: {field}")
    if 'metadata' in skill_data:
        for field in REQUIRED_METADATA_FIELDS:
            if field not in skill_data['metadata']:
                errors.append(f"Missing metadata.{field}")
        risk = skill_data.get('metadata', {}).get('riskLevel', '')
        if risk not in VALID_RISK_LEVELS:
            errors.append(f"Invalid riskLevel: {risk}")
    return {'passed': len(errors) == 0, 'errors': errors, 'warnings': warnings}

def check_security(skill_content):
    issues = []
    for pattern, severity, msg in SECURITY_PATTERNS:
        if re.search(pattern, skill_content):
            issues.append({'severity': severity, 'msg': msg})
    return {'passed': not any(i['severity'] == 'CRITICAL' for i in issues),
             'issues': issues}

# === Main execution ===

skill_content = """${testSkill.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""

# Parse YAML frontmatter
parts = skill_content.split('---')
if len(parts) >= 2:
    yaml_content = parts[1].split('---')[0] if '---' in parts[1] else parts[1]
    skill_data = yaml.safe_load(yaml_content)
else:
    skill_data = {}

# Run audits
tier1 = check_agentskills_base(skill_data)
tier2 = check_security(skill_content)

# Build result
result = {
    'passed': tier1['passed'] and tier2['passed'],
    'score': 100 - (len(tier1.get('errors', [])) + len(tier2.get('issues', []))) * 10,
    'tier1': tier1,
    'tier2': tier2,
    'overall': 'PASS' if (tier1['passed'] and tier2['passed']) else 'FAIL',
    'recommendation': 'approve' if tier2['passed'] else 'reject'
}

print(json.dumps(result, indent=2))
`;

async function runAudit() {
  console.log('=== freeskill-audit 测试 ===\n');

  // 保存测试脚本
  fs.writeFileSync('./temp_audit_test.py', testScript);
  console.log('测试 Skill 内容:');
  console.log('- name: test-skill');
  console.log('- 包含硬编码密码和 API key');
  console.log('- 包含 eval() 和 os.system()\n');

  // 运行测试
  return new Promise((resolve) => {
    const proc = spawn('py', ['-u', './temp_audit_test.py'], {
      shell: true,
      timeout: 30000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (stdout) {
        console.log('审核结果:');
        console.log(stdout);
      }
      if (stderr) {
        console.log('错误:');
        console.log(stderr);
      }

      // 清理
      try { fs.unlinkSync('./temp_audit_test.py'); } catch (e) {}

      resolve();
    });
  });
}

runAudit().catch(console.error);
