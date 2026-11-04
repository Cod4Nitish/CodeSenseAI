# Demo script and viva cheat-sheet

Presentation notes for CodeSense AI. The main README is [here](../README.md).

## 2-minute demo script (4 steps)

Open <http://localhost:5173> (backend on :8000), or the live site. Nothing to type anywhere.

1. **Analyze (40 s).** Click **Try an example**. Watch the scan beam sweep the editor, then the
   score count up (4.2 / D), red squiggles appear on lines 4, 8, 12 and the CWE / OWASP-tagged issues
   slide in. Click an `L8` badge (editor jumps to the line), click **fix all** to see the
   before/after diff, then **reset**.
2. **PR review (40 s).** Top bar, **PR Review**, **Load sample PR**, **Review PR**. Point out the
   stepped loader, the risk level, per-file groups, the severity filter chips and the line
   "verified against the lines this PR changed" (the hallucination guard). Click **export .md**.
3. **AI chat (30 s).** Back on Workspace, click **Ask AI**, press the **Why is this unsafe?**
   chip, then **Apply to editor** on the suggested code. (Tabs **Explain** and **Tests** do code
   explanation and test generation, **Fix it for me** fixes the whole file with a diff.)
4. **Landing page (10 s).** Open `/` for the landing page. Finish by flipping the
   **Light / Dark / System** toggle in the top bar (the gear icon holds editor settings and an
   About section with project details).

> If Gemini is rate-limited, the UI shows a friendly error with a **Retry** button. It never shows
> fake results.

---

## Viva Q&A cheat-sheet

**1. What is your project?**
*CodeSense AI – An AI-Powered Code and Bug Detection System.* A web app where you paste code or a
pull-request diff and get line-level bugs, security issues and fixes from Gemini, with a
deterministic quality score.

**2. Why FastAPI?**
It is async (the server is not blocked while Gemini answers), validates input with Pydantic and
generates API docs automatically. Lighter than Django for an API-only backend.

**3. How is the quality score computed?**
`10 - 2.5*high - 0.8*medium - 0.2*low`, clamped to 0-10, mapped to a grade (A+ to F). It is a fixed
formula (`core/scoring.py`, mirrored in `lib/score.js`), so the same code always gives the same
score. The AI never decides the score.

**4. How do you control hallucinations?**
Line numbers are sent with the code; output is forced to JSON and validated by Pydantic. For PR
review, a deterministic diff parser (`core/diff.py`) drops any comment whose file or line was not
really changed. Security findings carry CWE / OWASP tags so they can be checked.

**5. How is it secured?**
bcrypt password hashing, JWT with expiry, rate limiting, input validation, per-user history
isolation (other users get 404), CORS allow-list, API key only on the server, anonymous code is
never stored.

**6. What are the limitations?**
Depends on Gemini availability and quota; 20,000-character limit for a file; the AI can still miss
bugs or be wrong, so findings are suggestions; SQLite is for demo scale; no execution or static
analysers yet.

**7. Future scope?**
GitHub PR bot, static analysers (Bandit, ESLint, Semgrep) alongside the AI, PostgreSQL + Docker +
CI, team workspaces, more languages. A longer Q&A is in `PROJECT_DETAILS.md`.
