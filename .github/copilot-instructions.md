<!-- .github/copilot-instructions.md -->
# Quick instructions for AI coding agents (Filora)

This file documents the minimal, high-value knowledge needed to be immediately productive in this repository.
Keep edits short and reference concrete files/examples below.

1) Big picture (what this repo is)
- Monorepo: a React single-page app (Create React App) in `src/` and a Django REST backend in `backend/`.
- Frontend serves the UI at `npm start` (dev: `http://localhost:3000`). Backend exposes API at `http://localhost:8000/api`.

2) Key entry points & where to look
- Frontend: `src/` (components in `src/components`, services in `src/services`, pages in `src/pages`). Example: `src/components/auth/LoginForm.js` (react-hook-form + lucide icons).
- Frontend HTTP layer: `src/services/api.js` (axios instance, base URL `http://localhost:8000/api`, request interceptor injects Bearer token, 401 handling).
- Auth client: `src/services/auth.js` (login/signup wrappers store tokens in localStorage).
- Backend Django project: `backend/` (project at `backend/backend`). Settings: `backend/backend/settings.py`.
- Backend URL routing: `backend/backend/urls.py` and app routes (e.g. `backend/files/urls.py`).

3) Why things are structured this way
- Separation of concerns: the Django app is a pure JSON API (DRF) with JWT auth and scope-based middleware; the React app consumes the API via `axios` + react-query.
- Uploads are chunked on the server (to support resumable/big files) — see `backend/files/upload_views.py` and `backend/files/urls.py` for the exact endpoints.

4) Concrete developer workflows (quick commands & expectations)
- Frontend (dev):
  - Start: `npm install` then `npm start` (runs CRA dev server, uses port 3000).
  - Build: `npm run build`.
  - Tests: `npm test` (CRA test runner).
- Backend (dev):
  - Typical flow: create & activate a Python venv, install required packages, then:
    - `python backend/manage.py migrate`
    - `python backend/manage.py runserver` (default at port 8000)
    - `python backend/manage.py test` runs Django tests.
  - Settings rely on `python-decouple` for env vars (`backend/backend/settings.py` uses `config(...)`). Expect a `.env` in development for SECRET_KEY and DEBUG.

5) Auth, tokens and API patterns (important to follow)
- Backend uses JWT (SimpleJWT) and DRF. Default DRF permissions set to `IsAuthenticated` in `settings.py`.
- Client adds tokens via `Authorization: Bearer <access_token>` handled in `src/services/api.js`.
- There is a custom User model: `authentication.User` — inspect `backend/authentication/models.py` before changing auth behavior.

6) Uploads & storage (high priority when changing file flows)
- Endpoints (see `backend/files/urls.py`):
  - Init: POST `/api/uploads/init/` -> returns `upload_id`, `chunk_size`, `max_file_size`.
  - Upload chunk: POST `/api/uploads/<upload_id>/chunk/` (multipart form, field `chunk`, plus `chunk_number`, `total_chunks`).
  - Complete: POST `/api/uploads/<upload_id>/complete/`.
  - Cancel: DELETE `/api/uploads/<upload_id>/cancel/`.
- Server limits: 50 MB max file size (`FILE_UPLOAD_MAX_MEMORY_SIZE` and checks in `upload_views.py`). Chunk size returned is 1MB by default.
- Storage: `MEDIA_ROOT` under project base; `default_storage` is used — changes may affect both local dev and cloud storage adapters.

7) Integrations & scope checks
- There is middleware `integrations.middleware.ApiTokenAuthenticationMiddleware` and a decorator `integrations.middleware.check_api_scope()` used in `api/views.py` to gate endpoints by API scope (e.g., `files.read`, `files.write`). When adding public API endpoints, apply the same pattern.

8) Code patterns & conventions to follow
- Backend apps live under `backend/` as Django apps: `authentication`, `files`, `api`, `integrations`.
- DRF class-based views are used in `api/` for the public API and function views elsewhere; prefer reusing serializers in the same app (`files.serializers`, `authentication.serializers`).
- Frontend uses small presentational components in `src/components/*` and a services layer in `src/services/*` for HTTP logic. UI primitives are in `src/components/ui` (e.g., `Button`, `Input`). Use these instead of adding new ad-hoc UI elements.

9) Tests & quick checks
- Frontend unit/interaction tests use CRA testing libraries (`@testing-library/react`). Run with `npm test`.
- Backend tests run via `python backend/manage.py test`.

10) Files to inspect before making changes
- `backend/backend/settings.py` — CORS, JWT lifetimes, file limits, installed apps.
- `backend/files/upload_views.py` & `backend/files/urls.py` — upload logic and endpoints.
- `src/services/api.js` & `src/services/auth.js` — base URL, token handling, and redirect-on-401 behavior.
- `backend/authentication/serializers.py` and `backend/authentication/models.py` — custom user flows and fields.

11) Small examples (from repo) you can reuse
- Axios base: `src/services/api.js` sets baseURL to `http://localhost:8000/api` and injects `Authorization` from `localStorage`.
- Upload flow (client-side outline):
  1. POST `/api/uploads/init/` with { filename, size, mime_type } -> get `upload_id` and `chunk_size`.
  2. For each chunk: send multipart POST to `/api/uploads/<upload_id>/chunk/` with fields `chunk` (file), `chunk_number`, `total_chunks`.
  3. POST `/api/uploads/<upload_id>/complete/` to finalize and create the File object.

12) What to ask a human reviewer when unsure
- Is there a required CI or lint configuration not in repo? (eslint/formatting rules are default CRA unless extra config is present.)
- Where are backend Python dependencies captured for dev (requirements.txt / Pipfile)? If missing, ask which packages to pin.

If you want, I can open and merge this file into the repo now (create/update `.github/copilot-instructions.md`) and run quick checks. Tell me to proceed or request edits to the draft above.
