"""
CodeSense AI — /api/github/pr: fetch the diff of a PUBLIC GitHub pull request.
by Nitish Singh

Lets a user paste a PR link instead of a raw diff. SSRF-safe by construction: only
``https://github.com/<owner>/<repo>/pull/<n>`` is accepted, and we only ever request
that exact github.com URL (the .diff endpoint), never a user-supplied host.
"""

from __future__ import annotations

import asyncio
import logging
import re
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from core.ratelimit import analyze_rate_limit

logger = logging.getLogger("codesense.github")
router = APIRouter()

_PR_RE = re.compile(r"^https://github\.com/([A-Za-z0-9_.-]{1,100})/([A-Za-z0-9_.-]{1,100})/pull/(\d{1,7})(?:[/?#].*)?$")
_MAX_BYTES = 400_000


class GithubPR(BaseModel):
    title: str
    diff: str
    truncated: bool = False


def _fetch(url: str) -> tuple[str, bool]:
    req = urllib.request.Request(url, headers={"User-Agent": "CodeSenseAI", "Accept": "text/plain"})
    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310 - host pinned by regex above
        raw = resp.read(_MAX_BYTES + 1)
    return raw[:_MAX_BYTES].decode("utf-8", "replace"), len(raw) > _MAX_BYTES


@router.get("/github/pr", response_model=GithubPR, tags=["github"], dependencies=[Depends(analyze_rate_limit)])
async def github_pr(url: str = Query(..., max_length=300)) -> GithubPR:
    m = _PR_RE.match(url.strip())
    if not m:
        raise HTTPException(422, "Paste a link like https://github.com/owner/repo/pull/123")
    owner, repo, num = m.groups()
    try:
        diff, truncated = await asyncio.to_thread(_fetch, f"https://github.com/{owner}/{repo}/pull/{num}.diff")
    except urllib.error.HTTPError as e:
        if e.code in (403, 404):
            raise HTTPException(404, "PR not found, or the repository is private. Only public PRs work.")
        raise HTTPException(502, "GitHub did not return the diff. Try again.")
    except Exception:
        logger.exception("github fetch failed")
        raise HTTPException(502, "Could not reach GitHub. Try again.")
    if not diff.strip():
        raise HTTPException(404, "This PR has no diff.")
    return GithubPR(title=f"{owner}/{repo}#{num}", diff=diff, truncated=truncated)
