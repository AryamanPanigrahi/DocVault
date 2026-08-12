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
## Current state (last updated: 2026-08-10)
- Phase 1, backend setup
- Working:
  - FastAPI + Uvicorn, two endpoints tested/understood
  - PostgreSQL 16 running via docker-compose, credentials in .env
  - SQLAlchemy models: User (id, email, hashed_password, created_at),
    Document (id, filename, file_path, content_type, size_bytes,
    uploaded_at, owner_id FK -> users.id, extracted_text)
  - Alembic set up and wired to .env + models; first migration
    generated and applied successfully — users, documents, and
    alembic_version tables confirmed live in Postgres via psql
- Fixed: Postgres only reads POSTGRES_* env vars on first volume
  init — rotating the password in .env alone doesn't update it inside
  an existing container; had to `docker compose down -v` to reset
- Next step: build real endpoints that use these models (e.g. create
  user, list documents) — first time connecting FastAPI routes to
  the actual database via SessionLocal

## Current state (last updated: 2026-08-11)
- Phase 1, backend setup — now building JWT auth (staged approach)
- Working:
  - FastAPI, Postgres, SQLAlchemy models, Alembic migrations (see prior entries)
  - Password hashing/verification via bcrypt in app/security.py — tested,
    correct password returns True, wrong password returns False
- Understand: why token-based auth over sessions (stateless, works across
  web/desktop/Android clients uniformly), what a JWT actually contains
  (payload + expiry + signature), why hashing is one-way vs encryption,
  why bcrypt specifically (slow + salted, resists brute force)
- Next step (Stage 2 of JWT auth): build a signup endpoint that creates a
  real User row with a hashed password, then a login endpoint that verifies
  credentials and issues a JWT

## Current state (last updated: 2026-08-11)
- Phase 1, backend setup — JWT auth Stage 2 complete
- Working:
  - POST /signup — creates a User via SQLAlchemy, hashes password with
    bcrypt before storage, returns UserOut (id, email, created_at) —
    hashed_password never exposed in response. Tested via /docs and
    verified directly in Postgres via psql.
- Understand: Pydantic schemas (UserCreate vs UserOut) vs SQLAlchemy
  models — schemas shape API input/output, models shape DB tables;
  response_model enforces what leaves the API regardless of what the
  route function returns; FastAPI Depends() pattern for providing/
  cleaning up a DB session per-request
- Next step (Stage 3): login endpoint — verify email/password against
  stored hash, issue a JWT on success

## Current state (last updated: 2026-08-12)
- Phase 1, backend setup — JWT auth Stage 3 complete
- Working:
  - POST /signup — creates User, hashes password, returns UserOut
  - POST /login — verifies email/password via bcrypt, issues a signed
    JWT (15 min expiry) using OAuth2PasswordRequestForm. Tested via
    /docs, confirmed real access_token returned.
- Fixed: SECRET_KEY was literally "<...>" including placeholder angle
  brackets pasted into .env by mistake — caused jwt.encode() to fail
  with "Expected a string value". Lesson: always verify env values
  with a quick python -c print before assuming a save worked.
- Next step (Stage 4, final auth stage): protect routes so they
  require a valid token — read the JWT, extract user, reject
  invalid/missing/expired tokens

## Current state (last updated: 2026-08-12)
- Phase 1, backend setup — JWT auth COMPLETE (all 4 stages)
- Working:
  - POST /signup — hashes password with bcrypt, creates User
  - POST /login — verifies credentials, issues signed JWT (15 min exp)
  - GET /documents/{document_id} — now protected via get_current_user
    dependency; tested both authorized (200, correct user identified)
    and unauthorized (401 Not authenticated) cases via /docs
- Fixed: circular import — database.py had accidentally picked up
  `from app.security import get_current_user`, but security.py
  already imports from database.py. Rule: dependencies should only
  flow one direction (database.py -> models.py -> security.py -> main.py),
  never loop back.
- Understand: OAuth2PasswordBearer + Depends() pattern for protecting
  routes, sub claim carrying user identity through a stateless token,
  full request lifecycle from Authorization header to verified user object
- Next stage: MinIO — object storage for actual file uploads
