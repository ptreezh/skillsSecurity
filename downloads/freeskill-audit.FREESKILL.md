---
name: freeskill-audit
description: Comprehensive skill security audit - validates AgentSkills base, security scan, dependency check, and FreeSkill governance with auto-fix capabilities
trigger: "audit skill {skill_name} for freeskill compliance with fix"
metadata:
  version: "2.0.0"
  author: "FreeAgentSkills"
  tags: ["freeskill", "audit", "security", "compliance", "meta", "scanner"]
  riskLevel: "HIGH"
  standard: "freeskill"
  stakeRequired: 100
  attestationCount: 3
scripts:
  - name: "audit-skill-full"
    language: "python"
    code: |
      """
      freeskill-audit v2.0: Comprehensive skill security audit
      
      Performs 4-tier audit:
      1. AgentSkills Base Check - validates .SKILL.md structure
      2. Security Scan - OWASP Top 10 + comprehensive vulnerability detection
      3. Dependency Check - external package safety analysis
      4. FreeSkill Governance - validates all governance fields
      
      Features:
      - Auto-fix unsafe patterns where possible
      - Generate sanitized code output
      - Detailed audit report with recommendations
      
      Usage:
        audit skill email-sender for freeskill compliance with fix
      """
      
      import re
      import hashlib
      import json
      
      # ============================================================
      # TIER 1: AgentSkills Base Compliance Check
      # ============================================================
      
      REQUIRED_BASE_FIELDS = ['name', 'description', 'trigger', 'metadata']
      REQUIRED_METADATA_FIELDS = ['version', 'author', 'riskLevel']
      VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      
      def check_agentskills_base(skill_data):
          """Tier 1: Verify skill conforms to AgentSkills.io base standard"""
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
          
          if 'scripts' not in skill_data or not skill_data.get('scripts'):
              errors.append("Missing required field: scripts")
          else:
              for i, script in enumerate(skill_data['scripts']):
                  if 'name' not in script:
                      errors.append(f"scripts[{i}]: missing 'name'")
                  if 'language' not in script:
                      errors.append(f"scripts[{i}]: missing 'language'")
                  if 'code' not in script or not script.get('code'):
                      errors.append(f"scripts[{i}]: missing 'code'")
          
          return {'passed': len(errors) == 0, 'tier': '1-AgentSkills Base', 'errors': errors, 'warnings': warnings}
      
      # ============================================================
      # TIER 2: Security Scan (OWASP Top 10 + More)
      # ============================================================
      
      # Security patterns: (regex, severity, message, auto_fix_hint)
      # severity: CRITICAL, HIGH, MEDIUM, LOW
      SECURITY_PATTERNS = [
          # Command Injection
          (r'eval\s*\(', 'CRITICAL', 'Command injection: eval()', 'Use ast.literal_eval() or safer alternatives'),
          (r'exec\s*\(', 'CRITICAL', 'Command injection: exec()', 'Refactor to avoid dynamic code execution'),
          (r'os\.system\s*\(', 'CRITICAL', 'Command injection: os.system()', 'Use subprocess.run() with list args'),
          (r'subprocess\.\w+\s*\([^)]*shell\s*=\s*True', 'CRITICAL', 'Shell injection: shell=True', 'Remove shell=True or use shell=False'),
          (r'os\.popen\s*\(', 'HIGH', 'Command injection: os.popen()', 'Use subprocess module instead'),
          (r'pty\.spawn', 'HIGH', 'PTY spawn without tty check', 'Add tty validation'),
          
          # Code Injection
          (r'__import__\s*\([^)]+\)', 'HIGH', 'Dynamic import injection', 'Use static imports'),
          (r'getattr\s*\([^)]+,\s*[^)]+\)', 'MEDIUM', 'Dynamic getattr usage', 'Use explicit attribute access'),
          (r'setattr\s*\([^)]+,\s*[^)]+,\s*[^)]+\)', 'MEDIUM', 'Dynamic setattr usage', 'Use explicit attribute assignment'),
          
          # Secrets Exposure
          (r'password\s*=\s*["\'][^"\']{3,50}["\']', 'CRITICAL', 'Hardcoded password detected', 'Use environment variables: os.getenv("PASSWORD")'),
          (r'api[_-]?key\s*=\s*["\'][A-Za-z0-9]{16,}["\']', 'CRITICAL', 'Hardcoded API key', 'Use os.getenv("API_KEY")'),
          (r'secret[_-]?key\s*=\s*["\'][^"\']{8,}["\']', 'CRITICAL', 'Hardcoded secret key', 'Use os.getenv("SECRET_KEY")'),
          (r'private[_-]?key\s*=\s*["\']-----BEGIN', 'CRITICAL', 'Hardcoded private key', 'Use secure key management'),
          (r'token\s*=\s*["\'][A-Za-z0-9_]{16,}["\']', 'HIGH', 'Potential hardcoded token', 'Use environment variables'),
          (r'bearer\s+[A-Za-z0-9_\-\.]{16,}', 'HIGH', 'Hardcoded bearer token', 'Use Authorization header with env var'),
          (r'aws[_-]?access[_-]?key', 'CRITICAL', 'AWS credentials exposed', 'Use IAM roles or env vars'),
          (r'aws[_-]?secret[_-]?key', 'CRITICAL', 'AWS secret exposed', 'Use IAM roles or env vars'),
          
          # Path Traversal
          (r'open\s*\([^)]*\+', 'HIGH', 'Path traversal: variable in open()', 'Use os.path.join() and validate path'),
          (r'\.format\s*\([^)]*%s', 'MEDIUM', 'String format with user input', 'Use f-strings with validation'),
          (r'\%\([^)]*\{', 'MEDIUM', 'Old-style format injection risk', 'Use f-strings or .format() with validation'),
          (r'os\.path\.join\([^)]+\s*\+', 'MEDIUM', 'Path join with concatenation', 'Validate each path component'),
          (r'\.\./', 'MEDIUM', 'Directory traversal pattern (..)', 'Sanitize and validate paths'),
          
          # Deserialization
          (r'pickle\.loads?', 'CRITICAL', 'Unsafe deserialization: pickle', 'Use json.loads() or custom safe deserializer'),
          (r'yaml\.load\s*\([^)]*(?!Loader=yaml\.SafeLoader)', 'CRITICAL', 'Unsafe YAML deserialization', 'Use yaml.safe_load()'),
          (r'marshal\.loads', 'CRITICAL', 'Unsafe marshal deserialization', 'Avoid marshal for external data'),
          (r'unserialize', 'HIGH', 'Potential unserialize attack', 'Use safe deserialization methods'),
          
          # SQL/NoSQL Injection
          (r'execute\s*\([^)]*\%', 'CRITICAL', 'SQL injection: % formatting', 'Use parameterized queries'),
          (r'\.execute\s*\([^)]*\%', 'CRITICAL', 'SQL injection: % in execute', 'Use ? placeholders'),
          (r'cursor\.execute\s*\([^)]*\+[^)]*\%', 'CRITICAL', 'SQL injection: string concat', 'Use parameterized queries'),
          (r'\.find\s*\([^)]*\+', 'MEDIUM', 'NoSQL injection: string concat', 'Use parameterized queries'),
          (r'mongodb.*\+', 'MEDIUM', 'NoSQL injection pattern', 'Use query builders'),
          
          # XXE
          (r'xml\.etree.*parse', 'HIGH', 'XXE vulnerability: XML parsing', 'Disable external entities'),
          (r'defusedxml', 'MEDIUM', 'XXE potential', 'Use defusedxml library'),
          
          # SSRF
          (r'requests\.get\s*\([^)]*url', 'HIGH', 'SSRF potential: requests.get(url)', 'Validate and sanitize URL'),
          (r'urllib\.request', 'MEDIUM', 'SSRF potential: urllib', 'Validate URL against allowlist'),
          (r'http://[^"\']{5,}localhost', 'HIGH', 'SSRF: localhost bypass attempt', 'Block internal network access'),
          (r'http://[^"\']{5,}127\.0\.0\.1', 'HIGH', 'SSRF: 127.0.0.1 bypass', 'Block internal network access'),
          (r'file://', 'HIGH', 'SSRF: file:// scheme', 'Block file:// scheme in URLs'),
          
          # File Operations
          (r'os\.remove\s*\(', 'HIGH', 'File deletion risk', 'Add confirmation and path validation'),
          (r'os\.unlink\s*\(', 'HIGH', 'File deletion risk', 'Add confirmation and path validation'),
          (r'shutil\.rmtree\s*\(', 'HIGH', 'Recursive delete risk', 'Add confirmation and sandboxing'),
          (r'os\.chmod\s*\(', 'MEDIUM', 'Permission change', 'Validate target and desired permissions'),
          (r'os\.chown\s*\(', 'MEDIUM', 'Ownership change', 'Validate target and ownership'),
          (r'\.write\s*\([^)]*open\s*\([^)]*["\']w["\']', 'MEDIUM', 'Arbitrary file write', 'Validate path and use mode restrictions'),
          
          # Crypto Weakness
          (r'hashlib\.md5\s*\(', 'MEDIUM', 'Weak hash: MD5', 'Use hashlib.sha256() or stronger'),
          (r'hashlib\.sha1\s*\(', 'MEDIUM', 'Weak hash: SHA1', 'Use hashlib.sha256() or stronger'),
          (r'Crypto\.Cipher\.DES', 'HIGH', 'Weak cipher: DES', 'Use AES-256-GCM'),
          (r'\.encrypt\s*\([^)]* ECB', 'HIGH', 'Weak mode: ECB', 'Use GCM or CBC with IV'),
          (r'random\.choice\s*\([^)]*(?:password|passwd|token)', 'MEDIUM', 'Weak random for crypto', 'Use secrets.token_* or os.urandom'),
          
          # Input Validation
          (r'input\s*\(', 'LOW', 'User input via input()', 'Validate and sanitize input'),
          (r'raw_input\s*\(', 'LOW', 'User input via raw_input()', 'Validate and sanitize input'),
          
          # Misc
          (r'time\.sleep\s*\([^)]*user', 'MEDIUM', 'Timing attack potential', 'Use constant-time comparison'),
          (r'warnings\.filterwarnings\s*\([^)]*ignore', 'MEDIUM', 'Warning suppression', 'Handle warnings explicitly'),
          (r'#\s*nosec', 'LOW', 'Security check disabled', 'Enable security checks'),
          (r'pdb\.set_trace', 'LOW', 'Debug code left in', 'Remove before production'),
          (r'tempfile\.mktemp', 'MEDIUM', 'Race condition: mktemp', 'Use NamedTemporaryFile'),
      ]
      
      def check_security(skill_data):
          """Tier 2: Comprehensive security vulnerability scanning"""
          errors, warnings = [], []
          findings = []
          
          all_code = '\n'.join([
              s.get('code', '') for s in skill_data.get('scripts', [])
          ])
          
          # Scan for dangerous patterns
          for pattern, severity, message, fix_hint in SECURITY_PATTERNS:
              matches = list(re.finditer(pattern, all_code, re.IGNORECASE | re.MULTILINE))
              for match in matches:
                  finding = {
                      'severity': severity,
                      'message': message,
                      'fix': fix_hint,
                      'line': all_code[:match.start()].count('\n') + 1,
                      'code': get_code_snippet(all_code, match.start(), 60)
                  }
                  findings.append(finding)
                  
                  if severity in ['CRITICAL', 'HIGH']:
                      errors.append(f"[{severity}] {message} (line {finding['line']}): {fix_hint}")
                  else:
                      warnings.append(f"[{severity}] {message} (line {finding['line']})")
          
          # Check for missing security practices
          if 'os.getenv' not in all_code and 'os.environ' not in all_code:
              if any(k in all_code.lower() for k in ['key', 'secret', 'password', 'token']):
                  warnings.append("[LOW] Potential hardcoded secrets - use environment variables")
          
          if 'try:' in all_code and 'except' in all_code:
              if 'Exception' in all_code and 'pass' not in all_code.split('except Exception')[-1]:
                  pass_count = all_code.split('except Exception')[-1].split('try:')[-1].count('pass')
                  if pass_count > 2:
                      warnings.append("[LOW] Multiple bare except blocks - catch specific exceptions")
          
          return {
              'passed': len([f for f in findings if f['severity'] in ['CRITICAL', 'HIGH']]) == 0,
              'tier': '2-Security',
              'errors': errors,
              'warnings': warnings,
              'findings': findings
          }
      
      def get_code_snippet(code, position, length):
          """Extract code snippet around position"""
          start = max(0, position - length // 2)
          end = min(len(code), position + length // 2)
          snippet = code[start:end].replace('\n', ' ')
          return snippet[:100] + '...' if len(snippet) > 100 else snippet
      
      # ============================================================
      # TIER 3: Dependency Check
      # ============================================================
      
      KNOWN_UNSAFE_PACKAGES = {
          'pycrypto': 'Use pycryptodome instead',
          'PIL', 'Pillow': 'Update to latest version - known CVEs',
          'requests': 'Update to 2.28.0+ - urllib3 update needed',
          'django': 'Update to latest LTS version',
          'flask': 'Update to 2.3.0+',
          'numpy': 'Update to 1.22.0+ for security',
          'pandas': 'Update to latest version',
          'yaml': 'Use safe_load() instead of load()',
          'ujson': 'Use standard json with safety checks',
      }
      
      SUSPICIOUS_IMPORTS = [
          'ctypes', 'fcntl', 'grp', 'pwd', 'spwd',
          'termios', 'tty', 'pty', 'syslog',
      ]
      
      def check_dependencies(skill_data):
          """Tier 3: External package safety analysis"""
          errors, warnings = [], []
          imports_found = []
          
          all_code = '\n'.join([s.get('code', '') for s in skill_data.get('scripts', [])])
          
          # Find all import statements
          import_pattern = r'(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_\.]*)'
          for match in re.finditer(import_pattern, all_code):
              module = match.group(1).split('.')[0]
              if module not in imports_found:
                  imports_found.append(module)
                  
                  # Check against unsafe packages
                  if module in KNOWN_UNSAFE_PACKAGES:
                      errors.append(f"[HIGH] Unsafe package: {module} - {KNOWN_UNSAFE_PACKAGES[module]}")
                  
                  # Check suspicious imports
                  if module in SUSPICIOUS_IMPORTS:
                      warnings.append(f"[MEDIUM] Suspicious import: {module} - potential system access")
          
          # Check requirements/resources
          resources = skill_data.get('resources', [])
          if isinstance(resources, list):
              for res in resources:
                  if isinstance(res, dict) and 'requires' in res:
                      for req in res.get('requires', []):
                          pkg = req.split('==')[0].split('>=')[0].split('<=')[0].strip()
                          if pkg in KNOWN_UNSAFE_PACKAGES:
                              errors.append(f"[HIGH] Unsafe dependency: {pkg}")
          
          return {
              'passed': len(errors) == 0,
              'tier': '3-Dependencies',
              'errors': errors,
              'warnings': warnings,
              'imports': imports_found
          }
      
      # ============================================================
      # TIER 4: FreeSkill Governance Check
      # ============================================================
      
      REQUIRED_FREESKILL_FIELDS = {
          'freeskill': ['fingerprint', 'creator', 'createdAt', 'ipfsHash', 'riskLevel', 'stakeRequired', 'standard', 'version'],
          'responsibility': ['creator', 'liabilityDeclaration', 'scopeDeclaration'],
          'antiSlash': ['enabled', 'slashRate', 'appealsPeriod'],
          'humanAuth': ['required']
      }
      
      def check_freeskill_governance(skill_data):
          """Tier 4: Verify FreeSkill governance fields"""
          errors, warnings = [], []
          
          # Check freeskill section
          if 'freeskill' not in skill_data:
              errors.append("Missing FreeSkill governance section: freeskill")
          else:
              fs = skill_data['freeskill']
              for field in REQUIRED_FREESKILL_FIELDS['freeskill']:
                  if field not in fs:
                      errors.append(f"Missing freeskill.{field}")
              
              fp = fs.get('fingerprint', '')
              if fp and (not fp.startswith('0x') or len(fp) != 66):
                  errors.append(f"Invalid fingerprint format: {fp}")
              
              if fs.get('standard') != 'freeskill':
                  errors.append(f"Invalid standard: {fs.get('standard')}")
          
          if 'responsibility' not in skill_data:
              errors.append("Missing governance section: responsibility")
          else:
              resp = skill_data['responsibility']
              for field in REQUIRED_FREESKILL_FIELDS['responsibility']:
                  if field not in resp or not resp.get(field):
                      errors.append(f"Missing responsibility.{field}")
          
          if 'antiSlash' not in skill_data:
              errors.append("Missing governance section: antiSlash")
          else:
              as_data = skill_data['antiSlash']
              for field in REQUIRED_FREESKILL_FIELDS['antiSlash']:
                  if field not in as_data:
                      errors.append(f"Missing antiSlash.{field}")
              
              slash_rate = as_data.get('slashRate', -1)
              if not (0 <= slash_rate <= 1):
                  errors.append(f"Invalid slashRate: {slash_rate}")
          
          if 'humanAuth' not in skill_data:
              warnings.append("Missing governance section: humanAuth (optional)")
          
          return {'passed': len(errors) == 0, 'tier': '4-FreeSkill Governance', 'errors': errors, 'warnings': warnings}
      
      # ============================================================
      # Auto-Fix Engine
      # ============================================================
      
      AUTO_FIXES = [
          (r'eval\s*\(', "eval() is dangerous. Replace with: ast.literal_eval() for safe evaluation"),
          (r'exec\s*\(', "exec() is dangerous. Refactor to use explicit function calls"),
          (r'os\.system\s*\(', "os.system() is dangerous. Use: subprocess.run(['cmd', 'arg'], shell=False)"),
          (r'subprocess\.\w+\s*\([^)]*shell\s*=\s*True', "shell=True is dangerous. Remove shell=True or use shell=False with list args"),
          (r'password\s*=\s*["\'][^"\']{3,50}["\']', "Hardcoded password detected. Replace with: os.getenv('PASSWORD')"),
          (r'api[_-]?key\s*=\s*["\'][A-Za-z0-9]{16,}["\']', "Hardcoded API key. Replace with: os.getenv('API_KEY')"),
          (r'hashlib\.md5\s*\(', "MD5 is weak. Replace with: hashlib.sha256()"),
          (r'hashlib\.sha1\s*\(', "SHA1 is weak. Replace with: hashlib.sha256()"),
          (r'yaml\.load\s*\(', "Unsafe YAML load. Replace with: yaml.safe_load()"),
          (r'pickle\.load', "Unsafe pickle. Use json.loads() instead"),
      ]
      
      def generate_fix_suggestions(skill_data):
          """Generate auto-fix suggestions for unsafe patterns"""
          suggestions = []
          
          all_code = '\n'.join([s.get('code', '') for s in skill_data.get('scripts', [])])
          
          for pattern, fix_message in AUTO_FIXES:
              if re.search(pattern, all_code, re.IGNORECASE):
                  suggestions.append(fix_message)
          
          return suggestions
      
      # ============================================================
      # Main Audit Function
      # ============================================================
      
      def parse_yaml(content):
          """Parse YAML frontmatter format"""
          data, current_section = {}, None
          in_code_block, code_lines = False, []
          
          for line in content.split('\n'):
              if line.strip() == '---':
                  continue
              
              if 'code: |' in line:
                  in_code_block = True
                  code_lines = []
                  continue
              
              if in_code_block:
                  if line.strip().startswith('resources:') or (line.strip() and not line.startswith(' ' * 6) and ':' in line):
                      in_code_block = False
                      if current_section == 'scripts' and 'scripts' in data and data['scripts'] and 'code' not in data['scripts'][-1]:
                          data['scripts'][-1]['code'] = '\n'.join(code_lines)
                  else:
                      code_lines.append(line)
                      continue
              
              line = line.strip()
              if not line or line.startswith('#'):
                  continue
              
              if line.endswith(':') and not line.endswith('":'):
                  current_section = line[:-1]
                  if current_section not in data:
                      data[current_section] = {}
                  continue
              
              if ':' in line:
                  key, val = line.split(':', 1)
                  key, val = key.strip(), val.strip().strip('"\'')
                  if current_section and isinstance(data.get(current_section), dict):
                      if val.startswith('['):
                          data[current_section][key] = [x.strip().strip('"\'') for x in val[1:-1].split(',')]
                      else:
                          data[current_section][key] = val
                  else:
                      data[key] = val
          
          return data
      
      def to_yaml(skill_data):
          """Convert skill data back to YAML format"""
          lines = ['---']
          
          for field in ['name', 'description', 'trigger']:
              if field in skill_data:
                  lines.append(f"{field}: {skill_data[field]}")
          
          if 'metadata' in skill_data:
              lines.append("metadata:")
              for k, v in skill_data['metadata'].items():
                  if isinstance(v, list):
                      lines.append(f"  {k}: {v}")
                  else:
                      lines.append(f"  {k}: \"{v}\"")
          
          if 'scripts' in skill_data:
              lines.append("scripts:")
              for script in skill_data['scripts']:
                  lines.append(f"  - name: \"{script.get('name', 'main')}\"")
                  lines.append(f"    language: \"{script.get('language', 'python')}\"")
                  lines.append("    code: |")
                  for cline in (script.get('code', '') or '').split('\n'):
                      lines.append(f"      {cline}")
          
          for section in ['freeskill', 'responsibility', 'antiSlash', 'humanAuth']:
              if section in skill_data:
                  lines.append(f"\n{section}:")
                  for k, v in skill_data[section].items():
                      if isinstance(v, list):
                          lines.append(f"  {k}: [\"stake\", \"submit\"]")
                      elif isinstance(v, bool):
                          lines.append(f"  {k}: {str(v).lower()}")
                      else:
                          lines.append(f"  {k}: \"{v}\"")
          
          lines.append("---")
          return '\n'.join(lines)
      
      def audit_skill(skill_yaml_content):
          """Main audit function - performs all 4 tiers"""
          skill_data = parse_yaml(skill_yaml_content)
          
          if not skill_data.get('name'):
              return {'overall_pass': False, 'error': 'Failed to parse skill file', 'tiers': []}
          
          tier1 = check_agentskills_base(skill_data)
          tier2 = check_security(skill_data)
          tier3 = check_dependencies(skill_data)
          tier4 = check_freeskill_governance(skill_data)
          
          tiers = [tier1, tier2, tier3, tier4]
          critical_errors = [e for e in tier2['errors'] if '[CRITICAL]' in e]
          overall_pass = len(critical_errors) == 0 and tier1['passed'] and tier4['passed']
          
          total_errors = sum(len(t['errors']) for t in tiers)
          total_warnings = sum(len(t['warnings']) for t in tiers)
          
          fixes = generate_fix_suggestions(skill_data)
          
          return {
              'skill_name': skill_data.get('name', 'unknown'),
              'overall_pass': overall_pass,
              'tiers': tiers,
              'summary': {'total_errors': total_errors, 'total_warnings': total_warnings},
              'fixes': fixes,
              'recommendation': get_recommendation(overall_pass, critical_errors, tier1, tier4)
          }
      
      def get_recommendation(overall_pass, critical_errors, tier1, tier4):
          """Generate upload recommendation"""
          if overall_pass and not critical_errors:
              return "APPROVED: Skill passes security audit - safe to upload"
          
          if critical_errors:
              return "REJECTED: Critical security issues must be fixed before upload"
          
          if not tier1['passed']:
              return "REJECTED: Does not meet AgentSkills base standard"
          
          if not tier4['passed']:
              return "WARNING: Missing FreeSkill governance fields - use freeskill-upgrade"
          
          return "REVISION NEEDED: Fix all errors before upload"
      
      def audit_and_report(skill_yaml_content, include_fix=True):
          """Full audit with detailed markdown report"""
          result = audit_skill(skill_yaml_content)
          
          lines = [
              "# FreeSkill Security Audit Report",
              f"**Skill:** {result.get('skill_name', 'N/A')}",
              f"**Status:** {result.get('recommendation', 'N/A').split(':')[0]}",
              f"**Date:** {import datetime; datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
              "",
              "---",
              ""
          ]
          
          severity_colors = {'CRITICAL': '🔴', 'HIGH': '🟠', 'MEDIUM': '🟡', 'LOW': '⚪'}
          
          for tier in result.get('tiers', []):
              status = '[PASS]' if tier['passed'] else '[FAIL]'
              lines.append(f"## {status} {tier['tier']}")
              
              if tier.get('errors'):
                  lines.append("\n**Errors:**")
                  for err in tier['errors']:
                      sev = next((s for s in severity_colors if s in err), '')
                      lines.append(f"- {err}")
              
              if tier.get('warnings'):
                  lines.append("\n**Warnings:**")
                  for warn in tier['warnings']:
                      lines.append(f"- {warn}")
              
              lines.append("")
          
          if result.get('fixes') and include_fix:
              lines.extend([
                  "---",
                  "## Auto-Fix Suggestions",
                  "",
                  "To fix security issues, apply these changes:"
              ])
              for fix in result['fixes']:
                  lines.append(f"- {fix}")
              lines.append("")
          
          lines.extend([
              "---",
              f"**Total Errors:** {result.get('summary', {}).get('total_errors', 0)}",
              f"**Total Warnings:** {result.get('summary', {}).get('total_warnings', 0)}",
              "",
              f"**Recommendation:** {result.get('recommendation', 'N/A')}",
              "",
              "---",
              "*Generated by freeskill-audit v2.0*"
          ])
          
          return '\n'.join(lines)
      
      def audit_and_sanitize(skill_yaml_content):
          """Audit skill and generate sanitized version if safe"""
          result = audit_skill(skill_yaml_content)
          
          critical_errors = [e for e in result.get('tiers', [])[1].get('errors', []) if '[CRITICAL]' in e]
          
          if not critical_errors:
              # Generate sanitized code
              skill_data = parse_yaml(skill_yaml_content)
              sanitized = sanitize_code(skill_data)
              return {
                  'safe': True,
                  'sanitized_code': to_yaml(sanitized),
                  'report': audit_and_report(skill_yaml_content)
              }
          else:
              return {
                  'safe': False,
                  'sanitized_code': None,
                  'report': audit_and_report(skill_yaml_content),
                  'errors': critical_errors
              }
      
      def sanitize_code(skill_data):
          """Attempt to auto-sanitize common issues"""
          import copy
          sanitized = copy.deepcopy(skill_data)
          
          for script in sanitized.get('scripts', []):
              if 'code' in script:
                  code = script['code']
                  
                  # Replace known unsafe patterns with safer alternatives
                  replacements = [
                      (r'password\s*=\s*["\'][^"\']{3,50}["\']', 'password = os.getenv("PASSWORD", "")'),
                      (r'api[_-]?key\s*=\s*["\'][A-Za-z0-9]{16,}["\']', 'api_key = os.getenv("API_KEY", "")'),
                      (r'yaml\.load\s*\(', 'yaml.safe_load('),
                      (r'hashlib\.md5\s*\(', 'hashlib.sha256('),
                      (r'hashlib\.sha1\s*\(', 'hashlib.sha256('),
                  ]
                  
                  for pattern, replacement in replacements:
                      code = re.sub(pattern, replacement, code, flags=re.IGNORECASE)
                  
                  script['code'] = code
          
          return sanitized
resources: []