"use client";

import { useMemo } from "react";
import { useAvailableModelsContext } from "@/contexts/AvailableModelsContext";
import { Select } from "@/components/ui/Select";

type Props = {
  value: string;
  onChange: (model: string) => void;
};

export default function AssistantModelSelect({ value, onChange }: Props) {
  const availableModels = useAvailableModelsContext();
  const modelOptions = useMemo(
    () => ["", ...availableModels.map((model) => model.id)],
    [availableModels],
  );
  const modelLabels = useMemo(
    () => ({
      "": "Default model",
      ...Object.fromEntries(
        availableModels.map((model) => [model.id, model.name]),
      ),
    }),
    [availableModels],
  );

  return (
    <Select
      value={value}
      options={modelOptions}
      labels={modelLabels}
      onChange={onChange}
      className="w-36 px-2 py-1 text-xs"
    />
  );
}
