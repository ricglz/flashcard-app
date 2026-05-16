"use client";

import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { isFailureResult } from "@/lib/appResult";
import { useOfflinePreloadedQuery } from "@/lib/useOfflinePreloadedQuery";

export default function AiSettingsSection({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.userSettings.get>;
}) {
  const settings = useOfflinePreloadedQuery(preloaded);
  const updateAiConfig = useMutation(api.userSettings.updateAiConfig);

  const [llmProvider, setLlmProvider] = useState<string | null>(null);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatPromptInitialized, setChatPromptInitialized] = useState(false);
  const [llmSaving, setLlmSaving] = useState(false);
  const [llmSaved, setLlmSaved] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  if (settings && !chatPromptInitialized) {
    setChatPrompt(settings.customChatPrompt ?? "");
    setChatPromptInitialized(true);
  }

  const effectiveProvider = llmProvider ?? settings?.llmProvider ?? "";

  return (
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
            value={effectiveProvider}
            onChange={(e) => {
              setLlmProvider(e.target.value || null);
              if (!e.target.value) setLlmApiKey("");
              setLlmSaved(false);
            }}
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
        {effectiveProvider && (
          <div>
            <label htmlFor="llm-key" className="block text-sm font-medium mb-1">API Key</label>
            {settings?.llmKeyHint && !llmApiKey && (
              <p className="text-xs text-muted mb-1 font-mono">{settings.llmKeyHint}</p>
            )}
            <input
              id="llm-key"
              type="password"
              placeholder={settings?.hasLlmKey ? "Enter new key to replace" : "Enter your API key"}
              value={llmApiKey}
              onChange={(e) => { setLlmApiKey(e.target.value); setLlmSaved(false); }}
              className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
            />
          </div>
        )}
        <div>
          <label htmlFor="chat-prompt" className="block text-sm font-medium mb-1">Chat Assistant Prompt (optional)</label>
          <textarea
            id="chat-prompt"
            value={chatPrompt}
            onChange={(e) => { setChatPrompt(e.target.value); setLlmSaved(false); }}
            rows={3}
            placeholder="You are a study assistant for a flashcard app. Help the user understand their study material. Be concise and helpful."
            className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm"
          />
          <p className="text-xs text-muted mt-1">Leave empty to use the default prompt.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              void (async () => {
                setLlmSaving(true);
                setLlmError(null);
                setLlmSaved(false);
                try {
                  const provider = llmProvider ?? settings?.llmProvider;
                  if (!provider) {
                    setLlmError("Please select a provider.");
                    return;
                  }
                  if (!llmApiKey && !settings?.hasLlmKey) {
                    setLlmError("Please enter an API key.");
                    return;
                  }
                  const result = await updateAiConfig({
                    provider,
                    apiKey: llmApiKey,
                    customChatPrompt: chatPrompt || undefined,
                  });
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
              })();
            }}
            disabled={llmSaving || (!llmProvider && !llmApiKey && chatPrompt === (settings?.customChatPrompt ?? ""))}
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
  );
}
