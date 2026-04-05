import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"
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
      </body>
    </html>
  );
}
