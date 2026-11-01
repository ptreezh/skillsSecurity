"""Platform generators."""

from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Any

import yaml

from skill_packager.schema import FreeSkillEnhanced


class BaseGenerator:
    """Base generator interface."""

    def generate(self, universal: FreeSkillEnhanced) -> bytes:
        raise NotImplementedError

    def _add_frontmatter_skill_md(self, zf: zipfile.ZipFile, skill_name: str, frontmatter: dict, body: str) -> None:
        """Add a SKILL.md with YAML frontmatter to the zip."""
        fm_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
        content = f"---\n{fm_yaml}---\n{body}\n"
        zf.writestr(f"skills/{skill_name}/SKILL.md", content.encode("utf-8"))

    def _add_resource_dirs(self, zf: zipfile.ZipFile, skill_name: str, resources: Any) -> None:
        """Add resource directories (references/, scripts/, assets/) to the zip."""
        base = f"skills/{skill_name}"
        for ref in (resources.references or []):
            zf.writestr(f"{base}/references/{ref}", b"# Reference\n")
        for script in (resources.scripts or []):
            zf.writestr(f"{base}/scripts/{script}", b"# Script placeholder\n")
        for asset in (resources.assets or []):
            zf.writestr(f"{base}/assets/{asset}", b"")


class WorkBuddyGenerator(BaseGenerator):
    """Generate WorkBuddy skill package.

    Output ZIP structure:
      .codebuddy-plugin/plugin.json
      skills/<name>/SKILL.md
      agents/<name>.md            (optional, if agent definition exists)
      .mcp.json                   (optional, if MCP configs exist)
      settings.json
      skills/<name>/references/   (optional)
      skills/<name>/scripts/      (optional)
      skills/<name>/templates/    (optional)
    """

    def generate(self, universal: FreeSkillEnhanced) -> bytes:
        skill = universal.skill
        if not skill:
            raise ValueError("No skill definition found")

        skill_name = skill.name
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # plugin.json
            plugin = {
                "name": skill_name,
                "version": skill.version,
                "description": skill.description,
                "teamLead": f"agents/{skill_name}-lead.md" if universal.agent else None,
                "members": [f"agents/{skill_name}.md"] if universal.agent else [],
                "skills": [skill_name],
            }
            zf.writestr(".codebuddy-plugin/plugin.json", yaml.dump(plugin, default_flow_style=False, allow_unicode=True).encode("utf-8"))

            # SKILL.md
            frontmatter = {
                "name": skill_name,
                "display_name": skill.displayName or skill.name,
                "description": skill.description,
                "description_zh": skill.description,
                "description_en": skill.description,
                "category": skill.category or "开发工具",
                "version": skill.version,
                "author": universal.freeskill.creator or "Unknown",
            }
            self._add_frontmatter_skill_md(zf, skill_name, frontmatter, skill.content.body or "")

            # Agent definition (optional)
            if universal.agent:
                agent_md = self._render_agent_markdown(universal.agent)
                zf.writestr(f"agents/{skill_name}.md", agent_md.encode("utf-8"))

            # MCP config (optional)
            if universal.mcp:
                mcp_data = {}
                for server_name, configs in universal.mcp.items():
                    mcp_data[server_name] = [c.model_dump() if hasattr(c, "model_dump") else dict(c) for c in configs]
                zf.writestr(".mcp.json", yaml.dump(mcp_data, default_flow_style=False, allow_unicode=True).encode("utf-8"))

            # Settings
            settings = {
                "skillNamespace": f"/{skill_name}",
                "autoDiscovery": True,
                "freeskill": {
                    "standard": "freeskill-enhanced",
                    "version": "1.0.0",
                    "creator": universal.freeskill.creator,
                    "forkType": universal.freeskill.forkType.value if hasattr(universal.freeskill.forkType, "value") else universal.freeskill.forkType,
                    "parentSkillId": universal.freeskill.parentSkillId,
                    "parentFingerprint": universal.freeskill.parentFingerprint,
                },
            }
            zf.writestr("settings.json", yaml.dump(settings, default_flow_style=False, allow_unicode=True).encode("utf-8"))

            # Resources
            self._add_resource_dirs(zf, skill_name, skill.resources)
            for template in (skill.resources.assets or []):
                if template.endswith(".json"):
                    zf.writestr(f"skills/{skill_name}/templates/{template}", b"{}")

        return buffer.getvalue()

    def _render_agent_markdown(self, agent: Any) -> str:
        """Render agent definition as Markdown."""
        lines = [f"# {agent.name}\n"]
        if agent.description:
            lines.append(f"\n{agent.description}\n")
        if agent.systemPrompt:
            lines.append(f"\n## System Prompt\n\n{agent.systemPrompt}\n")
        if agent.tools:
            lines.append(f"\n## Tools\n\n{', '.join(agent.tools)}\n")
        return "\n".join(lines)


