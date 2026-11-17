"use client";

type PolaroidProps = {
  src: string;
  caption?: string;
  ejecting?: boolean;
};

/** Ejecting Polaroid — the only animated leave-the-panel element. */
export function Polaroid({
  src,
  caption = "L&J · 80s",
  ejecting = true,
}: PolaroidProps) {
  return (
    <figure className={`booth-polaroid${ejecting ? " is-ejecting" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Your 80s Photo Booth Polaroid" />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}
