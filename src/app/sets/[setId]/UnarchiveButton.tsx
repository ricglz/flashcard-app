"use client";

import { Button } from "@/components/ui/Button";

export function UnarchiveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick}>
      Unarchive
    </Button>
  );
}
