/// <reference types="vitest" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// Dev: /api is proxied to the Flask app, so the browser sees one origin and the
// Flask session cookie just works. Production: nginx does the same (see nginx.conf.example).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      port: 5173,
      proxy: { "/api": { target: env.VITE_API_TARGET || "http://localhost:5000", changeOrigin: false } },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom", "@tanstack/react-query"],
            charts: ["recharts"],
          },
        },
      },
    },
    test: { environment: "jsdom", globals: true, setupFiles: ["./src/test-setup.ts"], css: false },
  };
});
