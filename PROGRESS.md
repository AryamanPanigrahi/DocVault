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

## Current state (last updated: 2026-08-14)
- Phase 1: FULL STACK WORKING END-TO-END for the first time
- Frontend: React + TypeScript + Tailwind + React Router. Login and
  Signup pages fully functional against the real backend. Route
  protection via ProtectedRoute component (redirects to /login if no
  token). Dashboard fetches real documents from GET /documents using
  the stored JWT, renders them as a live list — confirmed showing
  actual uploaded documents from Postgres/MinIO.
- New concepts understood: useState (component state), useEffect
  (side effects / data fetching on load), TypeScript interfaces
  mirroring backend Pydantic schemas, attaching JWT via Authorization
  header, React Router protected routes.
- Fixed: recurring pattern today — new frontend code not taking
  effect turned out to be stale dev server/browser tab, not bad code.
  Lesson (same as backend): after adding new files/routes, fully
  restart the dev server AND open a fresh browser tab before
  debugging further.
- Remaining for Phase 1: upload UI (drag-drop or file picker), search
  bar wired to GET /documents/search, download/delete buttons on each
  document card, logout functionality

## Current state (last updated: 2026-08-15)
- Phase 1: FULL STACK FUNCTIONALLY COMPLETE
- Frontend: React + TypeScript + Tailwind + React Router, all core
  features working against the real backend:
  - Login/Signup with proper error handling
  - Route protection (redirects unauthenticated users)
  - Dashboard: live document list, sidebar nav, dark/light theme
    toggle (system-aware, centralized via Tailwind @theme tokens)
  - Upload: real file upload, auto-refreshing list, toast feedback,
    expired-token detection -> auto-redirect to login
  - Search: debounced live search across filename + OCR extracted
    text, verified correct on both dimensions
  - Download: triggers real browser file-save via Blob + object URL
  - Delete: confirmation dialog, removes from both MinIO and Postgres,
    defensive try/except around MinIO removal (handles already-missing
    files gracefully after a discovered Postgres/MinIO sync issue)
- Fixed today (recurring themes):
  - Multiple "code correct but not taking effect" bugs — always
    stale dev server or unsaved file, not bad code. Lesson holds
    across both backend and frontend.
  - Postgres/MinIO can fall out of sync if an operation is interrupted
    (e.g., mid-restart). No full transactional guarantee across the
    two systems yet — deliberately not over-engineered for Phase 1,
    noted as a known limitation.
