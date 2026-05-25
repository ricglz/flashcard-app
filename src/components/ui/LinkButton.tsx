import Link from "next/link";
import type { LinkProps } from "next/link";
import type React from "react";

type LinkButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type LinkButtonSize = "sm" | "md" | "lg";

type LinkButtonProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: LinkButtonVariant;
    size?: LinkButtonSize;
    fullWidth?: boolean;
  };

const variantStyles: Record<LinkButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-edge text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:text-foreground hover:bg-surface-hover",
  danger: "bg-danger text-white hover:bg-danger-hover",
};

const sizeStyles: Record<LinkButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  const combinedClassName = [
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link className={combinedClassName} {...props}>
      {children}
    </Link>
  );
}
