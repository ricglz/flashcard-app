import type React from "react";

export function Tooltip({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <span
      id={id}
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 min-w-32 max-w-64 -translate-x-1/2 rounded-lg border border-edge bg-card-bg px-2 py-1 text-xs text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
    >
      {children}
    </span>
  );
}

