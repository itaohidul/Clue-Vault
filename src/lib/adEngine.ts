
/**
 * Robust Ad Engine for libtl SDK (show_11030019)
 * Implements fallback logic: Rewarded Interstitial -> Popunder -> Catch Failure
 */

export type AdType = 'rewarded' | 'pop' | 'inApp';

interface InAppSettings {
  frequency: number;
  capping: number;
  interval: number;
  timeout: number;
  everyPage: boolean;
}

export async function triggerAd(type: AdType = 'rewarded'): Promise<void> {
  const showAd = (window as any).show_11030019;
  
  if (typeof showAd !== 'function') {
    console.error("Ad Engine: SDK not detected in window scope");
    throw new Error("SDK_NOT_LOADED");
  }

  // Fallback chain logic
  try {
    if (type === 'rewarded') {
      // Primary: Rewarded Interstitial
      console.log("Ad Engine: Triggering Rewarded Interstitial");
      await showAd();
    } else if (type === 'pop') {
      // Direct Popunder
      console.log("Ad Engine: Triggering Popunder");
      await showAd('pop');
    }
  } catch (error) {
    console.warn("Ad Engine: Primary trigger failed, attempting fallback to Popunder", error);
    try {
      // Fallback to Popunder if rewarded fails
      await showAd('pop');
    } catch (fallbackError) {
      console.error("Ad Engine: All ad formats failed", fallbackError);
      throw fallbackError;
    }
  }
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
