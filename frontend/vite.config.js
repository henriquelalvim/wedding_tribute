import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // GitHub Pages serves the site from /<repo>/. Set VITE_BASE_PATH accordingly,
    // or leave it as "/" when using a custom domain.
    base: env.VITE_BASE_PATH || "/",
    plugins: [react(), tailwindcss()],
    // canvas-confetti is imported dynamically in src/lib/celebrate.js, so it
    // already lands in its own chunk and never delays the first paint.
    build: { target: "es2022" },
  };
});
