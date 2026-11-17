"use client";

/**
 * 80s Photo Booth — LOCKS (see PHOTO_BOOTH.md):
 * 1. Fixed OpenArt environment plate (`/images/booth/environment.jpg`) for every step.
 * 2. Entry = large two-column panel: left Polaroid + camera prop (~45%), right welcome + drag/drop + upload (~55%).
 *    On-screen Polaroid frame has no logo; downloads are raw AI photos only.
 * 3. AI via Gemini (preferred) or OpenArt (`/api/booth/generate` → `src/lib/booth/ai.ts`).
 */

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BOOTH_GUEST_MESSAGES,
  guestVisibleBoothError,
} from "@/lib/booth/guestMessages";
import { readBoothJson } from "@/lib/booth/http";
import { emitBoothRsvpHandoff } from "@/lib/booth/rsvpBridge";
import { scrollToSection } from "@/lib/scrollToSection";

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
  const localPreviewRef = useRef<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(12);
  const [flash, setFlash] = useState(false);
  const [propFlash, setPropFlash] = useState(false);
  const [polaroidPhase, setPolaroidPhase] = useState<"idle" | "eject" | "develop" | "ready">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<PhotoItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rsvpPrompt, setRsvpPrompt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const entryFileRef = useRef<HTMLInputElement>(null);
  const pendingAction = useRef<"ai" | "throwback" | "myphotos" | "submit" | null>(null);
  const pendingFile = useRef<File | null>(null);
  const propFlashTimer = useRef<number | null>(null);
  const rsvpPromptedFor = useRef<string | null>(null);

  const refreshSession = useCallback(async () => {
    const res = await fetch("/api/booth/session");
    const data = await readBoothJson<{
      authenticated?: boolean;
      guest?: Guest | null;
      photos?: PhotoItem[];
      rate?: Rate | null;
      ai?: { configured?: boolean };
      error?: string;
    }>(res);
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

  const offerRsvpHandoff = useCallback(
    (current: Guest | null, opts?: { forcePopup?: boolean }) => {
      if (!current?.email) return;
      if (current.hasRsvp) {
        emitBoothRsvpHandoff({
          firstName: current.firstName || "",
          email: current.email,
          hasRsvp: true,
          prefill: false,
          source: "submitted",
        });
        setRsvpPrompt(false);
        return;
      }
      emitBoothRsvpHandoff({
        firstName: current.firstName || firstName,
        email: current.email || email,
        hasRsvp: false,
        prefill: true,
        source: "submitted",
      });
      const key = `${current.email}:${resultId || "done"}`;
      if (opts?.forcePopup || rsvpPromptedFor.current !== key) {
        rsvpPromptedFor.current = key;
        setRsvpPrompt(true);
      }
    },
    [email, firstName, resultId],
  );

  const goRsvpNow = useCallback(() => {
    const name = guest?.firstName || firstName;
    const mail = guest?.email || email;
    emitBoothRsvpHandoff({
      firstName: name,
      email: mail,
      hasRsvp: Boolean(guest?.hasRsvp),
      prefill: !guest?.hasRsvp,
      source: "popup",
    });
    setRsvpPrompt(false);
    document.documentElement.dataset.seenRsvp = "1";
    history.replaceState(null, "", "#rsvp");
    scrollToSection("rsvp");
  }, [guest, firstName, email]);

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

  useEffect(() => {
    return () => {
      if (propFlashTimer.current) window.clearTimeout(propFlashTimer.current);
      if (localPreviewRef.current) {
        URL.revokeObjectURL(localPreviewRef.current);
        localPreviewRef.current = null;
      }
    };
  }, []);

  const clearLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  };

  const setPreviewFromFile = (file: File) => {
    clearLocalPreview();
    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    // Local blob so confirm always shows the selected photo even if the
    // authenticated /api/booth/file preview fails to load.
    setPreviewUrl(localUrl);
  };

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

  const requireAuthThen = async (action: "ai" | "throwback" | "myphotos" | "submit") => {
    setError("");
    const data = await refreshSession();
    if (data.authenticated) {
      if (action === "myphotos") setStep("myphotos");
      else if (action === "submit") {
        return true;
      } else if (action === "throwback") {
        setMode("throwback");
        setStep("upload");
      } else {
        setMode("ai");
        setStep("upload");
      }
      return true;
    }
    pendingAction.current = action;
    setOtpSent(false);
    setDevCode(null);
    setStep("auth");
    return false;
  };

  const startCreate = (action: "ai" | "throwback") => {
    setError("");
    setMode(action);
    setStep("upload");
  };

  const flashCornerProp = () => {
    if (propFlashTimer.current) return;
    setPropFlash(true);
    propFlashTimer.current = window.setTimeout(() => {
      setPropFlash(false);
      propFlashTimer.current = null;
    }, 420);
  };

  const onFile = async (file: File | null, purposeOverride?: "ai" | "throwback") => {
    if (!file) return;
    const purpose = purposeOverride ?? (mode === "throwback" ? "throwback" : "ai");
    if (purposeOverride) setMode(purposeOverride);
    setBusy(true);
    setError("");
    // Show the selected file immediately on confirm (don't wait on storage preview).
    setPreviewFromFile(file);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("purpose", purpose === "throwback" ? "throwback" : "ai_source");
      const res = await fetch("/api/booth/upload", { method: "POST", body: fd });
      const data = await readBoothJson<{ error?: string; uploadId?: string; previewUrl?: string }>(res);
      if (!res.ok) {
        throw new Error(
          guestVisibleBoothError(data.error, BOOTH_GUEST_MESSAGES.uploadFailed),
        );
      }
      if (!data.uploadId || !data.previewUrl) {
        throw new Error(BOOTH_GUEST_MESSAGES.uploadFailed);
      }
      setUploadId(data.uploadId);
      setConsent(false);
      setStep("confirm");
    } catch (err) {
      clearLocalPreview();
      setPreviewUrl(null);
      setError(
        guestVisibleBoothError(
          err instanceof Error ? err.message : "",
          BOOTH_GUEST_MESSAGES.uploadFailed,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const afterAuth = () => {
    const next = pendingAction.current || "ai";
    pendingAction.current = null;
    const queued = pendingFile.current;
    pendingFile.current = null;
    if (next === "submit") {
      void submitToGallery({ skipAuthCheck: true });
      return;
    }
    if (next === "myphotos") {
      setStep("myphotos");
      return;
    }
    if (next === "throwback") {
      setMode("throwback");
      if (queued) void onFile(queued, "throwback");
      else setStep("upload");
      return;
    }
    setMode("ai");
    if (queued) void onFile(queued, "ai");
    else setStep("upload");
  };

  const startAiFromEntry = async (file?: File | null) => {
    setError("");
    setMode("ai");
    if (file) {
      await onFile(file, "ai");
      return;
    }
    startCreate("ai");
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
      const data = await readBoothJson<{
        ok?: boolean;
        error?: string;
        devCode?: string;
        message?: string;
      }>(res);
      if (!res.ok || data.ok === false) {
        throw new Error(
          guestVisibleBoothError(
            data.error || data.message,
            "Could not send a verification code. Please try again.",
          ),
        );
      }
      setOtpSent(true);
      setDevCode(data.devCode || null);
    } catch (err) {
      setError(
        guestVisibleBoothError(
          err instanceof Error ? err.message : "",
          "Could not send a verification code. Please try again.",
        ),
      );
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
      const data = await readBoothJson<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || data.ok === false) {
        throw new Error(
          guestVisibleBoothError(data.error, BOOTH_GUEST_MESSAGES.verifyFailed),
        );
      }
      await refreshSession();
      afterAuth();
    } catch (err) {
      setError(
        guestVisibleBoothError(
          err instanceof Error ? err.message : "",
          BOOTH_GUEST_MESSAGES.verifyFailed,
        ),
      );
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
      const data = await readBoothJson<{
        error?: string;
        rate?: Rate;
        photoId?: string;
        rawUrl?: string;
        brandedUrl?: string;
      }>(res);
      window.clearInterval(tick);
      if (!res.ok) {
        setPolaroidPhase("idle");
        setError(
          guestVisibleBoothError(
            data.error,
            mode === "throwback"
              ? BOOTH_GUEST_MESSAGES.generic
              : BOOTH_GUEST_MESSAGES.generateFailed,
          ),
        );
        if (data.rate) setRate(data.rate);
        setStep("confirm");
        return;
      }

      setProgress(100);
      setResultId(data.photoId || null);
      // Hold blank eject, then develop once AI image is ready (never reveal early)
      setPolaroidPhase("eject");
      await new Promise((r) => setTimeout(r, 700));
      setResultUrl(data.rawUrl || data.brandedUrl || null);
      setPolaroidPhase("develop");
      await new Promise((r) => setTimeout(r, 5200));
      setPolaroidPhase("ready");
      await refreshSession();
      setStep("ready");
    } catch (err) {
      window.clearInterval(tick);
      setPolaroidPhase("idle");
      setError(
        guestVisibleBoothError(
          err instanceof Error ? err.message : "",
          BOOTH_GUEST_MESSAGES.generateFailed,
        ),
      );
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  };

  const submitToGallery = async (opts?: { skipAuthCheck?: boolean }) => {
    if (!resultId) return;
    if (!opts?.skipAuthCheck) {
      const ok = await requireAuthThen("submit");
      if (!ok) return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/booth/photos/${resultId}/submit`, { method: "POST" });
      const data = await readBoothJson<{ error?: string; needsAuth?: boolean }>(res);
      if (res.status === 401 || data.needsAuth) {
        pendingAction.current = "submit";
        setOtpSent(false);
        setDevCode(null);
        setStep("auth");
        setError(
          guestVisibleBoothError(
            data.error,
            "Verify your email to save this photo.",
          ),
        );
        return;
      }
      if (!res.ok) {
        throw new Error(
          guestVisibleBoothError(data.error, BOOTH_GUEST_MESSAGES.saveFailed),
        );
      }
      const session = await refreshSession();
      setStep("submitted");
      offerRsvpHandoff((session.guest as Guest | null) || guest, { forcePopup: true });
    } catch (err) {
      setError(
        guestVisibleBoothError(
          err instanceof Error ? err.message : "",
          BOOTH_GUEST_MESSAGES.saveFailed,
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const resetCreate = () => {
    setUploadId(null);
    clearLocalPreview();
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

  // Dev/screenshot helper: ?booth_step= or window.__boothGoto(step); __boothFlash() for sample Polaroid
  useEffect(() => {
    const apply = (s: string) => {
      const flashOnly = s === "entry-flash";
      const stepName = flashOnly ? "entry" : s;
      if (
        !["entry", "auth", "upload", "confirm", "generate", "ready", "submitted", "myphotos"].includes(
          stepName
        )
      ) {
        return;
      }
      setLoading(false);
      setStep(stepName as Step);
      if (flashOnly) {
        window.setTimeout(() => flashCornerProp(), 80);
      }
      if (stepName === "confirm" || stepName === "generate" || stepName === "ready" || stepName === "submitted") {
        setPreviewUrl((u) => u || "/images/booth/sample-after-face.jpg");
        setResultUrl((u) => u || "/images/booth/sample-after-face.jpg");
        setUploadId((id) => id || "demo");
        setResultId((id) => id || "demo");
        setConsent(true);
        if (stepName === "generate") {
          setPolaroidPhase("eject");
          setProgress(72);
          setFlash(true);
        }
        if (stepName === "ready" || stepName === "submitted") setPolaroidPhase("ready");
      }
    };
    const params = new URLSearchParams(
      location.hash.includes("?") ? location.hash.split("?")[1] : location.search
    );
    const fromUrl = params.get("booth_step");
    if (fromUrl) apply(fromUrl);
    if (params.get("booth_rsvp_prompt") === "1") {
      setGuest((g) =>
        g || {
          email: "guest@example.com",
          firstName: "Guest",
          rsvpId: null,
          hasRsvp: false,
          attend: null,
        },
      );
      setRsvpPrompt(true);
    }
    const w = window as unknown as {
      __boothGoto?: (s: string) => void;
      __boothFlash?: () => void;
      __boothRsvpPrompt?: () => void;
    };
    w.__boothGoto = apply;
    w.__boothFlash = flashCornerProp;
    w.__boothRsvpPrompt = () => {
      setGuest((g) =>
        g || {
          email: "guest@example.com",
          firstName: "Guest",
          rsvpId: null,
          hasRsvp: false,
          attend: null,
        },
      );
      setRsvpPrompt(true);
    };
    return () => {
      delete w.__boothGoto;
      delete w.__boothFlash;
      delete w.__boothRsvpPrompt;
    };
  }, []);

  return (
    <section id="photobooth" className="scene-section" aria-label="80s Photo Booth">
      {/* ONE fixed OpenArt environment plate for every step */}
      <div className="booth-scene" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="booth-env" src="/images/booth/environment.jpg" alt="" decoding="async" />
        <div className="booth-scene-veil" />
        <div className={`booth-scene-flash${propFlash ? " is-on" : ""}`} />
      </div>

      <div className="booth-wrap">
        <header className="booth-header">
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
            <div className="booth-entry">
              <div className="booth-entry-visual">
                <div className="booth-print-scene">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="booth-camera-prop"
                    src="/images/booth/polaroid-camera-cut.png"
                    alt=""
                    draggable={false}
                  />
                  <button
                    type="button"
                    className={`booth-entry-polaroid booth-polaroid is-sample is-ready${propFlash ? " is-flashing" : ""}`}
                    onClick={flashCornerProp}
                    aria-label="Sample 80s Polaroid — click to flash"
                  >
                    <span className={`booth-corner-flash${propFlash ? " is-on" : ""}`} aria-hidden />
                    <div className="booth-polaroid-img-wrap">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className="booth-polaroid-img"
                        src="/images/booth/sample-after-face.jpg"
                        alt="Sample 80s Polaroid"
                        draggable={false}
                      />
                      <span className="booth-polaroid-torn" aria-hidden />
                    </div>
                  </button>
                </div>
              </div>

              <div className="booth-entry-main">
                <p className="booth-subcopy booth-entry-subcopy">
                  {welcomeName
                    ? `Welcome back, ${welcomeName}. Upload a photo to get your 80's transformation and add it to the Party Gallery.`
                    : "Upload a photo to get your 80's transformation and add it to the Party Gallery."}
                </p>
                <div
                  className={`booth-drop booth-entry-drop${dragOver ? " is-drag" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    void startAiFromEntry(e.dataTransfer.files?.[0] || null);
                  }}
                >
                  <span className="booth-drop-icon" aria-hidden>
                    ☁
                  </span>
                  <p className="booth-drop-label">DRAG &amp; DROP YOUR PHOTO HERE</p>
                </div>
                <div className="booth-or" aria-hidden>
                  <span />
                  OR
                  <span />
                </div>
                <button
                  type="button"
                  className="booth-btn booth-btn-pink booth-btn-upload"
                  disabled={busy}
                  onClick={() => entryFileRef.current?.click()}
                >
                  <span className="booth-btn-upload-icon" aria-hidden>
                    ▣
                  </span>
                  {busy ? "Uploading…" : "Upload photo"}
                </button>
                <p className="booth-file-specs">JPG, PNG, or HEIC • Up to 10MB</p>
                <input
                  ref={entryFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    e.target.value = "";
                    void startAiFromEntry(f);
                  }}
                />
                <div className="booth-entry-links">
                  <button
                    type="button"
                    className="booth-linkish"
                    onClick={() => startCreate("throwback")}
                  >
                    Upload a throwback
                  </button>
                  <button
                    type="button"
                    className="booth-linkish"
                    onClick={() => void requireAuthThen("myphotos")}
                  >
                    See my photos
                  </button>
                </div>
                {rate ? (
                  <p className="booth-rate booth-entry-rate">
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
            <div className="mx-auto max-w-md space-y-4 text-center" data-booth-auth="verify-at-save">
              <h3 className="booth-panel-title">
                {pendingAction.current === "submit" || resultId
                  ? "Verify to save"
                  : pendingAction.current === "myphotos"
                    ? "See my photos"
                    : "Verify your email"}
              </h3>
              <p className="text-sm text-white/70">
                {pendingAction.current === "submit" || resultId
                  ? "Verify once to add this photo to the Party Gallery and your library. Creating and downloading drafts does not need email."
                  : "We email a one-time code. Same flow whether you've RSVP'd or not — Photo Booth never marks you as attending."}
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
                    <p className="text-xs text-[#c6ff00]" data-booth-dev-otp>
                      Dev / preview code: {devCode}
                    </p>
                  ) : null}
                  <button type="submit" className="booth-btn booth-btn-pink w-full" disabled={busy}>
                    {busy
                      ? "Checking…"
                      : pendingAction.current === "submit" || resultId
                        ? "Verify & save to gallery"
                        : "Verify & continue"}
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
              <button
                type="button"
                className="text-sm text-white/50 underline"
                onClick={() => setStep(resultId ? "ready" : "entry")}
              >
                Back
              </button>
            </div>
          ) : null}

          {!loading && step === "upload" ? (
            <div className="booth-entry-main booth-upload-step">
              {mode === "throwback" ? (
                <h3 className="booth-panel-title">Upload a Throwback</h3>
              ) : null}
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
              </div>
              <div className="booth-or" aria-hidden>
                <span />
                OR
                <span />
              </div>
              <button
                type="button"
                className="booth-btn booth-btn-pink booth-btn-upload"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? "Uploading…" : "Upload photo"}
              </button>
              <p className="booth-file-specs">JPG, PNG, or HEIC • Up to 10MB</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="hidden"
                onChange={(e) => void onFile(e.target.files?.[0] || null)}
              />
              <div className="booth-actions-row">
                <button type="button" className="booth-btn booth-btn-outline" onClick={() => setStep("entry")}>
                  Back
                </button>
              </div>
            </div>
          ) : null}

          {!loading && step === "confirm" ? (
            <div className="booth-confirm">
              <div className="booth-confirm-preview">
                <div className="booth-preview-frame">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Selected photo"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.dataset.failed === "1") return;
                        img.dataset.failed = "1";
                        img.removeAttribute("src");
                        img.alt = "Selected photo unavailable";
                      }}
                    />
                  ) : (
                    <div className="booth-preview-missing" aria-hidden>
                      No preview
                    </div>
                  )}
                  <span className="booth-check" aria-hidden>
                    ✓
                  </span>
                </div>
                <p className="font-nav text-xs tracking-[0.14em] text-white/50">Selected photo</p>
              </div>
              <div className="booth-confirm-copy">
                <h3 className="booth-panel-title">Your Photo</h3>
                <p className="mt-2 text-sm text-white/75">
                  {mode === "throwback"
                    ? "We'll keep this private until you verify email to add it to the Party Gallery."
                    : "This is the photo you selected. Ready to turn it into an 80's masterpiece?"}
                </p>
                {!aiConfigured && mode === "ai" ? (
                  <p className="booth-error">{BOOTH_GUEST_MESSAGES.aiUnavailable}</p>
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
                    disabled={
                      busy ||
                      !consent ||
                      (mode === "ai" && (!aiConfigured || (rate !== null && !rate.allowed)))
                    }
                    onClick={() => void runGenerate()}
                  >
                    {mode === "throwback" ? "Continue with throwback →" : "Create my 80s photo →"}
                  </button>
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => {
                      setUploadId(null);
                      clearLocalPreview();
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
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon" aria-hidden>
                  ⎙
                </div>
                <h3 className="booth-panel-title">Printing your photo...</h3>
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
                <div className="booth-print-scene">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="booth-camera-prop"
                    src="/images/booth/polaroid-camera-cut.png"
                    alt=""
                    draggable={false}
                  />
                  <div className="booth-polaroid is-ready">
                    <div className="booth-polaroid-img-wrap">
                      {resultUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="booth-polaroid-img" src={resultUrl} alt="Your 80s photo" />
                      ) : null}
                      <span className="booth-polaroid-torn" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon is-ok" aria-hidden>
                  ✓
                </div>
                <h3 className="booth-panel-title">
                  {mode === "throwback" ? "Throwback ready!" : "Your 80's Photo is Ready!"}
                </h3>
                <p className="booth-subcopy">
                  Download anytime. Verify your email only when you add it to the Party Gallery.
                </p>
                <p className="booth-download-note" data-download-type="raw">
                  Download is the raw 80s photo only — no Polaroid frame or logo.
                </p>
                <div className="booth-btn-stack mx-auto md:mx-0">
                  <button
                    type="button"
                    className="booth-btn booth-btn-pink"
                    disabled={busy}
                    onClick={() => void submitToGallery()}
                    data-booth-save="gallery"
                  >
                    Add to Party Gallery
                  </button>
                  <a
                    className="booth-btn booth-btn-outline"
                    href={resultId ? `/api/booth/photos/${resultId}/download` : resultUrl || "#"}
                    download={resultId ? undefined : "landon-jordan-80s-photo.jpg"}
                    data-download-type="raw"
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
                <div className="booth-print-scene">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="booth-camera-prop"
                    src="/images/booth/polaroid-camera-cut.png"
                    alt=""
                    draggable={false}
                  />
                  <div className="booth-polaroid is-ready">
                    <div className="booth-polaroid-img-wrap">
                      {resultUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="booth-polaroid-img" src={resultUrl} alt="Submitted photo" />
                      ) : null}
                      <span className="booth-polaroid-torn" aria-hidden />
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center md:text-left">
                <div className="booth-status-icon is-ok" aria-hidden>
                  ✓
                </div>
                <h3 className="booth-panel-title">Submitted to Party Gallery!</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Your photo has been received and is awaiting approval. Once approved, it will be
                  added to the event slideshow and Party Gallery.
                </p>
                <p className="booth-download-note" data-download-type="raw">
                  Download is the raw 80s photo only — no Polaroid frame or logo.
                </p>
                <div className="booth-btn-stack mx-auto mt-4 md:mx-0">
                  <a
                    className="booth-btn booth-btn-pink"
                    href={resultId ? `/api/booth/photos/${resultId}/download` : "#"}
                    data-download-type="raw"
                  >
                    Download photo
                  </a>
                  {guest?.hasRsvp ? (
                    <button
                      type="button"
                      className="booth-btn booth-btn-outline"
                      onClick={() => {
                        offerRsvpHandoff(guest);
                        document.documentElement.dataset.seenRsvp = "1";
                        history.replaceState(null, "", "#rsvp");
                        scrollToSection("rsvp");
                      }}
                    >
                      View my RSVP
                    </button>
                  ) : (
                    <button type="button" className="booth-btn booth-btn-outline" onClick={goRsvpNow}>
                      RSVP now
                    </button>
                  )}
                  <button
                    type="button"
                    className="booth-btn booth-btn-outline"
                    onClick={() => {
                      offerRsvpHandoff(guest, { forcePopup: !guest?.hasRsvp });
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
              <h3 className="booth-panel-title text-center">My Photos</h3>
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
              {guestVisibleBoothError(error, BOOTH_GUEST_MESSAGES.generic)}
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

      {rsvpPrompt && !guest?.hasRsvp ? (
        <div
          className="booth-rsvp-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booth-rsvp-popup-title"
        >
          <div className="booth-rsvp-popup-card">
            <p className="booth-rsvp-popup-eyebrow">You&apos;re in the booth</p>
            <h3 id="booth-rsvp-popup-title" className="booth-panel-title booth-rsvp-popup-title">
              RSVP now
            </h3>
            <p className="booth-rsvp-popup-copy">
              Your photo is saved. Jump to RSVP and we&apos;ll pre-fill your name and email from this
              booth session — Photo Booth never marks you as attending.
            </p>
            <div className="booth-rsvp-popup-actions">
              <button type="button" className="booth-btn booth-btn-pink" onClick={goRsvpNow}>
                RSVP now
              </button>
              <button
                type="button"
                className="booth-btn booth-btn-outline"
                onClick={() => setRsvpPrompt(false)}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

