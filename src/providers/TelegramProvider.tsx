import { useEffect, ReactNode } from 'react';

export default function TelegramProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) return;

    // Note: CloudStorage polyfill for older versions is handled early in index.html head scripts
    // to ensure availability before any React logic or third-party SDK calls.

    if (tg && typeof tg.ready === 'function') {
      try {
        tg.ready();
      } catch (e) {
        console.warn("tg.ready fail:", e);
      }
    }
    if (tg && typeof tg.expand === 'function') {
      try {
        tg.expand();
      } catch (e) {
        console.warn("tg.expand fail:", e);
      }
    }

    // Set background to tg theme color
    if (tg && tg.themeParams?.bg_color) {
      document.body.style.background = tg.themeParams.bg_color;
    }

  }, []);

  return <>{children}</>;
}
