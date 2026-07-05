import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";

// Sora for display/headings (geometric, modern), Inter for body (clean, legible).
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ad Champ — AI Video Ads Platform",
  description:
    "Create a consistent AI character once, then generate unlimited video ads with it — powered by Veo 3.1, Nano Banana 2, Claude and ElevenLabs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
