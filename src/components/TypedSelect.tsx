export default function TypedSelect<T extends string>({
  value,
  options,
  labels,
  onChange,
  className,
  ...rest
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  className?: string;
} & Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange"
>) {
  const handleChange = (rawValue: string) => {
    const next = options.find((option) => option === rawValue);
    if (next !== undefined) onChange(next);
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
      {...rest}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {labels[opt]}
        </option>
      ))}
    </select>
  );
}
