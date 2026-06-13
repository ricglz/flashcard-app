"use client";

import { Textarea } from "@/components/ui/Textarea";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function AiInstructionsField({
  value,
  onChange,
  label = "Additional Instructions (optional)",
  placeholder = "Any specific guidelines for card format, difficulty, etc.",
  disabled = false,
}: Props) {
  return (
    <div>
      <label htmlFor="ai-generation-instructions" className="block text-sm font-medium mb-1">
        {label}
      </label>
      <Textarea
        id="ai-generation-instructions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
