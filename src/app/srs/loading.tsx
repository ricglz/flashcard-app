import { PageHeader } from "@/components/ui/PageHeader";

export default function SrsReviewLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <PageHeader
        backLabel="Dashboard"
        actions={
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 rounded bg-raised animate-pulse" />
            <div className="h-8 w-8 rounded bg-raised animate-pulse" />
            <div className="h-4 w-20 rounded bg-raised animate-pulse" />
          </div>
        }
      />

      <div className="h-1 bg-raised">
        <div className="h-full w-12 bg-accent/60" />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-card-bg border-2 border-card-border rounded-xl p-4 sm:p-8 shadow-sm">
            <div className="space-y-4">
              <div className="mx-auto h-10 w-3/4 rounded bg-raised animate-pulse" />
              <div className="mx-auto h-5 w-1/2 rounded bg-raised animate-pulse" />
            </div>

            <div className="mt-6 text-center">
              <div className="mx-auto h-11 w-32 rounded-lg bg-accent/30 animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
