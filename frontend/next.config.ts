import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    // Proxy API, websocket, uploads, and docs traffic to the Express backend
    // so the browser can talk to it same-origin (required in proxied previews).
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${BACKEND_URL}/socket.io/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
      { source: "/api-docs/:path*", destination: `${BACKEND_URL}/api-docs/:path*` },
      { source: "/api-docs", destination: `${BACKEND_URL}/api-docs` },
    ];
  },
};

export default nextConfig;
