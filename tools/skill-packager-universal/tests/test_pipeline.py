"""End-to-end pipeline test."""

import zipfile
from pathlib import Path

from skill_packager.parsers import get_parser
from skill_packager.enrichers import get_enrichers
from skill_packager.generators import get_generator
from skill_packager.pipeline import Pipeline


def test_pipeline() -> None:
    example = Path("examples/example-analyzer.skill.md")
    if not example.exists():
        print(f"SKIP: {example} not found")
        return

    for platform in ("workbuddy", "doubao", "coze"):
        pipeline = Pipeline()
        pipeline.register_parser(platform, get_parser(platform))
        for enricher in get_enrichers():
            pipeline.register_enricher(enricher)
        pipeline.register_generator(platform, get_generator(platform))

        universal = pipeline.parse(example, platform)
        universal = pipeline.enrich(universal)
        output = pipeline.generate(universal, platform)

        assert isinstance(output, bytes), f"{platform}: generator must return bytes"
        assert len(output) > 0, f"{platform}: empty output"

        with zipfile.ZipFile(Path(".") / f"test-output-{platform}.zip", "w") as zf:
            zf.writestr(f"{platform}-package.bin", output)

        print(f"[{platform}] OK: {len(output)} bytes")

    print("Pipeline test passed for all platforms")


if __name__ == "__main__":
    test_pipeline()
