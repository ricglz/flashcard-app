import type { ReactNode } from "react";
import { BackHeader } from "./BackHeader";
import { CenteredState } from "./CenteredState";

type RouteStateShellWithHeaderProps = {
  backHref: string;
  backLabel: string;
  headerRight?: ReactNode;
  maxWidth?: "sm" | "md";
  children: ReactNode;
};

export function RouteStateShellWithHeader({
  backHref,
  backLabel,
  headerRight,
  maxWidth = "md",
  children,
}: RouteStateShellWithHeaderProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <BackHeader href={backHref} label={backLabel} right={headerRight} />
      <CenteredState maxWidth={maxWidth}>{children}</CenteredState>
    </div>
  );
}
