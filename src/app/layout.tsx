import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpectraPay | Monad Stealth Payments",
  description: "The privacy-first payment protocol native to Monad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark antialiased h-full`}>
      <body className="min-h-full flex flex-col relative bg-background selection:bg-monad-purple selection:text-white">
        <div className="absolute inset-0 z-[-1] bg-grid-white [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
