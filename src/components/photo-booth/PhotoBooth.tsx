"use client";

/**
 * 80s Photo Booth entry.
 *
 * LOCKS (see PHOTO_BOOTH.md):
 * - Fixed scene across steps: BoothShell never swaps wood/curtains/props/chrome.
 * - Only inner panel content + Polaroid animation change.
 * - AI generation uses OpenArt (image2image) via /api/photo-booth/generate.
 */

import { useCallback, useState } from "react";
import type { PhotoBoothStep } from "@/lib/photoBooth";
import { BoothShell } from "./BoothShell";
import { Polaroid } from "./Polaroid";
import { CaptureStep } from "./steps/CaptureStep";
import { GeneratingStep } from "./steps/GeneratingStep";
import { RevealStep } from "./steps/RevealStep";
import { WelcomeStep } from "./steps/WelcomeStep";
import "./photo-booth.css";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function PhotoBooth() {
  const [step, setStep] = useState<PhotoBoothStep>("welcome");
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetToCapture = useCallback(() => {
    setResultUrl(null);
    setError(null);
    setStep("capture");
  }, []);

  const onPickFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      setCaptureDataUrl(dataUrl);
    } catch {
      setError("Could not read that image. Try another.");
    }
  }, []);

  const onGenerate = useCallback(async () => {
    if (!captureDataUrl) return;
    setBusy(true);
    setError(null);
    setStep("generating");
    try {
      const res = await fetch("/api/photo-booth/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: captureDataUrl }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        imageUrl?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.imageUrl) {
        throw new Error(json?.error || "OpenArt generation failed.");
      }
      setResultUrl(json.imageUrl);
      setStep("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
      setStep("capture");
    } finally {
      setBusy(false);
    }
  }, [captureDataUrl]);

  let panel = null;
  if (step === "welcome") {
    panel = <WelcomeStep onStart={() => setStep("capture")} />;
  } else if (step === "capture") {
    panel = (
      <CaptureStep
        previewUrl={captureDataUrl}
        busy={busy}
        onPickFile={onPickFile}
        onGenerate={onGenerate}
        onBack={() => setStep("welcome")}
      />
    );
  } else if (step === "generating") {
    panel = <GeneratingStep previewUrl={captureDataUrl} />;
  } else {
    panel = (
      <RevealStep
        resultUrl={resultUrl || captureDataUrl || ""}
        onRetake={resetToCapture}
        onDone={() => {
          setCaptureDataUrl(null);
          setResultUrl(null);
          setStep("welcome");
        }}
      />
    );
  }

  return (
    <section id="booth" className="scene-section photo-booth" aria-label="80s Photo Booth">
      <div className="photo-booth-atmosphere" aria-hidden />
      <BoothShell
        polaroid={
          step === "reveal" && resultUrl ? <Polaroid src={resultUrl} ejecting /> : null
        }
      >
        <>
          {panel}
          {error ? (
            <p className="booth-error" role="alert" style={{ padding: "0 1rem 1rem" }}>
              {error}
            </p>
          ) : null}
        </>
      </BoothShell>
    </section>
  );
}
