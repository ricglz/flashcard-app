import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import FlaggedCardsClient from "./FlaggedCardsClient";

export default async function FlaggedPage() {
  const token = await requireAuthToken();

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
