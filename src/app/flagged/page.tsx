import { redirect } from "next/navigation";
import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import FlaggedCardsClient from "./FlaggedCardsClient";

export default async function FlaggedPage() {
  const token = await getAuthToken();
  if (!token) redirect("/");

  const [preloaded, preloadedTtsConfig] = await Promise.all([
    preloadQuery(api.cardAnnotations.getFlagged, {}, { token }),
    preloadQuery(api.userSettings.getTtsConfig, {}, { token }),
  ]);

  return (
    <FlaggedCardsClient
      preloaded={preloaded}
      preloadedTtsConfig={preloadedTtsConfig}
    />
  );
}
