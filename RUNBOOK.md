# AI Web Search (FastAPI + React)

Full-stack app: FastAPI backend and React (Vite) frontend that search OpenAlex, Crossref, and arXiv, showing Open Access papers first.

## Prereqs
- Python 3.11+
- Node 20.19+ (Vite 7 requires Node 20.19+ or 22.12+)

## Backend (FastAPI)
```bash
cd /Users/stan/Downloads/ai-search
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
# Test:
curl "http://localhost:8000/api/search?source=openalex&entity=works&q=transformers&per_page=10&cursor=*"
```

## Frontend (React/Vite)
```bash
cd /Users/stan/Downloads/ai-search/web
npm install
echo 'VITE_API_BASE=http://localhost:8000' > .env.local
npm run dev
# Open http://localhost:5173
```

## API
- GET `/api/search` with query params:
  - `source`: `openalex` | `crossref` | `arxiv`
  - `entity`: `works` | `authors` (authors only for `openalex`)
  - `q`: search string
  - `per_page`, `cursor`: pagination (use `*` to start)
- Response: `{ results: any[], meta: { count: number, next_cursor: string|null } }`
- Results are sorted OA-first (free/open access first) for all sources.

## Notes
- Crossref requires a descriptive User-Agent; backend sets one by default. Optionally export `HTTP_USER_AGENT`.
- If port 8000 is busy: `lsof -nP -iTCP:8000 -sTCP:LISTEN` then `kill <PID>`.
