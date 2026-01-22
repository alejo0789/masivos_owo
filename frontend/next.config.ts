import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Configure basePath for reverse proxy (only in production)
  basePath: isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || '/masivos_owo') : '',

  // Asset prefix for static files (only in production)
  assetPrefix: isProd ? (process.env.NEXT_PUBLIC_BASE_PATH || '/masivos_owo') : '',

  // Trailing slash - set to true for Apache compatibility
  trailingSlash: true,
};

export default nextConfig;
