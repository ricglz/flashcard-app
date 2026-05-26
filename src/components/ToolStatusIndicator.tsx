import type { ToolStatus } from "@/lib/chatStream";

const TOOL_LABELS: Record<string, string> = {
  list_sets: "Looking up your sets",
  get_weak_cards: "Analyzing weak cards",
  add_note_to_current_card: "Adding note to this card",
};

export default function ToolStatusIndicator({ status }: { status: ToolStatus }) {
  const label = TOOL_LABELS[status.name] ?? `Running ${status.name}`;
  return (
    <div className="flex items-center gap-2 text-sm lg:text-base text-muted">
      <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
      {label}...
    </div>
  );
}
