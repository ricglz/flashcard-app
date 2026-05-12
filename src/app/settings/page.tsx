"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { isFailureResult } from "@/lib/appResult";

function formatDate(ms: number | undefined) {
  if (ms === undefined) return "Never";
  return new Date(ms).toLocaleString();
}

export default function SettingsPage() {
  const status = useQuery(api.cliTokens.getStatus);
  const createToken = useMutation(api.cliTokens.create);
  const revokeToken = useMutation(api.cliTokens.revoke);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setIsBusy(true);
    setError(null);
    try {
      const result = await createToken({ label: "Local AI assistant CLI" });
      if (isFailureResult(result)) {
        setError(result.error.message);
        return;
      }
      if ("token" in result) {
        setNewToken(result.token);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create token");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevoke() {
    if (!confirm("Revoke CLI assistant access? Existing local CLI tokens will stop working.")) return;
    setIsBusy(true);
    setError(null);
    try {
      const result = await revokeToken({});
      if (isFailureResult(result)) {
        setError(result.error.message);
        return;
      }
      setNewToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke token");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <Show when="signed-out">
          <div className="text-center py-20">
            <p className="text-muted">Sign in to manage settings.</p>
          </div>
        </Show>

        <Show when="signed-in">
          <section className="border border-edge rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">AI Assistant CLI Access</h2>
              <p className="text-sm text-muted mt-1">
                Create a temporary token for local CLI tools to list sets, export bounded SRS weak-card context,
                and create AI-generated remedial sets. Tokens expire after 24 hours of inactivity.
              </p>
            </div>

            {status === undefined ? (
              <div className="animate-pulse text-sm text-muted">Loading token status…</div>
            ) : status === null ? (
              <p className="text-sm text-muted">Unable to load status.</p>
            ) : status.enabled ? (
              <div className="space-y-3 text-sm">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="p-3 bg-raised rounded-lg">
                    <p className="text-xs text-muted">Status</p>
                    <p className="font-medium">Enabled</p>
                  </div>
                  <div className="p-3 bg-raised rounded-lg">
                    <p className="text-xs text-muted">Token</p>
                    <p className="font-mono text-xs">fcai_{status.publicId}_••••••••</p>
                  </div>
                  <div className="p-3 bg-raised rounded-lg">
                    <p className="text-xs text-muted">Last used</p>
                    <p>{formatDate(status.lastUsedAt)}</p>
                  </div>
                  <div className="p-3 bg-raised rounded-lg">
                    <p className="text-xs text-muted">Expires if unused</p>
                    <p>{formatDate(status.expiresAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={isBusy}
                    className="px-4 py-2 border border-edge rounded-lg hover:bg-surface-hover disabled:opacity-50"
                  >
                    Rotate token
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={isBusy}
                    className="px-4 py-2 text-danger border border-danger rounded-lg hover:bg-danger-surface disabled:opacity-50"
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">CLI access is disabled.</p>
                <button
                  onClick={handleCreate}
                  disabled={isBusy}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50"
                >
                  {isBusy ? "Creating…" : "Create temporary CLI token"}
                </button>
              </div>
            )}

            {newToken && (
              <div className="p-4 border border-warning rounded-lg bg-warning/10 space-y-2">
                <p className="font-medium text-sm">Copy this token now. It will not be shown again.</p>
                <code className="block p-3 bg-background rounded border border-edge text-xs break-all">{newToken}</code>
                <button
                  onClick={() => void navigator.clipboard.writeText(newToken)}
                  className="px-3 py-1.5 text-sm border border-edge rounded-lg hover:bg-surface-hover"
                >
                  Copy token
                </button>
              </div>
            )}

            {error && <p className="text-sm text-danger">{error}</p>}
          </section>
        </Show>
      </main>
    </div>
  );
}
