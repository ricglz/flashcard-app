import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

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
