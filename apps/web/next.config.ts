import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? '/panopticon' : '',
  // assetPrefix: isProd ? '/panopticon/' : '', // Let Next.js handle asset prefix relative to basePath automatically
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@panopticon/core",
    "@panopticon/ui",
    "@panopticon/map-engine",
    "@panopticon/data-pipeline"
  ],
};

export default nextConfig;
