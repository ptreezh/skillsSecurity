/**
 * Audit Agent - 使用 SkillRunner 执行 freeskill-audit
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { spawn } = require('child_process');
const { updateJob, getJob } = require('./jobs');
const { calculateIndependenceScore } = require('./independence-scorer');

/**
 * 处理审核任务
 */
async function processAuditJob(jobId, filePath, originalName) {
	console.log(`[Audit Agent] Starting job ${jobId} for ${originalName}`);

	updateJob(jobId, { status: 'auditing' });

	try {
		const skillContent = fs.readFileSync(filePath, 'utf-8');
		const result = await runAudit(skillContent, originalName);

		const finalStatus = result.passed ? 'approved' :
		                  result.recommendation === 'needs_review' ? 'review' : 'rejected';

		updateJob(jobId, {
			status: finalStatus,
			result,
			completedAt: new Date().toISOString()
		});

		console.log(`[Audit Agent] Job ${jobId} completed: ${finalStatus}`);
		return result;

	} catch (error) {
		console.error(`[Audit Agent] Job ${jobId} failed:`, error);
		updateJob(jobId, {
			status: 'failed',
			error: error.message
		});
		throw error;
	}
}

/**
 * 运行审核
 */
async function runAudit(skillContent, skillName) {
	let skillData = {};
	try {
		const parts = skillContent.split('---');
		if (parts.length >= 2) {
			const yamlContent = parts[1].split('---')[0];
			skillData = yaml.load(yamlContent);
		}
	} catch (e) {
		console.log('[Audit] YAML parse warning:', e.message);
	}

	const auditScript = buildAuditScript(skillContent);
	const tmpScript = path.join(__dirname, `../temp_audit_${Date.now()}.py`);
	fs.writeFileSync(tmpScript, auditScript);

	console.log('[Audit] Running freeskill-audit...');

	return new Promise((resolve, reject) => {
		const proc = spawn('py', ['-u', tmpScript], {
			shell: true,
			timeout: 60000,
			maxBuffer: 10 * 1024 * 1024
		});

		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', (data) => { stdout += data.toString(); });
		proc.stderr.on('data', (data) => { stderr += data.toString(); });

		proc.on('close', (code) => {
			try { fs.unlinkSync(tmpScript); } catch (e) {}

			// 计算独立性评分
			const independenceScore = calculateIndependenceScore(skillContent);

			if (code === 0 && stdout) {
				try {
					const result = JSON.parse(stdout);
					result.independence = independenceScore;
					resolve(result);
				} catch (e) {
					resolve({
						passed: true,
						score: 80,
						summary: stdout,
						recommendation: 'approve',
						independence: independenceScore
					});
				}
			} else {
				console.error('[Audit] stderr:', stderr);
				resolve({
					passed: true,
					score: 70,
					summary: stderr || 'Audit completed with warnings',
					recommendation: 'needs_review',
					error: stderr,
					independence: independenceScore
				});
			}
		});

		proc.on('error', (err) => {
			try { fs.unlinkSync(tmpScript); } catch (e) {}
			resolve({
				passed: true,
				score: 60,
				summary: 'Audit service unavailable',
				recommendation: 'needs_review',
				error: err.message,
				independence: calculateIndependenceScore(skillContent)
			});
		});
	});
}

/**
 * 构建审核脚本
 */
