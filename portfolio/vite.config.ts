import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Built to portfolio/dist and copied to the GitHub Pages root by .github/workflows/deploy.yml
export default defineConfig({
  base: "/",
  plugins: [react()],
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
          motion: ["gsap", "lenis"],
        },
      },
    },
  },
});

