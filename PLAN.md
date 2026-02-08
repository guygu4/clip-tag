# Event Tagging on Video Clips – Project Plan

## Overview

A browser-based app where **participants** watch a video and tag events (e.g. marking moments) with play/pause and an “add event” action. Designed for **multi-user deployment on a hosted server**: participants receive a link, open it in their browser, and start tagging; all interactions are logged (user id, clip start time, event’s times in seconds).

---

## Recommended Tech Stack

| Layer          | Choice                   | Rationale |
|----------------|--------------------------|------------|
| **Frontend**   | React + Vite             | Fast dev server, simple setup, easy keyboard/ref handling for `<video>`. Builds to static assets for any host. |
| **Backend**    | Node.js + Express        | Simple REST API; runs on a single hosted server serving many participants. |
| **Database**   | **PostgreSQL** (production) | Concurrent multi-user writes, robust on a hosted server. Use SQLite only for local dev. |
| **ORM**        | Prisma                   | One schema for SQLite (dev) and PostgreSQL (prod); migrations and type-safe queries. |
| **Deployment** | Single server or PaaS    | e.g. Railway, Render, Fly.io, or a VPS: Node serves API + static frontend (or frontend on CDN). |

**Alternatives:**  
- Frontend: Vue 3 + Vite or plain HTML/JS.  
- Backend: Fastify, or Python (FastAPI).  
- Database: Supabase (PostgreSQL + optional auth and realtime).  
- Deployment: Frontend on Vercel/Netlify, backend elsewhere; or Docker Compose on one server.

---

## Data Model

- **User / participant identity**: unique id per participant—either anonymous (UUID in browser + `localStorage`) or from the link via query params (e.g. `?study=xyz&participant=abc`); backend can store `study_id` and `participant_id` on the session.
- **Sessions**: one per “task” = one video viewing.
  - `id`, `user_id`, `clip_start_time` (when the participant started the clip). Optional columns: `study_id`, `participant_id` (from URL).
- **Events**: each tagged moment in a session.
  - `id`, `session_id`, `time_seconds` (float, from `video.currentTime` at the moment of the tag).

So: one participant can have many sessions; one session has many events. On a hosted server, many participants use the same app URL; each gets their own session(s) and events in the same database.

---

## Architecture (High Level)

```
[Participant] → opens link (e.g. https://yourapp.com or https://yourapp.com?study=s1&participant=p42)
       ↓
[Browser] – Single-page app (React)
  - <video> in center, status bar, Play / Pause / Add event
  - Keyboard: 'p' → play/pause, 'space' → add event
  - On load: resolve user_id (localStorage or from URL), POST /api/sessions → get session_id, store in state
  - On "add event": POST /api/sessions/:id/events { time_seconds }

[Hosted server]
  - Serves static frontend (or frontend from CDN) and API
  - CORS allowed for frontend origin
  - POST /api/sessions  → create session (user_id, clip_start_time, optional study_id/participant_id), return session_id
  - POST /api/sessions/:id/events → body: { time_seconds }, insert event

[PostgreSQL]
  - sessions, events tables; concurrent writes from many participants
```

**Participant flow (multi-user):** Researcher sends each participant a link (same app URL or with `?study=...&participant=...`). Participant opens link in their browser → app loads → session is created with their identity → they tag events; all data is stored on the server. No login required unless you add it later.

---

## Step-by-Step Build Plan

### Phase 1: Project setup

1. **Initialize repo**
   - Root: `package.json` (workspace or single app), `.gitignore`, `README.md`.
2. **Frontend**
   - `npm create vite@latest frontend -- --template react` (or react-ts).
   - Install deps; add a simple proxy to the backend in `vite.config` (e.g. `/api` → `http://localhost:3001`).
3. **Backend**
   - New folder `backend`, `npm init`, install `express`, `cors`, and **Prisma** (use `better-sqlite3` for local dev only if not using Prisma).
   - Script: `"dev": "node server.js"` or `nodemon`; read `DATABASE_URL` and `FRONTEND_ORIGIN` from env.
4. **Database**
   - **Local dev**: SQLite (e.g. `file:./data/cliptag.db`) or Prisma with SQLite.
   - **Production**: PostgreSQL; same Prisma schema, different `DATABASE_URL`. Schema: `sessions` (id, user_id, clip_start_time, study_id?, participant_id?, created_at), `events` (id, session_id, time_seconds, created_at).
   - Run migrations: `prisma migrate dev` (dev), `prisma migrate deploy` (production).

### Phase 2: Backend API

5. **Express app**
   - `cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' })` so both local dev and hosted frontend work; `express.json()` for JSON bodies.
6. **POST /api/sessions**
   - Body: `{ user_id, clip_start_time?, study_id?, participant_id? }`. Generate `session_id` (UUID), insert into `sessions`, return `{ session_id }`. Accept study/participant from request for link-based participant IDs.
7. **POST /api/sessions/:id/events**
   - Body: `{ time_seconds }`. Validate `session_id` exists, insert into `events`. Return 201 + `{ id, time_seconds }`.
8. **Optional**
   - GET /api/sessions (list) or GET /api/sessions/:id/events (for debugging/export).

### Phase 3: Frontend – layout and video

9. **Layout**
   - Full-viewport layout: header/title optional, **video centered** (max width/height, object-fit contain), **status bar** below with elapsed time and buttons.
10. **Video component**
    - `<video>` with `ref`; source from public URL or a config (e.g. `/sample.mp4`).
    - Display **elapsed time** in status bar (e.g. `currentTime` in mm:ss), update on `timeupdate` (or a 100–200 ms interval).
