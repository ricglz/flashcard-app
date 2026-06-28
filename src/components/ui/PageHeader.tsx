"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

type PageHeaderProps = {
  title?: string;
  backLabel?: string;
  backDisabled?: boolean;
  actions?: ReactNode;
  leftExtra?: ReactNode;
  rightExtra?: ReactNode;
};

export function PageHeader({
  title,
  backLabel = "Back",
  backDisabled = false,
  actions,
  leftExtra,
  rightExtra,
}: PageHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const showBack = pathname !== "/";

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <header className="border-b px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4 min-w-0">
        {showBack ? (
          <button
            onClick={handleBack}
            disabled={backDisabled}
            className="text-sm text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &larr; {backLabel}
          </button>
        ) : (
          <div className="w-14" />
        )}
        {leftExtra}
      </div>
      <div className="flex-1 flex justify-center min-w-0 px-2">
        {title && <h1 className="text-xl font-bold text-center break-words">{title}</h1>}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 justify-end">
        {actions ?? <div className="w-14" />}
        {rightExtra}
      </div>
    </header>
  );
}
