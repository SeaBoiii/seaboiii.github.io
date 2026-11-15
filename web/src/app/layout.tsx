import type { Metadata } from "next";
import "./globals.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/literata/latin-400.css";
import "@fontsource/literata/latin-400-italic.css";
import "@fontsource/literata/latin-600.css";
import "@fontsource/literata/latin-700.css";
import "@/styles/reader-fonts.css";
import { ThemeBootScript } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Aleem's Novels",
  description:
    "Explore novels by Aleem Siddique, from intimate romances to speculative worlds. Discover a story and settle in to read.",
  metadataBase: new URL("https://seaboiii.github.io"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <ThemeBootScript />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
