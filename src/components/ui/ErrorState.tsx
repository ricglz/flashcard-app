import type { ReactNode } from "react";
import { RouteStateShellCentered } from "./RouteStateShell";
import { StateContent } from "./StateContent";
import { Button } from "./Button";
import { LinkButton } from "./LinkButton";

type ErrorStateProps = {
  title: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  href?: string;
  actionLabel?: string;
};

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  href = "/",
  actionLabel = "Go to Dashboard",
}: ErrorStateProps) {
  return (
    <RouteStateShellCentered>
      <StateContent
        title={title}
        description={description}
        size="md"
        actionsLayout="row"
        actions={
          <>
            {onRetry ? (
              <Button variant="secondary" size="md" onClick={onRetry}>
                {retryLabel}
              </Button>
            ) : null}
            <LinkButton href={href} variant="primary" size="md">
              {actionLabel}
            </LinkButton>
          </>
        }
      />
    </RouteStateShellCentered>
  );
}
