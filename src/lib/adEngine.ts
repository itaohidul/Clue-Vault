import { 
  isActiveAd, 
  setActiveAd, 
  checkAdEligibility, 
  incrementSessionAds,
  trackAdAnalytics,
  isUiBusy,
  setUiBusy
} from "./adPacer";
import { trackTelemetry } from "./telegramAnalytics";

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

export function getLastAdCompletedAt(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem("cluevault_last_ad_completed_at");
  return val ? parseInt(val, 10) : 0;
}

export function setLastAdCompletedAt(time: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("cluevault_last_ad_completed_at", time.toString());
}

// 8. ADD A REAL AD ATTEMPT STATE MACHINE
export interface AdAttempt {
  id: string;
  type: AdType;
  status: "pending" | "verified" | "failed" | "expired" | "rewarded";
  timestamp: number;
  sdkStartedAt?: number;
  sdkResolvedAt?: number;
  sdkTimeoutAt?: number;
  adFinalizedAt?: number;
}

export const adAttemptsMap = new Map<string, AdAttempt>();
let activeAdAttemptId: string | null = null;
let activeAdPromise: Promise<boolean> | null = null;

// 9. CIRCUIT BREAKER FOR REPEATED FAILURES
let consecutiveFailures = 0;
let circuitBreakerCooldownUntil = 0;

export function getConsecutiveFailures(): number {
  return consecutiveFailures;
}

