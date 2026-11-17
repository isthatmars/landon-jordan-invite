"use client";

type RevealStepProps = {
  resultUrl: string;
  onRetake: () => void;
  onDone: () => void;
};

export function RevealStep({ resultUrl, onRetake, onDone }: RevealStepProps) {
  return (
    <div className="booth-panel-inner">
      <h3>Got it</h3>
      <p>Your Polaroid is ready. Save it or jump back in for another take.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="booth-result" src={resultUrl} alt="Generated 80s Polaroid" />
      <div className="booth-actions">
        <a className="booth-btn" href={resultUrl} download="landon-jordan-80s-polaroid.jpg">
          Download
        </a>
        <button type="button" className="booth-btn is-ghost" onClick={onRetake}>
          Retake
        </button>
        <button type="button" className="booth-btn is-ghost" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
