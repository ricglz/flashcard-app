import { preloadQuery } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { requireAuthToken } from "@/lib/routePreload";
import GenerateClient from "./GenerateClient";

export default async function GeneratePage() {
  const token = await requireAuthToken();

  const preloadedSets = await preloadQuery(
    api.flashcardSets.list,
    {},
    { token },
  );

  return <GenerateClient preloadedSets={preloadedSets} />;
}
