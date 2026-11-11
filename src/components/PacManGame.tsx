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

/** Slower than the original arcade tick so guests can aim turns. */
const TICK_MS = 200;

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

export function PacManGame({
  running,
  embed = false,
  showPad = false,
  sessionActive = false,
  startHintDone = false,
  onStartHintDone,
}: {
  running: boolean;
  embed?: boolean;
  showPad?: boolean;
  /** Arcade Start Game session (ignores arcadeLive flicker). */
  sessionActive?: boolean;
  /** Parent-owned: once true, the embed start cue stays gone across remounts. */
  startHintDone?: boolean;
  onStartHintDone?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [phase, setPhase] = useState<"play" | "won" | "lost">("play");
  /**
   * Desktop embed: one-shot start cue. Dismissed on first direction input and
   * never re-shown for this play session (death / replay / remount stay quiet).
   */
  const [localHintDismissed, setLocalHintDismissed] = useState(startHintDone);
  const hintDismissedRef = useRef(startHintDone);
  const onStartHintDoneRef = useRef(onStartHintDone);
  useEffect(() => {
    onStartHintDoneRef.current = onStartHintDone;
  }, [onStartHintDone]);
  useEffect(() => {
    if (startHintDone) {
      hintDismissedRef.current = true;
      setLocalHintDismissed(true);
    }
  }, [startHintDone]);
  const showStartHint = embed && !localHintDismissed && !startHintDone;
  const phaseRef = useRef(phase);
  const livesRef = useRef(lives);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  const state = useRef({
    // next: null → Pac stays put until an arrow / swipe / pad press.
    pac: { x: 9, y: 15, dir: "R" as Dir, next: null as Dir | null },
    ghosts: [
      { x: 9, y: 9, dir: "U" as Dir, color: "#ff4d6d" },
      { x: 8, y: 9, dir: "L" as Dir, color: "#22d3ee" },
      { x: 10, y: 9, dir: "R" as Dir, color: "#fb923c" },
    ],
    pellets: pelletsFromMaze(),
    tick: 0,
    hurt: 0,
  });

  /** Reposition Pac after a hit — does not revive the start-key hint. */
  const resetPac = () => {
    state.current.pac = { x: 9, y: 15, dir: "R", next: null };
  };

  const setDir = useCallback((dir: Dir) => {
    state.current.pac.next = dir;
    if (!hintDismissedRef.current) {
      hintDismissedRef.current = true;
      setLocalHintDismissed(true);
      onStartHintDoneRef.current?.();
    }
  }, []);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);

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
      if (!dir || !runningRef.current) return;
      e.preventDefault();
      setDir(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDir]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;

    const wrapTunnel = (x: number, y: number) => {
      let nx = x;
      if (y === 9 && nx < 0) nx = COLS - 1;
      if (y === 9 && nx >= COLS) nx = 0;
      return nx;
    };

    const stepGhost = (
      ent: { x: number; y: number; dir: Dir },
      prefer?: Dir,
    ) => {
      const tryDir = prefer && canMove(ent.x + DIRS[prefer].x, ent.y + DIRS[prefer].y) ? prefer : ent.dir;
      const ny = ent.y + DIRS[tryDir].y;
      const nx = wrapTunnel(ent.x + DIRS[tryDir].x, ny);
      if (canMove(nx, ny)) {
        ent.x = nx;
        ent.y = ny;
        ent.dir = tryDir;
        return;
      }
      // Ghosts may bounce into another open corridor.
      const order: Dir[] = ["U", "L", "D", "R"];
      for (const d of order) {
        const tx = wrapTunnel(ent.x + DIRS[d].x, ent.y + DIRS[d].y);
        const ty = ent.y + DIRS[d].y;
        if (canMove(tx, ty)) {
          ent.x = tx;
          ent.y = ty;
          ent.dir = d;
          return;
        }
      }
    };

    /** Pac only moves after a player command; stops at walls (no auto-bounce). */
    const stepPac = (pac: { x: number; y: number; dir: Dir; next: Dir | null }) => {
      if (!pac.next) return;
      const tryMove = (dir: Dir) => {
        const ny = pac.y + DIRS[dir].y;
        const nx = wrapTunnel(pac.x + DIRS[dir].x, ny);
        if (!canMove(nx, ny)) return false;
        pac.x = nx;
        pac.y = ny;
        pac.dir = dir;
        return true;
      };
      if (tryMove(pac.next)) return;
      if (pac.dir !== pac.next && tryMove(pac.dir)) return;
      // Blocked — hold still until a new arrow opens a path.
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const s = state.current;
      if (running && phaseRef.current === "play" && t - last >= TICK_MS) {
        last = t;
        s.tick++;

      stepPac(s.pac);
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
        stepGhost(g, pick);
        if (g.x === s.pac.x && g.y === s.pac.y && s.tick - s.hurt > 6) {
          s.hurt = s.tick;
          const nextLives = livesRef.current - 1;
          livesRef.current = Math.max(nextLives, 0);
          setLives(livesRef.current);
          if (nextLives <= 0) {
            phaseRef.current = "lost";
            setPhase("lost");
          } else {
            resetPac();
          }
        }
      }

      if (s.pellets.size === 0) {
        phaseRef.current = "won";
        setScore((v) => v + 200);
        setPhase("won");
      }
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewW = COLS * CELL;
      const viewH = ROWS * CELL;
      const cssW = canvas.clientWidth || viewW;
      const cssH = canvas.clientHeight || viewH;
      const backingW = Math.max(1, Math.round(cssW * dpr));
      const backingH = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== backingW || canvas.height !== backingH) {
        canvas.width = backingW;
        canvas.height = backingH;
      }
      ctx.setTransform((cssW * dpr) / viewW, 0, 0, (cssH * dpr) / viewH, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // draw
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, viewW, viewH);
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

  const replay = () => {
    state.current.pellets = pelletsFromMaze();
    state.current.hurt = 0;
    resetPac();
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    phaseRef.current = "play";
    setPhase("play");
  };

  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className={embed ? "relative flex h-full w-full touch-none flex-col bg-black" : "game-board"}
      onPointerDown={(e) => {
        swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        if (!swipe.current) return;
        const dx = e.clientX - swipe.current.x;
        const dy = e.clientY - swipe.current.y;
        swipe.current = null;
        if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
        if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? "R" : "L");
        else setDir(dy > 0 ? "D" : "U");
      }}
    >
      <div
        className={
          embed
            ? "flex justify-between px-1 pt-0.5 font-mono text-[9px] leading-tight tracking-wider text-[#ffe14a]"
            : "mb-2 flex justify-between px-1 text-sm tracking-widest text-[#ffe14a]"
        }
      >
        <span>1UP {String(score).padStart(2, "0")}</span>
        <span>LIVES {Math.max(lives, 0)}</span>
        <span>HI {Math.max(score, 10000)}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        aria-label="Pac-Man"
        className={
          embed
            ? "h-full min-h-0 w-full flex-1 bg-black"
            : "game-canvas"
        }
      />
      {showPad && (
        <div className="game-pad" aria-label="Direction pad">
          <Pad dir="U" onClick={() => setDir("U")} />
          <Pad dir="L" onClick={() => setDir("L")} />
          <Pad dir="D" onClick={() => setDir("D")} />
          <Pad dir="R" onClick={() => setDir("R")} />
        </div>
      )}
      {showPad && (
        <button type="button" className="game-restart" onClick={replay}>
          RESTART GAME
        </button>
      )}
      {sessionActive && showStartHint && phase === "play" ? (
        <div className="pac-keys-hint" role="status">
          <p className="pac-keys-hint-title">Press arrow key to start</p>
          <p className="pac-keys-hint-keys" aria-hidden>
            <kbd>↑</kbd>
            <span>
              <kbd>←</kbd>
              <kbd>↓</kbd>
              <kbd>→</kbd>
            </span>
          </p>
          <p className="pac-keys-hint-sub">use arrows to move Pac-Man</p>
        </div>
      ) : null}
      {phase !== "play" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-black/72 px-4 text-center">
          <div>
            <p className="font-nav text-lg tracking-[0.16em] text-[#ffe14a]">
              {phase === "won" ? "YOU WIN" : "GAME OVER"}
            </p>
            <p className="mt-1 text-sm text-white">Score {score}</p>
            <button type="button" className="btn-pink-outline mt-3 min-h-12 px-4 text-base" onClick={replay}>
              PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pad({ dir, onClick }: { dir: Dir; onClick: () => void }) {
  const label = { U: "Up", D: "Down", L: "Left", R: "Right" }[dir];
  return (
    <button type="button" className={`game-pad-btn game-pad-${dir.toLowerCase()}`} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 4.5 5.5 12H10v7.5h4V12h4.5L12 4.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
