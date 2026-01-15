import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure basePath for reverse proxy
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/masivos_owo',

  // Asset prefix for static files
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '/masivos_owo',

  // Trailing slash - set to true for Apache compatibility
  trailingSlash: true,

  // Output configuration
  output: 'standalone',
};

export default nextConfig;

