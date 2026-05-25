"use client";

import { useMutation } from "convex/react";
import type { Preloaded } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

import { useOfflinePreloadedQuery } from "@/hooks/useOfflinePreloadedQuery";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useSaveHandler } from "@/hooks/useSaveHandler";

const LLM_PROVIDER_OPTIONS = [
  "",
  "openai",
  "anthropic",
  "google",
  "mistral",
  "ollama",
  "groq",
  "xai",
  "deepseek",
] as const;

type LlmProviderOption = (typeof LLM_PROVIDER_OPTIONS)[number];
type LlmProvider = Exclude<LlmProviderOption, "">;

const LLM_PROVIDER_LABELS: Record<LlmProviderOption, string> = {
  "": "Select a provider...",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  mistral: "Mistral AI",
  ollama: "Ollama (local)",
  groq: "Groq",
  xai: "xAI",
  deepseek: "DeepSeek",
};

const LLM_PROVIDER_VALUES = new Set<string>(LLM_PROVIDER_OPTIONS);

function isLlmProvider(value: string | null | undefined): value is LlmProvider {
  return typeof value === "string" && value !== "" && LLM_PROVIDER_VALUES.has(value);
}

export default function AiSettingsSection({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.userSettings.get>;
}) {
  const settings = useOfflinePreloadedQuery(preloaded);
  const updateAiConfig = useMutation(api.userSettings.updateAiConfig);

  const [llmProvider, setLlmProvider] = useState<LlmProvider | null>(null);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [chatPromptDraft, setChatPromptDraft] = useState<string | null>(null);
  const [llmSaved, setLlmSaved] = useState(false);
  const { execute: saveConfig, isSaving: llmSaving, error: llmError } = useSaveHandler({
    onSuccess: () => {
      setLlmApiKey("");
      setLlmSaved(true);
    },
  });

  const savedProvider = isLlmProvider(settings?.llmProvider)
    ? settings.llmProvider
    : "";
  const effectiveProvider = llmProvider ?? savedProvider;
  const savedChatPrompt = settings?.customChatPrompt ?? "";
  const chatPrompt = chatPromptDraft ?? savedChatPrompt;

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
          <Select
            id="llm-provider"
            value={effectiveProvider}
            options={LLM_PROVIDER_OPTIONS}
            labels={LLM_PROVIDER_LABELS}
            onChange={(provider) => {
              setLlmProvider(provider || null);
              if (!provider) setLlmApiKey("");
              setLlmSaved(false);
            }}
            className="w-full"
          />
        </div>
        {effectiveProvider && (
          <div>
            <label htmlFor="llm-key" className="block text-sm font-medium mb-1">API Key</label>
            {settings?.llmKeyHint && !llmApiKey && (
              <p className="text-xs text-muted mb-1 font-mono">{settings.llmKeyHint}</p>
            )}
            <TextInput
              id="llm-key"
              type="password"
              placeholder={settings?.hasLlmKey ? "Enter new key to replace" : "Enter your API key"}
              value={llmApiKey}
              onChange={(e) => { setLlmApiKey(e.target.value); setLlmSaved(false); }}
            />
          </div>
        )}
        <div>
          <label htmlFor="chat-prompt" className="block text-sm font-medium mb-1">Chat Assistant Prompt (optional)</label>
          <Textarea
            id="chat-prompt"
            value={chatPrompt}
            onChange={(e) => { setChatPromptDraft(e.target.value); setLlmSaved(false); }}
            rows={3}
            placeholder="You are a study assistant for a flashcard app. Help the user understand their study material. Be concise and helpful."
          />
          <p className="text-xs text-muted mt-1">Leave empty to use the default prompt.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
              onClick={() => {
              const provider = llmProvider ?? savedProvider;
              if (!provider) {
                return;
              }
              if (!llmApiKey && !settings?.hasLlmKey) {
                return;
              }
              void saveConfig(() =>
                updateAiConfig({
                  provider,
                  apiKey: llmApiKey,
                  customChatPrompt: chatPrompt || undefined,
                })
              );
            }}
            disabled={llmSaving || (!llmProvider && !llmApiKey && chatPrompt === savedChatPrompt) || !((llmProvider ?? settings?.llmProvider) && (llmApiKey || settings?.hasLlmKey))}
            loading={llmSaving}
          >
            Save
          </Button>
          {llmSaved && <span className="text-sm text-success">Saved</span>}
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
