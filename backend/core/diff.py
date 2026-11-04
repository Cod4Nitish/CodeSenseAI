"""
CodeSense AI — unified-diff parser.
by Nitish Singh

Deterministic (no AI). Turns a ``git diff`` into per-file stats and the exact set
of *new-file* line numbers that were added, so AI review comments can be checked
against lines that really changed in the PR.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")


@dataclass
class FileDiff:
    path: str
    additions: int = 0
    deletions: int = 0
    is_new: bool = False
    is_deleted: bool = False
    added_lines: set[int] = field(default_factory=set)
    # (new_line_no, "+" or " ", text) for every new-side line visible in the diff.
    numbered: list[tuple[int, str, str]] = field(default_factory=list)


def parse_diff(diff: str) -> list[FileDiff]:
    files: list[FileDiff] = []
    cur: FileDiff | None = None
    new_no = 0
    in_hunk = False
    for raw in diff.splitlines():
        if raw.startswith("diff --git "):
            m = re.match(r"diff --git a/(.*?) b/(.*)$", raw)
            cur = FileDiff(path=(m.group(2) if m else raw[11:]).strip())
            files.append(cur)
            in_hunk = False
            continue
        if cur is None:
            if raw.startswith("+++ "):  # plain `diff -u` without a git header
                cur = FileDiff(path=raw[4:].removeprefix("b/").split("\t")[0].strip())
                files.append(cur)
            continue
        if not in_hunk:
            if raw.startswith("new file mode"):
                cur.is_new = True
            elif raw.startswith("deleted file mode"):
                cur.is_deleted = True
            elif raw.startswith("+++ "):
                target = raw[4:].split("\t")[0].strip()
                if target != "/dev/null":
                    cur.path = target.removeprefix("b/")
        m = _HUNK.match(raw)
        if m:
            new_no = int(m.group(1))
            in_hunk = True
            continue
        if not in_hunk:
            continue
        if raw.startswith("+"):
            cur.additions += 1
            cur.added_lines.add(new_no)
            cur.numbered.append((new_no, "+", raw[1:]))
            new_no += 1
        elif raw.startswith("-"):
            cur.deletions += 1
        elif raw.startswith("\\"):
            continue
        else:
            cur.numbered.append((new_no, " ", raw[1:]))
            new_no += 1
    return files


def render_for_prompt(files: list[FileDiff], max_chars: int = 60_000) -> str:
    """Compact, line-numbered view of the new side of the diff (``+`` = added)."""
    out: list[str] = []
    used = 0
    for f in files:
        block = [f"### FILE: {f.path}  (+{f.additions} -{f.deletions})"]
        for no, mark, text in f.numbered:
            block.append(f"{no:>5} {mark} {text}")
        chunk = "\n".join(block)
        if used + len(chunk) > max_chars:
            out.append(f"### FILE: {f.path}  (omitted: diff too large)")
            continue
        used += len(chunk)
        out.append(chunk)
    return "\n\n".join(out)
