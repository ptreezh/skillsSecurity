/**
 * Independence Scorer
 *
 * Principle: developer-friendly, bonus-based, non-blocking
 * Score range: 0-100
 *
 * Bonus points:
 *   +20: No external network calls (pure local computation)
 *   +15: Uses environment variables for secrets
 *   +10: Has timeout settings
 *   +10: Has error handling
 *   +5: Uses temporary files
 *
 * Warnings (do not affect score):
 *   - Dynamic package installation
 *   - Downloading executable files
 *   - No timeout setting
 */

const { t } = require('./i18n');

const PATTERNS = {
  // Network call patterns (warning)
  NETWORK_CALLS: [
    /requests\.(get|post|put|delete|patch)/i,
    /urllib\.request|urlopen/i,
    /http\.client\./i,
    /httpx\./i,
    /axios\./i,
    /fetch\s*\(/i,
    /wget\s+/i,
    /curl\s+/i,
  ],

  // Dangerous download patterns (warning)
  DANGEROUS_DOWNLOAD: [
    /\.(exe|bat|cmd|vbs|ps1|sh|bash)\s*$/i,
  ],

  // Dynamic installation patterns (warning)
  DYNAMIC_INSTALL: [
    /pip\s+install/i,
    /pip3\s+install/i,
    /npm\s+install/i,
    /subprocess.*install/i,
    /os\.system.*install/i,
  ],

  // Bonus patterns
  BONUS_PATTERNS: {
    NO_NETWORK: {
      pattern: /^(?!.*(?:http|requests|urllib|axios|fetch|wget|curl))(?!.*(?:import\s+\w+\s*$))/s,
      score: 20,
      feature: 'noNetwork'
    },
    ENV_VAR: {
      pattern: /os\.getenv|os\.environ\.get|process\.env/i,
      score: 15,
      feature: 'envVar'
    },
    TIMEOUT: {
      pattern: /timeout\s*=\s*[0-9]+|timeout\s*=\s*[a-z_]+\.seconds/i,
      score: 10,
      feature: 'timeout'
    },
    ERROR_HANDLING: {
      pattern: /try\s*:|except\s*:|catch\s*\(|if\s+error/i,
      score: 10,
      feature: 'errorHandling'
    },
    TEMP_FILE: {
      pattern: /tempfile\.|NamedTemporaryFile|mktemp/i,
      score: 5,
      feature: 'tempFile'
    },
  }
};

const WARNING_KEYS = {
  NETWORK: 'network',
  DYNAMIC_INSTALL: 'dynamicInstall',
  NO_TIMEOUT: 'noTimeout',
  DANGEROUS_DOWNLOAD: 'dangerousDownload',
  SENSITIVE_NETWORK: 'sensitiveNetwork',
};

/**
 * Calculate independence score
 * @param {string} skillContent - Skill content
 * @param {string} locale - Locale, e.g. 'zh-CN' or 'en-US'
 * @returns {Object} Score result
 */
function calculateIndependenceScore(skillContent, locale = 'zh-CN') {
  const code = skillContent || '';
  let score = 50; // base score
  const features = [];
  const warnings = [];
  const suggestions = [];

  const _t = (key, data) => t(locale, `independence.${key}`, data);

  // Check bonus points
  const bonuses = [];

  // 1. No external network calls +20
  const hasNetworkCall = PATTERNS.NETWORK_CALLS.some(p => p.test(code));
  const hasDangerousDownload = PATTERNS.DANGEROUS_DOWNLOAD.some(p => p.test(code));

  if (!hasNetworkCall && !hasDangerousDownload) {
    bonuses.push({ score: 20, featureKey: PATTERNS.BONUS_PATTERNS.NO_NETWORK.feature });
  }

  // 2. Uses environment variables +15
  if (PATTERNS.BONUS_PATTERNS.ENV_VAR.pattern.test(code)) {
    bonuses.push({ score: 15, featureKey: PATTERNS.BONUS_PATTERNS.ENV_VAR.feature });
  }

  // 3. Has timeout setting +10
  if (PATTERNS.BONUS_PATTERNS.TIMEOUT.pattern.test(code)) {
    bonuses.push({ score: 10, featureKey: PATTERNS.BONUS_PATTERNS.TIMEOUT.feature });
  } else if (hasNetworkCall) {
    warnings.push(_t('warnings.noTimeout'));
    suggestions.push(_t('suggestions.addTimeout'));
  }

  // 4. Has error handling +10
  if (PATTERNS.BONUS_PATTERNS.ERROR_HANDLING.pattern.test(code)) {
    bonuses.push({ score: 10, featureKey: PATTERNS.BONUS_PATTERNS.ERROR_HANDLING.feature });
  }

  // 5. Uses temporary files +5
  if (PATTERNS.BONUS_PATTERNS.TEMP_FILE.pattern.test(code)) {
    bonuses.push({ score: 5, featureKey: PATTERNS.BONUS_PATTERNS.TEMP_FILE.feature });
  }

  // Calculate total score
  bonuses.forEach(b => {
    score += b.score;
    features.push('✓ ' + _t(`features.${b.featureKey}`));
  });

  // Add warnings
  if (hasNetworkCall && !hasDangerousDownload) {
    warnings.push(_t('warnings.network'));
    suggestions.push(_t('suggestions.cacheOrOffline'));
  }

  if (hasDangerousDownload) {
    warnings.push(_t('warnings.dangerousDownload'));
  }

  PATTERNS.DYNAMIC_INSTALL.forEach(p => {
    if (p.test(code)) {
      warnings.push(_t('warnings.dynamicInstall'));
      suggestions.push(_t('suggestions.removeDynamicInstall'));
    }
  });

  // Boundary handling
  score = Math.max(0, Math.min(100, score));

  // Calculate grade
  const grade = getGrade(score);

  return {
    score,
    grade,
    features,
    warnings,
    suggestions,
    summary: getSummary(score, warnings.length, locale),
    // Compatibility fields
    indep: score,
    label: getLabel(score, locale),
  };
}

/**
 * Get grade
 */
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

/**
 * Get label
 */
function getLabel(score, locale = 'zh-CN') {
  const _t = (key) => t(locale, `independence.labels.${key}`);
  if (score >= 90) return _t('high');
  if (score >= 70) return _t('medium');
  if (score >= 50) return _t('someDeps');
  if (score >= 30) return _t('strongDeps');
  return _t('highlyDependent');
}

/**
 * Get summary
 */
function getSummary(score, warningCount, locale = 'zh-CN') {
  const _t = (key, data) => t(locale, `independence.${key}`, data);
  const base = _t('summary', { score, grade: getGrade(score) });
  if (warningCount > 0) {
    return _t('summaryWithWarnings', { summary: base, count: warningCount });
  }
  return _t('summaryExcellent', { summary: base });
}

module.exports = {
  calculateIndependenceScore,
  PATTERNS,
  getGrade,
  getLabel,
};
