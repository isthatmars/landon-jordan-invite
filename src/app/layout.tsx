import type { Metadata } from "next";
import localFont from "next/font/local";
import { Barlow_Condensed, Caveat, Fugaz_One, Inter, Oswald, Yellowtail } from "next/font/google";
import { Cinematic } from "@/components/motion/Cinematic";
import { INTRO_BOOT } from "@/components/motion/introBoot";
import { SiteEffects } from "@/components/SiteEffects";
import "./globals.css";
import "./motion.css";
import "./cinematic.css";

const script = localFont({
  src: "../fonts/hastron.otf",
  variable: "--font-hastron",
  display: "swap",
  fallback: ["Yellowtail", "cursive"],
});

const scriptFallback = Yellowtail({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script-fallback",
  display: "swap",
});

const chrome = Fugaz_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-chrome",
  display: "swap",
});

const condensed = Barlow_Condensed({
  weight: ["600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-condensed",
  display: "swap",
});

const nav = Oswald({
  weight: "500",
  subsets: ["latin"],
  variable: "--font-nav",
  display: "swap",
});

const body = Inter({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const label = Caveat({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-label",
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
      suppressHydrationWarning
      className={`${script.variable} ${scriptFallback.variable} ${chrome.variable} ${condensed.variable} ${nav.variable} ${body.variable} ${label.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col night-sky">
        <script id="lj-intro-boot" dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />
        <button type="button" className="skip-intro" id="skip-intro">
          Skip intro
        </button>
        <Cinematic />
        <SiteEffects />
        {children}
      </body>
    </html>
  );
}
