# CodeSense AI — Frontend

React 18 + Vite 8. Hand-written CSS, no Tailwind, no component library.
**CodeSense AI · by Nitish Singh**

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Dev server on `http://localhost:5173` (strict port) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the built `dist/` on `http://localhost:4173` |

## Notes

- The backend must be running on `http://localhost:8000` (override with
  `VITE_API_URL` in `.env`). The backend's CORS allowlist covers ports
  `5173` (dev) and `4173` (preview) on `localhost` and `127.0.0.1`.
- Monaco is loaded via `@monaco-editor/react`'s default CDN loader — the app
  already requires a network connection for the Gemini API, so there is no
  offline gain from bundling it, and the bundle stays ~60 kB gzipped.
- Quality-score maths lives in `src/lib/score.js` and is the single source of
  truth shared by `ScoreBadge.jsx` and the Markdown exporter.
