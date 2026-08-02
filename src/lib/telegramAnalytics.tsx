import React from "react";

export function trackTelemetry(_event: string, _properties?: any) {}

export function TwaAnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useTelemetree() {
  return { track: (_event: string, _properties?: any) => {} };
}