- Remaining: visual polish (Login/Signup styling catch-up to match
  Dashboard's refined palette), pptx badge color fix, minor UX
  cleanup (sidebar "Trash" nav item is currently a non-functional
  placeholder — decide whether to remove or defer to Phase 4)
## Current state (last updated: 2026-08-15)
- Phase 1: functionally complete + substantial visual/UX polish pass
- New backend: GET /me — returns current user's own info via
  get_current_user dependency, reusing existing auth verification.
  Tested via /docs before wiring into frontend.
- Dashboard redesign:
  - Real file size formatting (KB/MB) and relative timestamps
    ("2h ago") via new src/utils/format.ts, replacing raw numbers
  - Real empty state (dashed panel, clear heading/subtext) replacing
    plain "No documents yet" text
  - Document cards: hover border feedback, Download/Delete buttons
    now hover-revealed (group/opacity pattern) for a calmer default view
  - Honest usage stats line: live document count + total size,
    computed from real data via .reduce(), no invented metrics
  - Search bar elevated to a primary action row next to Upload
  - Real user identity: avatar initial + email in sidebar, sourced
    from the new /me endpoint (replaced an earlier JWT-decoding hack
    that wouldn't have worked since the token only stores user id,
    not email)
- Branding: custom logo (Logo.tsx component + standalone favicon.svg),
  used across sidebar, Login, Signup, browser tab
- Full feature set: auth, upload, search (OCR + filename), download,
  delete, theming, all polished and tested

## Current state (last updated: 2026-08-15)
- Phase 1: functionally complete + full visual/UX polish pass DONE
- [everything from previous entry stays as-is]

## Next feature stage: Trash / Soft Delete
- Scope: this is a real feature stage, not a quick add — requires:
  - New Alembic migration: add nullable `deleted_at` column to
    Document model
  - Update list_documents, search_documents, download_document to
    exclude soft-deleted documents by default (filter deleted_at IS NULL)
  - New DELETE /documents/{id} behavior: soft-delete (set deleted_at)
    instead of permanent removal + MinIO cleanup
  - New endpoints: GET /documents/trash (list soft-deleted),
    POST /documents/{id}/restore, and a separate genuinely-permanent
    DELETE /documents/{id}/permanent (only from within trash view)
  - Frontend: new Trash page/view, restore button, permanent-delete
    confirmation (now two distinct delete actions to design clearly
    for, not just one)
- Plan: build with the same role/purpose-first, one-piece-at-a-time
  rhythm as every other backend stage (start fresh next session, not
  tacked onto an already-long one)
## Current state (last updated: 2026-08-16)
- Phase 1: functionally complete, fully polished, trash feature DONE
- Backend: deleted_at column added via Alembic migration. All
  document-reading routes (list, search, download) now filter out
  soft-deleted documents. DELETE /documents/{id} now soft-deletes
  (sets deleted_at) instead of permanent removal. New routes:
  GET /documents/trash, POST /documents/{id}/restore,
  DELETE /documents/{id}/permanent (the only truly destructive one,
  handles MinIO + Postgres cleanup with defensive error handling).
- Frontend: new Trash.tsx page (separate route, not a toggled
  Dashboard view — deliberate choice, matches how real file managers
  like Google Drive handle this), Restore and Delete Forever buttons,
  sidebar "Trash" link now functional.
- Fixed: /documents/trash hit the exact same route-ordering bug as
  /documents/search weeks ago (generic {document_id} route defined
  before the literal one). Third time hitting this class of bug —
  genuinely internalized now: any literal-segment route must be
  defined above any {variable} route sharing that path position.
- Verified end-to-end at every layer: frontend UI, backend /docs
  response, and direct Postgres query, for delete, restore, and
  permanent delete all separately.
- Full feature set: auth, upload, search, download, soft delete +
  trash (restore/permanent delete), theming, branding — Phase 1 is
  genuinely feature-complete.
## Current state (last updated: 2026-08-16)
- Phase 1: feature-complete + trash + sorting/drag-drop/paste upload
- Dashboard additions:
  - Sort control (compact icon button + dropdown): Newest, Name A-Z,
    Largest — client-side sort on existing data, no new backend calls
  - Drag-and-drop upload: page-wide drop detection, but visual
    feedback consolidated to one persistent banner (glows on drag)
    rather than a full-page overlay, after iterating past a redundant
    double-box issue
  - Paste-to-upload: window-level clipboard listener, reuses the same
    uploadFile() function as click/drag (refactored handleFileUpload
    into a shared uploadFile(file) + thin per-trigger wrappers)
  - Persistent "Add a document" banner always visible (not just in
    empty state) for discoverability
- Next: document detail view showing OCR extracted text — the last
  planned addition, needs a small backend change first (extracted_text
  isn't currently exposed via DocumentOut schema)
## Current state (last updated: 2026-08-16)
- Phase 1: feature-complete. All planned additions done: sorting,
  drag-and-drop + paste upload, document detail modal with inline
  preview.
- Backend: DocumentOut schema now includes extracted_text (was
  previously withheld, no longer needed to be).
- Detail modal: click any document card to open. Shows inline preview
  for PDFs (iframe) and images (object-contain), falls back to
  extracted OCR text for other types (e.g. pptx), and a clear message
  when neither exists. Large (90vh, max-w-4xl) for real usability,
  Drive-style.
- Fixed: preview showed stale content from the previously-viewed
  document due to previewUrl not resetting on open/close — root cause
  of what looked like "random" failures. Now explicitly cleared on
  every select/close, plus an honest loading state during fetch.
- Known, permanent limitation (not a bug): pptx/docx/xlsx cannot be
  previewed inline — no browser-native rendering capability exists
  for these formats without much heavier server-side infrastructure.
  Correctly falls back to text/metadata view.
- Phase 1 is now genuinely complete: full auth, storage, OCR search,
  CRUD, trash, theming, branding, and a polished, tested UI.
## Current state (last updated: 2026-08-17)
- Phase 1: fully complete, major design pass on auth pages done
- AuthLayout: rebuilt from split-screen to landing-page-style hero
  (headline + form side by side, "Why DocVault" section below with
  feature grid + framed dashboard mockup). Login and Signup now have
  distinctly different headline/copy so they're immediately
  distinguishable, not just relabeled versions of each other.
- Fixed: dark mode was silently broken everywhere (Dashboard, Trash,
  and the new AuthLayout) — Tailwind v4 defaults to
  prefers-color-scheme-only for dark: variants and does NOT respond
  to a manually toggled .dark class without explicit opt-in. Fixed via
  `@custom-variant dark (&:where(.dark, .dark *));` in index.css. This
  had likely been subtly broken for a while and coincidentally looked
  correct during earlier testing if system preference happened to
  match.
- Next: switching primary work to Claude Code (user now has Pro) for
  remaining work — starting with deployment planning. CLAUDE.md and
  this file are the handoff context; open Claude Code from the
  DocVault root, not backend/ or frontend/ specifically.

## Current state (last updated: 2026-08-18)
- Phase 1 complete. Now mid-deployment, working in Claude Code.
- Deployment plan: Render (backend, Docker) + Neon (Postgres) +
  Backblaze B2 (object storage) + Vercel (frontend). Originally
  scoped for a self-hosted Oracle Cloud VM + Cloudflare R2, but
  Oracle's card verification hold failed (international transactions
  disabled on the only card available), and Cloudflare R2 turned out
  to also require a card despite advertising otherwise — switched to
  an entirely card-free stack instead.
- Backend containerized: new `backend/Dockerfile` (multi-stage build
  via uv, installs `tesseract-ocr` system package in the final stage)
  and `backend/.dockerignore`. Verified end-to-end via
  `docker compose up backend` against the real local Postgres/MinIO
  containers — DB queries, storage, and OCR (tesseract binary) all
  confirmed working inside the container before touching any real
  infra.
- Fixed a recurring bug class while containerizing: `ocr.py`,
  `storage.py`, `database.py`, and `alembic/env.py` all had
  Windows-only or `localhost`-hardcoded values that would silently
  break under Docker networking or on a real host. All now read from
  env vars with sensible local-dev defaults preserved
  (`POSTGRES_HOST`, `STORAGE_ENDPOINT`, and a `DATABASE_URL` full-URL
  override for providers like Neon that require a single connection
  string with `sslmode=require`).
- Neon: project created, migrations (`alembic upgrade head`) applied
  successfully — `users`/`documents` tables confirmed live via a
  direct query, not just by trusting Alembic's output.
- Backblaze B2: bucket `DocVault-documents` created, application key
  scoped to just that bucket. `storage.py` now resolves
  access/secret key from `B2_KEY_ID`/`B2_APPLICATION_KEY` (falling
  back to the old `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` names for
  local dev), and `BUCKET_NAME` is now env-driven instead of
  hardcoded to `"documents"` (B2 bucket names are globally unique
  across all users, so the prod name necessarily differs from local).
  Verified with a real put/get/delete round-trip against the live
  bucket, not just a reachability check. Caught and fixed a real
  region mismatch along the way (`.env` had `us-west-004`, actual
  bucket was in `ca-east-006`).
- Frontend: fixed the sidebar being non-static (scrolled away with
  page content instead of staying pinned) — wrapper changed from
  `min-h-screen` to `h-screen`, `<main>` given its own
  `overflow-y-auto`. Also fixed a follow-on bug this introduced
  (`<main>` had both `flex-1` and `max-w-4xl`, so the scrollbar ended
  up stranded mid-screen instead of at the true window edge) by
  moving the width cap to an inner `mx-auto` wrapper instead.
- Mobile layout was essentially unusable before this pass (only
  `AuthLayout` had any responsive breakpoints) — rebuilt Dashboard
  and Trash's sidebar into a shared `Sidebar.tsx` + `MobileTopBar.tsx`
  (hamburger + slide-in drawer below the `md` breakpoint), and fixed
  document rows collapsing filenames to 0px width on narrow screens
  (icon + always-visible action buttons alone exceeded the row width)
  via `flex-wrap` and a floor width on the name column. Also fixed
  Download/Delete being unreachable on touch devices — they were
  hover-only (`opacity-0 group-hover:opacity-100`), which doesn't
  trigger on touch; now always visible below `md`.
- Trash page was also missing the theme toggle, user email, and
  logout entirely (Dashboard had them, Trash never did) — fixed as
  part of extracting the shared Sidebar component.
- Small correctness fixes: search-with-no-results was showing "add
  your first document" instead of a "no matches" message; truncated
  filenames had no hover tooltip; Esc didn't close the document
  preview modal.
- Next: Render (backend deploy) and Vercel (frontend deploy) are the
  only two pieces left. Neon and B2 are both fully wired and verified
  working end-to-end.
