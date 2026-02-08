import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Process env (e.g. Render Dashboard) overrides .env file so Render's VITE_VIDEO_URL is always used when set.
  const envFromFile = loadEnv(mode, process.cwd(), "");
  const videoUrl =
    process.env.VITE_VIDEO_URL ?? envFromFile.VITE_VIDEO_URL ?? "";

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_VIDEO_URL": JSON.stringify(videoUrl),
    },
    server: {
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
