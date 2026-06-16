/**
 * AdPacer: Elegant Dynamic Ad Gacing & Analytics Engine
 * - One unskippable ad allowed instantly at first launch.
 * - Dynamic cooldown intervals between subsequent transitions (45s reduced to 8s during rapid engagements).
 * - Tracks page layouts, active triggers, session metrics, and local analytics offline.
 */

export interface AdAnalytics {
  adsShown: number;
  rewardedAds: number;
  interstitials: number;
  popunders: number;
  sessionDuration: number;
  spins: number;
  tasks: number;
  rewardedFailures: number;
  adQueueDelays: number;
  totalIntervals: number;
  navigationTriggeredAds: number;
}

const sessionStart = Date.now();

// Operational pacing states
let activeAdState = false;
let pendingAdState: string | null = null;
let navigationCounterState = 0;
let sessionAdsState = 0;
let isUiBusyState = false;

// Accessors & Mutators
export function isActiveAd(): boolean {
  return activeAdState;
}

export function setActiveAd(active: boolean): void {
  activeAdState = active;
}

export function getPendingAd(): string | null {
  return pendingAdState;
}

export function setPendingAd(ad: string | null): void {
  pendingAdState = ad;
}

export function getNavigationCounter(): number {
  return navigationCounterState;
}

export function incrementNavigationCounter(): number {
  navigationCounterState++;
  return navigationCounterState;
}

export function resetNavigationCounter(): void {
  navigationCounterState = 0;
}

export function getSessionAds(): number {
  return sessionAdsState;
}

export function incrementSessionAds(): number {
  sessionAdsState++;
  trackAdAnalytics("adsShown", 1);
  return sessionAdsState;
}

export function isUiBusy(): boolean {
  return isUiBusyState;
}

export function setUiBusy(busy: boolean): void {
  console.log(`[Ad Pacer] UI busy channel state updated to: ${busy}`);
  isUiBusyState = busy;
}

export function recordUserTap(): void {
  try {
    const now = Date.now();
    const storedTaps = localStorage.getItem("cluevault_user_taps");
    let tapTimestamps: number[] = storedTaps ? JSON.parse(storedTaps) : [];
    
    // Filter out old taps
    tapTimestamps = tapTimestamps.filter(t => now - t < 30000);
    tapTimestamps.push(now);
    
    localStorage.setItem("cluevault_user_taps", JSON.stringify(tapTimestamps));
  } catch (e) {
    console.warn("Failed to record engagement metrics:", e);
  }
}

export function checkAdEligibility(): { allowed: boolean; reason: string } {
  try {
    const now = Date.now();
    
    // UI Busy locks (e.g. spinning, shop payment, vault decryption)
    if (isUiBusyState) {
      return { allowed: false, reason: "Interruption Protected: Core user interface is processing critical rewards." };
    }

    // 1. Show instantly at first launch check session flag set inside frame
    const runAdShown = sessionStorage.getItem("cluevault_session_ad_shown");
    if (!runAdShown) {
      sessionStorage.setItem("cluevault_session_ad_shown", "true");
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: "First cold start session allocation allowed instantly." };
    }

    const lastAdTimeStr = localStorage.getItem("cluevault_last_ad_trigger");
    if (!lastAdTimeStr) {
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: "First ad initialization fallback allowed." };
    }

    // Fetch dynamic tap frequency mapping
    const storedTaps = localStorage.getItem("cluevault_user_taps");
    let tapTimestamps: number[] = storedTaps ? JSON.parse(storedTaps) : [];
    tapTimestamps = tapTimestamps.filter(t => now - t < 30000);
    const tapCount = tapTimestamps.length;

    // Fast-pacing scaling (45 seconds baseline decreased down to 8s by user action tap metrics)
    const baseCooldownMs = 45000;
    const reductionPerTapMs = 6000;
    const dynamicCooldownMs = Math.max(8000, baseCooldownMs - (tapCount * reductionPerTapMs));

    const lastAdTime = parseInt(lastAdTimeStr, 10);
    const elapsed = now - lastAdTime;

    if (elapsed >= dynamicCooldownMs) {
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: `Ad allowed, cooled down in ${elapsed}ms (dynamic cooldown thresholds was ${dynamicCooldownMs}ms)` };
    }

    return { 
      allowed: false, 
      reason: `Ad pacing suppressed of interval cooldown limitation. Cooldown: ${Math.round(dynamicCooldownMs / 1000)}s. Elapsed: ${Math.round(elapsed / 1000)}s.` 
    };
  } catch (e) {
    console.warn("Ad eligibility check fallback:", e);
    return { allowed: true, reason: "Fallback allowed on metrics parser exception." };
  }
}

// Lightweight Offline analytics ledger stores
export function trackAdAnalytics(key: keyof AdAnalytics, val: number = 1): void {
  try {
    const raw = localStorage.getItem("cluevault_ad_analytics");
    const analytics: AdAnalytics = raw ? JSON.parse(raw) : {
      adsShown: 0,
      rewardedAds: 0,
      interstitials: 0,
      popunders: 0,
      sessionDuration: 0,
      spins: 0,
      tasks: 0,
      rewardedFailures: 0,
      adQueueDelays: 0,
      totalIntervals: 0,
      navigationTriggeredAds: 0
    };

    analytics[key] = (analytics[key] || 0) + val;
    
    // Sync session duration dynamically on any track invocation
    analytics.sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
    
    localStorage.setItem("cluevault_ad_analytics", JSON.stringify(analytics));
  } catch (e) {
    console.warn("Failed to update ad analytics Ledger:", e);
  }
}

export function getAdAnalytics(): AdAnalytics {
  try {
    const raw = localStorage.getItem("cluevault_ad_analytics");
    if (raw) {
      const parsed: AdAnalytics = JSON.parse(raw);
      parsed.sessionDuration = Math.round((Date.now() - sessionStart) / 1000);
      return parsed;
    }
  } catch (e) {}

  return {
    adsShown: 0,
    rewardedAds: 0,
    interstitials: 0,
    popunders: 0,
    sessionDuration: Math.round((Date.now() - sessionStart) / 1000),
    spins: 0,
    tasks: 0,
    rewardedFailures: 0,
    adQueueDelays: 0,
    totalIntervals: 0,
    navigationTriggeredAds: 0
  };
}
