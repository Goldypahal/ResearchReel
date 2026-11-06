import type { NextConfig } from "next";

/**
 * The browser talks to the API through this app's own origin (`/api/*`, `/uploads/*`),
 * so auth cookies are first-party and no CORS setup is needed. BACKEND_URL is read
 * at build time (rewrites are compiled into the build output).
 */
const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:5000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
