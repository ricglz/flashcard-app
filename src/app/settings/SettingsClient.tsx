"use client";

import { UserButton } from "@clerk/nextjs";
import type { Preloaded } from "convex/react";
import type { api } from "../../../convex/_generated/api";
import CliTokenSection from "./CliTokenSection";
import SrsSettingsSection from "./SrsSettingsSection";
import AiSettingsSection from "./AiSettingsSection";
import { PageHeader } from "@/components/ui/PageHeader";

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
      <PageHeader title="Settings" backLabel="Dashboard" actions={<UserButton />} />

      <main className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        <CliTokenSection preloaded={preloadedCliStatus} />
        <SrsSettingsSection preloaded={preloadedSettings} />
        <AiSettingsSection preloaded={preloadedSettings} />
      </main>
    </div>
  );
}
