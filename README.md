# CodeSense AI

**AI-powered code review, in a bespoke IDE-native workspace.**
Paste code → get line-accurate diagnostics, a deterministic quality score, and
copy-paste fixes, powered by Google Gemini.

> Final-year capstone project · **CodeSense AI · by Nitish Singh**

---

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
                                   auto-fallback gemini-2.5-flash-lite)
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
| `GEMINI_FALLBACK_MODEL` | `backend/.env` | no | `gemini-2.5-flash-lite` |
| `GEMINI_TIMEOUT_S` | `backend/.env` | no | `45` |
| `VITE_API_URL` | `frontend/.env` | no | `http://localhost:8000` |
