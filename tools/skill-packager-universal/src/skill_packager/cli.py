"""CLI for skill-packager-universal."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import click

from skill_packager.schema import FreeSkillEnhanced
from skill_packager.chain import ChainClient, ChainConfig


@click.group()
@click.version_option(version="0.1.0", prog_name="skill-packager")
def cli() -> None:
    """Cross-platform skill package converter with on-chain proof."""


@cli.command()
@click.argument("input_path", type=click.Path(exists=True, path_type=Path))
@click.option("--output", "-o", required=True, type=click.Path(path_type=Path), help="Output ZIP path")
@click.option("--target-platform", "-t", required=True, help="Target platform (workbuddy|doubao|coze)")
@click.option("--name", "-n", help="Skill name")
@click.option("--description", "-d", help="Skill description")
def convert(
    input_path: Path,
    output: Path,
    target_platform: str,
    name: str | None,
    description: str | None,
) -> None:
    """Convert a skill package to target platform format and save as ZIP."""
    click.echo(f"[convert] Input: {input_path}")
    click.echo(f"[convert] Target platform: {target_platform}")

    try:
        from skill_packager.parsers import get_parser
        from skill_packager.enrichers import get_enrichers
        from skill_packager.generators import get_generator

        # Parse
        parser = get_parser(target_platform)
        universal = parser.parse(input_path)

        # Override name/description if provided
        if name and universal.skill:
            universal.skill.name = name
        if description and universal.skill:
            universal.skill.description = description

        # Enrich
        for enricher in get_enrichers():
            universal = enricher.enrich(universal)

        # Generate
        generator = get_generator(target_platform)
        zip_bytes = generator.generate(universal)

        # Save
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(zip_bytes)
        click.echo(f"[convert] Output: {output} ({len(zip_bytes)} bytes)")
    except Exception as e:
        click.echo(f"[convert] Error: {e}", err=True)
        sys.exit(1)


@cli.group()
def chain() -> None:
    """On-chain registration and verification commands."""


@chain.command("register")
@click.argument("package_path", type=click.Path(exists=True, path_type=Path))
@click.option("--creator", "-c", required=True, help="Creator address (0x...)")
@click.option("--parent-skill-id", "-p", type=int, help="Parent skill ID if forked")
@click.option("--parent-fingerprint", help="Parent skill fingerprint")
@click.option("--fork-type", "-f", type=click.Choice(["original", "fork", "modify", "translation", "extension"]), default="original")
@click.option("--backend-url", envvar="BACKEND_API_URL", default="http://localhost:10001", help="Backend API URL")
def chain_register(
    package_path: Path,
    creator: str,
    parent_skill_id: int | None,
    parent_fingerprint: str | None,
    fork_type: str,
    backend_url: str,
) -> None:
    """Register a skill package on-chain."""
    click.echo(f"[chain:register] Package: {package_path}")
    click.echo(f"[chain:register] Creator: {creator}")
    click.echo(f"[chain:register] Fork type: {fork_type}")

    try:
        from skill_packager.parsers import get_parser

        # Parse package
        parser = get_parser("workbuddy")
        universal = parser.parse(package_path)

        # Update fork metadata
        if parent_skill_id:
            universal.freeskill.parentSkillId = parent_skill_id
        if parent_fingerprint:
            universal.freeskill.parentFingerprint = parent_fingerprint
        universal.freeskill.forkType = ForkType(fork_type)

        # Ensure responsibility has contributors
        if not universal.responsibility.contributors:
            universal.responsibility.contributors.append(
                {
                    "address": creator,
                    "role": "originator",
                    "weight": 1.0,
                    "skillId": None,
                    "contribution": "Original creation",
                    "timestamp": int(__import__("time").time()),
                }
            )

        # Register on-chain
        from skill_packager.chain import ChainClient, ChainConfig
        client = ChainClient(ChainConfig(backendUrl=backend_url))
        result = client.register_skill(universal, creator)

        if result.success:
            click.echo(f"[chain:register] Success!")
            click.echo(f"  skillId: {result.receipt.skillId}")
            click.echo(f"  txHash: {result.receipt.txHash}")
            click.echo(f"  blockNumber: {result.receipt.blockNumber}")
        else:
            click.echo(f"[chain:register] Failed: {result.message}", err=True)
            sys.exit(1)
    except requests.ConnectionError:
        click.echo("[chain:register] Error: Backend not available. Start the server first.", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"[chain:register] Error: {e}", err=True)
        sys.exit(1)


@chain.command("lineage")
@click.argument("skill_id", type=int)
@click.option("--backend-url", envvar="BACKEND_API_URL", default="http://localhost:10001")
def chain_lineage(skill_id: int, backend_url: str) -> None:
    """Query skill lineage (ancestors, descendants, contributors)."""
    click.echo(f"[chain:lineage] Skill ID: {skill_id}")

    import requests
    try:
        resp = requests.get(f"{backend_url}/api/chain/skills/{skill_id}/lineage", timeout=30)
        if resp.status_code != 200:
            click.echo(f"[chain:lineage] Failed: {resp.status_code} {resp.text}", err=True)
            sys.exit(1)
        data = resp.json()
        click.echo(json.dumps(data, indent=2, ensure_ascii=False))
    except requests.ConnectionError:
        click.echo("[chain:lineage] Error: Backend not available. Start the server first.", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"[chain:lineage] Error: {e}", err=True)
        sys.exit(1)


@chain.command("receipt")
@click.argument("skill_id", type=int)
@click.option("--backend-url", envvar="BACKEND_API_URL", default="http://localhost:10001")
@click.option("--output", "-o", type=click.Path(path_type=Path), help="Save receipt to file")
def chain_receipt(skill_id: int, backend_url: str, output: Path | None) -> None:
    """Download skill proof receipt."""
    click.echo(f"[chain:receipt] Skill ID: {skill_id}")

    import requests
    try:
        resp = requests.get(f"{backend_url}/api/chain/skills/{skill_id}/receipt", timeout=30)
        if resp.status_code != 200:
            click.echo(f"[chain:receipt] Failed: {resp.status_code} {resp.text}", err=True)
            sys.exit(1)
        data = resp.json()
        receipt_json = json.dumps(data, indent=2, ensure_ascii=False)

        if output:
            output.write_text(receipt_json, encoding="utf-8")
            click.echo(f"[chain:receipt] Saved to {output}")
        else:
            click.echo(receipt_json)
    except requests.ConnectionError:
        click.echo("[chain:receipt] Error: Backend not available. Start the server first.", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"[chain:receipt] Error: {e}", err=True)
        sys.exit(1)


@chain.command("contributors")
@click.argument("skill_id", type=int)
@click.option("--backend-url", envvar="BACKEND_API_URL", default="http://localhost:10001")
def chain_contributors(skill_id: int, backend_url: str) -> None:
    """Query skill contributors attribution."""
    click.echo(f"[chain:contributors] Skill ID: {skill_id}")

    import requests
    try:
        resp = requests.get(f"{backend_url}/api/chain/skills/{skill_id}/contributors", timeout=30)
        if resp.status_code != 200:
            click.echo(f"[chain:contributors] Failed: {resp.status_code} {resp.text}", err=True)
            sys.exit(1)
        data = resp.json()
        click.echo(json.dumps(data, indent=2, ensure_ascii=False))
    except requests.ConnectionError:
        click.echo("[chain:contributors] Error: Backend not available. Start the server first.", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"[chain:contributors] Error: {e}", err=True)
        sys.exit(1)


@cli.command()
@click.argument("package_path", type=click.Path(exists=True, path_type=Path))
@click.option("--platform", "-p", default="workbuddy", help="Source platform (workbuddy|doubao|coze)")
def validate(package_path: Path, platform: str) -> None:
    """Validate a skill package against FreeSkill Enhanced schema."""
    click.echo(f"[validate] Package: {package_path}")

    try:
        from skill_packager.parsers import get_parser
        parser = get_parser(platform)
        universal = parser.parse(package_path)
        click.echo("[validate] Package is valid")
        click.echo(f"  Name: {universal.skill.name if universal.skill else 'N/A'}")
        click.echo(f"  Version: {universal.skill.version if universal.skill else 'N/A'}")
        click.echo(f"  Fork type: {universal.freeskill.forkType}")
        click.echo(f"  Contributors: {len(universal.responsibility.contributors)}")
    except Exception as e:
        click.echo(f"[validate] Invalid: {e}", err=True)
        sys.exit(1)


def main() -> None:
    cli()


if __name__ == "__main__":
    main()
