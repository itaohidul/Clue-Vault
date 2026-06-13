import { useEffect, ReactNode } from "react";

export default function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    // Debug logging as requested
    if (tg) {
       console.log("[TELEGRAM-BOOT] SDK detected:", {
         version: tg.version,
         platform: tg.platform,
         hasReady: typeof tg.ready === 'function',
         hasExpand: typeof tg.expand === 'function',
         initDataLen: tg.initData?.length || 0,
         hasInitData: !!tg.initData
       });

       try {
         if (typeof tg.ready === 'function') tg.ready();
         if (typeof tg.expand === 'function') tg.expand();
         
         // Set background to tg theme color
         if (tg.themeParams?.bg_color) {
           document.body.style.background = tg.themeParams.bg_color;
         }
       } catch (e) {
         console.warn("Telegram init failed:", e);
       }
    } else {
       console.log("[TELEGRAM-BOOT] No SDK found, assuming browser mode.");
    }
  }, []);

  return <>{children}</>;
}
