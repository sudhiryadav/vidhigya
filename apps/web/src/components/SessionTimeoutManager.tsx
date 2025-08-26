"use client";

import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export function SessionTimeoutManager() {
  // This component uses the useSessionTimeout hook to manage session timeout
  // It doesn't render anything, just manages the timeout logic
  useSessionTimeout();

  return null;
}
