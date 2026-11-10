"use client";

import { useEffect, useRef, useState } from "react";

/** Tiny canvas pinball — optional second arcade mode */
export function PinballLite({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const left = useRef(false);
  const right = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") left.current = true;
      if (e.key === "ArrowRight" || e.key === "d") right.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") left.current = false;
      if (e.key === "ArrowRight" || e.key === "d") right.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    let ball = { x: W / 2, y: H / 2, vx: 2.2, vy: -3.2, r: 7 };
    let flipL = 0;
    let flipR = 0;
    let raf = 0;
    let pts = 0;

    const bumpers = [
      { x: 70, y: 90, r: 16 },
      { x: 160, y: 70, r: 14 },
      { x: 240, y: 100, r: 16 },
    ];

    const loop = () => {
      raf = requestAnimationFrame(loop);
      flipL += ((left.current ? 1 : 0) - flipL) * 0.35;
      flipR += ((right.current ? 1 : 0) - flipR) * 0.35;

      ball.vy += 0.12;
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x < ball.r || ball.x > W - ball.r) ball.vx *= -1;
      if (ball.y < ball.r) ball.vy *= -1;

      // flippers
      const flY = H - 36;
      if (ball.y > flY - 10 && ball.y < flY + 12) {
        if (ball.x < W / 2 - 10 && flipL > 0.4) {
          ball.vy = -6.5 - flipL * 2;
          ball.vx = 2 + flipL;
          pts += 5;
          setScore(pts);
        }
        if (ball.x > W / 2 + 10 && flipR > 0.4) {
          ball.vy = -6.5 - flipR * 2;
          ball.vx = -2 - flipR;
          pts += 5;
          setScore(pts);
        }
      }

      for (const b of bumpers) {
        const dx = ball.x - b.x;
        const dy = ball.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < ball.r + b.r) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.vx = nx * 4;
          ball.vy = ny * 4;
          ball.x = b.x + nx * (ball.r + b.r + 1);
          ball.y = b.y + ny * (ball.r + b.r + 1);
          pts += 25;
          setScore(pts);
        }
      }

      if (ball.y > H + 20) {
        ball = { x: W / 2, y: H / 2, vx: 2.2, vy: -3.2, r: 7 };
      }

      ctx.fillStyle = "#05010f";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#ff2bd6";
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, W - 8, H - 8);

      for (const b of bumpers) {
        ctx.fillStyle = "#2ef2c6";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "#2ef2c6";
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // flippers
      ctx.strokeStyle = "#39ff14";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(24, flY);
      ctx.lineTo(W / 2 - 18, flY - flipL * 18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 24, flY);
      ctx.lineTo(W / 2 + 18, flY - flipR * 18);
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div>
      <div className="mb-2 text-xs tracking-widest text-neon-green">PINBALL {score}</div>
      <canvas
        ref={canvasRef}
        width={300}
        height={400}
        className="mx-auto w-full max-w-[300px] rounded-md border border-pink-500/40 bg-black"
      />
      <div className="mt-3 flex justify-center gap-3 md:hidden">
        <button
          type="button"
          className="btn-pink-outline px-6"
          onTouchStart={() => (left.current = true)}
          onTouchEnd={() => (left.current = false)}
          onMouseDown={() => (left.current = true)}
          onMouseUp={() => (left.current = false)}
        >
          ◀
        </button>
        <button
          type="button"
          className="btn-pink-outline px-6"
          onTouchStart={() => (right.current = true)}
          onTouchEnd={() => (right.current = false)}
          onMouseDown={() => (right.current = true)}
          onMouseUp={() => (right.current = false)}
        >
          ▶
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] text-violet-300/80">Flippers: ← → / A D</p>
    </div>
  );
}
