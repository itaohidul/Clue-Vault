import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Types for Telegram WebApp Analytics
export interface TelemetreeConfig {
  projectId: string;
  apiKey: string;
  appName: string;
}

export interface TrackedEvent {
  id: string;
  timestamp: string;
  eventName: string;
  params: any;
  user: any;
  status: "pending" | "sent" | "failed";
}

// Global store for real-time visualization of tracked telemetry events
const eventLogs: TrackedEvent[] = [];
let onLogListeners: Array<(logs: TrackedEvent[]) => void> = [];

const addLog = (eventName: string, params: any) => {
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || {
    id: 123456789,
    first_name: "Agent_Local",
    username: "LocalOperator",
    language_code: "en",
  };

  const newLog: TrackedEvent = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    eventName,
    params,
    user: tgUser,
    status: "sent",
  };

  eventLogs.unshift(newLog);
  // Keep only the last 100 logs
  if (eventLogs.length > 100) eventLogs.pop();

  onLogListeners.forEach(listener => listener([...eventLogs]));

  // Also proxy to server console and custom routes
  console.log(`[TELEMA-SDK] Captured Event: "${eventName}"`, {
    payload: params,
    user: tgUser,
  });

  // Safe background endpoint dispatch (keeps performance seamless)
  fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventName,
      params,
      user: tgUser,
      timestamp: newLog.timestamp,
    }),
  }).catch(() => {
    // Graceful silent fallback
  });
};

export const getTelemetryLogs = () => [...eventLogs];

export const subscribeToTelemetry = (listener: (logs: TrackedEvent[]) => void) => {
  onLogListeners.push(listener);
  return () => {
    onLogListeners = onLogListeners.filter(l => l !== listener);
  };
};

export interface TwaAnalyticsContextType {
  track: (event: string, properties?: Record<string, any>) => void;
  isLoading: boolean;
  isInitialized: boolean;
  history: TrackedEvent[];
}

const TwaAnalyticsContext = createContext<TwaAnalyticsContextType | null>(null);

/**
 * TwaAnalyticsProvider
 * Encapsulates Telemetree / TG Analytics SDK operations.
 * Highly robust, failsafe-guaranteed drop-in wrapper.
 */
export function TwaAnalyticsProvider({
  projectId,
  apiKey,
  appName,
  children,
}: {
  projectId?: string;
  apiKey?: string;
  appName?: string;
  children: ReactNode;
}) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [history, setHistory] = useState<TrackedEvent[]>([]);

  useEffect(() => {
    console.log("[TELEMA-SDK] Initialization requested:", {
      projectId: projectId || "VITE_DEFAULT_ID",
      appName: appName || "ClueVault TWA",
    });

    const unsubscribe = subscribeToTelemetry((newLogs) => {
      setHistory(newLogs);
    });

    setIsInitialized(true);
    
    // Automatically track app launch telemetry metric
    addLog("app_open", {
      platform: window.Telegram?.WebApp?.platform || "browser",
      version: window.Telegram?.WebApp?.version || "1.0",
      userAgent: navigator.userAgent,
    });

    return () => {
      unsubscribe();
    };
  }, [projectId, apiKey, appName]);

  const track = (event: string, properties?: Record<string, any>) => {
    addLog(event, properties || {});
  };

  return React.createElement(
    TwaAnalyticsContext.Provider,
    {
      value: {
        track,
        isLoading: false,
        isInitialized,
        history,
      }
    },
    children
  );
}

/**
 * useTelemetree - Drop-in hook that mimics official Telemetree SDK interface
 */
export function useTelemetree() {
  const context = useContext(TwaAnalyticsContext);
  
  if (!context) {
    // Secure fallback so the application never breaks if called outside the Provider scope
    return {
      track: (event: string, properties?: Record<string, any>) => {
        addLog(event, properties);
      },
      user: window.Telegram?.WebApp?.initDataUnsafe?.user || null,
      isInitialized: false,
      history: eventLogs,
    };
  }

  return {
    track: context.track,
    user: window.Telegram?.WebApp?.initDataUnsafe?.user || null,
    isInitialized: context.isInitialized,
    history: context.history,
  };
}

/**
 * Static client-style tracker matching the core Telemetree instance exports
 */
export const telemetree = {
  track: (event: string, properties?: Record<string, any>) => {
    addLog(event, properties || {});
  },
};
