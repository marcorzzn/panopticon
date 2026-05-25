import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Force static HTML/JS/CSS generation
  trailingSlash: true, // Maintain trailing slashes on exported paths
  basePath: '/panopticon', // Match GitHub Pages subfolder subdirectory
  assetPrefix: '/panopticon/', // Ensure asset paths map correctly to the repository name
  images: {
    unoptimized: true, // Disables Next.js dynamic image resizing dependency
  },
  transpilePackages: ['@panopticon/core', '@panopticon/data-pipeline', '@panopticon/map-engine', '@panopticon/ui']
};

export default nextConfig;

