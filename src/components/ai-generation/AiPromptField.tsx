"use client";

import { Textarea } from "@/components/ui/Textarea";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function AiPromptField({
  value,
  onChange,
  label = "Prompt",
  placeholder = "Describe the cards you want to generate...",
  disabled = false,
}: Props) {
  return (
    <div>
      <label htmlFor="ai-generation-prompt" className="block text-sm font-medium mb-1">
        {label}
      </label>
      <Textarea
        id="ai-generation-prompt"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
