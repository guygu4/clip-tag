# Clip Tag

Browser-based event tagging on video clips. Participants open a link, watch a video, and tag events (play/pause with **P**, add event with **Space**). All data is logged to the database (user id, clip start time, event times in seconds).

See [PLAN.md](./PLAN.md) for architecture and deployment.

---

## Deploy to Render (online, share links with participants)

1. **Push this repo to GitHub** (if you haven’t already).

2. **Connect to Render**
   - Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**.
   - Connect the GitHub repo that contains this project. Render will detect the `render.yaml` in the root.

3. **Apply the Blueprint**
   - Render will create a **PostgreSQL** database (`cliptag-db`) and a **Web Service** (`clip-tag`) with build/start commands and `DATABASE_URL` linked.
   - Click **Apply** and wait for the first deploy (build + migrate + start).

4. **Set your app URL for CORS** (optional but recommended)
   - After the first deploy, open the **clip-tag** service → **Environment**.
   - Add: `FRONTEND_ORIGIN` = `https://<your-service-name>.onrender.com` (use the URL Render shows for the service).

5. **Share the link**
   - Your app is at `https://<your-service-name>.onrender.com`. Send this to participants.
   - For pre-assigned IDs: `https://<your-service-name>.onrender.com?study=exp1&participant=p001`.

**Video:** Set `VITE_VIDEO_URL` in the Render service **Environment** to an online video URL (local files in `frontend/public/` are gitignored). Rebuild after changing env.

---

## Quick start (local)

The app uses **PostgreSQL**. For local dev use a free [Neon](https://neon.tech) or [Supabase](https://supabase.com) database, or run Postgres in Docker.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Backend** (terminal 1): Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` to your PostgreSQL connection string, then:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   npm run dev
   ```
   API runs at `http://localhost:3001`.
3. **Frontend** (terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```
   App runs at `http://localhost:5173` and proxies `/api` to the backend.

4. **Video**: Set `VITE_VIDEO_URL` in `frontend/.env` to an online video URL (see `frontend/.env.example`). Local videos in `frontend/public/` are gitignored to keep the repo small.

5. Open `http://localhost:5173`. Optional: `?study=exp1&participant=p001` for link-based participant IDs.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev:backend` | Start backend only |
| `npm run dev:frontend` | Start frontend only |
| `npm run build:frontend` | Build frontend for production |
| `npm run build:backend` | Build backend (if configured) |

## Production (manual)

- Use **PostgreSQL** for `DATABASE_URL` and run `npx prisma migrate deploy` in `backend/`.
- Set `FRONTEND_ORIGIN` and `PORT` in the backend environment.
- To serve the app from one server: set `FRONTEND_DIST` to the path to `frontend/dist` and build the frontend before starting the backend. No need to set `VITE_API_URL` when frontend is served from the same host.
