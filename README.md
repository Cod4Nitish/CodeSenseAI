# CodeSense AI – An AI-Powered Code and Bug Detection System

**Project No. 61 · Group 23AIA861 · Project Guide: Ms. Khushboo · Domain: Application Based**

### Team

| Name | Roll No. | Role |
|------|----------|------|
| Nitish Kumar Singh | 2401331529005 | Lead developer |
| Shivam | 2301331520172 | Team member |

Paste code (or a git diff) and get line-accurate diagnostics, a deterministic quality score
and copy-paste fixes, powered by Google Gemini.

---

## 2-minute demo script (4 steps)

Open <http://localhost:5173> (backend on :8000). Nothing to type anywhere.

1. **Analyze (40 s).** Click **Load demo & analyze**. Watch the scan beam sweep the editor, then the
   score count up (4.2 / D), red squiggles appear on lines 4, 8, 12 and the CWE / OWASP-tagged issues
   slide in. Click an `L8` badge (editor jumps to the line), click **fix all** to see the
   before/after diff, then **reset**.
2. **PR review (40 s).** Top bar, **PR Review**, **Load sample PR**, **Review PR**. Point out the
   stepped loader, the risk level, per-file groups, the severity filter chips and the line
   "verified against the lines this PR changed" (the hallucination guard). Click **export .md**.
3. **AI chat (30 s).** Back on Workspace, click **AI Assistant**, press the **Why is this unsafe?**
   chip, then **Apply to editor** on the suggested code. (Tabs **Explain** and **Tests** do code
   explanation and test generation, **Auto-fix file** fixes the whole file with a diff.)
4. **Landing page (10 s).** Open `/welcome` for the product overview. Finish by flipping the
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

---

## What changed in the UI (summary)

- **Soft Pastel signature theme**, Light (default) and Dark, with a Light / Dark / System toggle.
  Optional **Neo Brutal** style in Settings. Monaco uses matching custom light/dark themes.
- **Settings** (gear icon): theme, font size, minimap, word wrap, default language, PR strictness,
  reset to defaults. Saved in `localStorage`.
- **Landing / empty state** with a "Load demo" button, USP cards and a 3-step "how it works".
- **Analysis animation**: scan beam over the editor, stepped loader, staggered result reveal.
- **Coder tools**: open file / drag-drop (language from extension), paste, remembered code and
  language, severity and type filters, **fix all** with diff, CWE / OWASP chips.
- **AI Assistant drawer**: chat, **Explain** (beginner to expert), **Generate tests**, plus
  **Auto-fix file** (all use the same Gemini key through `/api/ai/*`).
- **PR Review redesign**: sample PR, stepped loader, severity filters, collapsible file groups,
  copy / export as Markdown, friendly error with Retry. API: `POST /api/review-diff`.

## What it does

- **Interactive Monaco diagnostics** — Gemini findings are injected into the
  editor as red / amber squiggly underlines on the exact lines. Hovering shows
  the issue title and explanation. Clicking an `L·` badge in the results panel
  smooth-scrolls to the line and flashes a 3-second severity-tinted highlight.
- **Quality Score engine** — deterministic score
  `10 − (high×2.5) − (medium×0.8) − (low×0.2)`, clamped to `[0, 10]`, rendered
  with an `A+ … F` letter grade and severity-driven colour, prominently above
  the issue list.
- **Production issue list** — VS Code diff-style: 54px line gutter, type chip
  (`!!` bug · `SEC` security · `PFM` perf · `STL` style), title, severity badge.
  Expand a card for the explanation and a suggested-fix snippet with a
  one-click **copy** button. Global **expand all / collapse all**.
- **PR / diff review (CodeRabbit-style)** — open **PR Review**, paste a
  `git diff`, get a walkthrough, risk level, per-file summary, suggested review
  order and line-anchored comments with committable suggestions. A deterministic
  diff parser (`core/diff.py`) checks every AI comment against the lines the PR
  really changed, so hallucinated paths/lines are dropped. `chill` / `assertive`
  profiles control strictness. API: `POST /api/review-diff`.
