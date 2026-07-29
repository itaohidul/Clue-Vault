// Ad manager and state coordinator for libtl.com Ad SDK with High-CPM Prioritization & Cooldown Protection

export interface AdManagerConfig {
  onAdStart?: () => void;
  onAdEnd?: () => void;
}

// Minimum cooldown in milliseconds between automatic/background ad triggers to prevent ad bombardment (45 seconds)
const AD_COOLDOWN_MS = 45000;

class AdManager {
  private lastAdTime: number = Date.now();
  private isAdActive: boolean = false;
  private timerId: any = null;
  private config: AdManagerConfig = {};

  init(config: AdManagerConfig) {
    this.config = config;
    this.resetTimer();

    // Trigger initial interstitial on app startup after 5 seconds safety margin
    setTimeout(() => {
      this.triggerBackgroundInterstitial();
    }, 5000);

    // Setup checking routine every 2 seconds to check background ad eligibility
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.timerId = setInterval(() => {
      const elapsed = Date.now() - this.lastAdTime;
      // Only trigger auto background ad if at least 60 seconds have passed without ANY ad
      if (elapsed >= 60000) {
        this.triggerBackgroundInterstitial();
      }
    }, 2000);
  }

  // Check if global ad cooldown is active (within 45 seconds of last shown ad)
  public isCooldownActive(): boolean {
    const elapsed = Date.now() - this.lastAdTime;
    return elapsed < AD_COOLDOWN_MS;
  }

  // Get active showAd function, prioritizing new SDK
  private getShowAdFn() {
    const showAdNew = (window as any).show_11301826;
    if (typeof showAdNew === "function") {
      return { fn: showAdNew, isNew: true };
    }
    const showAdOld = (window as any).show_11030019;
    if (typeof showAdOld === "function") {
      return { fn: showAdOld, isNew: false };
    }
    return null;
  }

  // Record manual or incentivized ad view to strictly reset the global 45-60s background cooldown
  recordAdView() {
    this.lastAdTime = Date.now();
    console.log("[AdManager] Ad viewed/recorded. Global 45s cooldown active.");
  }

  // Get remaining seconds until the next automatic background ad
  getRemainingSeconds(): number {
    const elapsed = Date.now() - this.lastAdTime;
    return Math.max(0, Math.ceil((60000 - elapsed) / 1000));
  }

  // Trigger high paying ad format with fallback cascade (High CPM Rewarded Interstitial -> Rewarded Pop -> Direct Link)
  async triggerHighPayingAd(): Promise<boolean> {
    if (this.isAdActive) {
      console.log("[AdManager] Ad session already active, ignoring duplicate call.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();

    try {
      const showAd = this.getShowAdFn();
      if (showAd) {
        // High CPM Priority 1: High Paying Rewarded Interstitial
        try {
          console.log("[AdManager] Attempting High CPM Rewarded Interstitial...");
          const res = showAd.fn();
          if (res && typeof res.then === "function") {
            await res;
          }
          this.recordAdView();
          return true;
        } catch (e) {
          console.warn("[AdManager] Rewarded Interstitial unfulfilled, trying High CPM Pop...", e);
        }

        // High CPM Priority 2: High Paying Rewarded Pop
        try {
          console.log("[AdManager] Attempting High CPM Rewarded Pop...");
          const res = showAd.fn('pop');
          if (res && typeof res.then === "function") {
            await res;
          }
          this.recordAdView();
          return true;
        } catch (e) {
          console.warn("[AdManager] Rewarded Pop unfulfilled, falling back to Direct Link...", e);
        }
      }

      // High CPM Priority 3: Direct Link fallback
      try {
        console.log("[AdManager] Opening High CPM Direct Link Beacon...");
        window.open("https://omg10.com/4/6430252", "_blank");
        this.recordAdView();
        return true;
      } catch (e) {
        console.error("[AdManager] Direct link blocked or failed:", e);
      }

      return true;
    } finally {
      this.isAdActive = false;
      this.config.onAdEnd?.();
    }
  }

  private triggerBackgroundInterstitial() {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping background trigger.");
      return;
    }

    if (this.isCooldownActive()) {
      console.log("[AdManager] Ad cooldown active (<45s since last ad). Skipping background ad.");
      return;
    }

    const showAd = this.getShowAdFn();
    if (!showAd) {
      console.warn("[AdManager] No active SDK show function available yet. Will retry next interval.");
      return;
    }

    console.log(`[AdManager] Triggering background interstitial via ${showAd.isNew ? "new SDK" : "old SDK"}...`);
    this.isAdActive = true;
    this.config.onAdStart?.();

    const safetyTimer = setTimeout(() => {
      if (this.isAdActive) {
        console.warn("[AdManager] Background interstitial safety timeout, unlocking UI.");
        this.isAdActive = false;
        this.config.onAdEnd?.();
      }
    }, 3500);

    const finish = () => {
      clearTimeout(safetyTimer);
      this.isAdActive = false;
      this.config.onAdEnd?.();
    };

    // Invoke interstitial
    try {
      const res = showAd.fn({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 30,
          timeout: 5,
          everyPage: false
        }
      });
      if (res && typeof res.then === "function") {
        res.then(() => {
          console.log("[AdManager] Background interstitial completed.");
          this.recordAdView();
        })
        .catch((err: any) => {
          console.warn("[AdManager] Background interstitial failed:", err);
          this.recordAdView();
        })
        .finally(() => {
          finish();
        });
      } else {
        console.log("[AdManager] Background interstitial resolved synchronously.");
        this.recordAdView();
        finish();
      }
    } catch (e) {
      console.error("[AdManager] Error running background script:", e);
      this.recordAdView();
      finish();
    }
  }

  // In-App Interstitial
  async triggerInAppInterstitial(): Promise<boolean> {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping triggerInAppInterstitial.");
      return false;
    }

    const showAd = this.getShowAdFn();
    if (!showAd) {
      return this.triggerHighPayingAd();
    }

    this.isAdActive = true;
    this.config.onAdStart?.();
    try {
      const res = showAd.fn({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 30,
          timeout: 5,
          everyPage: false
        }
      });
      if (res && typeof res.then === "function") {
        await res;
      }
      this.recordAdView();
      return true;
    } catch (e) {
      console.error("[AdManager] Error triggering inApp interstitial:", e);
      return false;
    } finally {
      this.isAdActive = false;
      this.config.onAdEnd?.();
    }
  }

  // Rewarded Interstitial
  async triggerRewardedInterstitial(): Promise<boolean> {
    return this.triggerHighPayingAd();
  }

  // Rewarded Popup
  async triggerRewardedPopup(): Promise<boolean> {
    return this.triggerHighPayingAd();
  }

  private resetTimer() {
    this.lastAdTime = Date.now();
  }
}

export const adManager = new AdManager();
