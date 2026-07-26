import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  expireTime: 300,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
