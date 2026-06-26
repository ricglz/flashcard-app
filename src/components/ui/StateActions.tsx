import type { ReactNode } from "react";

type StateActionsProps = {
  children: ReactNode;
  layout?: "stack" | "row";
  className?: string;
};

export function StateActions({ children, layout = "stack", className = "" }: StateActionsProps) {
  const layoutStyles = layout === "row"
    ? "flex items-center justify-center gap-3"
    : "flex flex-col gap-3";

  return (
    <div className={[layoutStyles, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
