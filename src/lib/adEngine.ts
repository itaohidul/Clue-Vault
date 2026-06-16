import { 
  isActiveAd, 
  setActiveAd, 
  checkAdEligibility, 
  incrementSessionAds,
  trackAdAnalytics,
  isUiBusy,
  incrementNavigationCounter,
  getNavigationCounter
} from "./adPacer";

declare global {
  interface Window {
    show_11030019?: any;
  }
}

export const monetagReady = () =>
  typeof window !== "undefined" && typeof window.show_11030019 === "function";

export function isMonetagReady(): boolean {
  return monetagReady();
}

export async function showRewardedInterstitial(onReward?: any) {
  if (!monetagReady()) return false;

  try {
    const result = await window.show_11030019();
    if (typeof onReward === "function") onReward();
    return true;
  } catch {
    return false;
  }
}

export async function showRewardedPopup(onReward?: any) {
  if (!monetagReady()) return false;

  try {
    const result = await window.show_11030019("pop");
    if (typeof onReward === "function") onReward();
    return true;
  } catch {
    return false;
  }
}

export function showInAppInterstitial() {
  if (!monetagReady()) return false;

  window.show_11030019({
    type: "inApp",
    inAppSettings: {
      frequency: 1,
      capping: 0.25,
      interval: 120,
      timeout: 15,
      everyPage: false
    }
  });

  return true;
}

/**
 * Robust Ad Engine for libtl SDK (show_11030019) with Pacing Queue Support
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

interface AdRequest {
  type: AdType;
  force: boolean;
  resolve: (success: boolean) => void;
  reject: (err: any) => void;
}

const adQueue: AdRequest[] = [];

// Clean ad queue executor sequentially guaranteeing only ONE active ad at any moment
async function processNextAd(): Promise<void> {
  if (isActiveAd() || adQueue.length === 0) {
    return;
  }

  const nextAd = adQueue[0];
  
  // Verify eligibility for non-forced ads (e.g., periodic interval or navigation-triggered)
  if (!nextAd.force) {
    const eligibility = checkAdEligibility();
    if (!eligibility.allowed) {
      console.log(`[Ad Engine] Non-forced request shelved: ${eligibility.reason}`);
      trackAdAnalytics("adQueueDelays", 1);
      
      // Re-evaluate queue safely in 4 seconds
      setTimeout(processNextAd, 4000);
      return;
    }
  } else {
    // If forced but the interface is locked doing critical reward distributions, delay briefly
    if (isUiBusy()) {
      console.log(`[Ad Engine] Urgently requested ad delayed slightly—UI currently busy with critical gameplay rewards.`);
      setTimeout(processNextAd, 1500);
      return;
    }
  }

  // Remove matching from the operational queue since we are running it
  adQueue.shift();
  setActiveAd(true);

  const { type, resolve, reject } = nextAd;

  try {
    console.log(`[Ad Engine] Dequeueing and booting format: ${type}`);
    await playAdSequence(type);
    
    // Post reward tracking
    incrementSessionAds();
    resolve(true);
  } catch (error) {
    console.warn(`[Ad Engine Event] Play sequence failed or bypassed on fallback. Resolving successfully to prevent game locks.`, error);
    // Resolve anyway to guarantee offline mode continuation without locking the game interface
    resolve(false);
  } finally {
    setActiveAd(false);
    // Cycle the queue processing with a short breather delay to keep layouts clear
    setTimeout(processNextAd, 1500);
  }
}

async function playAdSequence(type: AdType): Promise<void> {
  if (!isMonetagReady()) {
    throw new Error("SDK not detected in scope (offline fallback integration active)");
  }
  const showAd = (window as any).show_11030019;

  const queue: string[] = [];
  
  // Whichever ad is triggered, we prefer rewarded interstitial first for maximum delivery
  queue.push('rewarded_interstitial', 'rewardedInterstitial', 'rewinterstitial', 'rewarded');
  
  // If needed to mix formats, use standard minimal interstitial next
  queue.push('interstitial');
  
  // Popunders and direct links as the absolute lowest possible backup formats
  queue.push('pop', 'popunder', 'direct', 'directlink');

  const finalQueue = Array.from(new Set(queue));
  let success = false;

  for (const format of finalQueue) {
    try {
      console.log(`[SDK Cascade] Attempting Monetag format: [${format}]`);
      
      // 1. empty parameter trial for rewarded interstitial formats
      if (
        format === 'rewarded_interstitial' || 
        format === 'rewardedInterstitial' || 
        format === 'rewinterstitial' || 
        format === 'rewarded'
      ) {
        try {
          await showAd();
          console.log(`[SDK Cascade] Success - empty args rewarded format: [${format}]`);
          success = true;
          break;
        } catch (errEmpty) {
          console.log(`[SDK Cascade] Empty-parameter reward call failed for [${format}]. Trying variations...`);
        }
      }

      // 2. Try direct parameter string
      try {
        await showAd(format);
        console.log(`[SDK Cascade] Success - string argument format: [${format}]`);
        success = true;
        break;
      } catch (errStr) {
        // 3. Try object type package
        try {
          await showAd({ type: format });
          console.log(`[SDK Cascade] Success - object parameter format: [${format}]`);
          success = true;
          break;
        } catch (errObj) {
          if (format === 'pop') {
            try {
              await showAd('popunder');
              console.log("[SDK Cascade] Success - popunder fallback");
              success = true;
              break;
            } catch (errPop) {}
          } else if (format === 'direct') {
            try {
              await showAd('directlink');
              console.log("[SDK Cascade] Success - directlink fallback");
              success = true;
              break;
            } catch (errDir) {}
          }
        }
      }
    } catch (e) {
      console.warn(`[SDK Cascade Warn] Format trial error on [${format}]:`, e);
    }
  }

  if (!success) {
    throw new Error("All cascade format options reported loading failure");
  }
}

export function triggerAd(type: AdType = 'rewarded_interstitial', force = false): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    // Audit log trackers based on requested category
    if (type.startsWith('reward') || type.includes('interstitial') || type === 'rewinterstitial') {
      trackAdAnalytics("rewardedAds", 1);
    } else if (type === 'pop') {
      trackAdAnalytics("popunders", 1);
    } else if (type === 'interstitial') {
      trackAdAnalytics("interstitials", 1);
    }
    
    adQueue.push({ type, force, resolve, reject });
    processNextAd();
  });
}

/**
 * Initializes the global in-app frequency engine with a retry mechanism
 */
export function initInAppAds(settings: InAppSettings, attempts: number = 0) {
  if (isMonetagReady()) {
    const showAd = (window as any).show_11030019;
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
