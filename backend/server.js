import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// POST /api/sessions – create a new session
app.post("/api/sessions", async (req, res) => {
  try {
    const { user_id, clip_start_time, study_id, participant_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    const clipStartTime =
      clip_start_time || new Date().toISOString();
    const session = await prisma.session.create({
      data: {
        userId: String(user_id),
        clipStartTime,
        studyId: study_id ?? null,
        participantId: participant_id ?? null,
      },
    });
    return res.status(201).json({ session_id: session.id });
  } catch (err) {
    console.error("POST /api/sessions", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

// POST /api/sessions/:id/events – add an event to a session
app.post("/api/sessions/:id/events", async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { time_seconds } = req.body;
    if (time_seconds === undefined || time_seconds === null) {
      return res.status(400).json({ error: "time_seconds is required" });
    }
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const event = await prisma.event.create({
      data: {
        sessionId,
        timeSeconds: Number(time_seconds),
      },
    });
    return res.status(201).json({
      id: event.id,
      time_seconds: event.timeSeconds,
    });
  } catch (err) {
    console.error("POST /api/sessions/:id/events", err);
    return res.status(500).json({ error: "Failed to add event" });
  }
});

// GET /api/sessions – list sessions (optional, for debugging/export)
app.get("/api/sessions", async (_req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: { events: true },
    });
    return res.json(sessions);
  } catch (err) {
    console.error("GET /api/sessions", err);
    return res.status(500).json({ error: "Failed to list sessions" });
  }
});

// GET /api/sessions/:id/events – list events for a session (optional)
app.get("/api/sessions/:id/events", async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { events: { orderBy: { timeSeconds: "asc" } } },
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json(session.events);
  } catch (err) {
    console.error("GET /api/sessions/:id/events", err);
    return res.status(500).json({ error: "Failed to list events" });
  }
});

// GET /api/video – stream video from VIDEO_SOURCE_URL (Bunny, Drive, or any URL)
function getVideoSourceUrl() {
  const url = process.env.VIDEO_SOURCE_URL || "";
  if (!url.trim()) return null;
  const u = url.trim();
  const driveMatch =
    u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    u.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const id = driveMatch[1];
    return `https://drive.google.com/uc?export=view&id=${id}`;
  }
  return u;
}

app.get("/api/video", async (req, res) => {
  const sourceUrl = getVideoSourceUrl();
  if (!sourceUrl) {
    return res.status(503).json({ error: "VIDEO_SOURCE_URL is not set on the server" });
  }
  try {
    const range = req.get("range");
    const opts = { redirect: "follow" };
    const headers = {};
    if (range) headers["Range"] = range;
    const referer = process.env.VIDEO_SOURCE_REFERER || process.env.FRONTEND_ORIGIN || "";
    if (referer) headers["Referer"] = referer;
    if (Object.keys(headers).length) opts.headers = headers;
    const resp = await fetch(sourceUrl, opts);
    if (!resp.ok) {
      console.error("GET /api/video: source returned", resp.status, sourceUrl.replace(/[?].*/, ""));
      return res.status(resp.status).json({
        error: `Video source returned ${resp.status}. For Bunny.net add your domain to Allowed Referrers, or set VIDEO_SOURCE_REFERER to your app URL.`,
      });
    }
    const contentType = (resp.headers.get("content-type") || "").split(";")[0].trim();
    if (contentType && contentType.toLowerCase().includes("text/html")) {
      console.error("GET /api/video: source returned HTML, not video. Check VIDEO_SOURCE_URL is a direct video URL.");
      return res.status(502).json({
        error:
          "Video source returned HTML (wrong URL or login page). Use a direct MP4 URL from Bunny.net, or check VIDEO_SOURCE_URL.",
      });
    }
    res.setHeader("Content-Type", contentType || "video/mp4");
    res.setHeader("Accept-Ranges", "bytes");
    const cl = resp.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);
    if (resp.status === 206 && resp.headers.get("content-range")) {
      res.status(206);
      res.setHeader("Content-Range", resp.headers.get("content-range"));
    }
    if (resp.body) {
      const stream = Readable.fromWeb(resp.body);
      stream.on("error", (err) => console.error("GET /api/video stream error:", err.message));
      stream.pipe(res);
      return;
    }
    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    const msg = err.message || String(err);
    console.error("GET /api/video:", msg, "URL:", sourceUrl.replace(/[?].*/, ""));
    return res.status(502).json({
      error: "Failed to load video",
      detail: msg,
    });
  }
});

// GET /api/export/csv – download all sessions and events as CSV
function escapeCsv(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

app.get("/api/export/csv", async (_req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: { events: { orderBy: { timeSeconds: "asc" } } },
    });
    const headers = [
      "session_id",
      "user_id",
      "clip_start_time",
      "study_id",
      "participant_id",
      "event_id",
      "time_seconds",
      "event_created_at",
    ];
    const rows = [headers.join(",")];
    for (const s of sessions) {
      for (const e of s.events) {
        rows.push(
          [
            escapeCsv(s.id),
            escapeCsv(s.userId),
            escapeCsv(s.clipStartTime),
            escapeCsv(s.studyId),
            escapeCsv(s.participantId),
            escapeCsv(e.id),
            escapeCsv(e.timeSeconds),
            escapeCsv(e.createdAt?.toISOString?.() ?? e.createdAt),
          ].join(",")
        );
      }
      if (s.events.length === 0) {
        rows.push(
          [
            escapeCsv(s.id),
            escapeCsv(s.userId),
            escapeCsv(s.clipStartTime),
            escapeCsv(s.studyId),
            escapeCsv(s.participantId),
            "",
            "",
            "",
          ].join(",")
        );
      }
    }
    const csv = rows.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="clip-tag-export.csv"`
    );
    return res.send(csv);
  } catch (err) {
    console.error("GET /api/export/csv", err);
    return res.status(500).json({ error: "Failed to export CSV" });
  }
});

// Optional: serve frontend build (set FRONTEND_DIST to path to frontend/dist)
const frontendDist = process.env.FRONTEND_DIST;
if (frontendDist) {
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(path.resolve(frontendDist), "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Clip-tag API listening on http://localhost:${PORT}`);
});
