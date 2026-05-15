"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAvailableModels } from "@/lib/useAvailableModels";
import type { StudyContext } from "./AssistantPanel";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function AssistantPanelInner({ context }: { context: StudyContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = useAction(api.ai.sendChatMessage);
  const { models: availableModels } = useAvailableModels(open);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const result = await sendMessage({
        message: text,
        history: messages,
        ...(model ? { model } : {}),
        context: {
          setId: context.setId,
          cardFields: context.cardFields,
        },
      });
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${result.error}` }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed to get response"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-accent text-white rounded-full shadow-lg hover:bg-accent-hover flex items-center justify-center text-xl transition-colors"
        aria-label="Open study assistant"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 lg:w-[28rem] max-w-[calc(100vw-2rem)] h-[32rem] lg:h-[36rem] max-h-[calc(100vh-2rem)] bg-background border border-edge rounded-xl shadow-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-edge">
        <h3 className="font-semibold text-sm lg:text-base">Study Assistant</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([])}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-foreground text-lg leading-none"
            aria-label="Close assistant"
          >
            &times;
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-edge flex gap-2 items-center">
        <span className="text-xs text-muted truncate flex-1">
          {context.setName}
        </span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-36 px-2 py-1 border border-edge rounded bg-transparent text-xs"
        >
          <option value="">Default model</option>
          {availableModels.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted text-sm lg:text-base py-8">
            Ask a question about this card or your study material.
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`text-sm lg:text-base ${msg.role === "user" ? "text-right" : ""}`}
          >
            <div
              className={`inline-block max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-accent text-white"
                  : "bg-surface-hover"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm lg:text-base text-muted">
            <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
            Thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-edge">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="Ask about this card..."
            disabled={loading}
            rows={1}
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-transparent text-sm lg:text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
