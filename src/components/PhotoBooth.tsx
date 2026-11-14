"use client";

/**
 * 80s Photo Booth — LOCKS (see PHOTO_BOOTH.md):
 * 1. Fixed OpenArt environment plate (`/images/booth/environment.jpg`) for every step.
 * 2. First shot = Polaroid camera before (modern) → after (80s) composition.
 * 3. AI via OpenArt only (`/api/booth/generate` → `src/lib/booth/ai.ts` → OpenArt).
 */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Step =
  | "entry"
  | "auth"
  | "myphotos"
  | "upload"
  | "confirm"
  | "generate"
  | "ready"
  | "submitted"
  | "throwback";

type Guest = {
  email: string;
  firstName: string;
  rsvpId: string | null;
  hasRsvp: boolean;
  attend: string | null;
};

type PhotoItem = {
  id: string;
  kind: "ai" | "throwback";
  status: string;
  createdAt: string;
  submittedToGalleryAt: string | null;
  errorMessage: string | null;
  url: string | null;
};

type Rate = {
  remaining: number;
  limit: number;
  resetAt: string | null;
  allowed: boolean;
};

const STEPS_AI = ["Choose", "Upload", "Confirm", "Generate", "Preview", "Complete"] as const;

const CONSENT =
  "I understand my photo may be reviewed before appearing in the party gallery/slideshow. Original uploads used for AI styling are deleted within 30 minutes. I confirm I have the right to upload this photo.";

function firstNameOf(guest: Guest | null) {
  return guest?.firstName?.trim() || "";
}

