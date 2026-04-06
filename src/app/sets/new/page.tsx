"use client";

import Link from "next/link";
import WizardShell from "@/components/wizard/WizardShell";

export default function NewSetPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b px-6 py-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Flashcard Set</h1>
        <WizardShell />
      </main>
    </div>
  );
}