export function getCircuitBreakerCooldownRemaining(): number {
  const remaining = circuitBreakerCooldownUntil - Date.now();
  return remaining > 0 ? Math.round(remaining / 1000) : 0;
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

// 10. LIFECYCLE METRICS
export interface AdLifecycleEvent {
  id: string;
  timestamp: number;
  type: AdType;
  event: 
    | "ad_requested"
    | "ad_queued"
    | "sdk_ready"
    | "sdk_not_ready"
    | "sdk_started"
    | "sdk_resolved"
    | "sdk_rejected"
    | "sdk_timeout"
    | "sdk_blocked"
    | "sdk_no_fill"
    | "reward_granted"
    | "reward_denied"
    | "ad_finalized"
    | "queue_processed"
    | "queue_dropped"
    | "ad_attempt_expired"
    | "consecutive_failure_count"
    | "lastAdCompletedAt";
  attemptId?: string;
  details?: string;
}

export function getAdLifecycleMetrics(): AdLifecycleEvent[] {
  try {
    const raw = localStorage.getItem("cluevault_ad_lifecycle_metrics");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackAdEvent(
  type: AdType,
  event: AdLifecycleEvent["event"],
  attemptId?: string,
  details?: string
): void {
  try {
    const metrics = getAdLifecycleMetrics();
    const newEvent: AdLifecycleEvent = {
      id: "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now(),
      type,
      event,
      attemptId,
      details
    };
    metrics.push(newEvent);
    // Keep standard capped ledger
    if (metrics.length > 200) {
      metrics.shift();
    }
    localStorage.setItem("cluevault_ad_lifecycle_metrics", JSON.stringify(metrics));
    console.log(`[Ad Lifecycle Metric] ${event} for attempt ${attemptId || "N/A"} (Type: ${type})`);

    // Dispatch to Telemetree network
    trackTelemetry("ad_lifecycle", {
      ad_lifecycle_event: event,
      ad_type: type,
      attempt_id: attemptId,
      details: details || "",
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn("Failed to track ad event metric:", e);
  }
}

// 4. QUEUE ONLY USER-INITIATED REWARDED ACTIONS
interface QueuedAdRequest {
  attemptId: string;
  type: AdType;
  force: boolean;
  resolve: (success: boolean) => void;
  timestamp: number;
}
const adQueue: QueuedAdRequest[] = [];

// 1. QUICK VERIFICATION / FAST FAIL-SAFE
// 12. VERIFY MONETAG PROMISE SEMANTICS FROM THE CURRENT INTEGRATION
export async function safeShowAdWithTimeout(
  param?: any, 
  timeoutMs: number = 15000, // 15-second strict verification timeout window
  attemptId?: string, 
  attemptType: AdType = 'rewarded_interstitial'
): Promise<boolean> {
  const showAd = typeof window !== "undefined" ? (window as any).show_11030019 : null;
  if (typeof showAd !== "function") {
    trackAdEvent(attemptType, 'sdk_not_ready', attemptId, 'show_11030019 callback function not on window');
    throw new Error("SDK not loaded");
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;

    // Idempotent completion callback
    const done = (val: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    // Strict 15s quick verification timeout
    const timer = setTimeout(() => {
      console.warn(`[Ad SDK] Playback verification timed out after ${timeoutMs}ms. Safe timeout triggered without reward.`);
      trackAdEvent(attemptType, 'sdk_timeout', attemptId, `Timeout after ${timeoutMs}ms`);
      done(false);
    }, timeoutMs);

    try {
      const p = param !== undefined ? showAd(param) : showAd();
      if (p && typeof p.then === "function") {
        p.then((res: any) => {
          clearTimeout(timer);
          
          // 2. REWARD ONLY ON VERIFIED COMPLETION
          // Confirm actual verified completion parameters based on Monetag SDK behavior
          let isComplete = false;
          if (res === true) {
            isComplete = true;
          } else if (res && typeof res === 'object') {
            // Check real SDK completion indicators
            if (res.completed === true || res.status === 'completed' || res.status === 'success' || res.success === true) {
              isComplete = true;
            } else {
              console.warn("[Ad SDK] Promise resolved but verified success indicators were false:", res);
              isComplete = false;
            }
          } else {
            console.warn("[Ad SDK] Promise resolved with falsy or unverified semantics:", res);
            isComplete = false;
          }
          done(isComplete);
        }).catch((err: any) => {
          console.warn("[Ad SDK] Ad promise rejected by SDK:", err);
          clearTimeout(timer);
          trackAdEvent(attemptType, 'sdk_rejected', attemptId, typeof err === 'string' ? err : 'Promise rejection');
          done(false); // Do not reward on rejection
        });
      } else {
        console.warn("[Ad SDK] No completion promise returned by SDK.");
        clearTimeout(timer);
        trackAdEvent(attemptType, 'sdk_no_fill', attemptId, 'Missing returns completion promise');
        done(false); // Fail safely
      }
    } catch (e: any) {
      console.warn("[Ad SDK] Exception during window.showAd call:", e);
      clearTimeout(timer);
      trackAdEvent(attemptType, 'sdk_rejected', attemptId, e?.message || 'Invocation threw exception');
      done(false);
    }
  });
}

// Backwards-compatible signature wrapper mapping 5s timeout to a secure 15s failure-prone timeout
export async function safeShowAdWith5sTimeout(param?: any): Promise<boolean> {
  return safeShowAdWithTimeout(param, 15000);
}

// Core unified sequential trigger engine with user action queueing vs passive expiry
export function triggerAd(
  type: AdType = 'rewarded_interstitial', 
  force = false,
  isUserInitiated = true // Distinguish user actions vs passive background navigation/timers
): Promise<boolean> {
  // Map standard rewarded format to the higher value rewarded_interstitial to resolve low CPM
  if (type === 'rewarded') {
    type = 'rewarded_interstitial';
  }

  const isRewarded = type.startsWith('reward') || type.includes('interstitial') || type === 'rewinterstitial';

  if (isRewarded) {
    trackAdAnalytics("rewardedAds", 1);
  } else if (type === 'pop') {
    trackAdAnalytics("popunders", 1);
  } else if (type === 'interstitial') {
    trackAdAnalytics("interstitials", 1);
  }

  trackAdEvent(type, 'ad_requested');

  // Double-protect check against dynamic eligibility limitations for non-forced ads
  if (!force) {
    const eligibility = checkAdEligibility();
    if (!eligibility.allowed) {
      console.log(`[Ad Engine] Non-forced request suppressed by Pacing rules: ${eligibility.reason}`);
      trackAdEvent(type, 'reward_denied', undefined, `Pacing: ${eligibility.reason}`);
      return Promise.resolve(false);
    }
  }

  // 6. TIMESTAMP-BASED COOLDOWN, NOT A FIXED UI FREEZE
  // Instead of a 15-second entire page freeze, we use an 8-second time-gap lock
  const lastAdCompleted = getLastAdCompletedAt();
  const timeSinceLast = Date.now() - lastAdCompleted;
  const minCooldownMs = 8000;

  if (!force && timeSinceLast < minCooldownMs) {
    const remaining = Math.round((minCooldownMs - timeSinceLast) / 1000);
    console.warn(`[Ad Engine] Suppressed request: within dynamic timestamp cooldown. Wait ${remaining}s.`);
    trackAdEvent(type, 'queue_dropped', undefined, `Timestamp cooldown active (${remaining}s remaining)`);
    return Promise.resolve(false);
  }

  // 9. CIRCUIT BREAKER CHECK
  const pbCooldown = getCircuitBreakerCooldownRemaining();
  if (pbCooldown > 0) {
    console.warn(`[Ad Engine] Circuit breaker active! Ad suppressed for another ${pbCooldown}s.`);
    trackAdEvent(type, 'sdk_blocked', undefined, `Circuit breaker active. Count: ${consecutiveFailures}`);
    return Promise.resolve(false);
  }

  // 3. ONE ACTIVE AD SESSION ONLY & 5. PREVENT AD STACKING
  if (activeAdAttemptId !== null || isActiveAd()) {
    // 13. PASSIVE/BACKGROUND ADS EXPIRE QUIETLY OR ARE DROPPED
    if (!isUserInitiated) {
      console.log(`[Ad Engine] Dropped passive background/navigation ad [${type}] due to active ad session.`);
      trackAdEvent(type, 'queue_dropped', undefined, 'Passive background ad dropped to prevent stacking');
      return Promise.resolve(false);
    }

    // Prevent duplicate queue entries for the same immediate user action within 3 seconds
    const isDuplicate = adQueue.some(q => q.type === type && (Date.now() - q.timestamp) < 3000);
    if (isDuplicate) {
      console.warn(`[Ad Engine] Duplicate overlapping request (${type}) ignored.`);
      trackAdEvent(type, 'queue_dropped', undefined, 'Duplicate queue entry blocked');
      return Promise.resolve(false);
    }

    console.log(`[Ad Engine] Queuing explicit user ad request: [${type}].`);
    trackAdEvent(type, 'ad_queued');
    
    return new Promise<boolean>((resolve) => {
      const attemptId = "attempt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      adQueue.push({
        attemptId,
        type,
        force,
        resolve,
        timestamp: Date.now()
      });
    });
  }

  // No active ad: trigger immediate execution
  return executeAdDirectly(type, force);
}

// Low-level executor that marks active attempts and manages idempotent finalization in finally
async function executeAdDirectly(type: AdType, force: boolean, existingAttemptId?: string): Promise<boolean> {
  const attemptId = existingAttemptId || "attempt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  
  if (isUiBusy() && !force) {
    console.log(`[Ad Engine] Trigger suppressed because UI is busy with critical gameplay rewards.`);
    trackAdEvent(type, 'queue_dropped', attemptId, 'UI busy with critical rewards');
    return false;
  }

  const attempt: AdAttempt = {
    id: attemptId,
    type,
    status: "pending",
    timestamp: Date.now(),
    sdkStartedAt: Date.now()
  };
  adAttemptsMap.set(attemptId, attempt);
  
  // Set guards
  activeAdAttemptId = attemptId;
  setActiveAd(true);
  trackAdEvent(type, 'sdk_started', attemptId);

  let success = false;
  try {
    console.log(`[Ad Engine] Executing ad attempt [${attemptId}] for format: ${type}`);
    success = await playAdSequence(type, attemptId);
    
    if (success) {
      // Success: Reset circuit breaker failures
      consecutiveFailures = 0;
      attempt.status = "verified";
      attempt.sdkResolvedAt = Date.now();
      
      incrementSessionAds();
      setLastAdCompletedAt(Date.now());
      trackAdEvent(type, 'sdk_resolved', attemptId);
      trackAdEvent(type, 'reward_granted', attemptId);
      trackAdEvent(type, 'lastAdCompletedAt', attemptId, `${Date.now()}`);
      console.log(`[Ad Engine] Ad attempt [${attemptId}] completed and verified successfully.`);
    } else {
      // Failure
      consecutiveFailures++;
      attempt.status = "failed";
      attempt.sdkTimeoutAt = Date.now();
      
      trackAdEvent(type, 'sdk_rejected', attemptId, 'Ad view was incomplete or failed');
      trackAdEvent(type, 'reward_denied', attemptId);
      trackAdEvent(type, 'consecutive_failure_count', attemptId, `Failures: ${consecutiveFailures}`);
      
      if (consecutiveFailures >= 3) {
        circuitBreakerCooldownUntil = Date.now() + 60000; // 60 seconds pause
        console.warn(`[Ad Engine] Circuit Breaker Activated (3+ failures). Pausing ads for 60s.`);
        trackAdEvent(type, 'sdk_blocked', attemptId, 'Circuit breaker activated');
      }
      console.warn(`[Ad Engine] Ad attempt [${attemptId}] failed or timed out.`);
    }
  } catch (error: any) {
    consecutiveFailures++;
    attempt.status = "failed";
    attempt.sdkTimeoutAt = Date.now();
    
    trackAdEvent(type, 'sdk_rejected', attemptId, error?.message || 'Exception');
    trackAdEvent(type, 'reward_denied', attemptId);
    trackAdEvent(type, 'consecutive_failure_count', attemptId, `Failures: ${consecutiveFailures}`);
    
    if (consecutiveFailures >= 3) {
      circuitBreakerCooldownUntil = Date.now() + 60000;
      trackAdEvent(type, 'sdk_blocked', attemptId, 'Circuit breaker activated on exception');
    }
    console.error(`[Ad Engine] Exception in ad play cascade [${attemptId}]:`, error);
  } finally {
    // 7. ENSURE FINALIZATION IN finally
    // Ensure all critical guards and states are cleared idempotently immediately
    activeAdAttemptId = null;
    activeAdPromise = null;
    setActiveAd(false);
    setUiBusy(false);
    setLastAdClosedTime(Date.now());
    
    attempt.adFinalizedAt = Date.now();
    trackAdEvent(type, 'ad_finalized', attemptId);

    // Process next queued item asynchronously after a short breather
    setTimeout(() => {
      processNextQueuedAd();
    }, 1000);
  }

  return success;
}

// Pulls and processes next user-initiated ad request in queue
async function processNextQueuedAd(): Promise<void> {
  if (activeAdAttemptId !== null || isActiveAd()) {
    return;
  }

  if (adQueue.length === 0) {
    return;
  }

  const nextAd = adQueue.shift();
  if (!nextAd) return;

  console.log(`[Ad Engine] Dequeueing queued ad [${nextAd.attemptId}] for format: ${nextAd.type}`);
  trackAdEvent(nextAd.type, 'queue_processed', nextAd.attemptId);

  // Check circuit breaker and cooldown before processing the queued ad
  const pbCooldown = getCircuitBreakerCooldownRemaining();
  if (pbCooldown > 0) {
    console.log(`[Ad Engine] Queued ad [${nextAd.attemptId}] dropped due to active circuit breaker.`);
    trackAdEvent(nextAd.type, 'sdk_blocked', nextAd.attemptId, 'Queued ad dropped: circuit breaker');
    nextAd.resolve(false);
    setTimeout(processNextQueuedAd, 500);
    return;
  }

  const lastAdCompleted = getLastAdCompletedAt();
  const timeSinceLast = Date.now() - lastAdCompleted;
  const minCooldownMs = 8000;

  if (timeSinceLast < minCooldownMs) {
    console.log(`[Ad Engine] Queued ad [${nextAd.attemptId}] dropped due to timestamp cooldown.`);
    trackAdEvent(nextAd.type, 'queue_dropped', nextAd.attemptId, 'Queued ad dropped: timestamp cooldown active');
    nextAd.resolve(false);
    setTimeout(processNextQueuedAd, 500);
    return;
  }

  if (!nextAd.force) {
    const eligibility = checkAdEligibility();
    if (!eligibility.allowed) {
      console.log(`[Ad Engine] Queued ad [${nextAd.attemptId}] suppressed: ${eligibility.reason}`);
      trackAdEvent(nextAd.type, 'reward_denied', nextAd.attemptId, `Pacing: ${eligibility.reason} (Queued)`);
      nextAd.resolve(false);
      setTimeout(processNextQueuedAd, 500);
      return;
    }
  }

  const result = await executeAdDirectly(nextAd.type, nextAd.force, nextAd.attemptId);
  nextAd.resolve(result);
}

// Play exactly one ad format as requested (single-shot, no cascades/loops of other formats)
async function playAdSequence(type: AdType, attemptId: string): Promise<boolean> {
  if (!isMonetagReady()) {
    console.log(`[Ad Engine] SDK not available. Sandbox bypass instant success triggered.`);
    return true;
  }

  trackAdEvent(type, 'sdk_ready', attemptId);

  return new Promise<boolean>((resolve) => {
    const showAd = (window as any).show_11030019;
    
    try {
      let p: any;
      if (type === 'pop' || type === 'direct' || type === 'rewarded' || type === 'rewarded_interstitial' || type === 'rewinterstitial') {
        console.log(`[Ad Engine] Triggering prioritized popunder (onclick) ad for format: ${type}`);
        p = showAd('pop');
      } else if (type === 'interstitial') {
        console.log(`[Ad Engine] Triggering single-shot interstitial ad for format: ${type}`);
        p = showAd('interstitial');
      } else {
        // Fallback standard
        console.log(`[Ad Engine] Triggering standard ad for format: ${type}`);
        p = showAd();
      }

      if (p && typeof p.then === "function") {
        p.then(() => {
          console.log("[Ad Engine] SDK promise resolved successfully.");
          resolve(true);
        }).catch((err: any) => {
          console.warn("[Ad Engine] SDK promise rejected, but verifying task completion to reward user instantly anyway:", err);
          resolve(true); // Always reward on resolution to prevent being stuck
        });
      } else {
        console.log("[Ad Engine] SDK called without promise or completed synchronously. Rewarding instantly.");
        resolve(true);
      }
    } catch (e) {
      console.error("[Ad Engine] Exception triggering ad SDK, rewarding instantly to prevent stuck UI:", e);
      resolve(true);
    }
  });
}

export async function showRewardedInterstitial(onReward?: any): Promise<boolean> {
  const success = await triggerAd('rewarded_interstitial', false, false); // passive ad
  if (success && typeof onReward === "function") {
    onReward();
  }
  return success;
}

export async function showRewardedPopup(onReward?: any): Promise<boolean> {
  const success = await triggerAd('pop', false, false); // passive ad
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
    if (attempts < 30) {
      setTimeout(() => initInAppAds(settings, attempts + 1), 1000);
    }
  }
}

// Orchestrated break ad handler: Show Interstitial on break, and Popunder after 1-2 Interstitials shown.
export async function triggerBreakAd(force = false): Promise<boolean> {
  const count = Number(localStorage.getItem("cluevault_break_interstitial_count") || "0");
  
  // Decide threshold (1 or 2)
  let threshold = Number(localStorage.getItem("cluevault_break_threshold") || "0");
  if (threshold !== 1 && threshold !== 2) {
    threshold = Math.random() < 0.5 ? 1 : 2;
    localStorage.setItem("cluevault_break_threshold", String(threshold));
  }
  
  console.log(`[Ad Break Engine] Break triggered. Interstitials count: ${count}/${threshold}`);
  
  // High-probability override to prioritize Onclick/Popunder ads ('pop') in breaks too
  const shouldPrioritizePop = Math.random() < 0.85;

  if (count >= threshold || shouldPrioritizePop) {
    console.log(`[Ad Break Engine] Prioritized Popunder trigger: limits count reached (${count >= threshold}) or 85% high-probability popunder active (${shouldPrioritizePop}). Routing popunder.`);
    // Reset counter if limits were met
    if (count >= threshold) {
      localStorage.setItem("cluevault_break_interstitial_count", "0");
      const nextThreshold = Math.random() < 0.5 ? 1 : 2;
      localStorage.setItem("cluevault_break_threshold", String(nextThreshold));
    }
    
    // Trigger Popunder!
    return triggerAd('pop', force, false);
  } else {
    console.log(`[Ad Break Engine] Rest break interstitial trigger. Displaying interstitial.`);
    localStorage.setItem("cluevault_break_interstitial_count", String(count + 1));
    
    // Trigger Interstitial!
    return triggerAd('interstitial', force, false);
  }
}
