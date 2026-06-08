import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server output for a small multi-stage Docker image.
  output: "standalone",
};

export default nextConfig;
