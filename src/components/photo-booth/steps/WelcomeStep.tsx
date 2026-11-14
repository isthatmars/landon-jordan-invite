"use client";

type WelcomeStepProps = {
  onStart: () => void;
};

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="booth-panel-inner">
      <h3>Strike a pose</h3>
      <p>One booth. One vibe. Snap a shot and we&apos;ll drop you into an 80s Polaroid.</p>
      <div className="booth-actions">
        <button type="button" className="booth-btn" onClick={onStart}>
          Enter booth
        </button>
      </div>
    </div>
  );
}
