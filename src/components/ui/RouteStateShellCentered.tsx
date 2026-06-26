import type { ReactNode } from "react";

type RouteStateShellCenteredProps = {
  maxWidth?: "sm" | "md";
  children: ReactNode;
  className?: string;
};

export function RouteStateShellCentered({
  maxWidth = "md",
  children,
  className = "",
}: RouteStateShellCenteredProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className={[maxWidth === "sm" ? "max-w-sm" : "max-w-md", "w-full text-center space-y-4", className].filter(Boolean).join(" ")}>
        {children}
      </div>
    </div>
  );
}
