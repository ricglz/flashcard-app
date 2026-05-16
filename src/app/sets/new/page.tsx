import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import WizardShell from "@/components/wizard/WizardShell";
import { getAuthToken } from "@/lib/server";

export default async function NewSetPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const preloadedSettings = await preloadQuery(
    api.userSettings.get,
    {},
    { token },
  );

  return (
    <div className="min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          &larr; Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Flashcard Set</h1>
        <WizardShell preloadedSettings={preloadedSettings} />
      </main>
    </div>
  );
}
