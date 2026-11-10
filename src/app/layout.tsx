import type { Metadata } from "next";
import { Fugaz_One, Great_Vibes, Outfit } from "next/font/google";
import { SiteEffects } from "@/components/SiteEffects";
import "./globals.css";

const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

const chrome = Fugaz_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-chrome",
  display: "swap",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Landon & Jordan's 80s Birthday Party",
  description:
    "You're invited to Landon & Jordan's 80s Birthday Party — Saturday, December 19th, 6pm to midnight at Xtreme Action Park, Fort Lauderdale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${script.variable} ${chrome.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col night-sky">
        <SiteEffects />
        {children}
      </body>
    </html>
  );
}
