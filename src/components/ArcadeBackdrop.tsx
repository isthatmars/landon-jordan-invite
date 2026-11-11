"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveFlag } from "@/lib/useLiveFlag";

const SCENE = "/images/scene-arcade-room.jpg";
const LOOP = "/images/scene-arcade-disco.mp4";

/** Disco ball in the source photograph, as fractions of the 1280×720 frame. */
const BALL = { x: 1010 / 1280, y: 154 / 720, r: 88 / 1280 };

type Spot = {
  color: string;
  x: number;
  y: number;
  ax: number;
  ay: number;
  speed: number;
  phase: number;
  w: number;
  h: number;
};

const SPOTS: Spot[] = [
  { color: "#ff39c8", x: 0.42, y: 0.72, ax: 0.18, ay: 0.06, speed: 0.55, phase: 0.2, w: 0.09, h: 0.035 },
  { color: "#c6ff00", x: 0.62, y: 0.8, ax: 0.16, ay: 0.05, speed: 0.42, phase: 1.4, w: 0.07, h: 0.03 },
  { color: "#5ad8ff", x: 0.3, y: 0.66, ax: 0.12, ay: 0.07, speed: 0.7, phase: 2.2, w: 0.06, h: 0.028 },
  { color: "#ffb020", x: 0.74, y: 0.76, ax: 0.14, ay: 0.08, speed: 0.48, phase: 0.8, w: 0.08, h: 0.032 },
  { color: "#ff39c8", x: 0.55, y: 0.88, ax: 0.2, ay: 0.04, speed: 0.36, phase: 3.1, w: 0.11, h: 0.03 },
  { color: "#7dffdf", x: 0.88, y: 0.42, ax: 0.03, ay: 0.12, speed: 0.62, phase: 1.1, w: 0.028, h: 0.04 },
  { color: "#ffe14a", x: 0.9, y: 0.55, ax: 0.025, ay: 0.1, speed: 0.5, phase: 2.6, w: 0.03, h: 0.045 },
];

function coverPlacement(cw: number, ch: number, iw: number, ih: number) {
  const scale = Math.max(cw / iw, ch / ih);
  const rw = iw * scale;
  const rh = ih * scale;
  return {
    ox: (cw - rw) * 0.5,
    oy: (ch - rh) * 0.72,
    rw,
    rh,
    scale,
  };
}

export function ArcadeBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visibleRef = useRef(false);
  const arcadeLive = useLiveFlag("liveArcade");
  const arcadeLiveRef = useRef(arcadeLive);
  const [reduce, setReduce] = useState(false);
  const [mode, setMode] = useState<"video" | "canvas">("video");

  useEffect(() => {
    arcadeLiveRef.current = arcadeLive;
    const video = videoRef.current;
    if (!video || reduce || mode !== "video") return;
    if (arcadeLive && visibleRef.current) {
      video.muted = true;
      void video.play().catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMode("canvas");
      });
    } else {
      video.pause();
    }
  }, [arcadeLive, reduce, mode]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduce(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        const video = videoRef.current;
        if (!video || reduce || mode !== "video") return;
        if (entry.isIntersecting && arcadeLiveRef.current) {
          video.muted = true;
          void video.play().catch((err: unknown) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            setMode("canvas");
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.08 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [reduce, mode]);

  useEffect(() => {
    if (reduce || mode !== "canvas") return;
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;
    let last = 0;
    const img = new Image();
    img.src = SCENE;

    const draw = (now: number) => {
      if (stopped) return;
      raf = window.requestAnimationFrame(draw);
      if (
        !visibleRef.current ||
        !arcadeLiveRef.current ||
        document.hidden ||
        !img.complete ||
        !img.naturalWidth
      ) {
        return;
      }
      if (now - last < 32) return;
      last = now;

      const cw = root.clientWidth;
      const ch = root.clientHeight;
      if (cw < 2 || ch < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const pw = Math.floor(cw * dpr);
      const ph = Math.floor(ch * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const place = coverPlacement(cw, ch, img.naturalWidth, img.naturalHeight);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, place.ox, place.oy, place.rw, place.rh);

      const cx = place.ox + BALL.x * img.naturalWidth * place.scale;
      const cy = place.oy + BALL.y * img.naturalHeight * place.scale;
      const radius = BALL.r * img.naturalWidth * place.scale;
      const angle = (now / 14000) * Math.PI * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
      ctx.drawImage(img, place.ox, place.oy, place.rw, place.rh);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const t = now / 1000;
      for (const spot of SPOTS) {
        const nx = spot.x + Math.sin(t * spot.speed + spot.phase) * spot.ax;
        const ny = spot.y + Math.cos(t * spot.speed * 0.8 + spot.phase) * spot.ay;
        const x = place.ox + nx * img.naturalWidth * place.scale;
        const y = place.oy + ny * img.naturalHeight * place.scale;
        const w = spot.w * img.naturalWidth * place.scale;
        const h = spot.h * img.naturalHeight * place.scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.sin(t * 0.35 + spot.phase) * 0.6);
        ctx.fillStyle = spot.color;
        ctx.globalAlpha = 0.42 + 0.28 * Math.sin(t * spot.speed + spot.phase);
        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    const start = () => {
      raf = window.requestAnimationFrame(draw);
    };
    if (img.complete) start();
    else img.onload = start;

    return () => {
      stopped = true;
      window.cancelAnimationFrame(raf);
    };
  }, [reduce, mode]);

  return (
    <div ref={rootRef} className="absolute inset-0" data-testid="arcade-disco" data-disco={reduce ? "still" : mode}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SCENE}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_72%]"
      />
      {!reduce && mode === "video" ? (
        <video
          ref={videoRef}
          className="disco-video absolute inset-0 h-full w-full object-cover object-[center_72%]"
          poster={SCENE}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setMode("canvas")}
        >
          <source src={LOOP} type="video/mp4" />
        </video>
      ) : null}
      {!reduce && mode === "canvas" ? (
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      ) : null}
    </div>
  );
}
