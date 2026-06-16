import React from "react";

type SpinnerSize = "sm" | "md" | "lg" | "xl";

type SpinnerProps = {
  size?: SpinnerSize;
  label?: string;
  className?: string;
  inline?: boolean;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

const strokeWidth: Record<SpinnerSize, number> = {
  sm: 2,
  md: 2,
  lg: 3,
  xl: 3,
};

export function Spinner({
  size = "md",
  label,
  className = "",
  inline = false,
}: SpinnerProps) {
  const sizeClass = sizeClasses[size];
  const sw = strokeWidth[size];
  const ariaLabel = label ?? "Loading";

  const svg = (
    <svg
      className={`animate-spin text-accent ${sizeClass} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={sw}
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );

  if (inline) {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className="inline-flex items-center"
      >
        {svg}
      </span>
    );
  }

  if (label) {
    return (
      <span
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className="inline-flex flex-col items-center gap-4"
      >
        {svg}
        <span className="text-muted text-sm">{label}</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="inline-flex items-center"
    >
      {svg}
    </span>
  );
}

export default Spinner;
