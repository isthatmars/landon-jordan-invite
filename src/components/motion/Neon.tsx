import type { ElementType, ReactNode } from "react";

/** Resting neon is stable. Igniting is a one-shot. Breathing is a slow drift. */
export type NeonState = "off" | "igniting" | "on" | "breathing" | "interactive";

export function Neon({
  as,
  state,
  className = "",
  children,
}: {
  as?: ElementType;
  state: NeonState;
  className?: string;
  children: ReactNode;
}) {
  const Tag = as ?? "span";
  return (
    <Tag data-neon={state} className={className}>
      {children}
    </Tag>
  );
}
