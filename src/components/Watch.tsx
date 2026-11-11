"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { crtScreen } from "@/lib/cutouts";
import { useLiveFlag } from "@/lib/useLiveFlag";
import { usePlayback } from "./Playback";
import { YoutubeScreen } from "./YoutubeScreen";
import { YoutubeThumb } from "./YoutubeThumb";

type RemoteAction =
  | "play"
  | "prev"
  | "next"
  | "mute"
  | "browse"
  | "browse-up"
  | "browse-down"
  | `channel-${number}`;

/** Channel-switch snow — quick burst, well under the 1s hard cap. */
const CHANNEL_STATIC_MS = 500;
/** Absolute max cover (static + poster) so a slow buffer never leaves a long black gap. */
const CHANNEL_STATIC_MAX_MS = 1000;

const REMOTE_HOTSPOTS: {
  id: string;
  action: RemoteAction;
  label: string;
  style: CSSProperties;
}[] = [
  { id: "power", action: "mute", label: "Mute or unmute", style: { left: "83.2%", top: "9.5%", width: "7.5%", height: "15%" } },
  { id: "ch-up", action: "next", label: "Next video", style: { left: "81.8%", top: "27.5%", width: "7.2%", height: "17%" } },
  { id: "ch-down", action: "prev", label: "Previous video", style: { left: "78.8%", top: "67%", width: "7%", height: "17%" } },
  { id: "pause", action: "play", label: "Play or pause", style: { left: "26.5%", top: "30%", width: "10%", height: "22%" } },
  { id: "dpad-left", action: "prev", label: "Previous video", style: { left: "36.5%", top: "33%", width: "7.5%", height: "20%" } },
  { id: "dpad-right", action: "next", label: "Next video", style: { left: "43%", top: "38%", width: "8%", height: "16%" } },
  { id: "dpad-up", action: "browse-up", label: "Browse previous", style: { left: "38.5%", top: "12%", width: "8%", height: "18%" } },
  { id: "dpad-down", action: "browse-down", label: "Browse next", style: { left: "34.5%", top: "55%", width: "8%", height: "18%" } },
  { id: "color-blue", action: "browse", label: "Focus browse list", style: { left: "53%", top: "9%", width: "5%", height: "16%" } },
  { id: "ch1", action: "channel-1", label: "Play video 1", style: { left: "60%", top: "62%", width: "5.5%", height: "14%" } },
  { id: "ch2", action: "channel-2", label: "Play video 2", style: { left: "64%", top: "48%", width: "5.5%", height: "14%" } },
  { id: "ch3", action: "channel-3", label: "Play video 3", style: { left: "68%", top: "34%", width: "5.5%", height: "14%" } },
  { id: "ch4", action: "channel-4", label: "Play video 4", style: { left: "66%", top: "66%", width: "5.5%", height: "14%" } },
  { id: "ch5", action: "channel-5", label: "Play video 5", style: { left: "70%", top: "52%", width: "5.5%", height: "14%" } },
  { id: "ch6", action: "channel-6", label: "Play video 6", style: { left: "74%", top: "38%", width: "5.5%", height: "14%" } },
  { id: "ch7", action: "channel-7", label: "Play video 7", style: { left: "72%", top: "72%", width: "5.5%", height: "14%" } },
  { id: "ch8", action: "channel-8", label: "Play video 8", style: { left: "76%", top: "56%", width: "5.5%", height: "14%" } },
  { id: "ch9", action: "channel-9", label: "Play video 9", style: { left: "80%", top: "42%", width: "5.5%", height: "14%" } },
  { id: "ch0", action: "channel-0", label: "Play video 10", style: { left: "82%", top: "52%", width: "5.5%", height: "14%" } },
];

