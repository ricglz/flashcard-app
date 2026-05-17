import { SignOutButton } from "@clerk/nextjs";

export default function SignedInLanding() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Flashcard App</h1>
        <div className="flex items-center gap-4">
          <SignOutButton>
            <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
              Sign Out & Retry
            </button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold mb-4">
            Learn with Flashcards
          </h2>
          <p className="text-muted mb-8 max-w-md mx-auto">
            Your session has expired. Please sign out and sign back in.
          </p>
        </div>
      </main>
    </div>
  );
}
