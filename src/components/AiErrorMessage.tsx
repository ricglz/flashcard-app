import { Alert } from "@/components/ui/Alert";

export default function AiErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Alert variant="danger" className="max-w-full overflow-hidden break-words [overflow-wrap:anywhere]">
      {message}
    </Alert>
  );
}
