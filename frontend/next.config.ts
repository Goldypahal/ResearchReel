import type { NextConfig } from "next";

/**
 * The browser talks only to this app's origin. `/api/*`, `/uploads/*` and the
 * `/socket.io/` websocket are proxied to the API server, so auth cookies are
 * first-party and the API can stay on a private network.
 *
 * Backend location is read at BUILD time (rewrites are compiled into the build):
 *   BACKEND_HOSTPORT  e.g. "researchreel-api:10000" (Render private network)
 *   BACKEND_URL       e.g. "http://localhost:5000" (fallback)
 */
const BACKEND_URL = (
  process.env.BACKEND_HOSTPORT ? `http://${process.env.BACKEND_HOSTPORT}` : process.env.BACKEND_URL || "http://localhost:5000"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // socket.io requests "/socket.io/?EIO=4…" — don't redirect away the trailing slash.
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true,
  },
  experimental: {
    // Proxied requests (large uploads, AI answers) can take longer than the 30s default.
    proxyTimeout: 10 * 60 * 1000,
    // Uploads sent through the proxy (when NEXT_PUBLIC_UPLOAD_URL isn't set) are
    // buffered by Next; allow up to the API's own limits (videos 200 MB).
    proxyClientMaxBodySize: "210mb",
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
      { source: "/socket.io/", destination: `${BACKEND_URL}/socket.io/` },
      { source: "/socket.io/:path*", destination: `${BACKEND_URL}/socket.io/:path*` },
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
