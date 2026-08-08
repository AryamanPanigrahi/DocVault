\# DocVault — Progress Log



\## Current state (last updated: 2026-08-08)



\### Working

\- FastAPI + Uvicorn installed via `uv` in `backend/`

\- `GET /` — static root endpoint, tested and working

\- `GET /documents/{document\_id}` — path parameter with `int` type

&#x20; validation, tested including the 422 error case for invalid input

\- Docker Desktop + WSL2 installed and working

\- PostgreSQL 16 running via `docker-compose`, credentials in `.env`

&#x20; (gitignored), `.env.example` committed for reference



\### Understood (not just copy-pasted)

\- FastAPI: `app` object, decorators/routing, path params, automatic

&#x20; JSON serialization, automatic request validation

\- Docker: containers vs. native install, `docker-compose.yml`

&#x20; structure, volumes for data persistence, why secrets go in `.env`

&#x20; not committed config



\### Fixed / Lessons learned

\- Project relocated from OneDrive to `C:\\Doc-Vault\\DocVault` — avoids

&#x20; OneDrive sync issues with venv/dependency folders

\- `backend/.venv` broke after the OneDrive relocation because `uv`

&#x20; hardcodes absolute paths into its launcher scripts — fixed by

&#x20; deleting and rebuilding via `uv sync` (safe, since `uv.lock` already

&#x20; had exact versions recorded)

\- `.env` was accidentally committed early on. Fixed via

&#x20; `git rm --cached .env`, then rotated the password — untracking a

&#x20; file does NOT remove it from Git history, so any committed secret

&#x20; should be treated as compromised and rotated, not just hidden going

&#x20; forward

\- Windows requires Developer Mode enabled to allow symlink creation

&#x20; (needed for the `library-skills` FastAPI skill installer)

\- `PROGRESS.md` was previously a Word doc pasted manually — converted

&#x20; to plain markdown so Claude Code can actually read it directly from

&#x20; the repo, and so Git can show real diffs on it



\### Next step

\- Connect FastAPI to Postgres using SQLAlchemy — define first table

&#x20; (likely `User` or `Document`), understand engine/session/model

&#x20; concepts

