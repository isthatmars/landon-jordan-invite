import { Arcade } from "@/components/Arcade";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Lineup } from "@/components/Lineup";
import { Nav } from "@/components/Nav";
import { PartyPlayback } from "@/components/PartyPlayback";
import { RsvpForm } from "@/components/RsvpForm";
import { connection } from "next/server";
import { getStore } from "@/lib/store";

export default async function HomePage() {
  // Request-time so Admin CMS edits appear without rebuild.
  await connection();
  const store = await getStore();
  const { content, tracks, videos } = store;

  return (
    <main className="flex-1">
      <Nav brandName={content.brandName} />
      <Hero content={content} />
      <div className="scene-breath" aria-hidden />
      <PartyPlayback
        mixtapeHeadline={content.mixtapeHeadline}
        watchHeadline={content.watchHeadline}
        tracks={tracks}
        videos={videos}
      />
      <div className="scene-breath" aria-hidden />
      <Arcade headline={content.arcadeHeadline} />
      <div className="scene-breath" aria-hidden />
      <Lineup content={content} />
      <RsvpForm content={content} />
      <Footer tagline={content.footerTagline} />
    </main>
  );
}
