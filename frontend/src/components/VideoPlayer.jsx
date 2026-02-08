import { useRef, useEffect, useState } from "react";

const FALLBACK_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function getVideoSrc() {
  const url = import.meta.env.VITE_VIDEO_URL?.trim() || "";
  if (url) return url;
  return FALLBACK_VIDEO;
}

export default function VideoPlayer({ onTimeUpdate, videoRef: externalRef }) {
  const internalRef = useRef(null);
  const ref = externalRef ?? internalRef;
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);
  const videoSrc = getVideoSrc();

  useEffect(() => {
    setError(null);
    setErrorDetail(null);
  }, [videoSrc]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const handler = () => onTimeUpdate?.(video.currentTime);
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [ref, onTimeUpdate]);

  const handleError = () => {
    setError(true);
    if (videoSrc.startsWith("/api/video") || videoSrc.includes("/api/video")) {
      fetch(videoSrc)
        .then((r) => r.json().catch(() => ({})))
        .then((body) => {
          const parts = [body.error, body.detail].filter(Boolean);
          if (parts.length) setErrorDetail(parts.join(" — "));
        })
        .catch(() => {});
    }
  };

  return (
    <div className="video-container">
      <video
        ref={ref}
        src={videoSrc}
        controls={false}
        playsInline
        onError={handleError}
      >
        Your browser does not support the video tag.
      </video>
      {error && (
        <div className="video-error">
          <p>Video failed to load.</p>
          {errorDetail && (
            <p className="video-error-detail">
              <strong>Server:</strong> {errorDetail}
            </p>
          )}
          <p className="video-error-hint">
            <strong>Direct URL (e.g. Bunny.net):</strong> Set <code>VITE_VIDEO_URL</code> in{" "}
            <code>frontend/.env</code> to the full video URL. In Bunny dashboard add your site to{" "}
            <strong>Allowed Referrers</strong> (e.g. <code>http://localhost:5173</code> and your Render URL). Restart the dev server after changing .env.
          </p>
          <p className="video-error-hint">
            <strong>Proxy:</strong> Set <code>VIDEO_SOURCE_URL</code> in <code>backend/.env</code> to the video URL, <code>VITE_VIDEO_URL=/api/video</code> in <code>frontend/.env</code>. For Bunny, optionally set <code>VIDEO_SOURCE_REFERER</code> to your app URL. Restart both servers.
          </p>
        </div>
      )}
    </div>
  );
}
