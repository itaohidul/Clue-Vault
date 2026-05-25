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

    // Polyfill CloudStorage for Telegram WebApp versions below 6.9 to prevent warnings or errors.
    try {
      const needsPolyfill = typeof tg.isVersionAtLeast !== 'function' || !tg.isVersionAtLeast('6.9');
      
      // Specifically check if CloudStorage property exists without calling a throwing getter
      const hasCloudStorage = Object.prototype.hasOwnProperty.call(tg, 'CloudStorage') || (tg.CloudStorage !== undefined);

      if (needsPolyfill && !hasCloudStorage) {
        const mockCloudStorage = {
          setItem: (key: string, value: string, callback?: any) => {
            localStorage.setItem('tg_cloud_' + key, value);
            if (callback) callback(null, true);
            return Promise.resolve(true);
          },
          getItem: (key: string, callback?: any) => {
            const val = localStorage.getItem('tg_cloud_' + key);
            if (callback) callback(null, val);
            return Promise.resolve(val);
          },
          getItems: (keys: string[], callback?: any) => {
            const res: Record<string, string | null> = {};
            keys.forEach(k => {
              res[k] = localStorage.getItem('tg_cloud_' + k);
            });
            if (callback) callback(null, res);
            return Promise.resolve(res);
          },
          removeItem: (key: string, callback?: any) => {
            localStorage.removeItem('tg_cloud_' + key);
            if (callback) callback(null, true);
            return Promise.resolve(true);
          },
          removeItems: (keys: string[], callback?: any) => {
            keys.forEach(k => localStorage.removeItem('tg_cloud_' + k));
            if (callback) callback(null, true);
            return Promise.resolve(true);
          },
          getKeys: (callback?: any) => {
            const keys = Object.keys(localStorage)
              .filter(k => k.startsWith('tg_cloud_'))
              .map(k => k.replace('tg_cloud_', ''));
            if (callback) callback(null, keys);
            return Promise.resolve(keys);
          }
        };

        Object.defineProperty(tg, 'CloudStorage', {
          get: () => mockCloudStorage,
          configurable: true,
          enumerable: true
        });
      }
    } catch (e) {
      console.warn("Failed to apply Telegram CloudStorage polyfill:", e);
    }

    tg.ready();
    tg.expand();

    // Set background to tg theme color
    if (tg.themeParams?.bg_color) {
      document.body.style.background = tg.themeParams.bg_color;
    }

  }, []);

  return <>{children}</>;
}
