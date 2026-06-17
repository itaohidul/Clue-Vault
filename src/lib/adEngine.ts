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

export function getLastAdClosedTime(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem("cluevault_last_ad_closed");
  return val ? parseInt(val, 10) : 0;
}

export function setLastAdClosedTime(time: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cluevault_last_ad_closed", time.toString());
}

export interface AdAttempt {
  id: string;
  type: AdType;
  status: "pending" | "completed" | "failed" | "expired" | "rewarded";
  timestamp: number;
}

export const adAttemptsMap = new Map<string, AdAttempt>();
let activeAdAttemptId: string | null = null;
let activeAdPromise: Promise<boolean> | null = null;

export async function safeShowAdWithTimeout(param?: any, timeoutMs: number = 20000): Promise<boolean> {
  const showAd = typeof window !== "undefined" ? (window as any).show_11030019 : null;
  if (typeof showAd !== "function") {
    throw new Error("SDK not loaded");
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    const done = (val: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // 1. REMOVE AUTO-SUCCESS TIMEOUT BEHAVIOR & 6. SAFE TIMEOUT BEHAVIOR
    // Do not mark success, do not reward on timeout, fail safely and release locks
    const timer = setTimeout(() => {
      console.warn(`[Ad SDK] Playback verification timed out after ${timeoutMs}ms. Safe timeout triggered without award.`);
      done(false);
    }, timeoutMs);

    try {
      const p = param !== undefined ? showAd(param) : showAd();
      if (p && typeof p.then === "function") {
        p.then((res: any) => {
          clearTimeout(timer);
          // Reward only on confirmed completion (standard SDK behavior)
          const isComplete = res !== false;
          done(isComplete);
        }).catch((err: any) => {
          console.warn("[Ad SDK] Ad promise rejected by SDK:", err);
          clearTimeout(timer);
          done(false); // Do not reward on failure or cancel
        });
      } else {
        console.warn("[Ad SDK] No completion promise returned by SDK during call.");
        clearTimeout(timer);
        done(false); // Fail safely without reliable signal
      }
    } catch (e) {
      console.warn("[Ad SDK] Execution exception during window.showAd call:", e);
      clearTimeout(timer);
      done(false);
    }
  });
}

// Backwards-compatible signature wrapper mapping 5s timeout to a secure 20s failure-prone timeout
export async function safeShowAdWith5sTimeout(param?: any): Promise<boolean> {
  return safeShowAdWithTimeout(param, 20000);
}

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

// Core unified sequential trigger engine with active sessions, collision detection, and anti-overlap
export function triggerAd(type: AdType = 'rewarded_interstitial', force = false): Promise<boolean> {
  const isRewarded = type.startsWith('reward') || type.includes('interstitial') || type === 'rewinterstitial';

  if (isRewarded) {
    trackAdAnalytics("rewardedAds", 1);
  } else if (type === 'pop') {
    trackAdAnalytics("popunders", 1);
  } else if (type === 'interstitial') {
    trackAdAnalytics("interstitials", 1);
  }

  // 2. ADD ONE ACTIVE AD SESSION ONLY & 5. QUEUE OR BLOCK OVERLAPPING REQUESTS
  // Block any concurrent or stacked ad requests from route changes, intervals, tasks, or spins
  if (activeAdAttemptId !== null || isActiveAd()) {
    console.warn(`[Ad Engine] Blocked overlapping ad request (${type}) because another ad is already showing or pending.`);
    trackAdAnalytics("adQueueDelays", 1);
    return Promise.resolve(false);
  }

  // Double-protect check against dynamic eligibility limitations for automated ads
  if (!force) {
    const eligibility = checkAdEligibility();
    if (!eligibility.allowed) {
      console.log(`[Ad Engine] Non-forced request suppressed by Pacing rules: ${eligibility.reason}`);
      return Promise.resolve(false);
    }
  } else {
    // If forced but the interface is locked doing critical reward distributions, delay/fail safely
    if (isUiBusy()) {
      console.log(`[Ad Engine] Trigger suppressed because UI is busy with critical gameplay rewards.`);
      return Promise.resolve(false);
    }
  }

  // 3. USE A UNIQUE AD ATTEMPT ID
  const attemptId = "attempt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  const attempt: AdAttempt = {
    id: attemptId,
    type,
    status: "pending",
    timestamp: Date.now()
  };
  adAttemptsMap.set(attemptId, attempt);
  
  // Set guards
  activeAdAttemptId = attemptId;
  setActiveAd(true);

  activeAdPromise = (async () => {
    const startTime = Date.now();
    let success = false;
    try {
      console.log(`[Ad Engine] Initializing ad attempt [${attemptId}] for format: ${type}`);
      success = await playAdSequence(type, attemptId);
      
      // 4. REWARD ONLY ON VERIFIED COMPLETION
      if (success) {
        attempt.status = "completed";
        incrementSessionAds();
        console.log(`[Ad Engine] Ad attempt [${attemptId}] completed successfully.`);
      } else {
        attempt.status = "failed";
        console.warn(`[Ad Engine] Ad attempt [${attemptId}] failed or timed out.`);
      }
    } catch (error) {
      attempt.status = "failed";
      console.error(`[Ad Engine] Exception in ad play cascade [${attemptId}]:`, error);
    } finally {
      // Release UI block/lock strictly after completion to guarantee no overlapping,
      // maintaining a sensible minimum duration lock for CPM and pacing reasons (15 seconds)
      const elapsed = Date.now() - startTime;
      const minAdDuration = 15000; 
      if (elapsed < minAdDuration) {
        await new Promise(resolveHold => setTimeout(resolveHold, minAdDuration - elapsed));
      }

      // 8. FIX UI LOCK RELEASE LOGIC
      activeAdAttemptId = null;
      activeAdPromise = null;
      setActiveAd(false);
      setLastAdClosedTime(Date.now());
    }

    return success;
  })();

  return activeAdPromise;
}

