"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import SyncProvider from "@/lib/SyncProvider";
import OfflineIndicator from "./OfflineIndicator";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

function useConvexClerkAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authRevision, setAuthRevision] = useState(0);

  useEffect(() => {
    const handler = () => setAuthRevision((r) => r + 1);
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, []);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        return await getToken({ skipCache: forceRefreshToken });
      } catch {
        return null;
      }
    },
    // authRevision forces a new callback identity on reconnect,
    // which triggers ConvexProviderWithAuth to re-call client.setAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getToken, authRevision],
  );

  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
    fetchAccessToken,
  };
}

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexClerkAuth}>
      <SyncProvider>
        <OfflineIndicator />
        {children}
      </SyncProvider>
    </ConvexProviderWithAuth>
  );
}
