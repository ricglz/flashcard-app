"use client";

import type { ReactNode} from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import SyncProvider from "@/lib/SyncProvider";
import OfflineIndicator from "./OfflineIndicator";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string
);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <SyncProvider>
        <OfflineIndicator />
        {children}
      </SyncProvider>
    </ConvexProviderWithClerk>
  );
}
