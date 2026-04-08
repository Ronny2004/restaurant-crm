import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // Importar el componente optimizado
import "@/app/globals.css";
import { Providers } from "@/components/Providers";
import { N8nChat } from "@/components/N8nChat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Restaurante CRM",
  description: "Sistema de gestión integral para restaurantes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="app-background">
          <Providers>
            {children}
          </Providers>
        </div>
        <N8nChat />

        {/* Carga optimizada de scripts externos */}
        <Script 
          src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}