- **Multi-language sample suite** — 5 production-grade snippets
  (Python security, Python clean, JavaScript buggy, JavaScript clean, Java buggy).
- **Export `.md`** — one click compiles the full analysis (score, summary,
  every issue + fix, reviewed source) into a downloadable Markdown report
  attributed to Nitish Singh.
- **Power-user ergonomics** — `Ctrl`/`⌘ + Enter` analyses instantly, `?` opens
  the shortcuts modal, a stepped terminal loader (`parsing › reviewing ›
  formatting`), full keyboard + reduced-motion support, responsive down to mobile.

---

## Architecture

```
Browser  ── React 18 + Vite (:5173) ───────────────────────────┐
          │  Monaco editor  │  Score + diagnostics panel        │
          └──────── POST /api/analyze (JSON) ───────────────────┘
                                  │
FastAPI (:8000)  ── /api/health   │   stateless, fully typed
                 └─ /api/analyze ─┴─> services/gemini_service.py
                                          │  async, forced-JSON,
                                          │  tolerant parsing
                                          ▼
                                  Google Gemini
                                  (gemini-3.1-flash-lite,
                                   auto-fallback gemini-3.5-flash-lite)
```

| Layer      | Tech |
|------------|------|
| Frontend   | React 18, Vite 8, `@monaco-editor/react`, hand-written CSS (no Tailwind, no component library) |
| Backend    | FastAPI, Uvicorn, Pydantic v2, `google-genai` (async client) |
| AI         | Google Gemini — `gemini-3.1-flash-lite` |
| Design     | "Codex atmosphere × VS Code" — deep-space `#07080f`, dual aurora glow, severity-only accents, Inter + JetBrains Mono |

---

## Quick start

### 1 · Backend  (`http://localhost:8000`)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1          # Windows PowerShell
# source .venv/bin/activate           # macOS / Linux
pip install -r requirements.txt

copy .env.example .env                # then set GEMINI_API_KEY=...
python -m uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/health` → `{"status":"ok",...}`

### 2 · Frontend  (`http://localhost:5173`)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>, paste code, hit **▶ analyze** (or `Ctrl/⌘ + Enter`).

### Build check

```bash
cd frontend && npm run build     # clean production build into dist/
```

---

## Project layout

```
backend/
  main.py                  FastAPI app, CORS, timing middleware, /api/health
  routers/analyze.py       POST /api/analyze — validate, sort, shape response
  services/gemini_service.py  async Gemini call, forced JSON, tolerant parse + normalise
  models/schemas.py        Pydantic request / response models
  requirements.txt         pinned
  .env.example

frontend/
  index.html               fonts preconnect, inline favicon
  vite.config.js           React plugin, port 5173, preview 4173
  src/
    App.jsx                IDE shell, Monaco markers, line highlight, export, shortcuts
    api.js                 fetch wrapper
    components/
      CodeInput.jsx        Monaco + language select + samples dropdown
      ResultsPanel.jsx     score slot, summary + export, severity stats, issue list
      ScoreBadge.jsx       deterministic quality score + grade
      IssueCard.jsx        collapsible diff-style card + copy fix
      SeverityBadge.jsx    HIGH / MEDIUM / LOW pill
      Loader.jsx           stepped terminal loader
      ShortcutsModal.jsx   keyboard shortcuts
    lib/
      score.js             score + grade formula (single source of truth)
      report.js            Markdown report builder + download
    App.css                full design system
```

---

## Environment variables

| Variable | Where | Required | Default |
|----------|-------|----------|---------|
| `GEMINI_API_KEY` | `backend/.env` | **yes** | — |
| `GEMINI_MODEL` | `backend/.env` | no | `gemini-3.1-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | `backend/.env` | no | `gemini-3.5-flash-lite` |
| `GEMINI_TIMEOUT_S` | `backend/.env` | no | `45` |
| `VITE_API_URL` | `frontend/.env` | no | `http://localhost:8000` |
