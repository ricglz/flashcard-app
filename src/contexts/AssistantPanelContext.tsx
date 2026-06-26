"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ChatMessage } from "@/lib/chatStream";

type AssistantPanelContextValue = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  clear: () => void;
};

const AssistantPanelContext = createContext<AssistantPanelContextValue | null>(null);

export function AssistantPanelProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("");

  const clear = () => {
    setMessages([]);
    setInput("");
  };

  const value = useMemo(
    () => ({
      messages,
      setMessages,
      open,
      setOpen,
      input,
      setInput,
      model,
      setModel,
      clear,
    }),
    [messages, open, input, model],
  );

  return (
    <AssistantPanelContext.Provider value={value}>
      {children}
    </AssistantPanelContext.Provider>
  );
}

export function useAssistantPanel(): AssistantPanelContextValue {
  const context = useContext(AssistantPanelContext);
  if (!context) {
    throw new Error("useAssistantPanel must be used within AssistantPanelProvider");
  }
  return context;
}
