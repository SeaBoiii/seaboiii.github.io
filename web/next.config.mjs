import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: fileURLToPath(new URL("../", import.meta.url)),
  trailingSlash: true,
  images: { unoptimized: true },
  // Source markdown lives outside this app; allow file system reads via lib/*
  experimental: {
    // nothing experimental — placeholder for future tweaks
  },
};

export default nextConfig;
