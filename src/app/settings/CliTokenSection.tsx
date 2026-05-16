"use client";

import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { isFailureResult } from "@/lib/appResult";

function formatDate(ms: number | undefined) {
  if (ms === undefined) return "Never";
  return new Date(ms).toLocaleString();
}

export default function CliTokenSection({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.cliTokens.getStatus>;
}) {
  const status = usePreloadedQuery(preloaded);
  const createToken = useMutation(api.cliTokens.create);
  const revokeToken = useMutation(api.cliTokens.revoke);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function handleCreate() {
    setIsBusy(true);
    setError(null);
    setCopyState("idle");
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
    setCopyState("idle");
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

  async function handleCopyToken() {
    if (!newToken) return;
    clearTimeout(copyTimeoutRef.current);
    try {
      await navigator.clipboard.writeText(newToken);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
    copyTimeoutRef.current = setTimeout(() => setCopyState("idle"), 2000);
  }

  return (
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
            onClick={() => void handleCopyToken()}
            className="px-3 py-1.5 text-sm border border-edge rounded-lg hover:bg-surface-hover"
          >
            {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy token"}
          </button>
          <p className="text-xs text-muted" role="status" aria-live="polite">
            {copyState === "copied"
              ? "Token copied to clipboard."
              : copyState === "error"
                ? "Could not copy token. Select and copy it manually."
                : ""}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
