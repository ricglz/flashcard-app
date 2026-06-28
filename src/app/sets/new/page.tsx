import { preloadQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import WizardShell from "@/components/wizard/WizardShell";
import { requireAuthToken } from "@/lib/routePreload";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function NewSetPage() {
  const token = await requireAuthToken();

  const preloadedHasLlmKey = await preloadQuery(
    api.userSettings.hasLlmKey,
    {},
    { token },
  );

  return (
    <div className="min-h-screen">
      <PageHeader backLabel="Back" />

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6">Create New Flashcard Set</h1>
        <WizardShell preloadedHasLlmKey={preloadedHasLlmKey} />
      </main>
    </div>
  );
}
