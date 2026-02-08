import { useRef, useEffect } from "react";

// Use VITE_VIDEO_URL (online link). No local fallback – local videos are gitignored.
const VIDEO_SRC =
  import.meta.env.VITE_VIDEO_URL ||
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function VideoPlayer({ onTimeUpdate, videoRef: externalRef }) {
  const internalRef = useRef(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const handler = () => onTimeUpdate?.(video.currentTime);
    video.addEventListener("timeupdate", handler);
    return () => video.removeEventListener("timeupdate", handler);
  }, [ref, onTimeUpdate]);

  return (
    <div className="video-container">
      <video ref={ref} src={VIDEO_SRC} controls={false} playsInline>
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
