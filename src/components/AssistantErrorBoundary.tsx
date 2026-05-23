"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";

export default class AssistantErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: info.componentStack,
        },
      },
    });
    console.error("AssistantPanel error:", error, info);
    toast.error("Study assistant crashed - click to retry");
  }

  render() {
    if (this.state.hasError) {
      return (
        <button
          onClick={() => this.setState({ hasError: false })}
          className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-danger text-white rounded-full shadow-lg hover:bg-danger-hover flex items-center justify-center text-xl transition-colors"
          aria-label="Study assistant error - click to retry"
        >
          !
        </button>
      );
    }
    return this.props.children;
  }
}
