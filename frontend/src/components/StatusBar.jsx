export function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function StatusBar({
  currentTime,
  totalDuration,
  isPlaying,
  onPlay,
  onPause,
  onAddEvent,
  canAddEvent,
}) {
  return (
    <div className="status-bar">
      <span className="time" aria-label="Elapsed time">
        {formatTime(currentTime)}
        {totalDuration != null && !Number.isNaN(totalDuration) && (
          <> / {formatTime(totalDuration)}</>
        )}
      </span>
      {isPlaying ? (
        <button type="button" className="btn-pause" onClick={onPause} aria-label="Pause">
          Pause
        </button>
      ) : (
        <button type="button" className="btn-play" onClick={onPlay} aria-label="Play">
          Play
        </button>
      )}
      <button
        type="button"
        className="btn-event"
        onClick={onAddEvent}
        disabled={!canAddEvent}
        aria-label="Add event"
      >
        Add event
      </button>
      <span className="hint">P = play/pause · Space = add event</span>
    </div>
  );
}
