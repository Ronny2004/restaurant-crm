import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  typescript: {
    // Esto es lo que va a salvar el deploy ignorando los errores de n8n
  },
  //  Aquí silenciamos el warning de los paquetes viejos de exceljs
  serverExternalPackages: ['exceljs', 'fstream', 'rimraf'],
};

export default nextConfig;
