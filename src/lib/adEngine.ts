
/**
 * Robust Ad Engine for libtl SDK (show_11030019)
 * Priority: Rewarded Interstitial -> Rewarded -> Interstitial -> Popunder -> Direct Link
 */

export type AdType = 
  | 'rewarded_interstitial' 
  | 'rewardedInterstitial' 
  | 'rewinterstitial' 
  | 'rewarded' 
  | 'interstitial' 
  | 'pop' 
  | 'direct';

interface InAppSettings {
  frequency: number;
  capping: number;
  interval: number;
  timeout: number;
  everyPage: boolean;
}

let lastTriggerTime = 0;
const MANUAL_TRIGGER_INTERVAL = 30000; // 30 seconds (Aim for 1 interstitial every 30-60 seconds of active use)

export async function triggerAd(type: AdType = 'rewarded_interstitial', force = false): Promise<void> {
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

  // Build fallback queue starting with requested format family, descending in CPM
  const queue: string[] = [];
  
  if (
    type === 'rewarded_interstitial' || 
    type === 'rewardedInterstitial' || 
    type === 'rewinterstitial' || 
    type === 'rewarded'
  ) {
    queue.push(
      'rewarded_interstitial',
      'rewardedInterstitial',
      'rewinterstitial',
      'rewarded',
      'interstitial',
      'pop',
      'direct'
    );
  } else if (type === 'interstitial') {
    queue.push(
      'interstitial',
      'rewarded_interstitial',
      'rewardedInterstitial',
      'rewinterstitial',
      'rewarded',
      'pop',
      'direct'
    );
  } else if (type === 'pop') {
    queue.push(
      'pop',
      'popunder',
      'rewarded_interstitial',
      'rewardedInterstitial',
      'rewinterstitial',
      'rewarded',
      'interstitial',
      'direct'
    );
  } else {
    queue.push(
      'direct',
      'directlink',
      'rewarded_interstitial',
      'rewardedInterstitial',
      'rewinterstitial',
      'rewarded',
      'interstitial',
      'pop'
    );
  }

  // Deduplicate queue
  const finalQueue = Array.from(new Set(queue));

  for (const format of finalQueue) {
    try {
      console.log(`Ad Engine: Attempting to trigger format [${format}]`);
      
      // 1. Prioritize empty parameter call for rewarded interstitial family (highest CPM)
      if (
        format === 'rewarded_interstitial' || 
        format === 'rewardedInterstitial' || 
        format === 'rewinterstitial' || 
        format === 'rewarded'
      ) {
        try {
          await showAd();
          console.log(`Ad Engine: Successful display of format [${format}] via empty-argument call (Rewarded Interstitial)`);
          return;
        } catch (errEmpty) {
          console.log(`Ad Engine: Empty-argument call for ${format} failed, trying parameter-based fallbacks...`);
        }
      }
      
      // 2. Try direct parameter string
      try {
        await showAd(format);
        console.log(`Ad Engine: Successful display of format [${format}] via string arg`);
        return;
      } catch (errStr) {
        // 3. Try object parameter
        try {
          await showAd({ type: format });
          console.log(`Ad Engine: Successful display of format [${format}] via object type arg`);
          return;
        } catch (errObj) {
          // Additional fallback strings for common Monetag / WebTigers formats
          if (format === 'pop') {
            try {
              await showAd('popunder');
              console.log("Ad Engine: Successful display of format [popunder] fallback");
              return;
            } catch (errPop) {}
          } else if (format === 'direct') {
            try {
              await showAd('directlink');
              console.log("Ad Engine: Successful display of format [directlink] fallback");
              return;
            } catch (errDir) {}
          }
        }
      }
    } catch (error) {
      console.warn(`Ad Engine: ${format} trigger failed/ignored`, error);
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
