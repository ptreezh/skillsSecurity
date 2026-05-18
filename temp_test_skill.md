---
name: test-email-sender
description: Email sending skill for testing
trigger: "send email {to} {subject}"
metadata:
  version: "1.0.0"
  author: "test@example.com"
  riskLevel: "MEDIUM"
scripts:
  - name: send-email
    language: python
    code: |
      import yaml
      import sys

      # 模拟审核输入
      test_skill_content = """
      name: email-sender
      description: Send emails
      trigger: "send email {to}"
      metadata:
        version: "1.0"
        author: "test"
        riskLevel: "MEDIUM"
      """

      # 模拟审核逻辑
      issues = []
      warnings = []

      # Tier 1: 结构检查
      if 'name:' not in test_skill_content:
          issues.append({'tier': 1, 'severity': 'HIGH', 'msg': 'Missing name'})

      # Tier 2: 安全扫描
      if 'eval(' in test_skill_content:
          issues.append({'tier': 2, 'severity': 'CRITICAL', 'msg': 'eval() detected'})
      if 'os.system' in test_skill_content:
          issues.append({'tier': 2, 'severity': 'HIGH', 'msg': 'os.system detected'})

      # 生成报告
      result = {
          'passed': not any(i['severity'] in ['CRITICAL', 'HIGH'] for i in issues),
          'score': 100 - len(issues) * 10,
          'tier1': {'passed': True, 'score': 100, 'issues': []},
          'tier2': {'passed': len([i for i in issues if i['tier'] == 2]) == 0, 'score': 80, 'issues': [i for i in issues if i['tier'] == 2]},
          'tier3': {'passed': True, 'score': 100, 'issues': []},
          'tier4': {'passed': False, 'score': 50, 'issues': [{'severity': 'HIGH', 'msg': 'Missing FreeSkill governance fields'}]},
          'overall': 'PASS' if not any(i['severity'] in ['CRITICAL'] for i in issues) else 'FAIL',
          'recommendation': 'approve',
          'summary': 'Skill passes with warnings'
      }

      print(json.dumps(result))

      import json
      print(json.dumps(result))
