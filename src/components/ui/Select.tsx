import type React from "react";

type SelectProps<T extends string> = {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  className?: string;
} & Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>;

export function Select<T extends string>({
  value,
  options,
  labels,
  onChange,
  className = "",
  ...rest
}: SelectProps<T>) {
  const handleChange = (rawValue: string) => {
    const next = options.find((option) => option === rawValue);
    if (next !== undefined) onChange(next);
  };

  const combinedClassName = [
    "px-3 py-2 border border-edge rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <select
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      className={combinedClassName}
      {...rest}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labels[option]}
        </option>
      ))}
    </select>
  );
}

export default Select;
