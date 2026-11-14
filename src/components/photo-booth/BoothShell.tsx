"use client";

import type { ReactNode } from "react";

type BoothShellProps = {
  /** Inner neon-panel UI for the active step only. */
  children: ReactNode;
  /** Optional Polaroid overlay (reveal step). Does not replace the stage. */
  polaroid?: ReactNode;
  /** Accessible label for the fixed booth scene. */
  label?: string;
};

/**
 * Single persistent Photo Booth stage.
 * Wood / curtains / props / neon panel chrome stay fixed for the whole flow.
 * Step UIs render only inside the panel; never swap this shell's background.
 */
export function BoothShell({
  children,
  polaroid,
  label = "80s Photo Booth",
}: BoothShellProps) {
  return (
    <div className="booth-shell" role="group" aria-label={label}>
      <div className="booth-sign" aria-hidden>
        Photo Booth
      </div>

      <div className="booth-frame">
        <div className="booth-curtains" aria-hidden>
          <span className="booth-curtain is-left" />
          <span className="booth-curtain is-right" />
        </div>

        <div className="booth-panel-chrome">
          <div className="booth-panel">{children}</div>
        </div>

        <div className="booth-props" aria-hidden>
          <span className="booth-prop">flash</span>
          <span className="booth-prop">neon</span>
          <span className="booth-prop">coin</span>
        </div>

        {polaroid ? <div className="booth-polaroid-slot">{polaroid}</div> : null}
      </div>
    </div>
  );
}
