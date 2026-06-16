"use client";

import { Select } from "@/components/ui/Select";
import { VISIBILITIES, VISIBILITY_LABELS } from "@/lib/types";

export function VisibilityControls({
  visibility,
  onChange,
}: {
  visibility: (typeof VISIBILITIES)[number];
  onChange: (v: (typeof VISIBILITIES)[number]) => void;
}) {
  return (
    <Select
      value={visibility}
      options={VISIBILITIES}
      labels={VISIBILITY_LABELS}
      onChange={onChange}
      className="px-2 py-0.5 text-xs"
    />
  );
}
