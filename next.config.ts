import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  //  Aquí silenciamos el warning de los paquetes viejos de exceljs
  serverExternalPackages: ['exceljs', 'fstream', 'rimraf'],
};

export default nextConfig;
