import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "Dota 2 Draft Analyzer – Predict Winners, Timing & Win Conditions Instantly",
  description: "Analyze Dota 2 drafts using ability-based logic instead of win rates.",
  openGraph: {
    title: "Dota 2 Draft Analyzer – Predict Draft Winners Instantly",
    description: "Understand why drafts win or lose based on structure, timing, and interactions.",
    url: "https://dota2-draftanalyzer.vercel.app",
    siteName: "Dota 2 Draft Analyzer",
    images: [
      {
        url: "https://dota2-draftanalyzer.vercel.app/preview.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
