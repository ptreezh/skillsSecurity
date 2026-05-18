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
    (r'private[_-]?key\s*=\s*["\']
