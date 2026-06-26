import type { ReactNode } from "react";

type CenteredStateProps = {
  children: ReactNode;
  maxWidth?: "sm" | "md";
  className?: string;
};

const widthStyles: Record<NonNullable<CenteredStateProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
};

export function CenteredState({ children, maxWidth = "md", className = "" }: CenteredStateProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className={[widthStyles[maxWidth], "w-full text-center", className].filter(Boolean).join(" ")}>
        {children}
      </div>
    </main>
  );
}
