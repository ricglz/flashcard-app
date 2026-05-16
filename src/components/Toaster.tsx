"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--card-bg)",
          border: "1px solid var(--edge)",
          color: "var(--foreground)",
        },
      }}
    />
  );
}
