"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { useAvailableModelsContext } from "@/contexts/AvailableModelsContext";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  defaultLabel?: string;
  disabled?: boolean;
};

export function AiModelField({
  value,
  onChange,
  label = "Model",
  defaultLabel = "Default for provider",
  disabled = false,
}: Props) {
  const availableModels = useAvailableModelsContext();
  const modelOptions = useMemo(
    () => ["", ...availableModels.map((model) => model.id)],
    [availableModels],
  );
  const modelLabels = useMemo<Record<string, string>>(
    () => ({
      "": defaultLabel,
      ...Object.fromEntries(
        availableModels.map((model) => [model.id, model.name]),
      ),
    }),
    [availableModels, defaultLabel],
  );

  return (
    <div>
      <label htmlFor="ai-generation-model" className="block text-sm font-medium mb-1">
        {label}
      </label>
      <Select
        id="ai-generation-model"
        value={value}
        options={modelOptions}
        labels={modelLabels}
        onChange={onChange}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
