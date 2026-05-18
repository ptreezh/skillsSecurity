---
name: freeskill-create
description: Create a new skill conforming to FreeSkill standard with complete governance fields
trigger: "create freeskill {skill_name} with description {description} and trigger {trigger}"
metadata:
  version: "1.0.0"
  author: "FreeAgentSkills"
  tags: ["freeskill", "governance", "creation", "meta"]
  riskLevel: "MEDIUM"
  standard: "freeskill"
  stakeRequired: 50
  attestationCount: 2
scripts:
  - name: "create-freeskill"
    language: "python"
    code: |
      """
      freeskill-create: Create a new skill conforming to FreeSkill standard
      
      Input: skill_name, description, trigger, risk_level, code
      Output: FreeSkill conforming .FREESKILL.md file content
      
      What this meta-skill does:
      1. Validates input conforms to AgentSkills base standard
      2. Generates fingerprint: keccak256(ipfs_hash + creator + timestamp)
      3. Adds all FreeSkill governance fields:
         - freeskill: fingerprint, ipfsHash, stakeRequired, attestationCount, auditTrail
         - responsibility: liabilityDeclaration, scopeDeclaration
         - antiSlash: enabled, slashRate, appealsPeriod
         - humanAuth: required checkpoints
      4. Outputs complete .FREESKILL.md file ready for upload
      """
      
      import hashlib
      import json
      import time
      
      def create_freeskill(skill_name, description, trigger, risk_level, code, author_address):
          """
          Create a FreeSkill conforming skill file
          
          Args:
              skill_name: Name of the skill
              description: Skill description
              trigger: Trigger condition pattern
              risk_level: LOW/MEDIUM/HIGH/CRITICAL
              code: Main skill code
              author_address: Creator wallet address (0x...)
          
          Returns:
              dict with freeskills fields populated
          """
          
          # Validate risk level
          valid_levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
          if risk_level not in valid_levels:
              raise ValueError(f"Invalid risk level: {risk_level}")
          
          # Generate fingerprint components
          timestamp = int(time.time())
          ipfs_hash = f"Qm{timestamp:064x}"  # Simulated IPFS hash
          
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
          stake_required = stake_map[risk_level]
          
          # Attestation count by risk level
          attestation_map = {
              "LOW": 1,
              "MEDIUM": 2,
              "HIGH": 3,
              "CRITICAL": 5
          }
          attestation_count = attestation_map[risk_level]
          
          # Build FreeSkill conforming structure
          freeskills = {
              "name": skill_name,
              "description": description,
              "trigger": trigger,
              "metadata": {
                  "version": "1.0.0",
                  "author": author_address,
                  "tags": ["freeskill"],
                  "riskLevel": risk_level
              },
              "scripts": [
                  {
                      "name": "main",
                      "language": "python",
                      "code": code
                  }
              ],
              "resources": [],
              
              # === FreeSkill Governance Fields ===
              "freeskill": {
                  "fingerprint": f"0x{fingerprint}",
                  "creator": author_address,
                  "createdAt": timestamp,
                  "ipfsHash": ipfs_hash,
                  "riskLevel": risk_level,
                  "stakeRequired": stake_required,
                  "attestationCount": attestation_count,
                  "auditTrail": [
                      f"{timestamp}-CREATED-{author_address}-Skill created with FreeSkill standard"
                  ],
                  "standard": "freeskill",
                  "version": "1.0"
              },
              "responsibility": {
                  "creator": author_address,
                  "verifiers": [],
                  "auditReport": "",
                  "liabilityDeclaration": f"I, {author_address}, take full responsibility for this skill's behavior and outcomes.",
                  "scopeDeclaration": "This skill has access only to explicitly declared resources and parameters."
              },
              "antiSlash": {
                  "enabled": True,
                  "slashRate": 0.5,
                  "appealsPeriod": 7
              },
              "humanAuth": {
                  "required": ["stake", "submit"],
                  "confirmedBy": ""
              }
          }
          
          return freeskills
      
      def to_yaml(freeskills_dict):
          """Convert FreeSkill dict to YAML format"""
          # Simplified YAML output
          lines = ["---"]
          lines.append(f"name: {freeskills_dict['name']}")
          lines.append(f"description: {freeskills_dict['description']}")
          lines.append(f"trigger: \"{freeskills_dict['trigger']}\"")
          lines.append("metadata:")
          lines.append(f"  version: \"{freeskills_dict['metadata']['version']}\"")
          lines.append(f"  author: \"{freeskills_dict['metadata']['author']}\"")
          lines.append(f"  riskLevel: \"{freeskills_dict['metadata']['riskLevel']}\"")
          lines.append("scripts:")
          lines.append("  - name: \"main\"")
          lines.append("    language: \"python\"")
          lines.append("    code: |")
          for line in freeskills_dict['scripts'][0]['code'].split('\n'):
              lines.append(f"      {line}")
          lines.append("")
          lines.append("# === FreeSkill Governance ===")
          lines.append("freeskill:")
          lines.append(f"  fingerprint: \"{freeskills_dict['freeskill']['fingerprint']}\"")
          lines.append(f"  creator: \"{freeskills_dict['freeskill']['creator']}\"")
          lines.append(f"  createdAt: {freeskills_dict['freeskill']['createdAt']}")
          lines.append(f"  ipfsHash: \"{freeskills_dict['freeskill']['ipfsHash']}\"")
          lines.append(f"  stakeRequired: {freeskills_dict['freeskill']['stakeRequired']}")
          lines.append(f"  attestationCount: {freeskills_dict['freeskill']['attestationCount']}")
          lines.append(f"  standard: \"freeskill\"")
          lines.append(f"  version: \"1.0\"")
          lines.append("")
          lines.append("responsibility:")
          lines.append(f"  creator: \"{freeskills_dict['responsibility']['creator']}\"")
          lines.append(f"  liabilityDeclaration: \"{freeskills_dict['responsibility']['liabilityDeclaration']}\"")
          lines.append(f"  scopeDeclaration: \"{freeskills_dict['responsibility']['scopeDeclaration']}\"")
          lines.append("")
          lines.append("antiSlash:")
          lines.append(f"  enabled: {str(freeskills_dict['antiSlash']['enabled']).lower()}")
          lines.append(f"  slashRate: {freeskills_dict['antiSlash']['slashRate']}")
          lines.append(f"  appealsPeriod: {freeskills_dict['antiSlash']['appealsPeriod']}")
          lines.append("")
          lines.append("humanAuth:")
          lines.append(f"  required: [\"stake\", \"submit\"]")
          lines.append("---")
          return '\n'.join(lines)
resources: []