const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { updateJob, getJob } = require('./jobs');

/**
 * Process audit job by calling Claude Code with freeskill-audit
 * @param {string} jobId - Job ID
 * @param {string} filePath - Path to skill file
 * @param {string} originalName - Original filename
 */
async function processAuditJob(jobId, filePath, originalName) {
  console.log(`[Audit] Starting job ${jobId} for ${originalName}`);

  // Update status to auditing
  updateJob(jobId, { status: 'auditing' });

  try {
    // Extract skill name from filename
    const skillName = path.basename(originalName, path.extname(originalName));

    // Read the skill file content
    let skillContent = '';
    if (filePath.endsWith('.SKILL.md') || filePath.endsWith('.md')) {
      skillContent = fs.readFileSync(filePath, 'utf-8');
    } else if (filePath.endsWith('.zip')) {
      // TODO: Extract and read .SKILL.md from zip
      skillContent = 'ZIP file - needs extraction';
    }

    // Build audit prompt for Claude Code
    const auditPrompt = `
Please audit this skill for FreeSkill compliance.

Skill name: ${skillName}

Skill content:
\`\`\`markdown
${skillContent}
\`\`\`

Run the freeskill-audit skill to check:
1. Base compliance (structure, required fields)
2. Security scan (vulnerabilities)
3. Dependency check
4. Governance fields validation

Report the audit results in this format:
{
  "passed": true/false,
  "tier1": { "passed": true/false, "issues": [] },
  "tier2": { "passed": true/false, "issues": [] },
  "tier3": { "passed": true/false, "issues": [] },
  "tier4": { "passed": true/false, "issues": [] },
  "overall": "PASS/FAIL",
  "recommendation": "approve/reject/needs_review"
}

Output JSON only, no other text.
`;

    // Run Claude Code
    const result = await runClaudeAudit(auditPrompt, skillName);

    // Parse result
    let auditResult;
    try {
      // Extract JSON from result
      const jsonMatch = result.match(/\{[\s\S]*"passed"[\s\S]*\}/);
      if (jsonMatch) {
        auditResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in audit result');
      }
    } catch (parseErr) {
      console.error(`[Audit] JSON parse error for job ${jobId}:`, parseErr);
      // Fallback to text result
      auditResult = {
        passed: result.includes('PASS') || result.includes('pass'),
        rawResult: result,
        recommendation: 'needs_review'
      };
    }

    // Update job with result
    const finalStatus = auditResult.passed ? 'approved' :
                        auditResult.recommendation === 'needs_review' ? 'review' : 'rejected';

    updateJob(jobId, {
      status: finalStatus,
      result: auditResult,
      completedAt: new Date().toISOString()
    });

    console.log(`[Audit] Job ${jobId} completed with status: ${finalStatus}`);
    return auditResult;

  } catch (error) {
    console.error(`[Audit] Job ${jobId} failed:`, error);
    updateJob(jobId, {
      status: 'failed',
      error: error.message
    });
    throw error;
  }
}

/**
 * Run Claude Code audit
 * @param {string} prompt - Audit prompt
 * @param {string} skillName - Skill name
 * @returns {Promise<string>} - Audit result text
 */
function runClaudeAudit(prompt, skillName) {
  return new Promise((resolve, reject) => {
    const timeout = 120000; // 2 minutes timeout

    const proc = spawn('claude', [
      '-p',
      prompt
    ], {
      cwd: path.join(__dirname, '..'),
      timeout,
      shell: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('Claude CLI not found. Please install Claude Code.'));
      } else {
        reject(err);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr || stdout}`));
      }
    });

    // Timeout handling
    setTimeout(() => {
      proc.kill();
      reject(new Error('Audit timeout after 2 minutes'));
    }, timeout);
  });
}

module.exports = {
  processAuditJob,
  runClaudeAudit
};
