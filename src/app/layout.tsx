import type { Metadata } from "next";
import { Inter } from "next/font/google";
import SiteFooter from "@/components/site-footer";
import SiteNavbar from "@/components/site-navbar";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "OffAnime",
    template: "%s | OffAnime",
  },
  description:
    "OffAnime — a premium, cinematic anime streaming experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Global navbar — fixed overlay, mounted once here so every route
            (including the custom 404) gets it. */}
        <SiteNavbar />
        <PageTransition>{children}</PageTransition>
        {/* Global footer — mounted once here so every route (including the
            custom 404) gets it without per-page duplication. */}
        <SiteFooter />
      </body>
    </html>
  );
}
