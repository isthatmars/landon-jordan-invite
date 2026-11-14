"use client";

type GeneratingStepProps = {
  previewUrl: string | null;
};

export function GeneratingStep({ previewUrl }: GeneratingStepProps) {
  return (
    <div className="booth-panel-inner">
      <h3>Developing</h3>
      <p>OpenArt is printing your 80s look — hang tight.</p>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="booth-preview" src={previewUrl} alt="" aria-hidden />
      ) : null}
      <p className="booth-status" role="status" aria-live="polite">
        Flash · grain · neon…
      </p>
    </div>
  );
}
