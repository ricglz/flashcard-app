import type React from "react";

type AlertVariant = "info" | "success" | "warning" | "danger";

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const variantStyles: Record<AlertVariant, string> = {
  info: "border-info-edge bg-info-surface text-info",
  success: "border-success-edge bg-success-surface text-success",
  warning: "border-warning-edge bg-warning-surface text-warning",
  danger: "border-danger-edge bg-danger-surface text-danger",
};

export function Alert({
  variant = "info",
  className = "",
  children,
  ...props
}: AlertProps) {
  const combinedClassName = [
    "rounded-lg border p-3 text-sm",
    variantStyles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={combinedClassName} {...props}>
      {children}
    </div>
  );
}
