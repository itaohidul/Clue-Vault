/**
 * AdPacer: Elegant Dynamic Ad Gating Engine
 * - Show one ad instantly at session start (reboot / reload).
 * - Implements a 30 to 60 seconds basic interval (default 45s) between ads.
 * - Dynamically adapts to user engagement: if the user is tapping quickly (high visual density of task actions),
 *   reduce the cooldown down to a minimum of 8 seconds to deliver high-priority popups faster!
 */

export function recordUserTap(): void {
  try {
    const now = Date.now();
    const storedTaps = localStorage.getItem("cluevault_user_taps");
    let tapTimestamps: number[] = storedTaps ? JSON.parse(storedTaps) : [];
    
    // Filter out taps older than 30 seconds to focus on immediate rapid engagement
    tapTimestamps = tapTimestamps.filter(t => now - t < 30000);
    // Add current action timestamp
    tapTimestamps.push(now);
    
    localStorage.setItem("cluevault_user_taps", JSON.stringify(tapTimestamps));
  } catch (e) {
    console.warn("Failed to record engagement metrics:", e);
  }
}

export function checkAdEligibility(): { allowed: boolean; reason: string } {
  try {
    const now = Date.now();
    
    // 1. Show one at start: Check sessionStorage first.
    // sessionStorage resets on reload / restart, guaranteeing that they get an instant ad on first view of the run.
    const runAdShown = sessionStorage.getItem("cluevault_session_ad_shown");
    if (!runAdShown) {
      sessionStorage.setItem("cluevault_session_ad_shown", "true");
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: "First ad of the session allowed instantly." };
    }

    const lastAdTimeStr = localStorage.getItem("cluevault_last_ad_trigger");
    if (!lastAdTimeStr) {
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: "Ad allowed (initialized last ad marker)." };
    }

    // 2. Fetch recent tap metrics for dynamic scaling
    const storedTaps = localStorage.getItem("cluevault_user_taps");
    let tapTimestamps: number[] = storedTaps ? JSON.parse(storedTaps) : [];
    tapTimestamps = tapTimestamps.filter(t => now - t < 30000);
    const tapCount = tapTimestamps.length;

    // 3. Cooldown math matching "medium" speed with acceleration
    // Standard cooldown is 45s. Each recent tap (action) shrinks the cooldown by 6s.
    // If the user is tapping very quickly (e.g. 6 actions), cooldown decreases to 45 - 36 = 9 seconds!
    const baseCooldownMs = 45000;
    const reductionPerTapMs = 6000;
    const dynamicCooldownMs = Math.max(8000, baseCooldownMs - (tapCount * reductionPerTapMs));

    const lastAdTime = parseInt(lastAdTimeStr, 10);
    const elapsed = now - lastAdTime;

    if (elapsed >= dynamicCooldownMs) {
      localStorage.setItem("cluevault_last_ad_trigger", now.toString());
      return { allowed: true, reason: `Ad allowed, cooled down in ${elapsed}ms (dynamic cooldown was ${dynamicCooldownMs}ms)` };
    }

    return { 
      allowed: false, 
      reason: `Ad suppressed of minimum wait limits. Dynamic Cooldown: ${Math.round(dynamicCooldownMs / 1000)}s. Elapsed: ${Math.round(elapsed / 1000)}s.` 
    };
  } catch (e) {
    console.warn("Ad eligibility check fallback:", e);
    return { allowed: true, reason: "Fallback allowance on system error." };
  }
}
