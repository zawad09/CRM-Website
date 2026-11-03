import type { Metadata } from "next";
import { Noto_Sans_Bengali, Saira } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

// Saira is the only font used across the app (weights 400/500/600).
const saira = Saira({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-saira",
  display: "swap",
});

// Bangla fallback: Saira has no Bangla glyphs, so Bangla text renders in
// Noto Sans Bengali via the font stack.
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BIAI CRM",
  description: "Enquiry tracker for BIAI training programs",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${saira.variable} ${bengali.variable}`}>
      <body className="min-h-screen bg-stone-50 text-neutral-900 antialiased">
        <NavBar />
        <main className="mx-auto w-full max-w-[88rem] px-4 py-8 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
