"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Dev should never run the app service worker. If one was installed by a
      // prior build, remove it so stale Next.js chunks stop being served.
      void Promise.all([
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(
              registrations.map((registration) => registration.unregister()),
            ),
          ),
        "caches" in window
          ? caches
              .keys()
              .then((names) =>
                Promise.all(names.map((name) => caches.delete(name))),
              )
          : Promise.resolve([]),
      ]).catch(() => {
        // SW cleanup failed; app works fine without it.
      });
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .catch(() => {
        // SW registration failed; app works fine without it.
      });
  }, []);
  return null;
}
