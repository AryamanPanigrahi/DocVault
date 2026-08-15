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

## Current state (last updated: 2026-08-12)
- Phase 1, backend setup
- Working:
  - JWT auth (complete), Postgres + SQLAlchemy + Alembic, MinIO service
  - POST /documents/upload — protected route, accepts a real file via
    UploadFile, saves bytes to MinIO under a UUID-prefixed key, saves
    metadata (filename, content_type, size_bytes, file_path, owner_id)
    to Postgres via Document model. Tested end-to-end: verified file
    appears in MinIO console AND matching row exists in Postgres with
    correct owner_id and file_path linking the two.
- Fixed: `docker compose down -v` wipes ALL volumes in the compose
  file, not just the one being reset — this silently deleted Postgres
  data while fixing a MinIO password issue. Lesson: use targeted
  `docker volume rm <name>` for single-service resets going forward,
  reserve `down -v` for full environment wipes only.
- Next step: file retrieval/download endpoint, then move toward
  Tesseract OCR — extracting text from uploaded documents on upload

## Current state (last updated: 2026-08-13)
- Phase 1, backend setup
- Working:
  - JWT auth (complete), Postgres + SQLAlchemy + Alembic, MinIO
  - POST /documents/upload — file to MinIO, metadata to Postgres
  - GET /documents/{document_id}/download — streams file back from
    MinIO, enforces both authentication (401 if not logged in) and
    authorization (403 if not the document's owner). Tested end-to-end:
    real file downloaded and opened correctly.
- Fixed: server not picking up new route code even after --reload
  restart — required a full manual Ctrl+C stop + fresh start, plus a
  brand new browser tab (not just refresh) to clear stale cached
  endpoint list in /docs.
- Next stage: Tesseract OCR — extract text from uploaded documents so
  they become full-text searchable (the actual differentiator feature)

## Current state (last updated: 2026-08-13)
- Phase 1, backend setup
- Working:
  - JWT auth, Postgres + SQLAlchemy + Alembic, MinIO, upload/download
  - OCR (Tesseract via pytesseract) wired into upload flow — PDFs use
    native text extraction first (PyMuPDF), falls back to OCR for
    scanned pages; images go straight through Tesseract. extracted_text
    saved to Postgres automatically on upload.
  - Tested and verified: typed/printed text (screenshot) extracts
    near-perfectly. Handwritten text extracts poorly/empty — confirmed
    this is Tesseract's known real limitation, not a bug (isolated via
    direct python -c testing bypassing the API).
- Next stage: search endpoint — query extracted_text so documents
  become findable by their actual content, not just filename. This is
  the actual differentiator feature coming together.

## Current state (last updated: 2026-08-13)
- Phase 1, backend setup — CORE FEATURES COMPLETE
- Working:
  - JWT auth, Postgres + SQLAlchemy + Alembic, MinIO, upload/download
  - Tesseract OCR extraction on upload (typed text works well,
    handwriting is a known real limitation, verified via testing)
  - GET /documents/search?q=... — searches extracted_text AND
    filename via case-insensitive substring match, scoped to the
    logged-in user's own documents only. Tested: correctly returns
    only matching documents, excludes non-matches.
- Fixed: FastAPI matches routes top-to-bottom, first match wins.
  /documents/{document_id} (generic) was defined before
  /documents/search (literal), so "search" was being parsed as a
  document_id. Lesson: literal/fixed routes must be defined before
  generic parameterized routes that could swallow them.
- Remaining for Phase 1: basic file list/view/delete endpoints
  (mostly straightforward CRUD, no new concepts), then React/
  TypeScript/Tailwind frontend

## Current state (last updated: 2026-08-13)
- Phase 1 backend: FEATURE COMPLETE
- Working: JWT auth, Postgres + SQLAlchemy + Alembic, MinIO storage,
  OCR extraction, search, plus full CRUD:
  - POST /signup, POST /login
  - POST /documents/upload — file to MinIO, metadata + OCR text to Postgres
  - GET /documents — list current user's documents
  - GET /documents/search?q=... — search by content or filename
  - GET /documents/{id}/download — download, ownership-checked
  - DELETE /documents/{id} — removes from both MinIO and Postgres,
    ownership-checked
  - GET /documents/{id} — legacy placeholder route (still exists,
    could be removed or repurposed for "get single document metadata")
- Understand: FastAPI route matching order (literal before generic),
  query params vs path params vs body, ownership-filtering pattern
  repeated across download/delete (candidate for future refactor into
  a shared helper once a 3rd+ use case appears)
- Remaining for Phase 1: React/TypeScript/Tailwind frontend — the
  entire backend is now ready to be consumed by a real UI
## Current state (last updated: 2026-08-14)
- Phase 1: backend feature-complete, frontend just started
- Frontend scaffolded: React + TypeScript via Vite, Tailwind CSS wired
  in as a Vite plugin. Confirmed working — styled test page renders
  correctly (dark bg, centered "DocVault" heading).
- Fixed: vite.config.ts had duplicate imports after adding the
  Tailwind plugin — pasted new imports alongside old ones instead of
  merging. Lesson: when editing an existing config file, replace the
  relevant section rather than appending, or view the file first to
  confirm what's already there.
- Design direction settled (from reference research): light mode
  Notion-style (white/off-white, color accents) + dark mode Linear/
  Cloudy-dashboard-style (near-black bg, colored file-type badges),
  system-theme-aware with manual toggle. Font: Inter or Manrope.
- Next step: build out the actual app structure — login/signup pages,
  main document list layout, wire up API calls to the FastAPI backend

## Current state (last updated: 2026-08-14)
- Phase 1: backend feature-complete, frontend infra + routing done
- Frontend: React + TypeScript + Tailwind confirmed working. React
  Router set up with three routes (/  /login  /signup), each
  rendering a distinct placeholder page. Verified in browser.
- Fixed: `npm install react-router-dom` was run from the wrong
  directory (DocVault root instead of frontend/) — succeeded silently
  but never actually added the package. Lesson (recurring across both
  backend and frontend now): after any install command, verify the
  package actually appears in package.json / pyproject.toml rather
  than trusting terminal output alone.
- Also noted: browser extensions can inject unrelated console errors
  into any localhost page — use Incognito/Private window when
  debugging to rule out this noise.
- Next step: build real Login and Signup forms that actually call the
  FastAPI backend (POST /login, POST /signup) — first real frontend-
  to-backend connection

## Current state (last updated: 2026-08-14)
- Phase 1: backend feature-complete, frontend login flow working end-to-end
- Frontend: React + TypeScript + Tailwind + React Router all confirmed
  working together. Login page is fully functional — real form,
  useState for controlled inputs, calls POST /login on the FastAPI
  backend, stores the returned JWT in localStorage, redirects to
  dashboard on success, shows error message on failure.
- Fixed:
  - Backend startup was silently failing (MinIO container was
    stopped, so ensure_bucket_exists() crashed on startup) — always
    confirm Docker Desktop + `docker ps` shows both containers Up
    before starting the backend.
  - CORS: browser blocked frontend (localhost:5173) from reading
    backend (127.0.0.1:8000) responses by default. Added
    CORSMiddleware to FastAPI, explicitly allowing the frontend's
    origin — standard, expected setup for any separate frontend/
    backend, not something /docs ever needed since it's same-origin.
- Next step: Signup page (same pattern as Login), then attach the
  stored JWT to future requests (documents list, upload, etc.) and
  build route protection so unauthenticated users get redirected to
  /login
