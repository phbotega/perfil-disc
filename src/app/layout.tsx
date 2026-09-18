import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfil DISC — Mapeamento Comportamental",
  description:
    "64 afirmações, dois perfis: quem você é e o que pedem de você. Mapeamento comportamental para autoconhecimento e desenvolvimento.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-white font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}