"""Core pipeline: Parser -> Normalizer -> Enricher -> Generator."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from skill_packager.schema import FreeSkillEnhanced


class Pipeline:
    """Convert a skill package from source format to target platform format."""

    def __init__(self) -> None:
        self.parsers: dict[str, Any] = {}
        self.enrichers: list[Any] = []
        self.generators: dict[str, Any] = {}

    def register_parser(self, platform: str, parser: Any) -> None:
        self.parsers[platform] = parser

    def register_enricher(self, enricher: Any) -> None:
        self.enrichers.append(enricher)

    def register_generator(self, platform: str, generator: Any) -> None:
        self.generators[platform] = generator

    def parse(self, source: Path, platform: str) -> FreeSkillEnhanced:
        parser = self.parsers.get(platform)
        if not parser:
            raise ValueError(f"No parser registered for platform: {platform}")
        return parser.parse(source)

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        for enricher in self.enrichers:
            universal = enricher.enrich(universal)
        return universal

    def generate(self, universal: FreeSkillEnhanced, target_platform: str) -> bytes:
        generator = self.generators.get(target_platform)
        if not generator:
            raise ValueError(f"No generator registered for platform: {target_platform}")
        return generator.generate(universal)

    def run(self, source: Path, target_platform: str, source_platform: str = "auto") -> bytes:
        universal = self.parse(source, source_platform)
        universal = self.enrich(universal)
        return self.generate(universal, target_platform)