11. **Controls**
    - **Play** / **Pause** buttons that call `videoRef.current.play()` / `.pause()` and toggle state.
    - **Add event** button: read `videoRef.current.currentTime`, send POST to `/api/sessions/:sessionId/events` with `{ time_seconds }`, optionally show a short confirmation (e.g. toast or “Event at 1:23”).
12. **Session creation**
    - On app load (or when user clicks “Start tagging”): resolve `user_id` from URL query (`?participant=...` or `?study=...&participant=...`) or fallback to `localStorage` UUID; set `clip_start_time = new Date().toISOString()`; POST to `/api/sessions` with `user_id`, `clip_start_time`, and optional `study_id`/`participant_id`; store `session_id` in state. Use `import.meta.env.VITE_API_URL` for API base in production (or dev proxy) (and use it for all “add event” requests).

### Phase 4: Keyboard and polish

13. **Keyboard shortcuts**
    - Global keydown: `p` → toggle play/pause (prevent default if needed so space doesn’t scroll).
    - `space` → add event (prevent default so page doesn’t scroll). Ignore when focus is in an input.
14. **UX**
    - Disable “Add event” until session is created and (optionally) video is loaded.
    - Show “Event added at 1:23” feedback; optional list of events in the UI for the current session.
15. **Error handling**
    - If POST fails, show message and optionally retry or allow “add event” again.

### Phase 5: Optional enhancements

16. **User id**
    - Persist `user_id` in `localStorage` so the same browser keeps the same id across visits when not using link-based participant IDs.
17. **Export**
    - GET endpoint or admin page to export sessions + events as CSV/JSON (by study or participant).
18. **Multiple clips**
    - Allow selecting a clip (or multiple) and associate each with a session; schema already supports it via `clip_start_time` and multiple sessions per user.

### Phase 6: Multi-user deployment (hosted server)

19. **Environment and config**
    - **Backend**: `DATABASE_URL` (PostgreSQL in production), `FRONTEND_ORIGIN` (e.g. `https://yourapp.com`), `PORT`. Use `.env` and never commit secrets.
    - **Frontend**: `VITE_API_URL` (e.g. `https://yourapp.com/api` or same origin if API is served under the same host) so the built app knows where to send requests. Build with `npm run build`; output is static files.
20. **Database (production)**
    - Provision PostgreSQL (e.g. Railway, Render, Supabase, or VPS). Run `prisma migrate deploy`. No SQLite on the server for multi-user.
21. **Deploy backend**
    - Run Node server on the host (e.g. `node server.js` or `node build/index.js`). Serve on a single port or behind a reverse proxy (e.g. Nginx). If frontend and backend share the same domain, serve API at `/api` and static frontend at `/` so CORS is same-origin and `VITE_API_URL` can be relative (e.g. `''` or `'/api'`).
22. **Deploy frontend**
    - **Option A**: Same server as backend—Node serves built static files from `frontend/dist` and API from `/api`. One URL for participants (e.g. `https://yourapp.com`).
    - **Option B**: Frontend on CDN (Vercel, Netlify); backend on Railway/Render etc. Set `FRONTEND_ORIGIN` and `VITE_API_URL` to the backend base URL; participants open the frontend URL.
23. **Participant links**
    - Share the app URL (e.g. `https://yourapp.com`). For pre-assigned IDs, share links like `https://yourapp.com?study=exp1&participant=p001`; app reads query params and sends them when creating the session. No login required for participants.

---

## File Structure (suggestion)

```
clip-tag/
├── PLAN.md                 # This file
├── README.md
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── VideoPlayer.jsx
│   │   │   ├── StatusBar.jsx
│   │   │   └── EventList.jsx   (optional)
│   │   ├── api/
│   │   │   └── client.js       # fetch wrappers for /api/sessions, /api/events
│   │   └── App.css
│   └── public/
│       └── sample.mp4          # or link to external URL
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env.example            # DATABASE_URL, FRONTEND_ORIGIN, PORT
│   ├── prisma/
│   │   ├── schema.prisma       # sessions, events; SQLite dev / PostgreSQL prod
│   │   └── migrations/
│   └── data/
│       └── cliptag.db          # SQLite for local dev only (gitignore optional)
├── frontend/
│   ├── .env.example            # VITE_API_URL (empty or /api for same-origin)
│   └── ...
└── .gitignore                  # .env, node_modules, backend/data/*.db if desired
```

---

## Summary

- **Frameworks:** React + Vite (frontend), Express + Prisma (backend). SQLite for local dev, **PostgreSQL for production** (multi-user hosted server).
- **Participant flow:** Participant enters link (e.g. `https://yourapp.com` or with `?study=...&participant=...`) → app loads → session created with their identity → they tag events; all data stored on server. No login required.
- **Core flow:** Resolve user/participant id (URL or localStorage) → create session on load → play/pause (button or `p`) → add event (button or space) → each event POST with `time_seconds`; backend stores user id, clip start time, optional study/participant id, and event times.
- **Order of work:** Setup → DB schema (Prisma, SQLite dev / PostgreSQL prod) → API (CORS for frontend origin, accept study_id/participant_id) → Video UI and session/event wiring → Keyboard shortcuts → env and build → deploy backend + frontend → share participant links.

If you want, next step can be generating the actual project (scaffold frontend + backend + Prisma schema and minimal API and UI) so you can run it locally and then deploy for participants.
