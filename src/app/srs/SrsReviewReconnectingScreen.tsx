import InlineError from "@/components/InlineError";

export default function SrsReviewReconnectingScreen({
  displayError,
}: {
  displayError: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <InlineError message={displayError} />
      <p className="text-muted">Reconnecting...</p>
    </div>
  );
}
