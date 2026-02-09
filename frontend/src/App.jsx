import { useState, useRef, useCallback, useEffect } from "react";
import VideoPlayer from "./components/VideoPlayer.jsx";
import StatusBar, { formatTime } from "./components/StatusBar.jsx";
import EventList from "./components/EventList.jsx";
import { createSession, addEvent, getExportCsvUrl, clearDatabase } from "./api/client.js";

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
  const [participantName, setParticipantName] = useState("");
  const [clipStartTime, setClipStartTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const videoRef = useRef(null);

  const { studyId, participantId } = getStudyAndParticipantFromUrl();
  const isAdmin = participantId === "admin";

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

  const canAddEvent = true;

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

  const handleAddEvent = useCallback(() => {
    if (!videoRef.current) return;
    const timeSeconds = videoRef.current.currentTime;
    setError(null);
    // Record clip start time on first event if not already set
    setClipStartTime((prev) => prev || new Date().toISOString());
    setEvents((prev) => [...prev, timeSeconds]);
    setToast(`Event at ${formatTime(timeSeconds)}`);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSubmitEvents = useCallback(async () => {
    setError(null);
    if (!events.length) {
      setError("No events to submit.");
      return;
    }

    const isAdminParticipant = isAdmin;
    const name = participantName.trim();

    if (!isAdminParticipant && !name) {
      setError("Please enter your name before submitting.");
      return;
    }

    const effectiveParticipantId = isAdminParticipant
      ? "admin"
      : name;
    const userId = isAdminParticipant ? "admin" : name;
    const startTime = clipStartTime || new Date().toISOString();

    try {
      let id = sessionId;
      if (!id) {
        id = await createSession({
          userId,
          clipStartTime: startTime,
          studyId,
          participantId: effectiveParticipantId,
        });
        setSessionId(id);
      }
      // Upload buffered events
      for (const t of events) {
        // eslint-disable-next-line no-await-in-loop
        await addEvent(id, t);
      }
      setToast(`Submitted ${events.length} events`);
      setTimeout(() => setToast(null), 2000);
      setEvents([]);
    } catch (err) {
      setError(err.message);
    }
  }, [events, participantName, isAdmin, clipStartTime, sessionId, studyId]);

  const handleClearDb = useCallback(async () => {
    if (!window.confirm("Clear all sessions and events from the database? This cannot be undone.")) {
      return;
    }
    setError(null);
    try {
      await clearDatabase();
      setToast("Database cleared");
      setTimeout(() => setToast(null), 2000);
    } catch (err) {
      setError(err.message);
    }
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

  return (
    <div className="app">
      {showIntro && (
        <div className="intro-overlay">
          <div className="intro-modal">
            <h2>Clip Tagging Experiment - Please follow these instructions.</h2>
            <p>
              Event boundaries are the moments in a movie where one meaningful action or situation
              ends and a new one begins. An event takes place when there's a clear change in what is
              happening - for example a new goal, action, location, time, or interaction
              starts—even if the scene or shot doesn’t change.
            </p>
            <p>
              You are about to watch a short movie, press Play to start and Pause to stop. Pay
              attention to the movie and add events (using the button or space key) whenever you
              think there was an event boundary.
            </p>
            <p> 
              When you are done - enter your name at the bottom and press Submit Events. 
            </p>
            <button
              type="button"
              className="btn-submit"
              onClick={() => setShowIntro(false)}
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <VideoPlayer
        videoRef={videoRef}
        onTimeUpdate={setCurrentTime}
        onDurationChange={setDuration}
      />
      <StatusBar
        currentTime={currentTime}
        totalDuration={duration}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onAddEvent={handleAddEvent}
        canAddEvent={canAddEvent}
      />
      {error && <p className="error-msg">{error}</p>}
      <EventList events={events} />

      {!isAdmin && (
        <div className="participant-row">
          <label>
            Participant name:&nbsp;
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
            />
          </label>
          <button type="button" className="btn-submit" onClick={handleSubmitEvents}>
            Submit events
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="admin-row">
          <button type="button" className="btn-submit" onClick={handleSubmitEvents}>
            Submit events
          </button>
          <button type="button" className="btn-export" onClick={handleDownloadCsv}>
            Download database as CSV
          </button>
          <button type="button" className="btn-clear" onClick={handleClearDb}>
            Clear database
          </button>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
