---
name: freeskill-upgrade
description: Upgrade an existing AgentSkills skill to FreeSkill standard with governance fields
trigger: "upgrade skill {skill_name} to freeskill with author {author_address}"
metadata:
  version: "1.0.0"
  author: "FreeAgentSkills"
  tags: ["freeskill", "governance", "upgrade", "meta"]
  riskLevel: "MEDIUM"
  standard: "freeskill"
  stakeRequired: 50
  attestationCount: 2
scripts:
  - name: "upgrade-to-freeskill"
    language: "python"
    code: |
      """
      freeskill-upgrade: Upgrade existing AgentSkills skill to FreeSkill standard
      
      Input: .SKILL.md file content + author_address
      Output: .FREESKILL.md file with governance fields added
      
      What this meta-skill does:
      1. Parse existing .SKILL.md file (backward compatible)
      2. Preserve all original fields unchanged
      3. Add FreeSkill governance fields:
         - freeskill: fingerprint, ipfsHash, stakeRequired, attestationCount, auditTrail
         - responsibility: liabilityDeclaration, scopeDeclaration
         - antiSlash: enabled, slashRate, appealsPeriod
         - humanAuth: required checkpoints
      4. Output complete .FREESKILL.md file
      """
      
      import hashlib
      import time
      import re
      
      def upgrade_to_freeskill(skill_yaml_content, author_address):
          """
          Upgrade AgentSkills skill to FreeSkill standard
          
          Args:
              skill_yaml_content: Existing .SKILL.md file content (YAML format)
              author_address: Upgrade initiator wallet address (0x...)
          
          Returns:
              Upgraded .FREESKILL.md content with governance fields
          """
          
          # Parse existing skill fields
          skill_data = parse_yaml(skill_yaml_content)
          
          if not skill_data:
              raise ValueError("Failed to parse skill file. Ensure valid .SKILL.md format.")
          
          # Extract existing fields (preserve unchanged)
          name = skill_data.get('name', 'unknown')
          description = skill_data.get('description', '')
          trigger = skill_data.get('trigger', '')
          metadata = skill_data.get('metadata', {})
          scripts = skill_data.get('scripts', [])
          resources = skill_data.get('resources', [])
          
          risk_level = metadata.get('riskLevel', 'LOW')
          
          # Validate risk level
          valid_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
          if risk_level not in valid_levels:
              raise ValueError(f"Invalid risk level: {risk_level}")
          
          # Generate FreeSkill governance fields
          timestamp = int(time.time())
          ipfs_hash = f"Qm{timestamp:064x}"  # In production: actual IPFS upload
          
          # Compute fingerprint: keccak256(ipfsHash + creator + timestamp)
          fingerprint_input = f"{ipfs_hash}{author_address}{timestamp}"
          fingerprint = hashlib.sha3_256(fingerprint_input.encode()).hexdigest()
          
          # Stake requirements by risk level
          stake_map = {
              "LOW": 10,
              "MEDIUM": 50,
              "HIGH": 100,
              "CRITICAL": 200
          }
          
          # Attestation requirements by risk level
          attestation_map = {
              "LOW": 1,
              "MEDIUM": 2,
              "HIGH": 3,
              "CRITICAL": 5
          }
          
          # Build upgrade audit trail entry
          upgrade_entry = f"{timestamp}-UPGRADED-{author_address}-Upgraded from AgentSkills to FreeSkill standard"
          
          # Build FreeSkill governance fields
          governance = {
              "freeskill": {
                  "fingerprint": f"0x{fingerprint}",
                  "creator": author_address,
                  "createdAt": timestamp,
                  "ipfsHash": ipfs_hash,
                  "riskLevel": risk_level,
                  "stakeRequired": stake_map[risk_level],
                  "attestationCount": attestation_map[risk_level],
                  "auditTrail": [upgrade_entry],
                  "standard": "freeskill",
                  "version": "1.0",
                  # Original fields preserved
                  "originalName": name,
                  "upgradedFrom": "AgentSkills"
              },
              "responsibility": {
                  "creator": author_address,
                  "verifiers": [],
                  "auditReport": "",
                  "liabilityDeclaration": f"I, {author_address}, take full responsibility for this skill's behavior and accept the anti-slash mechanism.",
                  "scopeDeclaration": "This skill operates within the explicitly declared parameters and resources only."
              },
              "antiSlash": {
                  "enabled": True,
                  "slashRate": 0.5,  # 50% stake penalty on violation
                  "appealsPeriod": 7   # 7 days to appeal
              },
              "humanAuth": {
                  "required": ["stake", "submit"],
                  "confirmedBy": ""
              }
          }
          
          # Merge with original skill data
          upgraded_skill = {
              **skill_data,  # Original AgentSkills fields preserved
              "freeskill": governance["freeskill"],
              "responsibility": governance["responsibility"],
              "antiSlash": governance["antiSlash"],
              "humanAuth": governance["humanAuth"]
          }
          
          return upgraded_skill
      
      def parse_yaml(content):
          """Simple YAML parser for .SKILL.md format"""
          # Basic YAML parsing (in production use yaml library)
          data = {}
          current_section = None
          
          for line in content.split('\n'):
              line = line.strip()
              
              # Skip frontmatter delimiters and comments
              if line.startswith('---') or line.startswith('#'):
                  continue
              
              # Section headers
              if line.endswith(':') and not line.endswith('":'):
                  current_section = line[:-1]
                  if current_section not in data:
                      data[current_section] = {}
                  continue
              
              # Simple key-value
              if ':' in line and current_section:
                  key, val = line.split(':', 1)
                  val = val.strip().strip('"\'')
                  
                  if isinstance(data[current_section], dict):
                      if val and val[0] == '[':
                          # List value
                          data[current_section][key.strip()] = [x.strip().strip('"\'') for x in val[1:-1].split(',')]
                      else:
                          data[current_section][key.strip()] = val
                  else:
                      data[key.strip()] = val
          
          return data
      
      def to_yaml(skill_data):
          """Convert skill data back to YAML format with governance fields"""
          lines = ["---"]
          
          # Original AgentSkills fields
          if 'name' in skill_data:
              lines.append(f"name: {skill_data['name']}")
          if 'description' in skill_data:
              lines.append(f"description: {skill_data['description']}")
          if 'trigger' in skill_data:
              lines.append(f"trigger: \"{skill_data['trigger']}\"")
          
          # Metadata section
          if 'metadata' in skill_data:
              lines.append("metadata:")
              for k, v in skill_data['metadata'].items():
                  if isinstance(v, list):
                      lines.append(f"  {k}: {v}")
                  else:
                      lines.append(f"  {k}: \"{v}\"")
          
          # Scripts section
          if 'scripts' in skill_data:
              lines.append("scripts:")
              for script in skill_data['scripts']:
                  lines.append(f"  - name: \"{script.get('name', 'main')}\"")
                  lines.append(f"    language: \"{script.get('language', 'python')}\"")
                  lines.append("    code: |")
                  code = script.get('code', '')
                  for line in code.split('\n'):
                      lines.append(f"      {line}")
          
          lines.append("")
          
          # === FreeSkill Governance Fields ===
          lines.append("# === FreeSkill Governance ===")
          
          if 'freeskill' in skill_data:
              fs = skill_data['freeskill']
              lines.append("freeskill:")
              lines.append(f"  fingerprint: \"{fs.get('fingerprint', '')}\"")
              lines.append(f"  creator: \"{fs.get('creator', '')}\"")
              lines.append(f"  createdAt: {fs.get('createdAt', 0)}")
              lines.append(f"  ipfsHash: \"{fs.get('ipfsHash', '')}\"")
              lines.append(f"  stakeRequired: {fs.get('stakeRequired', 10)}")
              lines.append(f"  attestationCount: {fs.get('attestationCount', 1)}")
              if 'auditTrail' in fs:
                  lines.append("  auditTrail:")
                  for entry in fs['auditTrail']:
                      lines.append(f"    - \"{entry}\"")
              lines.append(f"  standard: \"freeskill\"")
              lines.append(f"  version: \"{fs.get('version', '1.0')}\"")
          
          if 'responsibility' in skill_data:
              resp = skill_data['responsibility']
              lines.append("")
              lines.append("responsibility:")
              lines.append(f"  creator: \"{resp.get('creator', '')}\"")
              lines.append(f"  liabilityDeclaration: \"{resp.get('liabilityDeclaration', '')}\"")
              lines.append(f"  scopeDeclaration: \"{resp.get('scopeDeclaration', '')}\"")
          
          if 'antiSlash' in skill_data:
              as_data = skill_data['antiSlash']
              lines.append("")
              lines.append("antiSlash:")
              lines.append(f"  enabled: {str(as_data.get('enabled', True)).lower()}")
              lines.append(f"  slashRate: {as_data.get('slashRate', 0.5)}")
              lines.append(f"  appealsPeriod: {as_data.get('appealsPeriod', 7)}")
          
          if 'humanAuth' in skill_data:
              ha = skill_data['humanAuth']
              lines.append("")
              lines.append("humanAuth:")
              lines.append(f"  required: [\"stake\", \"submit\"]")
              if ha.get('confirmedBy'):
                  lines.append(f"  confirmedBy: \"{ha['confirmedBy']}\"")
          
          lines.append("---")
          return '\n'.join(lines)
resources: []