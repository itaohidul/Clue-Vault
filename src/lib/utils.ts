import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely opens a link, preferring Telegram.WebApp.openLink if available
 * to ensure compatibility inside the Telegram integrated environment.
 */
export function safeOpenLink(url: string) {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg && typeof tg.openLink === "function") {
      tg.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  } catch (e) {
    console.warn("Failed to open link:", e);
    // Fallback
    try {
      window.open(url, "_blank");
    } catch (e2) {}
  }
}