// 5. Centralized delegated show routines
export async function showRewardedInterstitial(onReward?: any): Promise<boolean> {
  const success = await triggerAd('rewarded_interstitial', false);
  if (success && typeof onReward === "function") {
    onReward();
  }
  return success;
}

export async function showRewardedPopup(onReward?: any): Promise<boolean> {
  const success = await triggerAd('pop', false);
  if (success && typeof onReward === "function") {
    onReward();
  }
  return success;
}

export function showInAppInterstitial(): boolean {
  if (!monetagReady() || isActiveAd() || activeAdAttemptId !== null) return false;

  setActiveAd(true);
  try {
    const showAd = (window as any).show_11030019;
    showAd({
      type: "inApp",
      inAppSettings: {
        frequency: 1,
        capping: 0.25,
        interval: 120,
        timeout: 15,
        everyPage: false
      }
    });

    // Guard active block for 5 seconds to let the overlay initialize
    setTimeout(() => {
      setActiveAd(false);
      setLastAdClosedTime(Date.now());
    }, 5000);
    return true;
  } catch {
    setActiveAd(false);
    return false;
  }
}

async function playAdSequence(type: AdType, attemptId: string): Promise<boolean> {
  if (!isMonetagReady()) {
    throw new Error("SDK not detected in scope");
  }

  const queue: string[] = [];
  
  if (type === 'pop') {
    queue.push('pop', 'popunder');
    queue.push('rewarded_interstitial', 'rewardedInterstitial', 'rewinterstitial', 'rewarded');
    queue.push('interstitial');
    queue.push('direct', 'directlink');
  } else {
    queue.push('rewarded_interstitial', 'rewardedInterstitial', 'rewinterstitial', 'rewarded');
    queue.push('interstitial');
    queue.push('pop', 'popunder', 'direct', 'directlink');
  }

  const finalQueue = Array.from(new Set(queue));
  let success = false;

  for (const format of finalQueue) {
    try {
      console.log(`[SDK Cascade] Attempting Monetag format: [${format}] for attempt: ${attemptId}`);
      
      if (
        format === 'rewarded_interstitial' || 
        format === 'rewardedInterstitial' || 
        format === 'rewinterstitial' || 
        format === 'rewarded'
      ) {
        try {
          success = await safeShowAdWithTimeout(undefined, 20000);
          if (success) {
            console.log(`[SDK Cascade] Success - empty args rewarded format: [${format}]`);
            break;
          }
        } catch (errEmpty) {
          console.log(`[SDK Cascade] Empty-parameter reward call failed for [${format}]. Trying variations...`);
        }
      }

      success = await safeShowAdWithTimeout(format, 20000);
      if (success) {
        console.log(`[SDK Cascade] Success - string argument format: [${format}]`);
        break;
      }

      success = await safeShowAdWithTimeout({ type: format }, 20000);
      if (success) {
        console.log(`[SDK Cascade] Success - object parameter format: [${format}]`);
        break;
      }
    } catch (e) {
      console.warn(`[SDK Cascade Warn] Format trial error on [${format}] for attempt: ${attemptId}`, e);
    }
  }

  return success;
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
