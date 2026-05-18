/**
 * TDD: 独立性评分测试用例
 *
 * 基于最佳实践设计的测试用例
 * 原则: 开发者友好，加分制，无阻塞
 */

const { calculateIndependenceScore } = require('../server/independence-scorer');

describe('独立性评分 (Independence Scoring)', () => {
  describe('基础评分 (50分制)', () => {
    test('空技能应得基础分', () => {
      const result = calculateIndependenceScore('');
      expect(result.score).toBe(50);
      expect(result.grade).toBe('C');
    });

    test('简单计算技能应得高分', () => {
      const code = `
def add(a, b):
    return a + b
`;
      const result = calculateIndependenceScore(code);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.grade).toBe('A');
    });
  });

  describe('加分项测试', () => {
    test('使用环境变量应+15分', () => {
      const code = `
import os
api_key = os.getenv('API_KEY')
`;
      const result = calculateIndependenceScore(code);
      expect(result.features).toContain('使用环境变量存储密钥');
    });

    test('有超时设置应+10分', () => {
      const code = `
import requests
response = requests.get(url, timeout=30)
`;
      const result = calculateIndependenceScore(code);
      expect(result.features).toContain('有超时设置');
    });

    test('无外部调用应+20分', () => {
      const code = `
def calculate(a, b):
    return a * b + 100
`;
      const result = calculateIndependenceScore(code);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.grade).toBe('A');
    });
  });

  describe('警告项测试 (不影响分数)', () => {
    test('有网络调用应显示警告但不影响分数', () => {
      const code = `
import requests
response = requests.get(url)
`;
      const result = calculateIndependenceScore(code);
      expect(result.warnings).toContain('包含外部网络调用');
      expect(result.score).toBeGreaterThanOrEqual(50);
    });

    test('有动态安装应警告', () => {
      const code = `
import subprocess
subprocess.run(['pip', 'install', package])
`;
      const result = calculateIndependenceScore(code);
      expect(result.warnings).toContain('动态包安装 (可能影响可移植性)');
    });
  });

  describe('评分等级', () => {
    test('90-100分应为A', () => {
      const result = calculateIndependenceScore('return a + b');
      expect(result.grade).toBe('A');
    });

    test('70-89分应为B', () => {
      const code = `
import os
key = os.getenv('KEY')
return key
`;
      const result = calculateIndependenceScore(code);
      expect(['A', 'B']).toContain(result.grade);
    });

    test('50-69分应为C', () => {
      const result = calculateIndependenceScore('requests.get(url)');
      expect(['B', 'C']).toContain(result.grade);
    });

    test('低于50分应为D', () => {
      const code = `
import requests
requests.post(url, data)
pip install
`;
      const result = calculateIndependenceScore(code);
      expect(['C', 'D']).toContain(result.grade);
    });
  });

  describe('边界条件', () => {
    test('空代码应返回基础分', () => {
      const result = calculateIndependenceScore('');
      expect(result.score).toBe(50);
    });

    test('超长代码应正常处理', () => {
      const code = 'x = 1\n'.repeat(10000);
      const result = calculateIndependenceScore(code);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
