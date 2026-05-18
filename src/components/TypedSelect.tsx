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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
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
