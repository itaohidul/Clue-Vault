
/**
 * Robust Ad Engine for libtl SDK (show_11030019)
 * Priority: Rewarded Interstitial -> Interstitial -> Popunder -> Direct Link
 */

export type AdType = 'rewarded' | 'interstitial' | 'pop' | 'direct';

interface InAppSettings {
  frequency: number;
  capping: number;
  interval: number;
  timeout: number;
  everyPage: boolean;
}

let lastTriggerTime = 0;
const MANUAL_TRIGGER_INTERVAL = 30000; // 30 seconds

export async function triggerAd(type: AdType = 'rewarded', force = false): Promise<void> {
  const showAd = (window as any).show_11030019;
  
  if (typeof showAd !== 'function') {
    console.warn("Ad Engine: SDK not detected in window scope (fallback enabled)");
    return; // Resolve silently instead of throwing to prevent crashing the gameplay
  }

  // Throttle manual triggers unless forced
  const now = Date.now();
  if (!force && now - lastTriggerTime < MANUAL_TRIGGER_INTERVAL) {
    console.log("Ad Engine: Throttling trigger, last ad showed recently.");
    return;
  }

  lastTriggerTime = now;

  // Fallback chain logic: Rewarded -> Interstitial -> Popunder -> Direct
  // Always prioritize 'rewarded' first as per highest directive, then seek fallback modes.
  const typesToTry: AdType[] = ['rewarded', 'interstitial', 'pop', 'direct'];

  for (const t of typesToTry) {
    try {
      console.log(`Ad Engine: Attempting to trigger ${t}`);
      
      if (t === 'rewarded') {
        try {
          await showAd('rewarded');
          return;
        } catch (e1) {
          try {
            await showAd({ type: 'rewarded' });
            return;
          } catch (e2) {
            await showAd(); // Empty call as final fallback for rewarded
            return;
          }
        }
      } else if (t === 'interstitial') {
        try {
          await showAd('interstitial');
          return;
        } catch (e1) {
          await showAd({ type: 'interstitial' });
          return;
        }
      } else if (t === 'pop') {
        try {
          await showAd('pop');
          return;
        } catch (e1) {
          try {
            await showAd('popunder');
            return;
          } catch (e2) {
            await showAd({ type: 'pop' });
            return;
          }
        }
      } else if (t === 'direct') {
        try {
          await showAd('direct');
          return;
        } catch (e1) {
          try {
            await showAd('directlink');
            return;
          } catch (e2) {
            await showAd({ type: 'direct' });
            return;
          }
        }
      }
    } catch (error) {
      console.warn(`Ad Engine: ${t} trigger failed/ignored`, error);
    }
  }
  
  console.log("Ad Engine: Fallback ad chain completed.");
}

/**
 * Initializes the global in-app frequency engine with a retry mechanism
 */
export function initInAppAds(settings: InAppSettings, attempts: number = 0) {
  const showAd = (window as any).show_11030019;
  if (typeof showAd === 'function') {
    try {
      showAd({
        type: 'inApp',
        inAppSettings: settings
      });
      console.log("Ad Engine: In-App frequency initialized", settings);
    } catch (e) {
      console.warn("Ad Engine: In-App initialization failed, retrying...", e);
      if (attempts < 20) {
        setTimeout(() => initInAppAds(settings, attempts + 1), 2000);
      }
    }
  } else {
    // SDK not loaded yet, retry
    if (attempts < 30) {
      setTimeout(() => initInAppAds(settings, attempts + 1), 1000);
    }
  }
}
