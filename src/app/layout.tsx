import type { Metadata } from "next";
import { Great_Vibes, Orbitron, Outfit } from "next/font/google";
import "./globals.css";

const script = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

const display = Orbitron({
  weight: ["700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-display",
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
    "You're invited to Landon & Jordan's 80s Birthday Party — Friday Dec 19th at The Rink, Miami.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${script.variable} ${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col night-sky">{children}</body>
    </html>
  );
}
