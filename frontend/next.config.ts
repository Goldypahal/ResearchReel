import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    unoptimized: true,
  },
  // Retired prototype routes: keep old links and bookmarks working.
  async redirects() {
    return [
      { source: '/workspace', destination: '/projects', permanent: true },
      { source: '/workspace/:path*', destination: '/projects', permanent: true },
      { source: '/editor', destination: '/reels/create', permanent: true },
      { source: '/explore/conference/:id', destination: '/explore', permanent: true },
    ];
  },
};

export default nextConfig;