export function Watch({ headline }: { headline: string }) {
  const {
    videos,
    now,
    playing,
    toggleCurrent,
    tuneVideo,
    stepVideo,
    mute,
    onEnded,
    onPlayingChange,
    registerPlayer,
  } = usePlayback();
  const [channelSwitching, setChannelSwitching] = useState(false);
  const [switchKey, setSwitchKey] = useState(0);
  /** Keep the poster up after snow so the CRT never flashes black while YouTube buffers. */
  const [holdPoster, setHoldPoster] = useState(false);
  const [muted, setMuted] = useState(false);
  const skipStatic = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();
  const watchLive = useLiveFlag("liveWatch");
  const [desktopMotion, setDesktopMotion] = useState(false);

  /* CRT channel switch: quick snow (≤1s), then clear as the new video plays underneath. */
  useEffect(() => {
    if (skipStatic.current) {
      skipStatic.current = false;
      return;
    }
    if (reduceMotion) {
      const clearPoster = window.setTimeout(() => setHoldPoster(false), 0);
      return () => window.clearTimeout(clearPoster);
    }
    let clearTimer = 0;
    let posterCapTimer = 0;
    let cancelled = false;
    const startTimer = window.setTimeout(() => {
      if (cancelled) return;
      setSwitchKey((key) => key + 1);
      setChannelSwitching(true);
      setHoldPoster(true);
      clearTimer = window.setTimeout(() => {
        if (!cancelled) setChannelSwitching(false);
      }, CHANNEL_STATIC_MS);
      /* Hard cap: never leave static/poster covering past 1s. */
      posterCapTimer = window.setTimeout(() => {
        if (!cancelled) setHoldPoster(false);
      }, CHANNEL_STATIC_MAX_MS);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(clearTimer);
      window.clearTimeout(posterCapTimer);
    };
  }, [now?.youtubeId, reduceMotion]);

  const handlePlayingChange = (isPlaying: boolean) => {
    if (isPlaying) setHoldPoster(false);
    onPlayingChange(isPlaying);
  };

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const sync = () => setDesktopMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  /* Grounded remote: gentle lateral drift while staying on the lounge surface. */
  const remoteXRaw = useTransform(scrollYProgress, [0, 0.5, 1], ["4%", "0%", "-3%"]);
  const remoteX = useSpring(remoteXRaw, { stiffness: 42, damping: 28, mass: 0.65 });
  const remoteMotionOn = Boolean(desktopMotion && !reduceMotion && watchLive);

  const words = headline.trim().split(/\s+/).filter(Boolean);
  const lead = words.length > 1 ? words[0] : "";
  const hero = words.length > 1 ? words[1] : words[0] || "";
  const rest = words.length > 2 ? words.slice(2).join(" ") : "";

  const focusBrowse = (dir?: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    list.focus({ preventScroll: true });
    if (!dir) {
      list.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
      return;
    }
    const amount = Math.max(48, Math.floor(list.clientHeight * 0.35));
    list.scrollBy({ top: dir * amount, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const onRemoteAction = (action: RemoteAction) => {
    if (action === "play") {
      toggleCurrent();
      return;
    }
    if (action === "prev") {
      stepVideo(-1);
      return;
    }
    if (action === "next") {
      stepVideo(1);
      return;
    }
    if (action === "mute") {
      const next = !muted;
      setMuted(next);
      mute(next);
      return;
    }
    if (action === "browse") {
      focusBrowse();
      return;
    }
    if (action === "browse-up") {
      focusBrowse(-1);
      return;
    }
    if (action === "browse-down") {
      focusBrowse(1);
      return;
    }
    if (action.startsWith("channel-")) {
      const n = Number(action.slice("channel-".length));
      const index = n === 0 ? 9 : n - 1;
      const video = videos.filter((item) => item.youtubeId)[index];
      if (video) tuneVideo(video);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="watch"
      data-youtube-id={now?.youtubeId ?? ""}
      className="scene-section watch-scene relative overflow-visible"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/scene-watch-lounge.jpg" alt="" className="watch-bg" />
      <div className="watch-shade" aria-hidden />
      <div className="watch-atmosphere" aria-hidden>
        <span className="watch-lamp-glow" />
        <span className="watch-room-breath" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#1a0f08]/90 to-transparent" />

      <div className="watch-stage">
        <div className="watch-tv">
          <div className="crt-screen-light" aria-hidden />
          <div
            data-testid="tv-screen"
            data-screen="crt"
            className="crt-bezel-glow absolute z-[1] overflow-hidden bg-black"
            style={crtScreen}
          >
            {now?.youtubeId ? (
              <YoutubeScreen
                ref={registerPlayer}
                videoId={now.youtubeId}
                title={`${now.artist} — ${now.title}`}
                onEnded={onEnded}
                onPlayingChange={handlePlayingChange}
              />
            ) : null}
            {(!playing || holdPoster || channelSwitching) && now?.youtubeId ? (
              <YoutubeThumb
                videoId={now.youtubeId}
                alt={`${now.artist} — ${now.title}`}
                className="pointer-events-none absolute inset-0 z-[2] h-full w-full object-cover"
              />
            ) : null}
            {!playing && (
              <button
                type="button"
                className="absolute inset-0 z-10 grid place-items-center"
                aria-label={now ? `Play ${now.artist} — ${now.title}` : "Play video"}
                onClick={toggleCurrent}
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-white/92 shadow-[0_8px_24px_#000a]">
                  <span
                    className="ml-1 block h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-[#1a1028]"
                    aria-hidden
                  />
                </span>
              </button>
            )}
            <div className="crt-scanlines" aria-hidden />
            <div className="crt-boot-static" aria-hidden />
            {channelSwitching ? (
              <div key={switchKey} className="crt-static is-switching" aria-hidden>
                <span className="crt-static-snow" />
                <span className="crt-static-roll" />
                <span className="crt-static-flash" />
              </div>
            ) : null}
          </div>
          <div className="floor-contact" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/prop-crt-front.png"
            alt="Wood CRT television"
            className="pointer-events-none relative z-10 block h-auto w-full"
            draggable={false}
          />
          <div className="watch-remote-rail">
            <motion.div
              className="watch-remote"
              style={remoteMotionOn ? { x: remoteX } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/prop-tv-remote.png" alt="TV remote" draggable={false} />
              <div className="watch-remote-hotspots" role="group" aria-label="TV remote controls">
                {REMOTE_HOTSPOTS.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className="watch-remote-btn"
                    style={spot.style}
                    aria-label={spot.label}
                    aria-pressed={spot.action === "mute" ? muted : undefined}
                    onClick={() => onRemoteAction(spot.action)}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="watch-side">
          <div className="watch-copy">
            <div className="watch-heading">
              <h2 className="neon-script-lg watch-title">
                <span className="watch-line watch-line-top">
                  {lead ? <span className="watch-line-lead">{lead}</span> : null}
                  {lead && hero ? "\u00A0" : null}
                  {hero ? <span className="watch-line-hero">{hero}</span> : null}
                </span>
                {rest ? <span className="watch-line watch-line-rest">{rest}</span> : null}
              </h2>
            </div>

            <div className="watch-list" role="region" aria-label="Browse videos">
              <p className="watch-browse-label">Browse Videos</p>
              <ul ref={listRef} className="watch-list-items" tabIndex={-1}>
                {videos.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      data-youtube-id={video.youtubeId}
                      onClick={() => tuneVideo(video)}
                      className={`watch-list-item w-full border-b px-1 py-2 text-left text-sm text-white ${
                        now?.youtubeId === video.youtubeId
                          ? "is-current border-white/35"
                          : "border-white/20"
                      }`}
                    >
                      <span className="font-semibold text-white">{video.title}</span>
                      <span className="block text-xs text-white">{video.artist}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
