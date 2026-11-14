"use client";

import { useRef } from "react";

type CaptureStepProps = {
  previewUrl: string | null;
  busy?: boolean;
  onPickFile: (file: File) => void;
  onGenerate: () => void;
  onBack: () => void;
};

export function CaptureStep({
  previewUrl,
  busy,
  onPickFile,
  onGenerate,
  onBack,
}: CaptureStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="booth-panel-inner">
      <h3>Capture</h3>
      <p>Upload a clear face photo — we keep you, restyle the era.</p>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="booth-preview" src={previewUrl} alt="Your capture preview" />
      ) : null}
      <input
        ref={inputRef}
        className="booth-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
        }}
      />
      <div className="booth-actions">
        <button
          type="button"
          className="booth-btn is-ghost"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? "Reselect" : "Take / upload"}
        </button>
        <button
          type="button"
          className="booth-btn"
          disabled={!previewUrl || busy}
          onClick={onGenerate}
        >
          Make Polaroid
        </button>
        <button type="button" className="booth-btn is-ghost" disabled={busy} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
