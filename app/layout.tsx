import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";
import InstallPrompt from "@/components/InstallPrompt";
import Analytics from "@/components/Analytics";
import VideoAoVivo from "@/components/VideoAoVivo";
import VotoFlutuante from "@/components/VotoFlutuante";
import BuscaFlutuante from "@/components/BuscaFlutuante";
import { AuthProvider } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "43ª Nacional do Cavalo Mangalarga Marchador",
  description: "Catálogo oficial com 1639 animais. Busque por nome, registro, haras, criador e muito mais.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nacional MM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <AuthProvider>
          <Analytics />
          {children}
          {/* Fica no layout raiz (nao numa pagina especifica) pra continuar
              tocando ao navegar entre telas, em vez de recarregar do zero. */}
          <VideoAoVivo />
          {/* Vota no favorito da categoria em pista de qualquer tela - some
              sozinho na Home, que ja tem a lista com voto inline. */}
          <VotoFlutuante />
          {/* Acesso a busca de qualquer tela - some na Home, que ja tem seu
              proprio icone de busca. */}
          <BuscaFlutuante />
          <CookieConsent />
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
