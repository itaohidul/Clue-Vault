import { useEffect, ReactNode } from 'react';

// Ensure WebApp types are globally visible
declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function TelegramProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) return;

    tg.ready();
    tg.expand();

    // Set background to tg theme color
    if (tg.themeParams?.bg_color) {
      document.body.style.background = tg.themeParams.bg_color;
    }

  }, []);

  return <>{children}</>;
}