export function PhotoBooth() {
  const [step, setStep] = useState<Step>("entry");
  const [mode, setMode] = useState<"ai" | "throwback">("ai");
  const [guest, setGuest] = useState<Guest | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [rate, setRate] = useState<Rate | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [uploadId, setUploadId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(12);
  const [flash, setFlash] = useState(false);
  const [polaroidPhase, setPolaroidPhase] = useState<"idle" | "eject" | "develop" | "ready">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingAction = useRef<"ai" | "throwback" | "myphotos" | null>(null);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/booth/session");
    const data = await res.json();
    setAiConfigured(Boolean(data.ai?.configured));
    if (data.authenticated && data.guest) {
      setGuest(data.guest);
      setPhotos(data.photos || []);
      setRate(data.rate || null);
      setEmail(data.guest.email || "");
      setFirstName(data.guest.firstName || "");
    } else {
      setGuest(null);
      setPhotos([]);
      setRate(null);
    }
    setLoading(false);
    return data;
  }, []);

  useEffect(() => {
    void refreshSession();
    const params = new URLSearchParams(location.hash.split("?")[1] || "");
    const boothEmail = params.get("booth_email");
    const boothCode = params.get("booth_code");
    if (boothEmail && boothCode) {
      setEmail(boothEmail);
      setOtp(boothCode);
      setOtpSent(true);
      setStep("auth");
    }
  }, [refreshSession]);

  const stepIndex = useMemo(() => {
    switch (step) {
      case "entry":
      case "auth":
      case "myphotos":
        return 0;
      case "upload":
      case "throwback":
        return 1;
      case "confirm":
        return 2;
      case "generate":
        return 3;
      case "ready":
        return 4;
      case "submitted":
        return 5;
      default:
        return 0;
    }
  }, [step]);

  const requireAuthThen = async (action: "ai" | "throwback" | "myphotos") => {
    setError("");
    const data = await refreshSession();
    if (data.authenticated) {
      if (action === "myphotos") setStep("myphotos");
      else if (action === "throwback") {
        setMode("throwback");
        setStep("upload");
      } else {
        setMode("ai");
        setStep("upload");
      }
      return;
    }
    pendingAction.current = action;
    setStep("auth");
  };

  const afterAuth = () => {
    const next = pendingAction.current || "ai";
    pendingAction.current = null;
    if (next === "myphotos") setStep("myphotos");
    else if (next === "throwback") {
      setMode("throwback");
      setStep("upload");
    } else {
      setMode("ai");
      setStep("upload");
    }
  };

  const startAuth = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booth/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send code.");
      setOtpSent(true);
      setDevCode(data.devCode || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  };

  const verifyAuth = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/booth/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code failed.");
      await refreshSession();
      afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("purpose", mode === "throwback" ? "throwback" : "ai_source");
      const res = await fetch("/api/booth/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setUploadId(data.uploadId);
      setPreviewUrl(data.previewUrl);
      setConsent(false);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    if (!uploadId || !consent) return;
    setBusy(true);
    setError("");
    setStep("generate");
    setPolaroidPhase("idle");
    setFlash(false);
    setProgress(18);
    setResultUrl(null);
    setResultId(null);

    // Flash → eject blank polaroid while request runs
    requestAnimationFrame(() => {
      setFlash(true);
      window.setTimeout(() => {
        setFlash(false);
        setPolaroidPhase("eject");
      }, 420);
    });

    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 4 + Math.random() * 6, 88));
    }, 450);

    try {
      const endpoint = mode === "throwback" ? "/api/booth/throwback" : "/api/booth/generate";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, consent: true }),
      });
      const data = await res.json();
      window.clearInterval(tick);
      if (!res.ok) {
        setPolaroidPhase("idle");
        setError(data.error || "Generation failed.");
        if (data.rate) setRate(data.rate);
        setStep("confirm");
        return;
      }

      setProgress(100);
      setResultId(data.photoId);
      // Hold blank eject, then develop once AI image is ready (never reveal early)
      setPolaroidPhase("eject");
      await new Promise((r) => setTimeout(r, 700));
      setResultUrl(data.brandedUrl);
      setPolaroidPhase("develop");
      await new Promise((r) => setTimeout(r, 5200));
      setPolaroidPhase("ready");
      await refreshSession();
      if (mode === "throwback") {
        setStep("submitted");
      } else {
        setStep("ready");
      }
    } catch (err) {
      window.clearInterval(tick);
      setPolaroidPhase("idle");
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  };

  const submitToGallery = async () => {
    if (!resultId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/booth/photos/${resultId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed.");
      await refreshSession();
      setStep("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetCreate = () => {
    setUploadId(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setResultId(null);
    setConsent(false);
    setPolaroidPhase("idle");
    setProgress(12);
    setError("");
    setMode("ai");
    setStep("upload");
  };

  const welcomeName = firstNameOf(guest);

  // Dev/screenshot helper: ?booth_step= or window.__boothGoto(step)
  useEffect(() => {
    const apply = (s: string) => {
      if (
        !["entry", "auth", "upload", "confirm", "generate", "ready", "submitted", "myphotos"].includes(
          s
        )
      ) {
        return;
      }
      setLoading(false);
      setStep(s as Step);
      if (s === "confirm" || s === "generate" || s === "ready" || s === "submitted") {
        setPreviewUrl((u) => u || "/images/booth/sample-before.jpg");
        setResultUrl((u) => u || "/images/booth/sample-after-face.jpg");
        setUploadId((id) => id || "demo");
        setResultId((id) => id || "demo");
        setConsent(true);
        if (s === "generate") {
          setPolaroidPhase("eject");
          setProgress(72);
          setFlash(true);
        }
        if (s === "ready" || s === "submitted") setPolaroidPhase("ready");
      }
    };
    const params = new URLSearchParams(
      location.hash.includes("?") ? location.hash.split("?")[1] : location.search
    );
    const fromUrl = params.get("booth_step");
    if (fromUrl) apply(fromUrl);
    (window as unknown as { __boothGoto?: (s: string) => void }).__boothGoto = apply;
    return () => {
      delete (window as unknown as { __boothGoto?: (s: string) => void }).__boothGoto;
    };
  }, []);

  return (
    <section id="photobooth" className="scene-section" aria-label="80s Photo Booth">
      {/* ONE fixed OpenArt environment plate for every step */}
      <div className="booth-scene" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="booth-env" src="/images/booth/environment.jpg" alt="" decoding="async" />
        <div className="booth-scene-veil" />
      </div>

      <div className="booth-wrap">
        <header className="booth-header">
          <p className="booth-neon-80s">The 80&apos;s</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="booth-title-chrome"
            src="/images/booth/title-photo-booth-sm.png"
            alt="PHOTO BOOTH"
          />
          <h2 className="booth-chrome-fallback" aria-hidden="true">PHOTO BOOTH</h2>
        </header>

        <div className="booth-panel">
          {step !== "entry" && step !== "auth" && step !== "myphotos" ? (
            <div className="booth-steps" aria-label="Progress">
              {STEPS_AI.map((label, i) => (
                <span
                  key={label}
                  className={`booth-step-dot${i < stepIndex ? " is-done" : ""}${i === stepIndex ? " is-active" : ""}`}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {loading ? <p className="text-center text-white/70">Warming up the booth…</p> : null}

          {!loading && step === "entry" ? (
            <div className="booth-stage">
              <div className="booth-camera-wrap booth-first-shot" aria-label="Before and after Polaroid demo">
                <div className="booth-before">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/booth/sample-before.jpg" alt="Modern day photo" />
                  <span className="booth-before-label">Before</span>
                </div>
                <span className="booth-morph-arrow" aria-hidden>
                  →
                </span>
                <div className="booth-camera">
                  <div className="booth-flash is-on" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="booth-camera-img"
                    src="/images/booth/polaroid-camera-cut.png"
                    alt="Polaroid camera"
                  />
                  <div className="booth-polaroid is-from-camera is-ejecting is-sample">
                    <div className="booth-polaroid-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="booth-polaroid-img"
                        src="/images/booth/sample-after-face.jpg"
                        alt="80s transformed Polaroid"
                      />
                      <span className="booth-polaroid-torn" aria-hidden />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="booth-polaroid-brand" src="/images/booth/polaroid-watermark.png" alt="" />
                    <span className="booth-after-label">After · 80s</span>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="booth-neon-script" style={{ fontSize: "1.65rem" }}>
                  {welcomeName
                    ? `Welcome back, ${welcomeName}!`
                    : "Welcome to the 80's Photo Booth!"}
                </h3>
                <p className="booth-subcopy">
                  Watch a modern photo become an 80s Polaroid — then upload yours for the same
                  transformation and add it to the Party Gallery.
                </p>
                <div className="booth-btn-stack mx-auto md:mx-0">
                  <button
                    type="button"
                    className="booth-btn booth-btn-pink"
                    onClick={() => void requireAuthThen("ai")}
                  >
                    Upload photo →
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => void requireAuthThen("throwback")}
                  >
                    Upload a throwback
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => void requireAuthThen("myphotos")}
                  >
                    See my photos
                  </button>
                </div>
                {rate ? (
                  <p className="booth-rate mt-3">
                    AI photos left this hour: {rate.remaining}/{rate.limit}
                    {rate.resetAt && rate.remaining === 0
                      ? ` · next at ${new Date(rate.resetAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading && step === "auth" ? (
            <div className="mx-auto max-w-md space-y-4 text-center">
              <h3 className="booth-neon-script" style={{ fontSize: "1.5rem" }}>
                Unlock the booth
              </h3>
              <p className="text-sm text-white/70">
                We email a one-time code. Same flow whether you&apos;ve RSVP&apos;d or not — Photo
                Booth never marks you as attending.
              </p>
              {!otpSent ? (
                <form onSubmit={startAuth} className="space-y-3 text-left">
                  <label className="block text-sm">
                    First name
                    <input
                      className="input-dark mt-1 w-full"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="block text-sm">
                    Email
                    <input
                      className="input-dark mt-1 w-full"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </label>
                  <button type="submit" className="booth-btn booth-btn-pink w-full" disabled={busy}>
                    {busy ? "Sending…" : "Send code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyAuth} className="space-y-3 text-left">
                  <label className="block text-sm">
                    6-digit code
                    <input
                      className="input-dark mt-1 w-full tracking-[0.3em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      pattern="\d{6}"
                      required
                    />
                  </label>
                  {devCode ? (
                    <p className="text-xs text-[#c6ff00]">Dev code (email stubbed): {devCode}</p>
                  ) : null}
                  <button type="submit" className="booth-btn booth-btn-pink w-full" disabled={busy}>
                    {busy ? "Checking…" : "Verify & continue"}
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline w-full"
                    onClick={() => setOtpSent(false)}
                  >
                    Use a different email
                  </button>
                </form>
              )}
              <button type="button" className="text-sm text-white/50 underline" onClick={() => setStep("entry")}>
                Back
              </button>
            </div>
          ) : null}

          {!loading && step === "upload" ? (
            <div className="booth-stage">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="booth-polaroid-sample booth-polaroid-full"
                  src="/images/booth/sample-after-branded.jpg"
                  alt="Sample 80s Polaroid"
                />
              </div>
              <div>
                <h3 className="booth-neon-script" style={{ fontSize: "1.55rem" }}>
                  {mode === "throwback" ? "Upload a Throwback" : "Welcome to the 80's Photo Booth!"}
                </h3>
                <p className="booth-subcopy">
                  {mode === "throwback"
                    ? "Add an original 80's photo for the party slideshow."
                    : "Upload a photo to get your 80's transformation and add it to the Party Gallery."}
                </p>
                <div
                  className={`booth-drop${dragOver ? " is-drag" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void onFile(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <span className="booth-drop-icon" aria-hidden>
                    ☁
                  </span>
                  <p className="font-nav tracking-[0.12em] text-sm">DRAG &amp; DROP YOUR PHOTO HERE</p>
                  <button
                    type="button"
                    className="booth-btn booth-btn-pink"
                    disabled={busy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {busy ? "Uploading…" : "Upload photo"}
                  </button>
                  <p className="text-xs text-white/50">JPG, PNG, or HEIC • Up to 10MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={(e) => void onFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="booth-actions-row">
                  <button type="button" className="booth-btn booth-btn-outline" onClick={() => setStep("entry")}>
                    Back
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && step === "confirm" ? (
            <div className="booth-stage">
              <div className="flex flex-col items-center gap-3">
                <div className="booth-preview-frame">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Selected photo" />
                  ) : null}
                  <span className="booth-check" aria-hidden>
                    ✓
                  </span>
                </div>
                <p className="font-nav text-xs tracking-[0.14em] text-white/50">Selected photo</p>
              </div>
              <div>
                <h3 className="booth-neon-script" style={{ fontSize: "1.6rem" }}>
                  Your Photo
                </h3>
                <p className="mt-2 text-sm text-white/75">
                  {mode === "throwback"
                    ? "Ready to add this throwback to the party gallery?"
                    : "This is the photo you selected. Ready to turn it into an 80's masterpiece?"}
                </p>
                {!aiConfigured && mode === "ai" ? (
                  <p className="booth-error">
                    AI generation needs OPENART_TOKEN on the server (or BOOTH_MOCK_AI=1 for local
                    smoke tests). OpenArt image2image only — no alternate image providers.
                  </p>
                ) : null}
                <div className="booth-consent">
                  <label>
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>{CONSENT}</span>
                  </label>
                </div>
                {rate && mode === "ai" ? (
                  <p className="booth-rate mb-3">
                    Remaining AI gens: {rate.remaining}/{rate.limit}
                    {rate.resetAt && !rate.allowed
                      ? ` · available ${new Date(rate.resetAt).toLocaleString()}`
                      : ""}
                  </p>
                ) : null}
                <div className="booth-btn-stack">
                  <button
                    type="button"
                    className="booth-btn booth-btn-pink"
                    disabled={busy || !consent || (mode === "ai" && rate !== null && !rate.allowed)}
                    onClick={() => void runGenerate()}
                  >
                    {mode === "throwback" ? "Add to party gallery →" : "Create my 80s photo →"}
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => {
                      setUploadId(null);
                      setPreviewUrl(null);
                      setStep("upload");
                    }}
                  >
                    Choose a different photo
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && step === "generate" ? (
            <div className="booth-stage">
              <div className="booth-camera-wrap">
                <div className={`booth-flash${flash ? " is-on" : ""}`} />
                <div className="booth-camera">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="booth-camera-img"
                    src="/images/booth/polaroid-camera-cut.png"
                    alt=""
                  />
                  <div
                    className={`booth-polaroid is-from-camera${
                      polaroidPhase === "eject"
                        ? " is-ejecting"
                        : polaroidPhase === "develop"
                          ? " is-ejecting is-developing"
                          : polaroidPhase === "ready"
                            ? " is-ready"
                            : ""
                    }`}
                  >
                    <div className="booth-polaroid-img-wrap">
                      {resultUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="booth-polaroid-img" src={resultUrl} alt="" />
                      ) : (
                        <div className="booth-polaroid-img" />
                      )}
                      <span className="booth-polaroid-torn" aria-hidden />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="booth-polaroid-brand" src="/images/booth/polaroid-watermark.png" alt="" />
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon" aria-hidden>
                  ⎙
                </div>
                <h3 className="booth-neon-script">Printing your photo...</h3>
                <div className="booth-progress" aria-hidden>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <p className="booth-rate">CREATING YOUR 80&apos;S TRANSFORM</p>
                <ul className="booth-checklist">
                  <li>
                    <span className="dot is-done" /> Photo Uploaded
                  </li>
                  <li>
                    <span className={`dot${progress < 90 ? " is-active" : " is-done"}`} /> Applying
                    80s Style
                  </li>
                  <li>
                    <span className={`dot${progress >= 95 ? " is-done" : ""}`} /> Finalizing Your
                    Photo
                  </li>
                </ul>
              </div>
            </div>
          ) : null}

          {!loading && step === "ready" ? (
            <div className="booth-stage">
              <div className="flex justify-center">
                <div className="booth-polaroid is-ready">
                  <div className="booth-polaroid-img-wrap">
                    {resultUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="booth-polaroid-img" src={resultUrl} alt="Your 80s photo" />
                    ) : null}
                    <span className="booth-polaroid-torn" aria-hidden />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="booth-polaroid-brand" src="/images/booth/polaroid-watermark.png" alt="" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon is-ok" aria-hidden>
                  ✓
                </div>
                <h3 className="booth-neon-script">Your 80&apos;s Photo is Ready!</h3>
                <p className="booth-subcopy">
                  Your photo is ready and can be added to the Party Gallery for the event slideshow!
                </p>
                <div className="booth-btn-stack mx-auto md:mx-0">
                  <button
                    type="button"
                    className="booth-btn booth-btn-pink"
                    disabled={busy}
                    onClick={() => void submitToGallery()}
                  >
                    Submit to gallery
                  </button>
                  <a
                    className="booth-btn booth-btn-outline"
                    href={resultId ? `/api/booth/photos/${resultId}/download` : resultUrl || "#"}
                  >
                    Download photo
                  </a>
                  <button type="button" className="booth-btn booth-btn-outline" onClick={resetCreate}>
                    Create another
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && step === "submitted" ? (
            <div className="booth-stage">
              <div className="flex justify-center">
                <div className="booth-polaroid is-ready">
                  <div className="booth-polaroid-img-wrap">
                    {resultUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="booth-polaroid-img" src={resultUrl} alt="Submitted photo" />
                    ) : null}
                    <span className="booth-polaroid-torn" aria-hidden />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="booth-polaroid-brand" src="/images/booth/polaroid-watermark.png" alt="" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon is-ok" aria-hidden>
                  ✓
                </div>
                <h3 className="booth-neon-script">Submitted to Party Gallery!</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Your photo has been received and is awaiting approval. Once approved, it will be
                  added to the event slideshow and Party Gallery.
                </p>
                <div className="booth-btn-stack mx-auto mt-4 md:mx-0">
                  <a
                    className="booth-btn booth-btn-pink"
                    href={resultId ? `/api/booth/photos/${resultId}/download` : "#"}
                  >
                    Download photo
                  </a>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => {
                      setStep("entry");
                      resetCreate();
                    }}
                  >
                    Back to photo booth
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {!loading && step === "myphotos" ? (
            <div className="space-y-5">
              <h3 className="booth-neon-script text-center" style={{ fontSize: "1.5rem" }}>
                My Photos
              </h3>
              <div>
                <p className="font-nav mb-2 text-xs tracking-[0.14em] text-[#c6ff00]">
                  My 80s AI photos
                </p>
                <div className="booth-thumbs">
                  {photos.filter((p) => p.kind === "ai").length === 0 ? (
                    <p className="text-sm text-white/50">No AI photos yet.</p>
                  ) : (
                    photos
                      .filter((p) => p.kind === "ai")
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="booth-thumb"
                          onClick={() => setLightbox(p)}
                        >
                          {p.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.url} alt="" />
                          ) : (
                            <div className="aspect-square bg-white/10" />
                          )}
                          <span className="booth-thumb-meta">{p.status}</span>
                        </button>
                      ))
                  )}
                </div>
              </div>
              <div>
                <p className="font-nav mb-2 text-xs tracking-[0.14em] text-[#c6ff00]">
                  My throwback uploads
                </p>
                <div className="booth-thumbs">
                  {photos.filter((p) => p.kind === "throwback").length === 0 ? (
                    <p className="text-sm text-white/50">No throwbacks yet.</p>
                  ) : (
                    photos
                      .filter((p) => p.kind === "throwback")
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="booth-thumb"
                          onClick={() => setLightbox(p)}
                        >
                          {p.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.url} alt="" />
                          ) : (
                            <div className="aspect-square bg-white/10" />
                          )}
                          <span className="booth-thumb-meta">{p.status}</span>
                        </button>
                      ))
                  )}
                </div>
              </div>
              <div className="booth-actions-row">
                <button type="button" className="booth-btn booth-btn-pink" onClick={resetCreate}>
                  Create another 80s photo
                </button>
                <button type="button" className="booth-btn booth-btn-outline" onClick={() => setStep("entry")}>
                  Back
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="booth-error text-center" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {lightbox ? (
        <div className="booth-lightbox" role="dialog" aria-modal="true">
          <div className="booth-lightbox-inner">
            {lightbox.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.url} alt="" />
            ) : null}
            <p className="mt-2 text-center text-sm text-white/70">
              {lightbox.kind} · {lightbox.status}
            </p>
            <div className="booth-actions-row">
              <a className="booth-btn booth-btn-pink" href={`/api/booth/photos/${lightbox.id}/download`}>
                Download
              </a>
              {lightbox.status === "private" ? (
                <button
                  type="button"
                  className="booth-btn booth-btn-green"
                  onClick={async () => {
                    setResultId(lightbox.id);
                    setResultUrl(lightbox.url);
                    setLightbox(null);
                    await submitToGallery();
                  }}
                >
                  Add to gallery
                </button>
              ) : null}
              <button type="button" className="booth-btn booth-btn-outline" onClick={() => setLightbox(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

