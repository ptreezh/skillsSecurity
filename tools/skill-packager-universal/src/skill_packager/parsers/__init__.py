"""Platform parsers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from skill_packager.schema import (
    ExecutionContract,
    FreeSkillEnhanced,
    SkillContent,
    SkillDefinition,
    SkillResourceRefs,
    TriggerConfig,
)


class BaseParser:
    """Base parser interface."""

    def parse(self, source: Path) -> FreeSkillEnhanced:
        raise NotImplementedError


class WorkBuddyParser(BaseParser):
    """Parse WorkBuddy skill package format."""

    def parse(self, source: Path) -> FreeSkillEnhanced:
        content = source.read_text(encoding="utf-8")
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                meta = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()
            else:
                meta = {}
                body = content
        else:
            meta = {}
            body = content

        skill = SkillDefinition(
            name=meta.get("name", source.stem),
            description=meta.get("description", ""),
            version=meta.get("version", "1.0.0"),
            trigger=TriggerConfig(description=meta.get("trigger", {}).get("description", "")),
            content=SkillContent(body=body, frontmatter=meta),
            resources=SkillResourceRefs(),
            execution=ExecutionContract(),
        )

        return FreeSkillEnhanced(
            freeskill=FreeSkillEnhanced.model_fields["freeskill"].annotation(),
            skill=skill,
        )


class DoubaoParser(BaseParser):
    """Parse Doubao (ByteDance) skill package format.

    Doubao uses YAML frontmatter in SKILL.md:
      ---
      name: <skill-name>
      description: <description>
      version: <version>
      disable-model-invocation: false
      ---
      <body>
    """

    def parse(self, source: Path) -> FreeSkillEnhanced:
        content = source.read_text(encoding="utf-8")
        meta = {}
        body = content

        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                meta = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()

        skill = SkillDefinition(
            name=meta.get("name", source.stem),
            description=meta.get("description", ""),
            version=meta.get("version", "1.0.0"),
            trigger=TriggerConfig(description=meta.get("description", "")),
            content=SkillContent(body=body, frontmatter=meta),
            resources=SkillResourceRefs(),
            execution=ExecutionContract(),
        )

        return FreeSkillEnhanced(
            freeskill=FreeSkillEnhanced.model_fields["freeskill"].annotation(),
            skill=skill,
        )


class CozeParser(BaseParser):
    """Parse Coze (ByteDance) skill package format.

    Coze uses ZIP packages (.skill/.zip) containing:
      SKILL.md
      references/  (optional)
      scripts/     (optional)
      assets/      (optional)
    """

    def parse(self, source: Path) -> FreeSkillEnhanced:
        content = source.read_text(encoding="utf-8")
        meta = {}
        body = content

        if source.suffix.lower() in (".zip", ".skill"):
            import zipfile
            with zipfile.ZipFile(source, "r") as zf:
                skill_md_name = None
                for name in zf.namelist():
                    if name.endswith("SKILL.md") or name == "SKILL.md":
                        skill_md_name = name
                        break
                if skill_md_name:
                    skill_md_content = zf.read(skill_md_name).decode("utf-8")
                    if skill_md_content.startswith("---"):
                        parts = skill_md_content.split("---", 2)
                        if len(parts) >= 3:
                            meta = yaml.safe_load(parts[1]) or {}
                            body = parts[2].strip()
                    else:
                        body = skill_md_content
        elif content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                meta = yaml.safe_load(parts[1]) or {}
                body = parts[2].strip()

        skill = SkillDefinition(
            name=meta.get("name", source.stem),
            description=meta.get("description", ""),
            version=meta.get("version", "1.0.0"),
            trigger=TriggerConfig(description=meta.get("description", "")),
            content=SkillContent(body=body, frontmatter=meta),
            resources=SkillResourceRefs(),
            execution=ExecutionContract(),
        )

        return FreeSkillEnhanced(
            freeskill=FreeSkillEnhanced.model_fields["freeskill"].annotation(),
            skill=skill,
        )


PARSERS = {
    "workbuddy": WorkBuddyParser(),
    "doubao": DoubaoParser(),
    "coze": CozeParser(),
}


def get_parser(platform: str) -> BaseParser:
    parser = PARSERS.get(platform.lower())
    if not parser:
        raise ValueError(f"Unsupported platform: {platform}")
    return parser
