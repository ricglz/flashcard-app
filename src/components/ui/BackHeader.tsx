import Link from "next/link";
import type { ReactNode } from "react";

type BackHeaderProps = {
  href: string;
  label: string;
  right?: ReactNode;
};

export function BackHeader({ href, label, right }: BackHeaderProps) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <Link href={href} className="text-sm text-muted hover:text-foreground">
        &larr; {label}
      </Link>
      {right ? <div>{right}</div> : null}
    </header>
  );
}
