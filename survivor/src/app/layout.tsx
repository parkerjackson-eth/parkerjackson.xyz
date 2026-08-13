import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "Survivor Fantasy League",
    template: "%s · Survivor Fantasy League",
  },
  description:
    "Draft castaways, log each episode, and watch the standings move. A private fantasy league for Survivor.",
};

export const viewport: Viewport = {
  themeColor: "#0c0a09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-stone-200 antialiased">{children}</body>
    </html>
  );
}