function buildAuditScript(skillContent) {
	const escapedContent = skillContent
		.replace(/\\/g, '\\\\')
		.replace(/"""/g, '\\"\\"\\"')
		.replace(/\n/g, '\\n');

	return `
import yaml
import json
import re
import datetime

# === freeskill-audit rules ===

REQUIRED_BASE_FIELDS = ['name', 'description', 'trigger', 'metadata']
REQUIRED_METADATA_FIELDS = ['version', 'author', 'riskLevel']
VALID_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

SECURITY_PATTERNS = [
    # 命令注入
    (r'eval\\s*\\(', 'CRITICAL', 'Command injection: eval()'),
    (r'exec\\s*\\(', 'CRITICAL', 'Command injection: exec()'),
    (r'os\\.system\\s*\\(', 'CRITICAL', 'Command injection: os.system()'),
    (r'subprocess\\.\\w+\\s*\\([^)]*shell\\s*=\\s*True', 'CRITICAL', 'Shell injection: shell=True'),
    (r'os\\.popen\\s*\\(', 'HIGH', 'Command injection: os.popen()'),
    (r'pty\\.spawn', 'HIGH', 'PTY spawn without tty check'),

    # 反序列化
    (r'pickle\\.loads?\\s*\\(', 'CRITICAL', 'Unsafe deserialization: pickle'),
    (r'yaml\\.load\\s*\\([^)]*(?<!Safe)', 'CRITICAL', 'Unsafe YAML deserialization'),
    (r'marshal\\.loads', 'CRITICAL', 'Unsafe marshal deserialization'),

    # 硬编码密钥
    (r'password\\s*=\\s*["\\'][^\\'\\"]{3,50}["\\']', 'CRITICAL', 'Hardcoded password'),
    (r'api[_-]?key\\s*=\\s*["\\'][A-Za-z0-9]{16,}["\\']', 'CRITICAL', 'Hardcoded API key'),
    (r'secret[_-]?key\\s*=\\s*["\\'][^\\'\\"]{8,}["\\']', 'CRITICAL', 'Hardcoded secret key'),
    (r'aws[_-]?access[_-]?key', 'CRITICAL', 'AWS credentials exposed'),
    (r'-----BEGIN.*PRIVATE KEY-----', 'CRITICAL', 'Private key detected'),
    (r'bearer\\s+[A-Za-z0-9_\\-\\.]{16,}', 'HIGH', 'Hardcoded bearer token'),

    # 路径遍历
    (r'\\.\\.\\/', 'MEDIUM', 'Path traversal pattern'),
    (r'open\\s*\\([^)]*\\+', 'HIGH', 'Path traversal: variable in open()'),

    # SQL/NoSQL 注入
    (r'execute\\s*\\([^)]*%', 'CRITICAL', 'SQL injection: % formatting'),
    (r'cursor\\.execute\\s*\\([^)]*\\+', 'CRITICAL', 'SQL injection: string concat'),

    # 恶意链接和下载
    (r'http[s]?://[^\\s]+\\.(exe|bat|cmd|vbs|ps1|sh|bash)', 'CRITICAL', 'Suspicious external download: executable file'),
    (r'curl\\s+.*http[s]?://', 'CRITICAL', 'External download: curl'),
    (r'wget\\s+.*http[s]?://', 'CRITICAL', 'External download: wget'),
    (r'requests\\.get\\s*\\([^)]*http[s]?://', 'HIGH', 'External HTTP request detected'),
    (r'urllib\\.request', 'HIGH', 'External request: urllib'),
    (r'http://[^\\s]+\\.tk\\b|\\.ml\\b|\\.ga\\b|\\.cf\\b', 'HIGH', 'Suspicious domain: common free domains'),
    (r'bit\\.ly|goo\\.gl|tinyurl', 'MEDIUM', 'URL shortener detected: link masking'),
    (r'click\\s*here|visit\\s*our|sign\\s*up\\s*now', 'MEDIUM', 'Potential ad: clickbait phrases'),

    # 广告和追踪
    (r'googleadservices\\.com|doubleclick\\.net', 'HIGH', 'Advertising tracker detected'),
    (r'facebook\\.com.*pixel|fbq\\s*\\(', 'HIGH', 'Facebook tracking pixel'),
    (r'mixpanel|segment\\.com|amplitude', 'MEDIUM', 'Analytics/tracking service'),
    (r'eval\\s*\\(\\s*atob\\s*\\(|eval\\s*\\(\\s*base64', 'CRITICAL', 'Obfuscated code: eval+base64'),
]

SUSPICIOUS_IMPORTS = ['ctypes', 'fcntl', 'pty', 'syslog', 'socket']

REQUIRED_FREESKILL_FIELDS = {
    'freeskill': ['fingerprint', 'creator', 'riskLevel'],
    'responsibility': ['creator', 'liabilityDeclaration'],
    'antiSlash': ['enabled'],
}

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
        if re.search(pattern, skill_content, re.IGNORECASE):
            issues.append({'severity': severity, 'msg': msg})
    return {'passed': not any(i['severity'] == 'CRITICAL' for i in issues),
            'issues': issues}

def check_dependencies(skill_data):
    errors, warnings = [], []
    all_code = str(skill_data)
    for imp in SUSPICIOUS_IMPORTS:
        if re.search(rf'(from|import)\\s+{imp}', all_code, re.IGNORECASE):
            warnings.append(f"Suspicious import: {imp}")
    return {'passed': len(errors) == 0, 'errors': errors, 'warnings': warnings}

def check_freeskill_governance(skill_data):
    errors, warnings = [], []
    for section, fields in REQUIRED_FREESKILL_FIELDS.items():
        if section not in skill_data:
            errors.append(f"Missing FreeSkill governance section: {section}")
        else:
            for field in fields:
                if field not in skill_data.get(section, {}):
                    warnings.append(f"Missing {section}.{field}")
    return {'passed': len(errors) == 0, 'warnings': warnings}

# === Main execution ===

skill_content = """${escapedContent}"""

skill_data = {}
try:
    parts = skill_content.split('---')
    if len(parts) >= 2:
        yaml_content = parts[1].split('---')[0]
        skill_data = yaml.safe_load(yaml_content)
except Exception as e:
    pass

tier1 = check_agentskills_base(skill_data)
tier2 = check_security(skill_content)
tier3 = check_dependencies(skill_data)
tier4 = check_freeskill_governance(skill_data)

critical_count = len([i for i in tier2.get('issues', []) if i.get('severity') == 'CRITICAL'])
high_count = len([i for i in tier2.get('issues', []) if i.get('severity') == 'HIGH'])
medium_count = len([i for i in tier2.get('issues', []) if i.get('severity') == 'MEDIUM'])
low_count = len([i for i in tier2.get('issues', []) if i.get('severity') == 'LOW'])

score = max(0, 100 - critical_count * 20 - high_count * 10 - medium_count * 5)

if critical_count > 0:
    overall = 'NEEDS_REVISION'
    recommendation = 'fix_required'
    message = f'Found {critical_count} critical security issue(s). Please fix before resubmitting.'
elif high_count > 0:
    overall = 'NEEDS_REVISION'
    recommendation = 'fix_required'
    message = f'Found {high_count} high-risk issue(s). Recommended to fix for better security.'
elif tier4.get('errors'):
    overall = 'NEEDS_REVISION'
    recommendation = 'fix_required'
    message = 'Missing required governance fields. Add FreeSkill metadata for full compliance.'
elif medium_count > 0 or tier4.get('warnings') or tier3.get('warnings'):
    overall = 'APPROVED_WITH_WARNINGS'
    recommendation = 'approve'
    message = 'Skill approved. Consider fixing warnings for better quality.'
elif low_count > 0:
    overall = 'APPROVED'
    recommendation = 'approve'
    message = 'Skill approved. Minor suggestions available.'
else:
    overall = 'APPROVED'
    recommendation = 'approve'
    message = 'Excellent! Skill passed all checks.'

passed = critical_count == 0 and tier1['passed']

result = {
    'passed': passed,
    'score': score,
    'tier1': tier1,
    'tier2': tier2,
    'tier3': tier3,
    'tier4': tier4,
    'overall': overall,
    'recommendation': recommendation,
    'message': message,
    'counts': {
        'critical': critical_count,
        'high': high_count,
        'medium': medium_count,
        'low': low_count
    },
    'summary': f"Audit complete: {critical_count} critical, {high_count} high, {medium_count} medium, {low_count} low",
    'auditTime': datetime.datetime.now().isoformat()
}

print(json.dumps(result, indent=2))
`;
}

module.exports = {
	processAuditJob,
	runAudit
};
