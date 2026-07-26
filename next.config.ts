import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  serverExternalPackages: ['nodemailer'],
};

export default nextConfig;
