import type { ReactNode } from "react";
import { PageHeader } from "./PageHeader";
import { CenteredState } from "./CenteredState";

type RouteStateShellWithHeaderProps = {
  backLabel?: string;
  headerRight?: ReactNode;
  maxWidth?: "sm" | "md";
  children: ReactNode;
};

export function RouteStateShellWithHeader({
  backLabel = "Back",
  headerRight,
  maxWidth = "md",
  children,
}: RouteStateShellWithHeaderProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader backLabel={backLabel} actions={headerRight} />
      <CenteredState maxWidth={maxWidth}>{children}</CenteredState>
    </div>
  );
}
