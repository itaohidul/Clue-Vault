import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard express app initialization
const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory backend database of players to simulate real server-side records
interface BackendPlayer {
  telegram_id: string;
  username: string;
  first_name: string;
  photo_url: string;
  wallet_address?: string;
  coins: number;
  keys: number;
  fragments: number;
  baseMaterials: number;
  energy: number;
  level: number;
  unlockedTabs: string[];
  referred_by?: string;
  created_at: string;
  rateLimitTokens: number;
  lastRequestTime: number;
}

const playersDb: Record<string, BackendPlayer> = {};
const analyticsLogs: any[] = [];

// Rate Limiter implementation to prevent bot abuses and spam taps
function checkRateLimit(telegramId: string): boolean {
  const now = Date.now();
  const player = playersDb[telegramId];
  if (!player) return true;

  const secondsElapsed = (now - player.lastRequestTime) / 1000;
  // Recharge token bucket (up to 30 requests per minute capacity, refilled at 0.5 tokens/sec)
  player.rateLimitTokens = Math.min(30, player.rateLimitTokens + secondsElapsed * 0.5);
  player.lastRequestTime = now;

  if (player.rateLimitTokens >= 1) {
    player.rateLimitTokens -= 1;
    return true;
  }
  return false;
}

// Cryptographic signature validation for Telegram Init Data
function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  if (!initData || !botToken) return false;
  
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    // Filter out hash and sort parameters alphabetically
    const keys = Array.from(params.keys()).filter((k) => k !== "hash").sort();
    const checkString = keys.map((k) => `${k}=${params.get(k)}`).join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
      
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(checkString)
      .digest("hex");

    return computedHash === hash;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

// Gemini AI Setup
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenAI({ 
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

// Dynamic TonConnect Manifest Endpoint
app.get("/tonconnect-manifest.json", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  res.json({
    url: `${protocol}://${host}`,
    name: "ClueVault",
    iconUrl: `${protocol}://${host}/assets/icon.png`
  });
});

// ==========================================
// 8 & 9. CREATE BACKEND AUTH ROUTE & VALIDATE 
// ==========================================
app.post("/api/auth/telegram", (req, res) => {
  const { initData, referralCode } = req.body;
  if (!initData) {
    return res.status(400).json({ error: "Missing initData parameter" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  let isValid = false;

  if (botToken) {
    isValid = verifyTelegramWebAppData(initData, botToken);
  } else {
    // If no bot token configured, log warning and fallback to success in development mode
    console.warn("TELEGRAM_BOT_TOKEN not set in environment. Bypassing validation check.");
    isValid = true;
  }

  if (!isValid && botToken) {
    return res.status(401).json({ error: "Invalid Telegram signature verification failed" });
  }

  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    if (!userStr) {
      return res.status(400).json({ error: "User object empty in initData" });
    }

    const tgUser = JSON.parse(userStr);
    const tgId = String(tgUser.id);

    // 21 & 24. REFERRAL & ANALYTICS RECORDING
    const existingPlayer = playersDb[tgId];
    if (!existingPlayer) {
      // Create new player record if it doesn't exist
      const referrerId = referralCode || params.get("start_param") || undefined;
      
      playersDb[tgId] = {
        telegram_id: tgId,
        username: tgUser.username || "",
        first_name: tgUser.first_name || "Agent",
        photo_url: tgUser.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser.id}`,
        wallet_address: "",
        coins: 1000, // Initial bonus for registering via Telegram WebApp
        keys: 3,
        fragments: 0,
        baseMaterials: 50,
        energy: 100,
        level: 1.0,
        unlockedTabs: ["daily", "social"],
        referred_by: referrerId,
        created_at: new Date().toISOString(),
        rateLimitTokens: 30,
        lastRequestTime: Date.now(),
      };

      // 21. If referred, credit both players!
      if (referrerId && playersDb[referrerId]) {
        playersDb[referrerId].coins += 2000;
        playersDb[referrerId].keys += 5;
        analyticsLogs.push({
          event: "referral_reward",
          referrer: referrerId,
          referee: tgId,
          timestamp: new Date().toISOString(),
        });
      }

      analyticsLogs.push({
        event: "onboarding_completed",
        telegram_id: tgId,
        username: tgUser.username,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Record session returning event
      analyticsLogs.push({
        event: "session_start",
        telegram_id: tgId,
        timestamp: new Date().toISOString(),
      });
    }

    // Refresh energy if token/bucket states are managed
    const player = playersDb[tgId];
    res.json({
      success: true,
      user: {
        id: player.telegram_id,
        first_name: player.first_name,
        username: player.username,
        photo_url: player.photo_url,
        level: player.level,
      },
      resources: {
        coins: player.coins,
        keys: player.keys,
        fragments: player.fragments,
        baseMaterials: player.baseMaterials,
        energy: player.energy,
        maxEnergy: 100,
      }
    });

  } catch (err: any) {
    console.error("Error authenticating:", err);
    res.status(500).json({ error: "Auth loop failure: " + err.message });
  }
});

// ==========================================
// 22. SECURED GAME/REWARD VALIDATIONS 
// ==========================================
app.post("/api/game/action", (req, res) => {
  const { telegramId, actionType, cost, payload } = req.body;
  if (!telegramId || !playersDb[telegramId]) {
    return res.status(403).json({ error: "Access denied. Register player first." });
  }

  // Check rate limit safety
  if (!checkRateLimit(telegramId)) {
    return res.status(429).json({ error: "Rate limit exceeded. Slow down your actions." });
  }

  const player = playersDb[telegramId];

  if (actionType === "complete_mission") {
    // Validate mission completion on backend
    const rewardedCoins = payload?.coins || 0;
    const mats = payload?.baseMaterials || 0;
    const pieces = payload?.fragments || 0;

    // Reject suspicious amounts
    if (rewardedCoins > 5000 || mats > 100 || pieces > 10) {
      return res.status(400).json({ error: "Validation rule violated. Excessive reward." });
    }

    player.coins += rewardedCoins;
    player.baseMaterials += mats;
    player.fragments += pieces;
    player.level += payload?.xp ? 0.101 : 0;

    analyticsLogs.push({
      event: "mission_complete",
      telegram_id: telegramId,
      rewardedCoins,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, resources: player });
  }

  if (actionType === "purchase") {
    if (player.coins >= cost) {
      player.coins -= cost;
      if (payload?.keys) player.keys += payload.keys;
      if (payload?.baseMaterials) player.baseMaterials += payload.baseMaterials;

      return res.json({ success: true, resources: player });
    } else {
      return res.status(400).json({ error: "Insufficient coins." });
    }
  }

  res.status(400).json({ error: "Action undefined" });
});

// Analytics diagnostics endpoint
app.get("/api/analytics", (req, res) => {
  res.json({
    totalUsers: Object.keys(playersDb).length,
    eventsCount: analyticsLogs.length,
    logs: analyticsLogs.slice(-50), // Last 50 events
  });
});

// API Route for daily clues
app.post("/api/missions/clue", async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    
    const { userLevel, crewType } = req.body;
    
    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Generate a short, mysterious clue for a daily mission in a game called ClueVault. ` +
      `The theme is ${crewType || "stealth"}. The user level is ${userLevel || 1}. ` +
      `Return ONLY a JSON object with fields 'title', 'clue', 'mission_objective'.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate clue" });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
