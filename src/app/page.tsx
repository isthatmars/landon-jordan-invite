import { Arcade } from "@/components/Arcade";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { Lineup } from "@/components/Lineup";
import { Mixtape } from "@/components/Mixtape";
import { Nav } from "@/components/Nav";
import { RsvpForm } from "@/components/RsvpForm";
import { Watch } from "@/components/Watch";
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
      <Mixtape headline={content.mixtapeHeadline} tracks={tracks} />
      <Watch headline={content.watchHeadline} videos={videos} />
      <Arcade headline={content.arcadeHeadline} />
      <Lineup content={content} />
      <RsvpForm content={content} />
      <Footer tagline={content.footerTagline} />
    </main>
  );
}
