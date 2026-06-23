// Ad manager and state coordinator for libtl.com Ad SDK

export interface AdManagerConfig {
  onAdStart?: () => void;
  onAdEnd?: () => void;
}

class AdManager {
  private lastAdTime: number = Date.now();
  private isAdActive: boolean = false;
  private timerId: any = null;
  private config: AdManagerConfig = {};

  init(config: AdManagerConfig) {
    this.config = config;
    this.resetTimer();

    // Trigger initial interstitial on app startup after 3 seconds safety margin
    setTimeout(() => {
      this.triggerBackgroundInterstitial();
    }, 3000);

    // Setup checking routine every 1 second to see if 60 seconds passed since last ad action
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.timerId = setInterval(() => {
      const elapsed = Date.now() - this.lastAdTime;
      if (elapsed >= 60000) {
        this.triggerBackgroundInterstitial();
      }
    }, 1000);
  }

  // Record manual or incentivized ad view to strictly reset the 60s background timer
  recordAdView() {
    this.lastAdTime = Date.now();
    console.log("[AdManager] Ad viewed/recorded. Background timer reset.");
  }

  // Get remaining seconds until the next automatic background ad
  getRemainingSeconds(): number {
    const elapsed = Date.now() - this.lastAdTime;
    return Math.max(0, Math.ceil((60000 - elapsed) / 1000));
  }

  private triggerBackgroundInterstitial() {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping background trigger.");
      return;
    }

    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] SDK show_11030019 not available yet. Will retry next interval.");
      return;
    }

    console.log("[AdManager] Triggering background interstitial...");
    this.isAdActive = true;
    this.recordAdView(); // Reset timer immediately to prevent instant loops on fail or delay
    this.config.onAdStart?.();

    // Invoke interstitial
    try {
      const res = showAdFn({ type: "interstitial" });
      if (res && typeof res.then === "function") {
        res.then(() => {
          console.log("[AdManager] Background interstitial completed.");
          this.recordAdView();
        })
        .catch((err: any) => {
          console.warn("[AdManager] Background interstitial failed:", err);
          this.recordAdView(); // still reset to avoid spam loops
        })
        .finally(() => {
          this.isAdActive = false;
          this.config.onAdEnd?.();
        });
      } else {
        console.log("[AdManager] Background interstitial resolved synchronously.");
        this.recordAdView();
        this.isAdActive = false;
        this.config.onAdEnd?.();
      }
    } catch (e) {
      console.error("[AdManager] Error running show_11030019 background script:", e);
      this.recordAdView();
      this.isAdActive = false;
      this.config.onAdEnd?.();
    }
  }

  // In-App Interstitial
  async triggerInAppInterstitial(): Promise<boolean> {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping triggerInAppInterstitial.");
      return false;
    }

    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();
    try {
      const res = showAdFn({ type: "interstitial" });
      if (res && typeof res.then === "function") {
        await res;
      }
      this.recordAdView();
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return true;
    } catch (e) {
      console.error("[AdManager] Error triggering inApp interstitial:", e);
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return false;
    }
  }

  // Rewarded Interstitial
  async triggerRewardedInterstitial(): Promise<boolean> {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping triggerRewardedInterstitial.");
      return false;
    }

    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();

    try {
      const res = showAdFn({ type: "rewarded" });
      if (res && typeof res.then === "function") {
        await res;
      }
      this.recordAdView();
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return true;
    } catch (e) {
      console.error("[AdManager] Rewarded interstitial error/closed:", e);
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return false;
    }
  }

  // Rewarded Popup
  async triggerRewardedPopup(): Promise<boolean> {
    if (this.isAdActive) {
      console.log("[AdManager] Ad already active, skipping triggerRewardedPopup.");
      return false;
    }

    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();

    try {
      const res = showAdFn({ type: "popup" });
      if (res && typeof res.then === "function") {
        await res;
      }
      this.recordAdView();
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return true;
    } catch (e) {
      console.error("[AdManager] Rewarded pop error/closed:", e);
      this.isAdActive = false;
      this.config.onAdEnd?.();
      return false;
    }
  }

  private resetTimer() {
    this.lastAdTime = Date.now();
  }
}

export const adManager = new AdManager();
