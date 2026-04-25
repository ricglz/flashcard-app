import { redirect } from "next/navigation";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { api } from "../../../convex/_generated/api";
import { getAuthToken } from "@/lib/server";
import SrsReviewClient from "./SrsReviewClient";

export default async function SrsReviewPage() {
  const token = await getAuthToken();
  const preloadedQueue = await preloadQuery(
    api.srsReviewQueue.getHydratedQueue,
    {},
    { token }
  );

  const queue = preloadedQueryResult(preloadedQueue);
  if (!queue || queue.length === 0) {
    redirect("/");
  }

  return <SrsReviewClient preloadedQueue={preloadedQueue} />;
}
