import React, { createContext, useContext, ReactNode } from "react";
import { TwaAnalyticsProvider as RealTwaAnalyticsProvider, useTWAEvent } from "@tonsolutions/telemetree-react";

export function TwaAnalyticsProvider(props: any) {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const isTgWebApp = !!(tg?.initData);

  const mockTgData = {
    user: {
      id: 123456789,
      first_name: "Test",
      last_name: "Agent",
      username: "test_agent",
      language_code: "en"
    },
    platform: "browser",
    chat_type: "sender"
  };

  // Only use mock data in development if WE ARE NOT in a Telegram Web App session
  // In production, we must only use real Telegram Launch Data.
  const isDev = import.meta.env.DEV;
  const launchData = isTgWebApp ? undefined : (isDev ? mockTgData : undefined);

  if (typeof window !== 'undefined') {
    console.log("[TELEMETREE-READY] Init Params:", {
      isTgWebApp,
      hasLaunchData: !!launchData,
      isDev,
      projectId: props.projectId,
      apiKey: props.apiKey?.substring(0, 8) + "...",
      initDataLen: tg?.initData?.length || 0
    });
  }

  return (
    <RealTwaAnalyticsProvider 
      {...props} 
      telegramWebAppData={launchData}
    >
      <RealTelemetreeWrapper>
        {props.children}
      </RealTelemetreeWrapper>
    </RealTwaAnalyticsProvider>
  );
}

const MockAnalyticsContext = createContext<{ track: (evt: string, props?: any) => void }>({
  track: () => {}
});

function RealTelemetreeWrapper({ children }: { children: ReactNode }) {
  const builder = useTWAEvent();
  const hasTrackedLoad = React.useRef(false);

  React.useEffect(() => {
    if (builder && typeof builder.track === 'function' && !hasTrackedLoad.current) {
      console.log("[TELEMETREE-READY] Builder active. Sending app_loaded event.");
      try {
        builder.track("app_loaded", { timestamp: Date.now() });
        hasTrackedLoad.current = true;
      } catch (e) {
        console.warn("[TELEMETREE-READY] Failed to send initial app_loaded event:", e);
      }
    }
  }, [builder]);

  return (
    <MockAnalyticsContext.Provider value={{
      track: (event, properties) => {
        try {
          if (builder && typeof builder.track === 'function') {
             builder.track(event, properties || {});
          } else {
             console.warn("[TELEMA-SDK] Builder not initialized yet for event:", event);
          }
        } catch (e: any) {
          // If it fails because of "transport not initialized", we just swallow it or log a quiet message
          if (e.message && e.message.includes("not initialized")) {
             // Silence this specific initialization noise
          } else {
             console.warn("[TELEMA-SDK] Track failure:", e.message);
          }
        }
      }
    }}>
      {children}
    </MockAnalyticsContext.Provider>
  );
}

export function useTelemetree() {
   return useContext(MockAnalyticsContext);
}

