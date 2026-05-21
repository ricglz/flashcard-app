import React from "react";

type TextInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function TextInput({ error, className = "", ...props }: TextInputProps) {
  const baseStyles = "w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50";
  const errorStyles = error ? "border-red-500 focus:ring-red-500" : "";
  
  const combinedClassName = [baseStyles, errorStyles, className].filter(Boolean).join(" ");

  return <input className={combinedClassName} {...props} />;
}
