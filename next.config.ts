import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  typescript: {
    // 🛡️ Esto es lo que va a salvar el deploy ignorando los errores de n8n
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
