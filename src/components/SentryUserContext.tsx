"use client";

import { useAuth } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function SentryUserContext() {
  const { userId } = useAuth();

  useEffect(() => {
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);

  return null;
}
