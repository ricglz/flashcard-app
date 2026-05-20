"use client";

import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { usePreloadedQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { useSaveHandler } from "@/hooks/useSaveHandler";


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
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  
  const { execute: executeCreate, isSaving: isCreating, error, setError } = useSaveHandler({
    onSuccess: (result) => {
      setNewToken(result.token);
      setCopyState("idle");
    },
  });
  
  const { execute: executeRevoke, isSaving: isRevoking } = useSaveHandler({
    onSuccess: () => {
      setNewToken(null);
      setCopyState("idle");
    },
  });
  
  const isBusy = isCreating || isRevoking;

  async function handleCreate() {
    setCopyState("idle");
    await executeCreate(() => createToken({ label: "Local AI assistant CLI" }));
  }

  async function handleRevoke() {
    if (!confirm("Revoke CLI assistant access? Existing local CLI tokens will stop working.")) return;
    setCopyState("idle");
    await executeRevoke(() => revokeToken({}));
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

      {status === null ? (
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
            <Button onClick={handleCreate} disabled={isBusy} variant="secondary" loading={isCreating}>
              Rotate token
            </Button>
            <Button onClick={handleRevoke} disabled={isBusy} variant="danger" loading={isRevoking}>
              Revoke
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">CLI access is disabled.</p>
          <Button onClick={handleCreate} disabled={isBusy} loading={isCreating}>
            Create temporary CLI token
          </Button>
        </div>
      )}

      {newToken && (
        <div className="p-4 border border-warning rounded-lg bg-warning/10 space-y-2">
          <p className="font-medium text-sm">Copy this token now. It will not be shown again.</p>
          <code className="block p-3 bg-background rounded border border-edge text-xs break-all">{newToken}</code>
          <Button
            onClick={() => void handleCopyToken()}
            variant="secondary"
            size="sm"
          >
            {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy token"}
          </Button>
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
