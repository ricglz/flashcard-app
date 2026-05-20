"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAvailableModels } from "@/lib/useAvailableModels";
import {
  streamChat,
  reduceEvent,
  type ChatMessage,
  type ChatStreamState,
} from "@/lib/chatStream";
import type { StudyContext } from "./AssistantPanel";
import ToolStatusIndicator from "./ToolStatusIndicator";

export default function AssistantPanelInner({ context }: { context: StudyContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<ChatStreamState | null>(null);
  const [model, setModel] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { models: availableModels } = useAvailableModels(open);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const scrollToBottom = () => {
    queueMicrotask(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    scrollToBottom();

    const abort = new AbortController();
    abortRef.current = abort;
    let state: ChatStreamState = { text: "", toolStatus: null };
    setStreaming(state);

    try {
      const chatContext = { setId: context.setId, cardFields: context.cardFields };
      for await (const event of streamChat(text, messages, chatContext, model, abort.signal)) {
        state = reduceEvent(state, event);
        setStreaming({ ...state });
        scrollToBottom();
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      state = { text: `Error: ${err instanceof Error ? err.message : "Failed to get response"}`, toolStatus: null };
    }

    if (abort.signal.aborted) return;

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: state.text || "No response" },
    ]);
    setStreaming(null);
    abortRef.current = null;
    scrollToBottom();
  }, [input, streaming, messages, model, context.setId, context.cardFields]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(null);
  }, []);

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
            onClick={handleClear}
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
        {messages.length === 0 && !streaming && (
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
        {streaming && streaming.text && (
          <div className="text-sm lg:text-base">
            <div className="inline-block max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap bg-surface-hover">
              {streaming.text}
              <span className="inline-block w-0.5 h-4 bg-foreground animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}
        {streaming?.toolStatus && <ToolStatusIndicator status={streaming.toolStatus} />}
        {streaming && !streaming.text && !streaming.toolStatus && (
          <div className="flex items-center gap-2 text-sm lg:text-base text-muted">
            <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full" />
            Thinking...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-edge">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { 
              setInput(e.target.value); 
              e.target.style.height = "auto"; 
              const newHeight = Math.min(e.target.scrollHeight, 120);
              e.target.style.height = `${newHeight}px`;
              e.target.style.overflowY = e.target.scrollHeight > 120 ? "auto" : "hidden";
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder="Ask about this card..."
            disabled={!!streaming}
            rows={1}
            className="flex-1 px-3 py-2 border border-edge rounded-lg bg-transparent text-base lg:text-base resize-none overflow-y-hidden focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!!streaming || !input.trim()}
            className="px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
