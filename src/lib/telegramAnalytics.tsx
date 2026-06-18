import React, { createContext, useContext, ReactNode } from "react";
import { TwaAnalyticsProvider as RealTwaAnalyticsProvider, useTWAEvent } from "@tonsolutions/telemetree-react";

export function TwaAnalyticsProvider(props: any) {
  const { appName, ...rest } = props; // Strip appName to avoid prop spreading warnings/errors
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

  // Fix 1: Pass real Telegram data explicitly if we're in TG to ensure SDK has identity immediately
  const isDev = import.meta.env.DEV;
  
  // Real Telegram data payload
  const realTgData = isTgWebApp && tg && tg.initDataUnsafe && tg.initDataUnsafe.user
    ? { ...tg.initDataUnsafe, platform: tg.platform } 
    : undefined;
    
  const launchData = realTgData || mockTgData;

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

  // Force re-create EventBuilder on key change when real user identity becomes available
  const pKey = launchData?.user?.id ? `telemetree-${launchData.user.id}` : "telemetree-default";

  return (
    <RealTwaAnalyticsProvider 
      key={pKey}
      {...rest} 
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
    let active = true;
    const checkAndTrack = () => {
      if (!active) return;
      
      const isReady = builder && typeof builder.track === 'function';
                     
      if (isReady) {
        if (!hasTrackedLoad.current) {
          console.log("[TELEMETREE-READY] Builder active. Sending app_loaded event.");
          try {
            builder.track("app_loaded", { timestamp: Date.now() });
            hasTrackedLoad.current = true;
          } catch (e) {
            console.warn("[TELEMETREE-READY] Failed to send initial app_loaded event:", e);
          }
        }
      } else {
        // Safe intermittent polling
        setTimeout(checkAndTrack, 600);
      }
    };

    checkAndTrack();
    return () => {
      active = false;
    };
  }, [builder]);

  return (
    <MockAnalyticsContext.Provider value={{
      track: (event, properties) => {
        try {
          const isReady = builder && typeof builder.track === 'function';
                         
          if (isReady) {
             builder.track(event, properties || {});
          } else {
             console.warn("[TELEMA-SDK] Telemetree event builder not found. Event skipped:", event);
          }
        } catch (e: any) {
          if (e.message && e.message.includes("not initialized")) {
             // Silence specific initialization exceptions
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

