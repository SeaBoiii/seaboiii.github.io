import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    assetsDir: "portfolio-assets",
    target: "es2022",
    sourcemap: true,
    // Let the import boundary keep Three/Fiber completely outside the DOM entry.
  },
});
