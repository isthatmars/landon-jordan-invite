"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Dir = "U" | "D" | "L" | "R";

const CELL = 16;
const COLS = 19;
const ROWS = 21;

/** Simple classic-inspired maze: 0 path, 1 wall */
const MAZE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,1,1],
  [0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
  [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,0,0,0,0,0,0,1,0,1,1,1,1],
  [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
  [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const DIRS: Record<Dir, { x: number; y: number }> = {
  U: { x: 0, y: -1 },
  D: { x: 0, y: 1 },
  L: { x: -1, y: 0 },
  R: { x: 1, y: 0 },
};

function pelletsFromMaze() {
  const set = new Set<string>();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAZE[y][x] === 0) set.add(`${x},${y}`);
    }
  }
  set.delete("9,9");
  return set;
}

function canMove(x: number, y: number) {
  if (y === 9 && (x < 0 || x >= COLS)) return true; // tunnel
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return MAZE[y][x] === 0;
}

export function PacManGame({ running }: { running: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const state = useRef({
    pac: { x: 9, y: 15, dir: "L" as Dir, next: "L" as Dir },
    ghosts: [
      { x: 9, y: 9, dir: "U" as Dir, color: "#ff4d6d" },
      { x: 8, y: 9, dir: "L" as Dir, color: "#22d3ee" },
      { x: 10, y: 9, dir: "R" as Dir, color: "#fb923c" },
    ],
    pellets: pelletsFromMaze(),
    tick: 0,
  });

  const resetPac = () => {
    state.current.pac = { x: 9, y: 15, dir: "L", next: "L" };
  };

  const setDir = useCallback((dir: Dir) => {
    state.current.pac.next = dir;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "U",
        ArrowDown: "D",
        ArrowLeft: "L",
        ArrowRight: "R",
        w: "U",
        s: "D",
        a: "L",
        d: "R",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      setDir(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  useEffect(() => {
    if (!running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    const stepEntity = (
      ent: { x: number; y: number; dir: Dir },
      prefer?: Dir,
    ) => {
      const tryDir = prefer && canMove(ent.x + DIRS[prefer].x, ent.y + DIRS[prefer].y) ? prefer : ent.dir;
      let nx = ent.x + DIRS[tryDir].x;
      let ny = ent.y + DIRS[tryDir].y;
      if (ny === 9 && nx < 0) nx = COLS - 1;
      if (ny === 9 && nx >= COLS) nx = 0;
      if (canMove(nx, ny)) {
        ent.x = nx;
        ent.y = ny;
        ent.dir = tryDir;
        return;
      }
      // bump — try other dirs
      const order: Dir[] = ["U", "L", "D", "R"];
      for (const d of order) {
        const tx = ent.x + DIRS[d].x;
        const ty = ent.y + DIRS[d].y;
        if (canMove(tx, ty)) {
          ent.x = tx;
          ent.y = ty;
          ent.dir = d;
          return;
        }
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 110) return;
      last = t;
      const s = state.current;
      s.tick++;

      stepEntity(s.pac, s.pac.next);
      const key = `${s.pac.x},${s.pac.y}`;
      if (s.pellets.has(key)) {
        s.pellets.delete(key);
        setScore((v) => v + 10);
      }

      for (const g of s.ghosts) {
        const options: Dir[] = (["U", "D", "L", "R"] as Dir[]).filter((d) =>
          canMove(g.x + DIRS[d].x, g.y + DIRS[d].y),
        );
        const pick =
          options[Math.floor(Math.random() * Math.max(options.length, 1))] || g.dir;
        stepEntity(g, pick);
        if (g.x === s.pac.x && g.y === s.pac.y) {
          setLives((v) => {
            const next = v - 1;
            return next;
          });
          resetPac();
        }
      }

      if (s.pellets.size === 0) {
        s.pellets = pelletsFromMaze();
        setScore((v) => v + 200);
      }

      // draw
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (MAZE[y][x] === 1) {
            ctx.fillStyle = "#1d4ed8";
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx.strokeStyle = "#60a5fa";
            ctx.strokeRect(x * CELL + 0.5, y * CELL + 0.5, CELL - 1, CELL - 1);
          } else if (s.pellets.has(`${x},${y}`)) {
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // pac
      const mouth = 0.25 + 0.15 * Math.sin(s.tick / 2);
      const ang = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 }[s.pac.dir];
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(s.pac.x * CELL + CELL / 2, s.pac.y * CELL + CELL / 2);
      ctx.arc(
        s.pac.x * CELL + CELL / 2,
        s.pac.y * CELL + CELL / 2,
        CELL / 2 - 1,
        ang + mouth,
        ang + Math.PI * 2 - mouth,
      );
      ctx.closePath();
      ctx.fill();
      // ghosts
      for (const g of s.ghosts) {
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.arc(g.x * CELL + CELL / 2, g.y * CELL + CELL / 2 - 1, CELL / 2 - 2, Math.PI, 0);
        ctx.lineTo(g.x * CELL + CELL - 2, g.y * CELL + CELL - 2);
        ctx.lineTo(g.x * CELL + 2, g.y * CELL + CELL - 2);
        ctx.closePath();
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  useEffect(() => {
    if (lives <= 0) {
      state.current.pellets = pelletsFromMaze();
      setLives(3);
      setScore(0);
      resetPac();
    }
  }, [lives]);

  return (
    <div className="w-full">
      <div className="mb-2 flex justify-between text-xs tracking-widest text-neon-teal">
        <span>SCORE {score}</span>
        <span>LIVES {Math.max(lives, 0)}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="mx-auto w-full max-w-[304px] rounded-md border border-blue-400/40 bg-black shadow-[0_0_24px_#3b82f680]"
      />
      <div className="mt-3 grid grid-cols-3 gap-2 max-w-[220px] mx-auto md:hidden">
        <span />
        <Pad onClick={() => setDir("U")}>▲</Pad>
        <span />
        <Pad onClick={() => setDir("L")}>◀</Pad>
        <Pad onClick={() => setDir("D")}>▼</Pad>
        <Pad onClick={() => setDir("R")}>▶</Pad>
      </div>
      <p className="mt-2 text-center text-[11px] text-violet-300/80">
        Keyboard: arrows / WASD · Touch pads on mobile
      </p>
    </div>
  );
}

function Pad({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-neon-pink/60 bg-black/50 py-3 text-lg active:bg-pink-500/20"
    >
      {children}
    </button>
  );
}