class DoubaoGenerator(BaseGenerator):
    """Generate Doubao (ByteDance) skill package.

    Output ZIP structure:
      .user_skills/<name>/SKILL.md
      .user_skills/<name>/references/   (optional)
      .user_skills/<name>/scripts/      (optional)
      .user_skills/<name>/assets/       (optional)
    """

    def generate(self, universal: FreeSkillEnhanced) -> bytes:
        skill = universal.skill
        if not skill:
            raise ValueError("No skill definition found")

        skill_name = skill.name
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            base = f".user_skills/{skill_name}"

            # SKILL.md with Doubao-specific frontmatter
            frontmatter = {
                "name": skill_name,
                "description": skill.description,
                "version": skill.version,
                "disable-model-invocation": False,
            }
            fm_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
            content = f"---\n{fm_yaml}---\n{skill.content.body or ''}\n"
            zf.writestr(f"{base}/SKILL.md", content.encode("utf-8"))

            # Resources
            for ref in (skill.resources.references or []):
                zf.writestr(f"{base}/references/{ref}", b"# Reference\n")
            for script in (skill.resources.scripts or []):
                zf.writestr(f"{base}/scripts/{script}", b"# Script placeholder\n")
            for asset in (skill.resources.assets or []):
                zf.writestr(f"{base}/assets/{asset}", b"")

            # Metadata sidecar
            meta = {
                "standard": "freeskill-enhanced",
                "version": "1.0.0",
                "creator": universal.freeskill.creator,
                "forkType": universal.freeskill.forkType.value if hasattr(universal.freeskill.forkType, "value") else universal.freeskill.forkType,
                "parentSkillId": universal.freeskill.parentSkillId,
                "parentFingerprint": universal.freeskill.parentFingerprint,
            }
            zf.writestr(f"{base}/freeskill-metadata.yaml", yaml.dump(meta, default_flow_style=False, allow_unicode=True).encode("utf-8"))

        return buffer.getvalue()


class CozeGenerator(BaseGenerator):
    """Generate Coze (ByteDance) skill package.

    Output ZIP structure:
      SKILL.md
      references/   (optional)
      scripts/      (optional)
      assets/       (optional)
    """

    def generate(self, universal: FreeSkillEnhanced) -> bytes:
        skill = universal.skill
        if not skill:
            raise ValueError("No skill definition found")

        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # SKILL.md
            frontmatter = {
                "name": skill.name,
                "description": skill.description,
                "version": skill.version,
            }
            fm_yaml = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
            content = f"---\n{fm_yaml}---\n{skill.content.body or ''}\n"
            zf.writestr("SKILL.md", content.encode("utf-8"))

            # Resources
            for ref in (skill.resources.references or []):
                zf.writestr(f"references/{ref}", b"# Reference\n")
            for script in (skill.resources.scripts or []):
                zf.writestr(f"scripts/{script}", b"# Script placeholder\n")
            for asset in (skill.resources.assets or []):
                zf.writestr(f"assets/{asset}", b"")

            # On-chain proof sidecar
            if universal.onChain and universal.onChain.txHash:
                receipt = {
                    "skillId": universal.onChain.skillId,
                    "txHash": universal.onChain.txHash,
                    "blockNumber": universal.onChain.blockNumber,
                    "chainId": universal.onChain.chainId,
                    "creator": universal.onChain.creator or universal.freeskill.creator,
                    "timestamp": universal.onChain.registeredAt,
                }
                zf.writestr("proof.json", yaml.dump(receipt, default_flow_style=False, allow_unicode=True).encode("utf-8"))

            # Metadata sidecar
            meta = {
                "standard": "freeskill-enhanced",
                "version": "1.0.0",
                "creator": universal.freeskill.creator,
                "forkType": universal.freeskill.forkType.value if hasattr(universal.freeskill.forkType, "value") else universal.freeskill.forkType,
                "parentSkillId": universal.freeskill.parentSkillId,
                "parentFingerprint": universal.freeskill.parentFingerprint,
            }
            zf.writestr("freeskill-metadata.yaml", yaml.dump(meta, default_flow_style=False, allow_unicode=True).encode("utf-8"))

        return buffer.getvalue()


GENERATORS = {
    "workbuddy": WorkBuddyGenerator(),
    "doubao": DoubaoGenerator(),
    "coze": CozeGenerator(),
}


def get_generator(platform: str) -> BaseGenerator:
    generator = GENERATORS.get(platform.lower())
    if not generator:
        raise ValueError(f"Unsupported platform: {platform}")
    return generator
