---
name: freeskill-submit
description: Submit your skill to FreeSkill platform - audit, optimize, upgrade, and register on-chain
trigger: "submit skill {skill_file} to freeskill with author {author_address}"
metadata:
  version: "1.0.0"
  author: "FreeAgentSkills"
  tags: ["freeskill", "submit", "audit", "upgrade", "chain", "meta"]
  riskLevel: "HIGH"
  standard: "freeskill"
  stakeRequired: 100
  attestationCount: 3
dependencies:
  - freeskill-audit
  - freeskill-upgrade
scripts:
  - name: "submit-to-freeskill"
    language: "python"
    code: |
      """
      freeskill-submit: Submit skill to FreeSkill platform

      This meta-skill orchestrates the complete submission flow:
      1. Audit - Security check with freeskill-audit patterns
      2. Optimize - Suggest improvements based on audit results
      3. Upgrade - Transform to FreeSkill standard format
      4. Register - Prepare on-chain registration data

      Input: .SKILL.md or .FREESKILL.md file + author_address
      Output: Submission status + on-chain data ready for registration

      Usage in Claude Code:
        /submit skill my-skill.SKILL.md to freeskill with author 0x123...

      Args:
          skill_file: Path to .SKILL.md or .FREESKILL.md file
          author_address: Wallet address (0x...) for on-chain registration

      Returns:
          dict with:
            - status: "ready" | "needs_fix" | "audit_failed"
            - audit_result: Security audit output
            - optimized_skill: Improved version (if applicable)
            - freeskill_data: Upgraded .FREESKILL.md content
            - chain_data: Data ready for on-chain registration
            - suggestions: List of improvement suggestions
      """

      import hashlib
      import json
      import re
      import os
      import time

      # Audit patterns from freeskill-audit
      SECURITY_PATTERNS = [
          # CRITICAL: Command injection
          (r'eval\s*\(', 'Command injection: eval()'),
          (r'exec\s*\(', 'Command injection: exec()'),
          (r'os\.system\s*\(', 'Command injection: os.system()'),
          (r'subprocess\.\w+\s*\([^)]*shell\s*=\s*True', 'Shell injection: shell=True'),

          # CRITICAL: Hardcoded secrets
          (r'password\s*=\s*["\'][^\'\"]{3,50}["\']', 'Hardcoded password detected'),
          (r'api[_-]?key\s*=\s*["\'][A-Za-z0-9]{16,}["\']', 'Hardcoded API key detected'),
          (r'secret[_-]?key\s*=\s*["\'][^\'\"]{8,}["\']', 'Hardcoded secret key detected'),
          (r'-----BEGIN.*PRIVATE KEY-----', 'Private key detected in code'),

          # CRITICAL: Unsafe deserialization
          (r'pickle\.loads?\s*\(', 'Unsafe deserialization: pickle'),
          (r'yaml\.load\s*\([^)]*(?<!Safe)', 'Unsafe YAML deserialization'),

          # HIGH: Malicious downloads
          (r'http[s]?://[^\s]+\.(exe|bat|cmd|vbs|ps1)', 'Suspicious download: executable file'),
          (r'curl\s+.*http[s]?://', 'External download: curl'),
          (r'wget\s+.*http[s]?://', 'External download: wget'),

          # HIGH: Advertising/Tracking
          (r'googleadservices\.com|doubleclick\.net', 'Advertising tracker detected'),
          (r'facebook\.com.*pixel|fbq\s*\(', 'Facebook tracking pixel'),
      ]

      # Recommended patterns for skill quality
      QUALITY_PATTERNS = {
          'env_var': (r'os\.getenv|os\.environ\.get', 15, 'Uses environment variables'),
          'timeout': (r'timeout\s*=\s*[0-9]+', 10, 'Has timeout settings'),
          'error_handling': (r'try\s*:|except\s*:', 10, 'Has error handling'),
          'temp_file': (r'tempfile\.|NamedTemporaryFile', 5, 'Uses temp files properly'),
          'pure_local': (r'^(?!.*(?:requests|urllib|wget|curl|fetch))', 20, 'Pure local computation'),
      }

      def submit_skill(skill_file_path, author_address):
          """
          Complete submission pipeline for FreeSkill platform

          Args:
              skill_file_path: Path to skill file (.SKILL.md or .FREESKILL.md)
              author_address: Wallet address for on-chain registration

          Returns:
              Submission result dict
          """
          # Step 1: Read and parse skill file
          if not os.path.exists(skill_file_path):
              return {
                  'status': 'error',
                  'message': f'File not found: {skill_file_path}',
                  'audit_result': None,
                  'suggestions': []
              }

          with open(skill_file_path, 'r', encoding='utf-8') as f:
              skill_content = f.read()

          # Step 2: Run security audit
          audit_result = audit_skill(skill_content)

          # Step 3: Check if ready for submission
          if audit_result['critical_count'] > 0:
              return {
                  'status': 'audit_failed',
                  'message': f"Found {audit_result['critical_count']} critical security issue(s). Fix before submitting.",
                  'audit_result': audit_result,
                  'suggestions': audit_result['suggestions']
              }

          # Step 4: Calculate independence score
          indep_score = calculate_independence_score(skill_content)

          # Step 5: Generate optimization suggestions
          suggestions = generate_suggestions(audit_result, indep_score)

          # Step 6: Upgrade to FreeSkill format
          freeskill_data = upgrade_to_freeskill_format(skill_content, author_address)

          # Step 7: Prepare chain registration data
          chain_data = prepare_chain_registration(freeskill_data)

          return {
              'status': 'ready',
              'message': 'Skill is ready for on-chain registration',
              'audit_result': audit_result,
              'independence_score': indep_score,
              'freeskill_data': freeskill_data,
              'chain_data': chain_data,
              'suggestions': suggestions
          }

      def audit_skill(skill_content):
          """Run security audit on skill content"""
          issues = []
          critical_count = 0
          high_count = 0
          medium_count = 0
          low_count = 0

          for pattern, msg in SECURITY_PATTERNS:
              if re.search(pattern, skill_content, re.IGNORECASE):
                  # Determine severity based on pattern
                  if 'eval' in msg or 'exec' in msg or 'password' in msg or 'private key' in msg:
                      severity = 'CRITICAL'
                      critical_count += 1
                  elif 'download' in msg or 'tracking' in msg:
                      severity = 'HIGH'
                      high_count += 1
                  else:
                      severity = 'MEDIUM'
                      medium_count += 1

                  issues.append({
                      'severity': severity,
                      'message': msg,
                      'pattern': pattern
                  })

          # Calculate security score
          security_score = max(0, 100 - critical_count * 20 - high_count * 10 - medium_count * 5)

          suggestions = []
          if critical_count > 0:
              suggestions.append("CRITICAL: Remove hardcoded secrets and dangerous functions")
          if high_count > 0:
              suggestions.append("HIGH: Review external download requests")
          if security_score < 80:
              suggestions.append("Consider adding environment variables for configuration")

          return {
              'passed': critical_count == 0,
              'score': security_score,
              'issues': issues,
              'critical_count': critical_count,
              'high_count': high_count,
              'medium_count': medium_count,
              'low_count': low_count,
              'suggestions': suggestions
          }

      def calculate_independence_score(skill_content):
          """Calculate independence score based on quality patterns"""
          score = 50  # Base score
          features = []

          for name, (pattern, points, desc) in QUALITY_PATTERNS.items():
              if re.search(pattern, skill_content, re.MULTILINE | re.IGNORECASE):
                  score += points
                  features.append(desc)

          # Check for network calls (penalty in suggestions, not score)
          has_network = any(p in skill_content.lower() for p in ['requests.get', 'urllib.request', 'wget', 'curl'])

          # Clamp score
          score = min(100, score)

          # Determine grade
          if score >= 90:
              grade = 'A'
          elif score >= 70:
              grade = 'B'
          elif score >= 50:
              grade = 'C'
          elif score >= 30:
              grade = 'D'
          else:
              grade = 'F'

          warnings = []
          if has_network:
              warnings.append("Contains external network calls - ensure target is trusted")

          return {
              'score': score,
              'grade': grade,
              'features': features,
              'warnings': warnings
          }

      def generate_suggestions(audit_result, indep_score):
          """Generate improvement suggestions"""
          suggestions = []

          # From audit
          suggestions.extend(audit_result.get('suggestions', []))

          # From independence
          if indep_score['score'] < 70:
              suggestions.append("Consider using environment variables for API keys")
          if not any('timeout' in f for f in indep_score['features']):
              suggestions.append("Add timeout settings for external calls")
          if not any('error' in f.lower() for f in indep_score['features']):
              suggestions.append("Add try/except error handling")

          return list(set(suggestions))  # Remove duplicates

      def upgrade_to_freeskill_format(skill_content, author_address):
          """Upgrade skill to FreeSkill standard format"""
          import yaml

          # Parse existing skill
          try:
              parts = skill_content.split('---')
              if len(parts) >= 2:
                  yaml_content = parts[1].split('---')[0]
                  skill_data = yaml.safe_load(yaml_content)
              else:
                  skill_data = yaml.safe_load(skill_content)
          except:
              # Fallback: simple parsing
              skill_data = parse_simple_yaml(skill_content)

          # Generate FreeSkill fields
          timestamp = int(time.time())

          # Generate fingerprint
          ipfs_hash = f"Qm{timestamp:064x}"
          fingerprint_input = f"{ipfs_hash}{author_address}{timestamp}"
          fingerprint = hashlib.sha3_256(fingerprint_input.encode()).hexdigest()

          # Get risk level
          risk_level = (skill_data.get('metadata', {}) or {}).get('riskLevel', 'LOW')

          # Build FreeSkill structure
          freeskill = {
              'freeskill': {
                  'fingerprint': f"0x{fingerprint}",
                  'creator': author_address,
                  'createdAt': timestamp,
                  'ipfsHash': ipfs_hash,
                  'riskLevel': risk_level,
                  'stakeRequired': get_stake_required(risk_level),
                  'attestationCount': get_attestation_count(risk_level),
                  'auditTrail': [f"{timestamp}-CREATED-{author_address}-Initial submission"],
                  'standard': 'freeskill',
                  'version': '1.0'
              },
              'responsibility': {
                  'creator': author_address,
                  'liabilityDeclaration': f"I, {author_address}, take full responsibility for this skill and accept anti-slash conditions.",
                  'scopeDeclaration': 'This skill operates within declared parameters only.'
              },
              'antiSlash': {
                  'enabled': True,
                  'slashRate': 0.5,
                  'appealsPeriod': 7
              }
          }

          return freeskill

      def get_stake_required(risk_level):
          stakes = {'LOW': 10, 'MEDIUM': 50, 'HIGH': 100, 'CRITICAL': 200}
          return stakes.get(risk_level, 10)

      def get_attestation_count(risk_level):
          counts = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 5}
          return counts.get(risk_level, 1)

      def prepare_chain_registration(freeskill_data):
          """Prepare data for on-chain registration"""
          return {
              'action': 'registerSkill',
              'params': {
                  'fingerprint': freeskill_data['freeskill']['fingerprint'],
                  'creator': freeskill_data['freeskill']['creator'],
                  'ipfsHash': freeskill_data['freeskill']['ipfsHash'],
                  'riskLevel': freeskill_data['freeskill']['riskLevel'],
                  'stakeAmount': freeskill_data['freeskill']['stakeRequired'],
                  'attestationCount': freeskill_data['freeskill']['attestationCount']
              },
              'abi': 'registerSkill(bytes32 fingerprint, address creator, string ipfsHash, uint8 riskLevel, uint256 stakeAmount, uint8 attestationCount)'
          }

      def parse_simple_yaml(content):
          """Simple YAML parser fallback"""
          data = {}
          for line in content.split('\n'):
              line = line.strip()
              if ':' in line and not line.startswith('---'):
                  key, val = line.split(':', 1)
                  data[key.strip()] = val.strip().strip('"\'')
          return data

      # Example usage
      if __name__ == '__main__':
          import sys
          if len(sys.argv) >= 3:
              result = submit_skill(sys.argv[1], sys.argv[2])
              print(json.dumps(result, indent=2))
          else:
              print("Usage: python submit-to-freeskill.py <skill_file> <author_address>")
resources:
  - name: "freeskill-audit"
    type: "skill"
    source: "freeskill-audit"
  - name: "freeskill-upgrade"
    type: "skill"
    source: "freeskill-upgrade"
  - name: "documentation"
    type: "doc"
    content: |
      # freeskill-submit 使用指南

      ## 前置条件
      1. 已安装 Claude Code 或兼容的智能体环境
      2. 拥有可用的钱包地址 (0x...)
      3. 技能文件 (.SKILL.md 或 .FREESKILL.md)

      ## 触发命令
      ```
      /submit skill my-skill.SKILL.md to freeskill with author 0x742d...
      ```

      ## 自动执行流程
      1. 安全审核 (freeskill-audit)
      2. 独立性评分
      3. 升级标准化 (freeskill-upgrade)
      4. 链上注册准备

      ## 输出状态
      - `status: "ready"` - 可上链注册
      - `status: "audit_failed"` - 需修复后重试

      ## 安全声明
      提交即表示接受反噬机制，对技能行为承担全部责任。