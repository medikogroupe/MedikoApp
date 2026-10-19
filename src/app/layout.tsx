import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MEDIKO+ | Super App Étudiants Santé - Côte d'Ivoire",
  description:
    "MEDIKO+ : QCM, emploi du temps, notes, scanner de documents, bibliothèque et annuaire des pharmacies de garde en Côte d'Ivoire.",
  manifest: "/manifest.json",
  applicationName: "MEDIKO+",
  appleWebApp: { capable: true, title: "MEDIKO+", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A4B8A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-mp-bg text-mp-text font-sans antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
