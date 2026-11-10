/** Moving water, palms, and skyline lights behind the still couple cutout. */
export function HeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="hero-palm hero-palm-left">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-bg-miami.jpg" alt="" />
      </div>
      <div className="hero-palm hero-palm-right">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-bg-miami.jpg" alt="" />
      </div>
      <div className="hero-shimmer" />
      <div className="hero-shimmer hero-shimmer-b" />
      <div className="hero-water" />
      <div className="hero-water hero-water-b" />
    </div>
  );
}
