import { Alert } from "@/components/ui/Alert";

export default function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return <Alert variant="danger" className="mb-4">{message}</Alert>;
}
