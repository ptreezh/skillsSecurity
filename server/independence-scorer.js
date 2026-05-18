/**
 * 独立性评分器 (Independence Scorer)
 *
 * 原则: 开发者友好，加分制，无阻塞
 * 评分范围: 0-100
 *
 * 加分项:
 *   +20: 无外部网络调用 (纯本地计算)
 *   +15: 使用环境变量存储密钥
 *   +10: 有超时设置
 *   +10: 有错误处理
 *   +5: 使用临时文件
 *
 * 警告项 (不影响分数):
 *   - 动态包安装
 *   - 下载可执行文件
 *   - 无超时设置
 */

const PATTERNS = {
  // 网络调用模式 (警告)
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

  // 危险下载模式 (警告)
  DANGEROUS_DOWNLOAD: [
    /\.(exe|bat|cmd|vbs|ps1|sh|bash)\s*$/i,
  ],

  // 动态安装模式 (警告)
  DYNAMIC_INSTALL: [
    /pip\s+install/i,
    /pip3\s+install/i,
    /npm\s+install/i,
    /subprocess.*install/i,
    /os\.system.*install/i,
  ],

  // 加分模式
  BONUS_PATTERNS: {
    NO_NETWORK: {
      pattern: /^(?!.*(?:http|requests|urllib|axios|fetch|wget|curl))(?!.*(?:import\s+\w+\s*$))/s,
      score: 20,
      feature: '纯本地计算，无外部依赖'
    },
    ENV_VAR: {
      pattern: /os\.getenv|os\.environ\.get|process\.env/i,
      score: 15,
      feature: '使用环境变量存储密钥'
    },
    TIMEOUT: {
      pattern: /timeout\s*=\s*[0-9]+|timeout\s*=\s*[a-z_]+\.seconds/i,
      score: 10,
      feature: '有超时设置'
    },
    ERROR_HANDLING: {
      pattern: /try\s*:|except\s*:|catch\s*\(|if\s+error/i,
      score: 10,
      feature: '有错误处理'
    },
    TEMP_FILE: {
      pattern: /tempfile\.|NamedTemporaryFile|mktemp/i,
      score: 5,
      feature: '使用临时文件'
    },
  }
};

// 警告消息
const WARNING_MESSAGES = {
  NETWORK: '包含外部网络调用',
  DYNAMIC_INSTALL: '动态包安装 (可能影响可移植性)',
  NO_TIMEOUT: '无超时设置 (建议添加 timeout=)',
  DANGEROUS_DOWNLOAD: '下载可执行文件 (需确认来源)',
  SENSITIVE_NETWORK: '可能的数据外发 (需确认目标)',
};

/**
 * 计算独立性评分
 * @param {string} skillContent - Skill 内容
 * @returns {Object} 评分结果
 */
function calculateIndependenceScore(skillContent) {
  const code = skillContent || '';
  let score = 50; // 基础分
  const features = [];
  const warnings = [];
  const suggestions = [];

  // 检查加分项
  const bonuses = [];

  // 1. 无外部网络调用 +20
  const hasNetworkCall = PATTERNS.NETWORK_CALLS.some(p => p.test(code));
  const hasDangerousDownload = PATTERNS.DANGEROUS_DOWNLOAD.some(p => p.test(code));

  if (!hasNetworkCall && !hasDangerousDownload) {
    bonuses.push({ score: 20, feature: PATTERNS.BONUS_PATTERNS.NO_NETWORK.feature });
  }

  // 2. 使用环境变量 +15
  if (PATTERNS.BONUS_PATTERNS.ENV_VAR.pattern.test(code)) {
    bonuses.push({ score: 15, feature: PATTERNS.BONUS_PATTERNS.ENV_VAR.feature });
  }

  // 3. 有超时设置 +10
  if (PATTERNS.BONUS_PATTERNS.TIMEOUT.pattern.test(code)) {
    bonuses.push({ score: 10, feature: PATTERNS.BONUS_PATTERNS.TIMEOUT.feature });
  } else if (hasNetworkCall) {
    warnings.push(WARNING_MESSAGES.NO_TIMEOUT);
    suggestions.push('添加 timeout 参数: requests.get(url, timeout=30)');
  }

  // 4. 有错误处理 +10
  if (PATTERNS.BONUS_PATTERNS.ERROR_HANDLING.pattern.test(code)) {
    bonuses.push({ score: 10, feature: PATTERNS.BONUS_PATTERNS.ERROR_HANDLING.feature });
  }

  // 5. 使用临时文件 +5
  if (PATTERNS.BONUS_PATTERNS.TEMP_FILE.pattern.test(code)) {
    bonuses.push({ score: 5, feature: PATTERNS.BONUS_PATTERNS.TEMP_FILE.feature });
  }

  // 计算总分
  bonuses.forEach(b => {
    score += b.score;
    features.push('✓ ' + b.feature);
  });

  // 添加警告
  if (hasNetworkCall && !hasDangerousDownload) {
    warnings.push(WARNING_MESSAGES.NETWORK);
    suggestions.push('考虑: 缓存结果或提供离线模式');
  }

  if (hasDangerousDownload) {
    warnings.push(WARNING_MESSAGES.DANGEROUS_DOWNLOAD);
  }

  PATTERNS.DYNAMIC_INSTALL.forEach(p => {
    if (p.test(code)) {
      warnings.push(WARNING_MESSAGES.DYNAMIC_INSTALL);
      suggestions.push('建议: 移除动态安装，改用预装依赖');
    }
  });

  // 边界处理
  score = Math.max(0, Math.min(100, score));

  // 计算等级
  const grade = getGrade(score);

  return {
    score,
    grade,
    features,
    warnings,
    suggestions,
    summary: getSummary(score, warnings.length),
    // 兼容性字段
    indep: score,
    label: getLabel(score),
  };
}

/**
 * 获取等级
 */
function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 70) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

/**
 * 获取标签
 */
function getLabel(score) {
  if (score >= 90) return '高度独立';
  if (score >= 70) return '较独立';
  if (score >= 50) return '有外部依赖';
  if (score >= 30) return '强外部依赖';
  return '高度依赖';
}

/**
 * 获取摘要
 */
function getSummary(score, warningCount) {
  const base = `独立性评分: ${score}分 (${getGrade(score)})`;
  if (warningCount > 0) {
    return `${base}, 有 ${warningCount} 项建议`;
  }
  return `${base}, 表现优秀!`;
}

module.exports = {
  calculateIndependenceScore,
  PATTERNS,
  getGrade,
  getLabel,
};
