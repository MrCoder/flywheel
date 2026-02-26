import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/dashboard",
  server: {
    port: 3456,
    proxy: {
      "/api": "http://localhost:3457",
    },
  },
  build: {
    outDir: "../../dist/dashboard",
    emptyOutDir: true,
  },
});
