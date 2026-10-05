#!/usr/bin/env python
# -*- coding: utf-8 -*-
r"""Validate Markdown table shape in the WorkBuddy listing/connector plan doc.

Why this exists
---------------
An earlier verification pass only counted table *rows* and never compared
*column counts*, so four risk rows (`R15`, `R19`, `R20`, `R21`) silently shipped
with one extra cell: their mitigation text had been split into two cells by a
stray `|`. GitHub-flavoured Markdown then renders 责任人/状态 shifted one column
left, which looks like correct data but is not.

Rule enforced
-------------
Within one table block, every row (header, separator, data) must contain the
same number of *unescaped* ``|`` delimiters. Per GFM, a ``|`` inside a cell
splits cells unless written ``\|``, so unescaped pipes are counted literally.

Usage
-----
    py -X utf8 scripts/check_plan_tables.py [file.md ...]

Exit codes: 0 = all tables well-formed, 1 = at least one malformed row,
2 = bad invocation / unreadable file.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

DEFAULT_TARGETS = (
    Path("docs/plans/2026-10-05-workbuddy-listing-and-connector.md"),
)

# A row that opens a markdown table cell block.
ROW_RE = re.compile(r"^\s*\|")
# GFM separator row, e.g. |---|---|:--:|
SEPARATOR_RE = re.compile(r"^\s*\|[\s:|-]+\|\s*$")
# Escaped pipe inside a cell: must not be treated as a delimiter.
ESCAPED_PIPE_RE = re.compile(r"\\\|")


def count_delimiters(line: str) -> int:
    """Count cell delimiters, ignoring ``\\|``."""
    return ESCAPED_PIPE_RE.sub("", line).count("|")


def table_blocks(lines: list[str]) -> list[tuple[int, int, int]]:
    """Return (start, end, expected_pipes) for each table block, 1-based lines.

    ``expected_pipes`` is the header's delimiter count. Blocks that are not
    tables (no separator row) are reported with ``expected_pipes`` 0 so the
    caller can flag them.
    """
    blocks: list[tuple[int, int, int]] = []
    i = 0
    total = len(lines)
    while i < total:
        if not ROW_RE.match(lines[i]):
            i += 1
            continue
        start = i
        while i < total and ROW_RE.match(lines[i]):
            i += 1
        end = i - 1
        expected = count_delimiters(lines[start])
        if start + 1 <= end and SEPARATOR_RE.match(lines[start + 1]):
            blocks.append((start + 1, end + 1, expected))
        else:
            blocks.append((start + 1, end + 1, 0))
    return blocks


def check_file(path: Path) -> list[str]:
    """Return a list of problem descriptions for one markdown file."""
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        return [f"{path}: not valid UTF-8 ({exc})"]
    except OSError as exc:
        return [f"{path}: cannot read ({exc})"]

    lines = text.splitlines()
    problems: list[str] = []
    tables = 0

    for start, end, expected in table_blocks(lines):
        header = lines[start - 1].strip()
        if expected == 0:
            problems.append(
                f"{path}:{start}: pipe block is not a valid table "
                f"(missing separator row): {header[:60]!r}"
            )
            continue
        tables += 1
        width = expected - 1  # delimiters -> columns
        for lineno in range(start, end + 1):
            line = lines[lineno - 1]
            got = count_delimiters(line)
            if got != expected:
                rid = line.strip().lstrip("|").split("|")[0].strip()[:24]
                problems.append(
                    f"{path}:{lineno}: row {rid!r} has {got} pipes "
                    f"but header has {expected} "
                    f"(off by {got - expected:+d}; expected {width} columns)"
                )

    print(f"{path}: {tables} table(s) checked")
    return problems


def main(argv: list[str]) -> int:
    targets = [Path(a) for a in argv[1:]] or list(DEFAULT_TARGETS)
    missing = [t for t in targets if not t.exists()]
    if missing:
        for t in missing:
            print(f"ERROR: target not found: {t}", file=sys.stderr)
        return 2

    problems: list[str] = []
    for t in targets:
        problems.extend(check_file(t))

    if problems:
        print()
        for p in problems:
            print(f"FAIL {p}")
        print(f"\n{len(problems)} malformed table row(s)", file=sys.stderr)
        return 1

    print("OK: all table rows match their header column count")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))