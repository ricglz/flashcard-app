import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import SetsClient from "./SetsClient";

export default async function SetsPage() {
  const token = await requireAuthToken();

  const preloadedSets = await preloadQuery(
    api.flashcardSets.list,
    {},
    { token },
  );

  return <SetsClient preloadedSets={preloadedSets} />;
}
