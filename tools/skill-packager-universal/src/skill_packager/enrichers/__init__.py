"""Governance enrichers: credit_chain, responsibility, anti_slash, human_auth."""

from __future__ import annotations

from typing import Any

from skill_packager.schema import FreeSkillEnhanced


class BaseEnricher:
    """Base enricher interface."""

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        raise NotImplementedError


class CreditChainEnricher(BaseEnricher):
    """Add credit chain attribution for contributors."""

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        if not universal.responsibility.contributors:
            # Auto-add creator as originator if no contributors
            if universal.freeskill.creator:
                universal.responsibility.contributors.append(
                    {
                        "address": universal.freeskill.creator,
                        "role": "originator",
                        "weight": 1.0,
                        "skillId": None,
                        "contribution": "Original creation",
                        "timestamp": int(__import__("time").time()),
                    }
                )
        return universal


class ResponsibilityEnricher(BaseEnricher):
    """Ensure responsibility config is present and valid."""

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        if not universal.responsibility.creator and universal.freeskill.creator:
            universal.responsibility.creator = universal.freeskill.creator
        if not universal.responsibility.scopeDeclaration:
            universal.responsibility.scopeDeclaration = (
                f"Skill '{universal.skill.name if universal.skill else 'unknown'}' is provided as-is."
            )
        return universal


class AntiSlashEnricher(BaseEnricher):
    """Add anti-slash configuration."""

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        if not universal.antiSlash.violationTypes:
            universal.antiSlash.violationTypes = [
                {
                    "type": "malicious_skill",
                    "punishment": "slash",
                    "evidenceRequired": "multi_layer",
                }
            ]
        return universal


class HumanAuthEnricher(BaseEnricher):
    """Add human authentication configuration."""

    def enrich(self, universal: FreeSkillEnhanced) -> FreeSkillEnhanced:
        if not universal.humanAuth.required:
            universal.humanAuth.required = ["submit", "publish"]
        if not universal.humanAuth.confirmedBy:
            universal.humanAuth.confirmedBy = "wallet_signature"
        return universal


ENRICHERS = [
    CreditChainEnricher(),
    ResponsibilityEnricher(),
    AntiSlashEnricher(),
    HumanAuthEnricher(),
]


def get_enrichers() -> list[BaseEnricher]:
    return ENRICHERS
