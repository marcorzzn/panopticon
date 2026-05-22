import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@panopticon/core",
    "@panopticon/ui",
    "@panopticon/map-engine",
    "@panopticon/data-pipeline"
  ],
};

export default nextConfig;
