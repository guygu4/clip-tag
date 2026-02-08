import { useState, useRef, useCallback, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer.jsx";
import StatusBar, { formatTime } from "./components/StatusBar.jsx";
import EventList from "./components/EventList.jsx";
import { createSession, addEvent, getExportCsvUrl } from "./api/client.js";

const USER_ID_KEY = "clip_tag_user_id";

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const participant = params.get("participant");
  const study = params.get("study");
  if (participant) return study ? `${study}-${participant}` : participant;
  return null;
}

function getOrCreateUserId() {
  const fromUrl = getUserIdFromUrl();
  if (fromUrl) return fromUrl;
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function getStudyAndParticipantFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    studyId: params.get("study") ?? undefined,
    participantId: params.get("participant") ?? undefined,
  };
}

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [events, setEvents] = useState([]);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef(null);

  const handleDownloadCsv = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(getExportCsvUrl());
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clip-tag-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const canAddEvent = Boolean(sessionId);

  const handlePlay = useCallback(() => {
    videoRef.current?.play();
    setIsPlaying(true);
  }, []);

  const handlePause = useCallback(() => {
    videoRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleAddEvent = useCallback(async () => {
    if (!sessionId || !videoRef.current) return;
    const timeSeconds = videoRef.current.currentTime;
    setError(null);
    try {
      await addEvent(sessionId, timeSeconds);
      setEvents((prev) => [...prev, timeSeconds]);
      setToast(`Event at ${formatTime(timeSeconds)}`);
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err.message);
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const userId = getOrCreateUserId();
      const { studyId, participantId } = getStudyAndParticipantFromUrl();
      const clipStartTime = new Date().toISOString();
      try {
        const id = await createSession({
          userId,
          clipStartTime,
          studyId,
          participantId,
        });
        if (!cancelled) setSessionId(id);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === " ") {
        e.preventDefault();
        handleAddEvent();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlayPause, handleAddEvent]);

  if (loading) {
    return (
      <div className="app">
        <p className="loading">Starting session…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <VideoPlayer
        videoRef={videoRef}
        onTimeUpdate={setCurrentTime}
      />
      <StatusBar
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onAddEvent={handleAddEvent}
        canAddEvent={canAddEvent}
      />
      {error && <p className="error-msg">{error}</p>}
      <EventList events={events} />
      <p className="export-row">
        <button type="button" className="btn-export" onClick={handleDownloadCsv}>
          Download database as CSV
        </button>
      </p>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
