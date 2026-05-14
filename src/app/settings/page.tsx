"use client";

import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { isFailureResult } from "@/lib/appResult";

function formatDate(ms: number | undefined) {
  if (ms === undefined) return "Never";
  return new Date(ms).toLocaleString();
}

export default function SettingsPage() {
  const status = useQuery(api.cliTokens.getStatus);
  const settings = useQuery(api.userSettings.get);
  const createToken = useMutation(api.cliTokens.create);
  const revokeToken = useMutation(api.cliTokens.revoke);
  const updateSettings = useMutation(api.userSettings.update);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [llmProvider, setLlmProvider] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

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
    try {
      await navigator.clipboard.writeText(newToken);
      setCopyState("copied");
    } catch {
      setCopyState("error");
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

          <section className="border border-edge rounded-xl p-5 space-y-4 mt-6">
            <div>
              <h2 className="text-lg font-semibold">AI Settings</h2>
              <p className="text-sm text-muted mt-1">
                Configure your LLM provider for AI card generation and the study assistant.
                Your API key is stored securely and never sent to the browser.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="llm-provider" className="block text-sm font-medium mb-1">Provider</label>
                <select
                  id="llm-provider"
                  value={llmProvider || settings?.llmProvider || ""}
                  onChange={(e) => { setLlmProvider(e.target.value); setLlmSaved(false); }}
                  className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
                >
                  <option value="">Select a provider...</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="mistral">Mistral AI</option>
                  <option value="ollama">Ollama (local)</option>
                  <option value="groq">Groq</option>
                  <option value="xai">xAI</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>
              <div>
                <label htmlFor="llm-key" className="block text-sm font-medium mb-1">API Key</label>
                <input
                  id="llm-key"
                  type="password"
                  placeholder={settings?.hasLlmKey ? "Key saved (enter new key to replace)" : "Enter your API key"}
                  value={llmApiKey}
                  onChange={(e) => { setLlmApiKey(e.target.value); setLlmSaved(false); }}
                  className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setLlmSaving(true);
                    setLlmError(null);
                    setLlmSaved(false);
                    try {
                      const provider = llmProvider || settings?.llmProvider;
                      const patch: { llmProvider?: string; llmApiKey?: string } = {};
                      if (llmProvider) patch.llmProvider = llmProvider;
                      if (llmApiKey) patch.llmApiKey = llmApiKey;
                      if (!provider && !patch.llmProvider) {
                        setLlmError("Please select a provider.");
                        return;
                      }
                      const result = await updateSettings(patch);
                      if (isFailureResult(result)) {
                        setLlmError(result.error.message);
                        return;
                      }
                      setLlmApiKey("");
                      setLlmSaved(true);
                    } catch (err) {
                      setLlmError(err instanceof Error ? err.message : "Failed to save");
                    } finally {
                      setLlmSaving(false);
                    }
                  }}
                  disabled={llmSaving || (!llmProvider && !llmApiKey)}
                  className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm disabled:opacity-50"
                >
                  {llmSaving ? "Saving..." : "Save"}
                </button>
                {llmSaved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
                {settings?.hasLlmKey && (
                  <span className="text-xs text-muted">
                    Provider: {settings.llmProvider ?? "not set"}
                  </span>
                )}
              </div>
              {llmError && <p className="text-sm text-danger">{llmError}</p>}
            </div>
          </section>
        </Show>
      </main>
    </div>
  );
}
