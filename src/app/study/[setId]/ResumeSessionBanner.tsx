import Link from "next/link";
import { Doc } from "../../../../convex/_generated/dataModel";

type Props = {
  setId: string;
  activeSession: Doc<"studySessions">;
};

export default function ResumeSessionBanner({ setId, activeSession }: Props) {
  return (
    <div className="p-4 bg-info-surface border border-info-edge rounded-lg">
      <p className="text-sm font-medium mb-2">
        You have an active session ({activeSession.currentIndex}/
        {activeSession.cardOrder.length} cards done)
      </p>
      <div className="flex gap-2">
        <Link
          href={`/study/${setId}/session?sessionId=${activeSession._id}`}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          Resume
        </Link>
        <Link
          href={`/study/${setId}/results?sessionId=${activeSession._id}`}
          className="px-4 py-2 border border-edge rounded-lg text-sm hover:bg-surface-hover transition-colors"
        >
          View Results So Far
        </Link>
      </div>
    </div>
  );
}
