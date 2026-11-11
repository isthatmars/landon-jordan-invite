/** Party color wash + grain behind lineup content (static — no scroll/CSS thrash). */
export function LineupAmbient() {
  return (
    <div className="lineup-ambient-stage" aria-hidden>
      <div className="lineup-ambient-base" />
      <div className="lineup-ambient-parallax">
        <div className="lineup-ambient-blob lineup-ambient-blob-a" />
      </div>
      <div className="lineup-ambient-parallax">
        <div className="lineup-ambient-blob lineup-ambient-blob-b" />
      </div>
      <div className="lineup-ambient-parallax">
        <div className="lineup-ambient-blob lineup-ambient-blob-c" />
      </div>
      <div className="lineup-ambient-wash" />
      <div className="lineup-ambient-grain" />
    </div>
  );
}
