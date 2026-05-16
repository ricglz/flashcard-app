"use client";

import { UserButton } from "@clerk/nextjs";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import Link from "next/link";
import CliTokenSection from "./CliTokenSection";
import SrsSettingsSection from "./SrsSettingsSection";
import AiSettingsSection from "./AiSettingsSection";

type Props = {
  preloadedSettings: Preloaded<typeof api.userSettings.get>;
  preloadedCliStatus: Preloaded<typeof api.cliTokens.getStatus>;
};

export default function SettingsClient({
  preloadedSettings,
  preloadedCliStatus,
}: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <div className="flex items-center gap-4">
          <UserButton />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <CliTokenSection preloaded={preloadedCliStatus} />
        <SrsSettingsSection preloaded={preloadedSettings} />
        <AiSettingsSection preloaded={preloadedSettings} />
      </main>
    </div>
  );
}
