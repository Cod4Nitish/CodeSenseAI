# CodeSense AI — Backend

FastAPI service that sends code to Google Gemini and returns a structured,
fully-typed review. Stateless. **CodeSense AI · by Nitish Singh**

## Setup

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1      # Windows PowerShell
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt

copy .env.example .env            # set GEMINI_API_KEY
python -m uvicorn main:app --reload --port 8000
```

- API docs: <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/health>

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/`            | service metadata |
| GET  | `/api/health`  | `{"status":"ok",...}` |
| POST | `/api/analyze` | body `{ code, language }` → `{ summary, issues[], issue_count, model }` |

`language` ∈ `python · javascript · typescript · java · cpp · go · auto`.
`code` is 1–20,000 characters (empty / oversized → `422`).

## How it stays crash-proof on bad LLM output

`services/gemini_service.py`:

1. Async Gemini call (`client.aio`) with `response_mime_type=application/json`
   and a 45s timeout — the event loop is never blocked.
2. Tolerant decode: raw → strip ``` fences → slice first `{` … last `}`.
3. Normalisation: line coerced to a positive int or `null`; `type` / `severity`
   snapped to the canonical vocabulary via an alias map (e.g. `critical→high`);
   strings trimmed and length-capped; `issue_count` recomputed server-side.
4. Model fallback: if the primary model name is unavailable for the key, it
   transparently retries with `GEMINI_FALLBACK_MODEL`.

## Environment variables

| Variable | Required | Default |
|----------|----------|---------|
| `GEMINI_API_KEY` | **yes** | — |
| `GEMINI_MODEL` | no | `gemini-3.1-flash-lite` |
| `GEMINI_FALLBACK_MODEL` | no | `gemini-3.5-flash-lite` |
| `GEMINI_TIMEOUT_S` | no | `45` |
