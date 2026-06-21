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
      console.warn("[AdManager] SDK show_11030019 function not available on window. Retrying timer.");
      this.recordAdView(); // Reset timer to prevent constant retry loops if offline or blocked
      return;
    }

    console.log("[AdManager] Triggering background interstitial...");
    this.isAdActive = true;
    this.config.onAdStart?.();

    // Invoke interstitial
    try {
      showAdFn()
        .then(() => {
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
    } catch (e) {
      console.error("[AdManager] Error running show_11030019 background script:", e);
      this.recordAdView();
      this.isAdActive = false;
      this.config.onAdEnd?.();
    }
  }

  // In-App Interstitial
  async triggerInAppInterstitial(): Promise<boolean> {
    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.recordAdView();
    try {
      showAdFn({
        type: 'inApp',
        inAppSettings: {
          frequency: 2,
          capping: 0.1,
          interval: 30,
          timeout: 5,
          everyPage: false
        }
      });
      return true;
    } catch (e) {
      console.error("[AdManager] Error triggering inApp interstitial:", e);
      return false;
    }
  }

  // Rewarded Interstitial
  async triggerRewardedInterstitial(): Promise<boolean> {
    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();
    this.recordAdView();

    try {
      await showAdFn();
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
    const showAdFn = (window as any).show_11030019;
    if (typeof showAdFn !== "function") {
      console.warn("[AdManager] show_11030019 is not registered.");
      return false;
    }

    this.isAdActive = true;
    this.config.onAdStart?.();
    this.recordAdView();

    try {
      await showAdFn('pop');
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
