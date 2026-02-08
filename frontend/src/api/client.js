const getBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url !== undefined && url !== "") return url.replace(/\/$/, "");
  return ""; // same origin (dev proxy or production same host)
};

export async function createSession({ userId, clipStartTime, studyId, participantId }) {
  const res = await fetch(`${getBaseUrl()}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      clip_start_time: clipStartTime,
      study_id: studyId ?? undefined,
      participant_id: participantId ?? undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to create session");
  }
  const data = await res.json();
  return data.session_id;
}

export async function addEvent(sessionId, timeSeconds) {
  const res = await fetch(`${getBaseUrl()}/api/sessions/${sessionId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time_seconds: timeSeconds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Failed to add event");
  }
  return res.json();
}

/** Returns the URL for the CSV export (use with fetch then trigger download). */
export function getExportCsvUrl() {
  return `${getBaseUrl()}/api/export/csv`;
}
