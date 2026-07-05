import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The ffmpeg installer resolves its binary with dynamic requires that the
  // bundler can't follow — load it via plain Node require at runtime instead.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg", "pdf-parse", "mammoth"],
  // Baseline security headers applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
