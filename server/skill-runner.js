/**
 * SkillRunner - AgentSkills Skill Runtime
 *
 * 加载并执行 .SKILL.md 格式的技能
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

class SkillRunner {
  constructor(skillDir = './skills') {
    this.skillDir = skillDir;
    this.loadedSkills = new Map();
  }

  /**
   * 加载 Skill 文件
   * @param {string} name - Skill 名称 (不含扩展名)
   * @returns {Object} - 解析后的 Skill 对象
   */
  loadSkill(name) {
    if (this.loadedSkills.has(name)) {
      return this.loadedSkills.get(name);
    }

    const files = fs.readdirSync(this.skillDir)
      .filter(f => f.includes(name) && (f.endsWith('.SKILL.md') || f.endsWith('.FREESKILL.md')));

    if (files.length === 0) {
      throw new Error(`Skill not found: ${name}`);
    }

    const skillPath = path.join(this.skillDir, files[0]);
    const content = fs.readFileSync(skillPath, 'utf-8');

    // 解析 frontmatter + markdown
    const skill = this.parseSkill(content);
    skill._path = skillPath;
    skill._filename = files[0];

    this.loadedSkills.set(name, skill);
    return skill;
  }

  /**
   * 解析 .SKILL.md 文件
   * 支持两种格式:
   * 1. 标准 markdown: --- frontmatter --- body
   * 2. 纯 YAML: --- 整个文件都是 YAML ---
   */
  parseSkill(content) {
    const firstDash = content.indexOf('---');
    if (firstDash === -1) {
      throw new Error('Invalid .SKILL.md format: missing frontmatter separator');
    }

    // 尝试找第二个行首的 ---
    // 格式1: \n---\n (markdown分隔)
    // 格式2: 整个文件就是 YAML
    const afterFirst = content.slice(firstDash + 3);
    const secondDashMatch = afterFirst.match(/\n---\n/);

    let frontmatterStr, body;

    if (secondDashMatch) {
      // 格式1: 标准 markdown
      frontmatterStr = content.slice(firstDash + 3, firstDash + 3 + secondDashMatch.index);
      body = content.slice(firstDash + 3 + secondDashMatch.index + secondDashMatch[0].length);
    } else {
      // 格式2: 整个文件是 YAML (frontmatter结束位置就是文件末尾)
      frontmatterStr = content.slice(firstDash + 3);
      body = '';
    }

    // 正确解析 frontmatter
    const frontmatter = this.parseFrontmatter(frontmatterStr);

    // 提取代码块 (仅当有body时)
    const scripts = [];
    if (body) {
      const codeBlocks = body.match(/```(\w+)\n([\s\S]*?)```/g) || [];
      for (const block of codeBlocks) {
        const match = block.match(/```(\w+)\n([\s\S]*?)```/);
        if (match) {
          scripts.push({
            language: match[1],
            code: match[2].trim()
          });
        }
      }
    }
    const codeBlocks = body.match(/```(\w+)\n([\s\S]*?)```/g) || [];

    for (const block of codeBlocks) {
      const match = block.match(/```(\w+)\n([\s\S]*?)```/);
      if (match) {
        scripts.push({
          language: match[1],
          code: match[2].trim()
        });
      }
    }

    // 如果 frontmatter 中有 scripts 定义，优先使用
    if (frontmatter.scripts) {
      const parsed = Array.isArray(frontmatter.scripts)
        ? frontmatter.scripts
        : [frontmatter.scripts];

      for (const s of parsed) {
        if (s.language && s.code) {
          // frontmatter 中已有完整脚本定义
          scripts.push({
            name: s.name || 'default',
            language: s.language,
            code: s.code.trim()
          });
        }
      }
    }

    return {
      ...frontmatter,
      scripts,
      _body: body
    };
  }

  /**
   * 解析 YAML frontmatter
   */
  parseFrontmatter(yamlStr) {
    try {
      return yaml.load(yamlStr);
    } catch (e) {
      console.error('YAML parse error:', e.message);
      return {};
    }
  }

  /**
   * 执行 Skill
   * @param {string} skillName - Skill 名称
   * @param {string} trigger - 触发条件 (用于匹配脚本)
   * @param {Object} params - 输入参数
   */
  async execute(skillName, trigger, params = {}) {
    const skill = this.loadSkill(skillName);

    console.log(`[SkillRunner] Executing: ${skillName}`);
    console.log(`[SkillRunner] Trigger: ${trigger}`);
    console.log(`[SkillRunner] Scripts: ${skill.scripts.length}`);

    // 找匹配的脚本
    const matchedScripts = skill.scripts.filter(s =>
      !trigger || skill.name.includes(trigger.split(' ')[0])
    );

    if (matchedScripts.length === 0) {
      throw new Error(`No matching script found for trigger: ${trigger}`);
    }

    // 执行主脚本 (第一个 Python 或 JS 脚本)
    const mainScript = matchedScripts.find(s =>
      s.language === 'python' || s.language === 'javascript'
    ) || matchedScripts[0];

    console.log(`[SkillRunner] Running: ${mainScript.language}`);

    // 构建输入
    const input = {
      ...params,
      _trigger: trigger,
      _skill: skillName
    };

    // 执行脚本
    return this.runScript(mainScript, input);
  }

  /**
   * 运行脚本
   */
  runScript(script, params) {
    return new Promise((resolve, reject) => {
      let code = script.code;

      // 注入参数
      code = code.replace(
        /\ninputs\s*=\s*([^{]+)/,
        `\ninputs = ${JSON.stringify(params)}`
      );

      const ext = script.language === 'python' ? 'py' : 'js';
      const tmpFile = path.join(__dirname, `../temp_skill_${Date.now()}.${ext}`);

      fs.writeFileSync(tmpFile, code);

      // Windows 兼容: Python 用 py.exe
      const isPython = script.language === 'python';
      const cmd = isPython ? 'py' : (script.language === 'javascript' ? 'node' : script.language);
      const args = isPython ? ['-u', tmpFile] : [tmpFile];

      const proc = spawn(cmd, args, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        // 清理临时文件
        try { fs.unlinkSync(tmpFile); } catch (e) {}

        if (code === 0) {
          // 尝试解析 JSON 输出
          try {
            const jsonMatch = stdout.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]));
            } else {
              resolve({ output: stdout.trim() });
            }
          } catch (e) {
            resolve({ output: stdout.trim() });
          }
        } else {
          reject(new Error(`Script failed (${code}): ${stderr || stdout}`));
        }
      });

      proc.on('error', (err) => {
        try { fs.unlinkSync(tmpFile); } catch (e) {}
        reject(err);
      });
    });
  }

  /**
   * 列出所有可用的 Skills
   */
  listSkills() {
    return fs.readdirSync(this.skillDir)
      .filter(f => f.endsWith('.SKILL.md'))
      .map(f => {
        const content = fs.readFileSync(path.join(this.skillDir, f), 'utf-8');
        const parts = content.split('---');
        if (parts.length >= 2) {
          const fm = this.parseFrontmatter(parts[1]);
          return {
            name: fm.name || f.replace('.SKILL.md', ''),
            description: fm.description || '',
            version: fm.version || '',
            riskLevel: fm.riskLevel || ''
          };
        }
        return { name: f.replace('.SKILL.md', '') };
      });
  }
}

module.exports = SkillRunner;
