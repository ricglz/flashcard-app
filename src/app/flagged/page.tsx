import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import FlaggedCardsClient from "./FlaggedCardsClient";
import Link from "next/link";

export default async function FlaggedPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const preloaded = await preloadQuery(
    api.cardAnnotations.getFlagged,
    {},
    { token },
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-muted hover:text-foreground"
          >
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Flagged Cards</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <FlaggedCardsClient preloaded={preloaded} />
      </main>
    </div>
  );
}
