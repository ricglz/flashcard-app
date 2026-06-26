import type { ReactNode } from "react";
import { StateActions } from "./StateActions";

type StateContentProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  size?: "md" | "lg";
  actionsLayout?: "stack" | "row";
  children?: ReactNode;
};

const titleStyles: Record<NonNullable<StateContentProps["size"]>, string> = {
  md: "text-lg font-medium mb-2",
  lg: "text-2xl font-bold mb-2",
};

export function StateContent({
  title,
  description,
  actions,
  icon,
  size = "md",
  actionsLayout = "stack",
  children,
}: StateContentProps) {
  return (
    <>
      {icon ? <div className="mb-4 flex justify-center">{icon}</div> : null}
      <div className={titleStyles[size]}>{title}</div>
      {description ? (
        <div className="text-muted text-sm mb-6">{description}</div>
      ) : null}
      {children}
      {actions ? <StateActions layout={actionsLayout}>{actions}</StateActions> : null}
    </>
  );
}
