import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "Delicias Morán",
  description: "Sistema interno de gestión del restaurante Delicias Morán",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <div className="app-background">
          <Providers>
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}
