import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: isProd ? '/panopticon' : '',
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

