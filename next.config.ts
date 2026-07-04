import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The ffmpeg installer resolves its binary with dynamic requires that the
  // bundler can't follow — load it via plain Node require at runtime instead.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
};

export default nextConfig;
