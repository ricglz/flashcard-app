"use client";

import Link from "next/link";
import FlaggedCardsClient from "./FlaggedCardsClient";

export default function FlaggedPage() {
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
        <FlaggedCardsClient />
      </main>
    </div>
  );
}
