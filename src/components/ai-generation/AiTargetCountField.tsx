"use client";

type Props = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
};

export function AiTargetCountField({
  value,
  onChange,
  label = "Target count",
  min = 1,
  max = 100,
  disabled = false,
}: Props) {
  return (
    <div>
      <label htmlFor="ai-generation-count" className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id="ai-generation-count"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || min)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm disabled:opacity-50"
      />
    </div>
  );
}
