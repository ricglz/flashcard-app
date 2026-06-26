import { RouteStateShellCentered } from "@/components/ui/RouteStateShell";
import { StateContent } from "@/components/ui/StateContent";
import { LinkButton } from "@/components/ui/LinkButton";

type Props = {
  message: string;
  href?: string;
  label?: string;
};

export default function SetAccessError({
  message,
  href = "/",
  label = "Back home",
}: Props) {
  return (
    <RouteStateShellCentered maxWidth="sm">
      <StateContent
        title="Set unavailable"
        description={message}
        size="md"
        actions={
          <LinkButton href={href} variant="primary" size="md">
            {label}
          </LinkButton>
        }
      />
    </RouteStateShellCentered>
  );
}
