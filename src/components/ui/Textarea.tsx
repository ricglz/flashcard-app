import React from "react";

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const baseStyles = "w-full px-3 py-2 border border-edge rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-none";

  const combinedClassName = [baseStyles, className].filter(Boolean).join(" ");

  return <textarea className={combinedClassName} {...props} />;
}
