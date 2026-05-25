import type React from "react";

type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
};

const variantStyles: Record<BadgeVariant, string> = {
  neutral: "bg-neutral-surface text-neutral-text border-neutral-edge",
  info: "bg-info-surface text-info border-info-edge",
  success: "bg-success-surface text-success border-success-edge",
  warning: "bg-warning-surface text-warning border-warning-edge",
  danger: "bg-danger-surface text-danger border-danger-edge",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-xs",
  md: "px-2 py-0.5 text-xs",
};

export function Badge({
  variant = "neutral",
  size = "md",
  className = "",
  children,
  ...props
}: BadgeProps) {
  const combinedClassName = [
    "inline-flex shrink-0 items-center rounded border font-medium",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={combinedClassName} {...props}>
      {children}
    </span>
  );
}
