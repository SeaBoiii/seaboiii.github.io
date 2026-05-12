import type { Metadata } from "next";
import "./globals.css";
import { ThemeBootScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Aleem's Novels",
  description:
    "A cozy shelf of novels by Aleem — completed and ongoing stories. Browse, search, and read.",
  metadataBase: new URL("https://seaboiii.github.io"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Lora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Source+Serif+4:wght@400;600;700&family=Merriweather:wght@300;700&family=Atkinson+Hyperlegible:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
        <ThemeBootScript />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
