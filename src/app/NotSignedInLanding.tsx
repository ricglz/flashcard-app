import { SignInButton } from "@clerk/nextjs";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NotSignedInLanding() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Flashcard App"
        actions={
          <SignInButton mode="modal">
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
              Sign In
            </button>
          </SignInButton>
        }
      />

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold mb-4">
            Learn with Flashcards
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Create custom flashcard sets, study with text-to-speech,
            and track your progress. Sign in to get started.
          </p>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover text-lg transition-colors">
              Get Started
            </button>
          </SignInButton>
        </div>
      </main>
    </div>
  );
}
