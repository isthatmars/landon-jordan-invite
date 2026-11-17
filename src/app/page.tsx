import { Arcade } from "@/components/Arcade";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Lineup } from "@/components/Lineup";
import { Nav } from "@/components/Nav";
import { PartyPlayback } from "@/components/PartyPlayback";
import { PhotoBooth } from "@/components/PhotoBooth";
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
      <PartyPlayback
        mixtapeHeadline={content.mixtapeHeadline}
        watchHeadline={content.watchHeadline}
        tracks={tracks}
        videos={videos}
      />
      <Arcade headline={content.arcadeHeadline} />
      {/* Scroll order: Pac-Man arcade → Photo Booth → Lineup → RSVP */}
      <PhotoBooth />
      <Lineup content={content} />
      <RsvpForm content={content} />
      <Footer tagline={content.footerTagline} />
    </main>
  );
}
