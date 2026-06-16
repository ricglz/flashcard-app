"use client";

import type { ReactNode} from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import SyncProvider from "@/lib/SyncProvider";
import OfflineIndicator from "./OfflineIndicator";
import QueryProvider from "./QueryProvider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set.");
}

const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <QueryProvider>
        <SyncProvider>
          <OfflineIndicator />
          {children}
        </SyncProvider>
      </QueryProvider>
    </ConvexProviderWithClerk>
  );
}
