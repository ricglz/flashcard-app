"use client";

import { useAuth } from "@clerk/nextjs";
import NotSignedInLanding from "./NotSignedInLanding";
import SignedInLanding from "./SignedInLanding";

export default function HomeLanding() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <SignedInLanding />;
  }

  return <NotSignedInLanding />;
}
