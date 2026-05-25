import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const token = await requireAuthToken();

  const [preloadedSettings, preloadedCliStatus] = await Promise.all([
    preloadQuery(api.userSettings.get, {}, { token }),
    preloadQuery(api.cliTokens.getStatus, {}, { token }),
  ]);

  return (
    <SettingsClient
      preloadedSettings={preloadedSettings}
      preloadedCliStatus={preloadedCliStatus}
    />
  );
}
