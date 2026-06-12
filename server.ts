import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { supabase, isSupabaseConfigured } from "./src/lib/supabase";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory fallback dataset (to ensure robust, continuous operation even when Supabase is initializing/credentials are blank)
const localCache = {
  users: new Map<string, any>(),
  tasks: [
    { id: 1, title: "Decrypt Dark Web Intel Folder", reward: 2500, type: "social", link: "https://x.com" },
    { id: 2, title: "Initialize Proxy Connection Protocol", reward: 3750, type: "channel", link: "https://t.me" },
    { id: 3, title: "Verify TON Wallet Integration", reward: 7500, type: "wallet", link: "https://ton.org" },
    { id: 4, title: "Solve Cyber Crypt Riddle Challenge", reward: 10000, type: "riddle", link: "" }
  ],
  user_tasks: [] as Array<{ telegram_id: string; task_id: number; completed: boolean }>,
  transactions: [] as Array<{ id: number; telegram_id: string; amount: number; type: string; created_at: string }>
};

// Help seed simulated users for leaderboard fallback
localCache.users.set("anon_alpha", { telegram_id: "anon_alpha", username: "Agent Alpha", balance: 125000, referral_code: "ref_alpha", referred_by: null, state_json: { user: { name: "Agent Alpha", level: 42, exp: 8400 }, resources: { coins: 125000, keys: 12 } } });
localCache.users.set("anon_omega", { telegram_id: "anon_omega", username: "Agent Omega", balance: 98000, referral_code: "ref_omega", referred_by: null, state_json: { user: { name: "Agent Omega", level: 38, exp: 7600 }, resources: { coins: 98000, keys: 9 } } });
localCache.users.set("anon_cipher", { telegram_id: "anon_cipher", username: "Cipher Ghost", balance: 84000, referral_code: "ref_cipher", referred_by: "ref_alpha", state_json: { user: { name: "Cipher Ghost", level: 35, exp: 7000 }, resources: { coins: 84000, keys: 8 } } });

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Telegram MiniApp Telemetry Tracking Proxy Endpoint
app.post("/api/analytics/track", (req, res) => {
  const { eventName, params, user, timestamp } = req.body;
  console.log(`\x1b[35m[TELEMETRY PIPELINE]\x1b[0m Event: "${eventName}" | User: ${user?.username || user?.first_name || "anon"} (${user?.id || "N/A"})`);
  if (params && Object.keys(params).length > 0) {
    console.log(`\x1b[35m[TELEMETRY PIPELINE]\x1b[0m Payload:`, JSON.stringify(params));
  }
  
  // Optionally push to local cache for admin inspections
  if (!(localCache as any).analytics) {
    (localCache as any).analytics = [];
  }
  (localCache as any).analytics.push({ eventName, params, user, timestamp: timestamp || new Date().toISOString() });

  // Safe background REST forwarding to the user's live Telemetree Cloud Dashboard
  const TELEMETREE_API_KEY = process.env.VITE_TELEMETREE_API_KEY || "eyJhcHBfbmFtZSI6ImNsdWV2YXVsdCIsImFwcF91cmwiOiJodHRwczovL3QubWUvY2x1ZXZhdWx0Ym90IiwiYXBwX2RvbWFpbiI6Imh0dHBzOi8vY2x1ZS12YXVsdC52ZXJjZWwuYXBwLyJ9!6Y2ufwQNDoAHOR3+U+W/dtYypxTxe5zw8UxBWh11OXc=";
  if (TELEMETREE_API_KEY) {
    fetch("https://api.telemetree.io/api/v1/event", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": TELEMETREE_API_KEY
      },
      body: JSON.stringify({
        event: eventName,
        event_name: eventName,
        properties: {
          ...params,
          username: user?.username || "anonymous",
          first_name: user?.first_name || "anonymous",
          platform: user?.platform || "telegram",
        },
        user_id: user?.id?.toString() || "unknown",
        session_id: `session_${user?.id || "unknown_session"}`,
        timestamp: timestamp || new Date().toISOString()
      })
    })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        console.warn(`[TELEMETRY PIPELINE] Forward warning: Status ${response.status} - ${text}`);
      } else {
        console.log(`[TELEMETRY PIPELINE] Event successfully uploaded to Telemetree!`);
      }
    })
    .catch((err) => {
      console.warn("[TELEMETRY PIPELINE] Fail to push event to Telemetree REST API:", err.message || err);
    });
  }
  
  res.json({ success: true, logged: true });
});

// Supabase Connection Status Helper
app.post("/api/auth/telegram", async (req, res) => {
  const { initData } = req.body;
  
  // Minimal satisfying response for the front-end userStore sync protocol
  // In a real app, this would validate the initData via bot token hash
  try {
    // If we have Telegram data, extract user ID for basic handshake
    const params = new URLSearchParams(initData);
    const userStr = params.get("user");
    const user = userStr ? JSON.parse(userStr) : null;

    res.json({
      success: true,
      user: user || { id: "anon", first_name: "Guest" },
      message: "Handshake established"
    });
  } catch (e) {
    res.status(400).json({ error: "Invalid handshake signal" });
  }
});

app.get("/api/db-verify", async (req, res) => {
  const url_configured = isSupabaseConfigured;
  if (!url_configured) {
    return res.json({
      hasUri: false,
      readyState: 0,
      dbName: "Supabase Configuration Missing",
      urlConfigured: false,
      warning: "Supabase environment variables are not set or contain placeholders. Using local server-side cache fallback."
    });
  }
  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    res.json({
      hasUri: true,
      readyState: 1,
      dbName: "Supabase Active Cluster",
      urlConfigured: true
    });
  } catch (err: any) {
    res.json({
      hasUri: false,
      readyState: 0,
      dbName: "Supabase Connection Pending",
      urlConfigured: true,
      errorDetail: err.message || err.details || String(err),
      hint: err.hint || "Make sure you ran the SQL setup script to create the 'users' table in your Supabase DB, and that Row Level Security (RLS) is configured correctly.",
      warning: "Using secure serverless memory cache (local sandbox fallback). Please supply NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to sync to live database."
    });
  }
});

app.get("/api/db-status", async (req, res) => {
  const url_configured = isSupabaseConfigured;
  if (!url_configured) {
    return res.json({ 
      connected: false, 
      database: "Encrypted Cloud Memory Fallback (Configuration Missing)", 
      urlConfigured: false 
    });
  }
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    res.json({ 
      connected: true, 
      database: "Supabase PostgreSQL Database", 
      urlConfigured: true 
    });
  } catch (err: any) {
    res.json({ 
      connected: false, 
      database: "Encrypted Cloud Memory Fallback", 
      urlConfigured: true,
      errorDetail: err.message || err.details || String(err),
      hint: err.hint || "Make sure the 'users' table is created and RLS is disabled or allowed for public anon requests."
    });
  }
});

// Startup Handshake Endpoint (Consolidates 5 API requests into 1 for mobile connectivity)
app.get("/api/startup/:userId", async (req, res) => {
  const { userId } = req.params;
  const usernameQuery = (req.query.username as string) || "Agent_" + userId.slice(-4);
  let referredByCode = req.query.referredBy as string;
  if (referredByCode && referredByCode.startsWith("ref_ref_")) {
    referredByCode = referredByCode.substring(4);
  }

  const responsePayload: any = {
    dbConnected: false,
    user: null,
    tasks: [],
    completedTaskIds: [],
    transactions: [],
    source: "Supabase Live Connection"
  };

  try {
    if (!isSupabaseConfigured) throw new Error("Supabase is not configured. Falling back to local cache.");

    // 1. Get/Register User State
    let user = null;
    let registeredNow = false;

    try {
      const { data: dbUser, error: fetchErr } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", userId)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      user = dbUser;
    } catch (dbErr: any) {
      console.warn("[Handshake DB] Read user state deferred:", dbErr.message);
    }

    if (user) {
      let stateJson = user.state_json || user;
      if (typeof stateJson === "string") {
        try { stateJson = JSON.parse(stateJson); } catch (e) {}
      }
      stateJson = await compileUserPayloadWithLiveReferrals(stateJson, user.referral_code);
      responsePayload.user = stateJson;
      responsePayload.dbConnected = true;
    } else {
      // Auto register
      const referralCode = `ref_${userId.substring(0, 8)}`;
      const initialBalance = referredByCode ? 2500 : 1000;
      const seedState = {
        user: {
          name: usernameQuery,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          level: 1,
          exp: 0,
          referCount: 0,
          referralCode,
          referredBy: referredByCode || null,
          onboarded: false,
        },
        resources: {
          coins: initialBalance,
          keys: 5,
          clue: 0,
        },
        purchases: [],
        crew: null,
        base: { level: 1, energy: 100 },
        unlockedTabs: ["daily"],
        riddleState: { activeRiddleId: null, unlockedParts: 0 }
      };

      try {
        const { data: newUser, error: insertError } = await supabase
          .from("users")
          .insert([{
            telegram_id: userId,
            username: usernameQuery,
            balance: initialBalance,
            referral_code: referralCode,
            referred_by: referredByCode || null,
            state_json: seedState
          }])
          .select()
          .maybeSingle();

        if (insertError) throw insertError;
        user = newUser;
        let stateJson = newUser?.state_json || seedState;
        if (typeof stateJson === "string") {
          try { stateJson = JSON.parse(stateJson); } catch (e) {}
        }
        stateJson = await compileUserPayloadWithLiveReferrals(stateJson, newUser?.referral_code || referralCode);
        responsePayload.user = stateJson;
        responsePayload.dbConnected = true;
        registeredNow = true;

        // Referrer bonuses
        if (referredByCode) {
          const referrer = await findReferrerByCode(referredByCode);

          if (referrer) {
            const bonus = 5000;
            const updatedReferrerState = { ...referrer.state_json };
            if (updatedReferrerState.resources) {
              updatedReferrerState.resources.coins = (updatedReferrerState.resources.coins || 0) + bonus;
            }
            if (updatedReferrerState.user) {
              if (!updatedReferrerState.user.referrals) {
                updatedReferrerState.user.referrals = [];
              }
              const newAgent = {
                id: "agent_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
                name: usernameQuery,
                avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${usernameQuery}`,
                status: "unverified",
                consecutiveDays: 0,
                missionsToday: 0,
                lastActiveDate: new Date().toISOString().split('T')[0],
                joinedAt: new Date().toISOString()
              };
              updatedReferrerState.user.referrals.push(newAgent);
              updatedReferrerState.user.referCount = updatedReferrerState.user.referrals.length;
            }

            await supabase
              .from("users")
              .update({
                balance: (referrer.balance || 0) + bonus,
                state_json: updatedReferrerState
              })
              .eq("telegram_id", referrer.telegram_id);

            await supabase.from("transactions").insert([{
              telegram_id: referrer.telegram_id,
              amount: bonus,
              type: "referral_bonus"
            }]);
          }
        }

        // Welcome package transaction
        await supabase.from("transactions").insert([{
          telegram_id: userId,
          amount: initialBalance,
          type: "welcome_package"
        }]);

      } catch (regErr: any) {
        console.warn("[Handshake DB] Registration fail, falling back to cached user:", regErr.message);
      }
    }

    // 2. Fetch Tasks (Auto seeds if empty)
    try {
      let { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("id", { ascending: true });

      if (tasksError) throw tasksError;

      if (!tasks || tasks.length === 0) {
        const defaultTasks = [
          { title: "Deface Syndicate Access Terminal", reward: 1250, type: "social", link: "https://x.com" },
          { title: "Subscribe to CipherNet Intel Hub", reward: 2500, type: "channel", link: "https://t.me" },
          { title: "Authorize Safe Ledger Gateway", reward: 6000, type: "wallet", link: "https://ton.org" },
          { title: "Solve Cryptography Riddle Challenge", reward: 7500, type: "riddle", link: "" }
        ];

        const { data: seeded } = await supabase
          .from("tasks")
          .insert(defaultTasks)
          .select();
        tasks = seeded || defaultTasks;
      }
      responsePayload.tasks = tasks;
    } catch (tskErr: any) {
      console.warn("[Handshake DB] Read tasks fail:", tskErr.message);
      responsePayload.tasks = localCache.tasks;
    }

    // 3. Fetch Completed Tasks IDs
    try {
      const { data: compData, error: compDbErr } = await supabase
        .from("user_tasks")
        .select("task_id")
        .eq("telegram_id", userId);

      if (compDbErr) throw compDbErr;
      responsePayload.completedTaskIds = compData.map(item => item.task_id);
    } catch (cmpErr: any) {
      console.warn("[Handshake DB] Read completions fail:", cmpErr.message);
      responsePayload.completedTaskIds = localCache.user_tasks
        .filter(ut => ut.telegram_id === userId)
        .map(ut => ut.task_id);
    }

    // 4. Fetch User Transactions
    try {
      const { data: txData, error: txDbErr } = await supabase
        .from("transactions")
        .select("*")
        .eq("telegram_id", userId)
        .order("created_at", { ascending: false });

      if (txDbErr) throw txDbErr;
      responsePayload.transactions = txData || [];
    } catch (txErr: any) {
      console.warn("[Handshake DB] Read transactions fail:", txErr.message);
      responsePayload.transactions = localCache.transactions
        .filter(t => t.telegram_id === userId)
        .sort((a, b) => b.id - a.id);
    }

    // 5. If everything failed to fetch but we can support offline
    if (!responsePayload.user) {
      throw new Error("No database records accessible");
    }

    return res.json(responsePayload);

  } catch (globalErr: any) {
    console.warn(`[Startup Handshake API] Service degradation fallback triggered:`, globalErr.message);
    
    // In-Memory Fallback Implementation
    let cachedUser = localCache.users.get(userId);
    if (!cachedUser) {
      const referralCode = `ref_${userId.substring(0, 8)}`;
      const initialBalance = referredByCode ? 2500 : 1000;
      const seedState = {
        user: {
          name: usernameQuery,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
          level: 1,
          exp: 0,
          referCount: 0,
          referralCode,
          referredBy: referredByCode || null,
        },
        resources: {
          coins: initialBalance,
          keys: 5,
          clue: 0,
        },
        purchases: [],
        crew: null,
        base: { level: 1, energy: 100 },
        unlockedTabs: ["daily"],
        riddleState: { activeRiddleId: null, unlockedParts: 0 }
      };

      cachedUser = {
        telegram_id: userId,
        username: usernameQuery,
        balance: initialBalance,
        referral_code: referralCode,
        referred_by: referredByCode || null,
        state_json: seedState
      };
      localCache.users.set(userId, cachedUser);

      localCache.transactions.push({
        id: Date.now(),
        telegram_id: userId,
        amount: initialBalance,
        type: "welcome_package",
        created_at: new Date().toISOString()
      });

      if (referredByCode) {
        for (const [key, value] of localCache.users.entries()) {
          if (value.referral_code === referredByCode) {
            value.balance += 5000;
            if (value.state_json.resources) {
              value.state_json.resources.coins += 5000;
            }
            if (value.state_json.user) {
              if (!value.state_json.user.referrals) {
                value.state_json.user.referrals = [];
              }
              const newAgent = {
                id: "agent_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
                name: usernameQuery,
                avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${usernameQuery}`,
                status: "unverified",
                consecutiveDays: 0,
                missionsToday: 0,
                lastActiveDate: new Date().toISOString().split('T')[0],
                joinedAt: new Date().toISOString()
              };
              value.state_json.user.referrals.push(newAgent);
              value.state_json.user.referCount = value.state_json.user.referrals.length;
            }
            localCache.transactions.push({
              id: Date.now() + 1,
              telegram_id: value.telegram_id,
              amount: 5000,
              type: "referral_bonus",
              created_at: new Date().toISOString()
            });
            break;
          }
        }
      }
    }

    let stateJson = cachedUser.state_json;
    if (typeof stateJson === "string") {
      try { stateJson = JSON.parse(stateJson); } catch (e) {}
    }
    stateJson = await compileUserPayloadWithLiveReferrals(stateJson, cachedUser.referral_code);

    return res.json({
      dbConnected: false,
      user: stateJson,
      tasks: localCache.tasks,
      completedTaskIds: localCache.user_tasks.filter(ut => ut.telegram_id === userId).map(ut => ut.task_id),
      transactions: localCache.transactions.filter(t => t.telegram_id === userId).sort((a, b) => b.id - a.id),
      source: "Offline Memory Cache"
    });
  }
});

// Search and recover users for account restoration
app.get("/api/users/search", async (req, res) => {
  const { query } = req.query;
  try {
    if (!query || String(query).trim().length < 2) {
      // Return top 15 players as recovery suggestions
      const { data, error } = await supabase
        .from("users")
        .select("telegram_id, username, balance, state_json, created_at")
        .order("balance", { ascending: false })
        .limit(15);
      if (error) throw error;
      return res.json(data || []);
    }

    const { data, error } = await supabase
      .from("users")
      .select("telegram_id, username, balance, state_json, created_at")
      .ilike("username", `%${String(query).trim()}%`)
      .limit(15);
    
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error("[Search Users API] Error:", err.message);
    const results = [];
    const lowerQuery = String(query || "").trim().toLowerCase();
    for (const [id, value] of localCache.users.entries()) {
      if (!lowerQuery || value.username.toLowerCase().includes(lowerQuery)) {
        results.push({
          telegram_id: value.telegram_id,
          username: value.username,
          balance: value.balance,
          state_json: value.state_json
        });
      }
    }
    res.json(results.slice(0, 15));
  }
});

// Helper utilities for real-time live referrals
async function findReferrerByCode(code: string) {
  if (!code) return null;
  const codesToTry = [code];
  if (code.startsWith("ref_ref_")) {
    codesToTry.push(code.substring(4));
  } else if (code.startsWith("ref_")) {
    codesToTry.push(code.substring(4));
  } else {
    codesToTry.push("ref_" + code);
  }
  
  for (const c of codesToTry) {
    try {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("referral_code", c)
        .maybeSingle();
      if (data) return data;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

function findInMemoryReferrerByCode(code: string) {
  if (!code) return null;
  const codesToTry = [code];
  if (code.startsWith("ref_ref_")) {
    codesToTry.push(code.substring(4));
  } else if (code.startsWith("ref_")) {
    codesToTry.push(code.substring(4));
  } else {
    codesToTry.push("ref_" + code);
  }

  for (const c of codesToTry) {
    for (const [key, value] of localCache.users.entries()) {
      if (value.referral_code === c) return value;
    }
  }
  return null;
}

async function getLiveReferrals(referralCode: string): Promise<any[]> {
  try {
    const { data: referredUsers, error } = await supabase
      .from("users")
      .select("telegram_id, username, created_at, state_json")
      .eq("referred_by", referralCode);

    if (error) {
      console.warn("[getLiveReferrals] Failed to query live referrals:", error.message);
      return [];
    }

    const liveReferrals: any[] = [];
    if (referredUsers && referredUsers.length > 0) {
      referredUsers.forEach((ru: any) => {
        let uState = ru.state_json || {};
        if (typeof uState === "string") {
          try {
            uState = JSON.parse(uState);
          } catch (e) {
            uState = {};
          }
        }
        const uUser = uState.user || {};
        const consecutiveDays = uUser.referredConsecutiveDays || 0;
        const missionsToday = uUser.referredMissionsToday || 0;
        const vaultsToday = uUser.referredVaultsToday || 0;
        const status = consecutiveDays >= 7 ? "verified" : "unverified";
        const crewName = uState.crew?.name || uUser.crew || null;

        liveReferrals.push({
          id: ru.telegram_id,
          name: ru.username || uUser.name || `Agent_${ru.telegram_id.slice(-4)}`,
          avatar: uUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${ru.telegram_id}`,
          status: status,
          consecutiveDays: consecutiveDays,
          missionsToday: missionsToday,
          vaultsToday: vaultsToday,
          lastActiveDate: uUser.lastActiveDate || new Date().toISOString().split('T')[0],
          joinedAt: uUser.joinedAt || ru.created_at || new Date().toISOString(),
          crewName: crewName,
          isSimulated: false
        });
      });
    }

    return liveReferrals;
  } catch (err: any) {
    console.warn("[getLiveReferrals] Error:", err.message || err);
    return [];
  }
}

function getInMemoryLiveReferrals(referralCode: string): any[] {
  const liveReferrals: any[] = [];
  for (const [key, value] of localCache.users.entries()) {
    if (value.referred_by === referralCode) {
      let uState = value.state_json || {};
      if (typeof uState === "string") {
        try {
          uState = JSON.parse(uState);
        } catch (e) {
          uState = {};
        }
      }
      const uUser = uState.user || {};
      const consecutiveDays = uUser.referredConsecutiveDays || 0;
      const missionsToday = uUser.referredMissionsToday || 0;
      const vaultsToday = uUser.referredVaultsToday || 0;
      const status = consecutiveDays >= 7 ? "verified" : "unverified";
      const crewName = uState.crew?.name || uUser.crew || null;

      liveReferrals.push({
        id: value.telegram_id,
        name: value.username || uUser.name || `Agent_${value.telegram_id.slice(-4)}`,
        avatar: uUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${value.telegram_id}`,
        status: status,
        consecutiveDays: consecutiveDays,
        missionsToday: missionsToday,
        vaultsToday: vaultsToday,
        lastActiveDate: uUser.lastActiveDate || new Date().toISOString().split('T')[0],
        joinedAt: uUser.joinedAt || value.created_at || new Date().toISOString(),
        crewName: crewName,
        isSimulated: false
      });
    }
  }
  return liveReferrals;
}

async function compileUserPayloadWithLiveReferrals(stateJson: any, referralCode: string) {
  if (!stateJson) return stateJson;
  if (!stateJson.user) stateJson.user = {};
  
  const refCode = referralCode || stateJson.user.referralCode || `ref_${stateJson.user.id || ""}`;
  const liveRefs = await getLiveReferrals(refCode);
  const localMemoryRefs = getInMemoryLiveReferrals(refCode);

  const combinedLive = [...liveRefs];
  localMemoryRefs.forEach(mr => {
    if (!combinedLive.some(cl => cl.id === mr.id)) {
      combinedLive.push(mr);
    }
  });

  const currentSimulated = (stateJson.user.referrals || []).filter((r: any) => r.isSimulated);
  const mergedRefs = [...combinedLive, ...currentSimulated];
  stateJson.user.referrals = mergedRefs;
  stateJson.user.referCount = combinedLive.filter(r => !r.isSimulated).length;

  return stateJson;
}

// Handle local in-memory fallback for user registration and fetching
async function handleUserFallback(req: any, res: any, userId: string, usernameQuery: string, referredByCode?: string) {
  let cachedUser = localCache.users.get(userId);
  if (!cachedUser) {
    const referralCode = `ref_${userId.substring(0, 8)}`;
    const initialBalance = referredByCode ? 2500 : 1000;
    const seedState = {
      user: {
        name: usernameQuery,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        level: 1,
        exp: 0,
        referCount: 0,
        referralCode,
        referredBy: referredByCode || null,
        onboarded: false,
      },
      resources: {
        coins: initialBalance,
        keys: 5,
        clue: 0,
      },
      purchases: [],
      crew: null,
      base: { level: 1, energy: 100 },
      unlockedTabs: ["daily"],
      riddleState: { activeRiddleId: null, unlockedParts: 0 }
    };

    cachedUser = {
      telegram_id: userId,
      username: usernameQuery,
      balance: initialBalance,
      referral_code: referralCode,
      referred_by: referredByCode || null,
      state_json: seedState
    };
    localCache.users.set(userId, cachedUser);

    // Save transactions locally
    localCache.transactions.push({
      id: Date.now(),
      telegram_id: userId,
      amount: initialBalance,
      type: "welcome_package",
      created_at: new Date().toISOString()
    });

    if (referredByCode) {
      for (const [key, value] of localCache.users.entries()) {
        if (value.referral_code === referredByCode) {
          value.balance += 5000;
          if (value.state_json.resources) {
            value.state_json.resources.coins += 5000;
          }
          if (value.state_json.user) {
            if (!value.state_json.user.referrals) {
              value.state_json.user.referrals = [];
            }
            const newAgent = {
              id: "agent_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
              name: usernameQuery,
              avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${usernameQuery}`,
              status: "unverified",
              consecutiveDays: 0,
              missionsToday: 0,
              lastActiveDate: new Date().toISOString().split('T')[0],
              joinedAt: new Date().toISOString()
            };
            value.state_json.user.referrals.push(newAgent);
            value.state_json.user.referCount = value.state_json.user.referrals.length;
          }
          localCache.transactions.push({
            id: Date.now() + 1,
            telegram_id: value.telegram_id,
            amount: 5000,
            type: "referral_bonus",
            created_at: new Date().toISOString()
          });
          break;
        }
      }
    }
  }

  // Ensure live referral data is merged even in fallback mode
  const compiledState = await compileUserPayloadWithLiveReferrals(cachedUser.state_json, cachedUser.referral_code);
  return res.json(compiledState);
}

// Get User State (Auto-Registration + Referral Tracker)
app.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const usernameQuery = (req.query.username as string) || "Agent_" + userId.slice(-4);
  let referredByCode = req.query.referredBy as string;
  if (referredByCode && referredByCode.startsWith("ref_ref_")) {
    referredByCode = referredByCode.substring(4);
  }
  
  if (!isSupabaseConfigured) {
    console.warn("[API User] Supabase not configured, using local fallback");
    // Jump straight to the fallback logic
    return handleUserFallback(req, res, userId, usernameQuery, referredByCode);
  }

  try {
    // Attempt Supabase fetch
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId)
      .maybeSingle();

    if (error) {
      // Quietly fall through if table doesn't exist
      throw error;
    }

    if (user) {
      let stateJson = user.state_json || user;
      if (typeof stateJson === "string") {
        try { stateJson = JSON.parse(stateJson); } catch (e) {}
      }
      stateJson = await compileUserPayloadWithLiveReferrals(stateJson, user.referral_code);
      return res.json(stateJson);
    }

    // Insert user (Auto Registration)
    const referralCode = `ref_${userId.substring(0, 8)}`;
    const initialBalance = referredByCode ? 2500 : 1000;
    
    // Seed default state object
    const seedState = {
      user: {
        name: usernameQuery,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        level: 1,
        exp: 0,
        referCount: 0,
        referralCode,
        referredBy: referredByCode || null,
        onboarded: false,
      },
      resources: {
        coins: initialBalance,
        keys: 5,
        clue: 0,
      },
      purchases: [],
      crew: null,
      base: { level: 1, energy: 100 },
      unlockedTabs: ["daily"],
      riddleState: { activeRiddleId: null, unlockedParts: 0 }
    };

    // Attempt insert into Supabase
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{
        telegram_id: userId,
        username: usernameQuery,
        balance: initialBalance,
        referral_code: referralCode,
        referred_by: referredByCode || null,
        state_json: seedState
      }])
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    // Handle Referral bonuses
    if (referredByCode) {
      const { data: referrer, error: refError } = await supabase
        .from("users")
        .select("*")
        .eq("referral_code", referredByCode)
        .maybeSingle();

      if (referrer) {
        // Boost referrer balance
        const bonus = 5000;
        const updatedReferrerState = { ...referrer.state_json };
        if (updatedReferrerState.resources) {
          updatedReferrerState.resources.coins = (updatedReferrerState.resources.coins || 0) + bonus;
        }
        if (updatedReferrerState.user) {
          if (!updatedReferrerState.user.referrals) {
            updatedReferrerState.user.referrals = [];
          }
          const newAgent = {
            id: "agent_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
            name: usernameQuery,
            avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${usernameQuery}`,
            status: "unverified",
            consecutiveDays: 0,
            missionsToday: 0,
            lastActiveDate: new Date().toISOString().split('T')[0],
            joinedAt: new Date().toISOString()
          };
          updatedReferrerState.user.referrals.push(newAgent);
          updatedReferrerState.user.referCount = updatedReferrerState.user.referrals.length;
        }

        await supabase
          .from("users")
          .update({
            balance: (referrer.balance || 0) + bonus,
            state_json: updatedReferrerState
          })
          .eq("telegram_id", referrer.telegram_id);

        // Track Reward Transaction
        await supabase.from("transactions").insert([{
          telegram_id: referrer.telegram_id,
          amount: bonus,
          type: "referral_bonus"
        }]);
      }
    }

    // Track Welcome Transaction
    await supabase.from("transactions").insert([{
      telegram_id: userId,
      amount: initialBalance,
      type: "welcome_package"
    }]);

    return res.json(newUser?.state_json || seedState);

  } catch (err: any) {
    console.error(`[Supabase Error] Critical error during user state fetch/registration for user ${userId}:`, {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    if (err.message?.includes("row-level security") || err.code === "42501" || String(err.message).includes("permission denied")) {
      console.warn(`[Supabase RLS Alert] Row Level Security (RLS) is blocking the transaction. Please disable RLS on the 'users', 'tasks', 'user_tasks', and 'transactions' tables, or use the SUPABASE_SERVICE_ROLE_KEY to bypass RLS.`);
    }

    return handleUserFallback(req, res, userId, usernameQuery, referredByCode);
  }
});

// Update/Save Game State
app.post("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const payload = req.body;

  try {
    const { data: dbUser } = await supabase
      .from("users")
      .select("referral_code")
      .eq("telegram_id", userId)
      .maybeSingle();

    const refCode = dbUser?.referral_code || payload.user?.referralCode || `ref_${userId.substring(0, 8)}`;
    await compileUserPayloadWithLiveReferrals(payload, refCode);

    const updatedBalance = payload.ZP ?? payload.resources?.coins ?? 0;
    const updateObj: Record<string, any> = {
      balance: updatedBalance,
      state_json: payload
    };
    if (payload.user?.name) {
      updateObj.username = payload.user.name;
    }

    const { error } = await supabase
      .from("users")
      .update(updateObj)
      .eq("telegram_id", userId);

    if (error) throw error;
    res.json({ success: true, message: "Saved to Supabase database" });

  } catch (err: any) {
    console.error(`[Supabase Error] Error during saving state for user ${userId}:`, {
      message: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code
    });
    if (err.message?.includes("row-level security") || err.code === "42501" || String(err.message).includes("permission denied")) {
      console.warn(`[Supabase RLS Alert] Row Level Security (RLS) is blocking state save. Please run the provided SQL script to block RLS constraints, or setup SUPABASE_SERVICE_ROLE_KEY.`);
    }
    
    const cachedUser = localCache.users.get(userId) || {};
    const refCode = cachedUser.referral_code || payload.user?.referralCode || `ref_${userId.substring(0, 8)}`;
    const localMemoryRefs = getInMemoryLiveReferrals(refCode);
    const currentSimulated = (payload.user?.referrals || []).filter((r: any) => r.isSimulated);
    const combinedLive = [...localMemoryRefs];
    const mergedRefs = [...combinedLive, ...currentSimulated];

    if (payload.user) {
      payload.user.referrals = mergedRefs;
      payload.user.referCount = combinedLive.length;
    }

    localCache.users.set(userId, {
      ...cachedUser,
      telegram_id: userId,
      username: payload.user?.name || cachedUser.username || "Agent_" + userId.slice(-4),
      balance: payload.ZP ?? payload.resources?.coins ?? 0,
      state_json: payload
    });

    res.json({ success: true, message: "Backup saved to offline cache" });
  }
});

// Fetch Tasks API (Auto-seeds default tasks if empty)
app.get("/api/tasks", async (req, res) => {
  try {
    let { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      // Auto Seed database with production default missions
      const defaultTasks = [
        { title: "Deface Syndicate Access Terminal", reward: 1250, type: "social", link: "https://x.com" },
        { title: "Subscribe to CipherNet Intel Hub", reward: 2500, type: "channel", link: "https://t.me" },
        { title: "Authorize Safe Ledger Gateway", reward: 6000, type: "wallet", link: "https://ton.org" },
        { title: "Solve Cryptography Riddle Challenge", reward: 7500, type: "riddle", link: "" }
      ];

      const { data: seeded, error: seedError } = await supabase
        .from("tasks")
        .insert(defaultTasks)
        .select();

      if (seedError) throw seedError;
      tasks = seeded || defaultTasks;
    }

    res.json(tasks);
  } catch (err: any) {
    console.warn("[DB Fallback] Fetch tasks fallback to sandbox mock", err.message);
    res.json(localCache.tasks);
  }
});

// Submit / Claim Task Rewards
app.post("/api/tasks/claim", async (req, res) => {
  const { userId, taskId } = req.body;

  if (!userId || !taskId) {
    return res.status(400).json({ error: "Missing parameters userId or taskId" });
  }

  try {
    // 1. Check if task was completed previously
    const { data: completion, error: compCheckErr } = await supabase
      .from("user_tasks")
      .select("*")
      .eq("telegram_id", userId)
      .eq("task_id", taskId)
      .maybeSingle();

    if (completion) {
      return res.status(400).json({ error: "Task already decrypted and claimed!" });
    }

    // 2. Fetch target reward amount
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskErr || !task) {
      throw taskErr || new Error("Task target file not found");
    }

    // 3. Insert task completion flag
    const { error: insertComp } = await supabase
      .from("user_tasks")
      .insert([{
        telegram_id: userId,
        task_id: taskId,
        completed: true
      }]);

    if (insertComp) throw insertComp;

    // 4. Update the user balance in state
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId)
      .maybeSingle();

    if (userErr || !user) throw userErr || new Error("User file decrypted abnormally");

    const rewardCoins = Number(task.reward || 0);
    const rewardKeys = Number(task.reward_keys ?? task.rewardKeys ?? 1);
    const updatedState = { ...user.state_json };
    if (updatedState.resources) {
      updatedState.resources.coins = (updatedState.resources.coins || 0) + rewardCoins;
      updatedState.resources.keys = (updatedState.resources.keys || 0) + rewardKeys;
    }

    // Mark completed task inside state's custom tracker too, in case
    if (!updatedState.completedTaskIds) {
      updatedState.completedTaskIds = [];
    }
    updatedState.completedTaskIds.push(taskId);

    await supabase
      .from("users")
      .update({
        balance: (user.balance || 0) + rewardCoins,
        state_json: updatedState
      })
      .eq("telegram_id", userId);

    // 5. Log Transaction history
    await supabase.from("transactions").insert([{
      telegram_id: userId,
      amount: rewardCoins,
      type: "task_completion"
    }]);

    res.json({ success: true, reward: rewardCoins, rewardKeys });

  } catch (err: any) {
    console.warn("[DB Fallback] Claiming task running offline fallback mode", err.message);

    // Filter completions
    const alreadyCompleted = localCache.user_tasks.some(
      ut => ut.telegram_id === userId && ut.task_id === taskId
    );

    if (alreadyCompleted) {
      return res.status(400).json({ error: "Task already decrypted offline!" });
    }

    const task = localCache.tasks.find(t => t.id === Number(taskId));
    if (!task) {
      return res.status(404).json({ error: "Mission task files corrupt" });
    }

    // Record Completion
    localCache.user_tasks.push({
      telegram_id: userId,
      task_id: Number(taskId),
      completed: true
    });

    // Update Cache account balance
    const user = localCache.users.get(userId);
    const rewardKeys = Number((task as any).reward_keys ?? (task as any).rewardKeys ?? 1);
    if (user) {
      user.balance += task.reward;
      if (user.state_json.resources) {
        user.state_json.resources.coins += task.reward;
        user.state_json.resources.keys = (user.state_json.resources.keys || 0) + rewardKeys;
      }
      if (!user.state_json.completedTaskIds) {
        user.state_json.completedTaskIds = [];
      }
      user.state_json.completedTaskIds.push(taskId);
    }

    localCache.transactions.push({
      id: Date.now(),
      telegram_id: userId,
      amount: task.reward,
      type: "task_completion",
      created_at: new Date().toISOString()
    });

    res.json({ success: true, reward: task.reward, rewardKeys });
  }
});

// Fetch User's Completed Task IDs
app.get("/api/user/:userId/tasks", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from("user_tasks")
      .select("task_id")
      .eq("telegram_id", userId);

    if (error) throw error;
    res.json(data.map(item => item.task_id));
  } catch (err: any) {
    // Offline Cache fallback
    const offlineCompletedIds = localCache.user_tasks
      .filter(ut => ut.telegram_id === userId)
      .map(ut => ut.task_id);
    res.json(offlineCompletedIds);
  }
});

// Fetch user's transaction ledger history
app.get("/api/transactions/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("telegram_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    const subset = localCache.transactions
      .filter(t => t.telegram_id === userId)
      .sort((a, b) => b.id - a.id);
    res.json(subset);
  }
});

// Global Leaderboards API
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { category } = req.query;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .limit(100);

    if (error) throw error;
    const items = data || [];

    // Convert internal database schema to leaderboard visualizer specs
    let scoredLeaderboard = items.map((u: any) => {
      const details = u.state_json || {};
      const nameVal = u.username || details.user?.name || "Agent_" + u.telegram_id?.slice(-4);
      const avatarVal = details.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegram_id}`;
      const levelVal = details.user?.level || 1;
      const expVal = details.user?.exp || 0;
      const clearanceVal = details.user?.clearanceCount || 0;
      const referVal = details.user?.referCount || 0;
      return {
        userId: u.telegram_id,
        name: nameVal,
        avatar: avatarVal,
        Level: levelVal,
        EXP: expVal,
        ZP: u.balance || details.resources?.coins || 0,
        clearanceCount: clearanceVal,
        referCount: referVal,
        user: {
          name: nameVal,
          avatar: avatarVal,
          level: levelVal,
          exp: expVal,
          clearanceCount: clearanceVal,
          referCount: referVal
        }
      };
    });

    // Sort accordingly
    if (category === "referrals") {
      scoredLeaderboard.sort((a, b) => b.referCount - a.referCount);
    } else if (category === "vaults") {
      scoredLeaderboard.sort((a, b) => b.clearanceCount - a.clearanceCount || b.ZP - a.ZP);
    } else {
      // Default to "solvers" (or other) category sorting by ZP (balance)
      scoredLeaderboard.sort((a, b) => b.ZP - a.ZP);
    }

    res.json(scoredLeaderboard.slice(0, 20));
  } catch (err: any) {
    console.warn("[DB Fallback] Leaderboard fallback", err.message);
    const subset = Array.from(localCache.users.values()).map(u => {
      const details = u.state_json || {};
      const nameVal = u.username || details.user?.name || "Operator";
      const avatarVal = details.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegram_id}`;
      const levelVal = details.user?.level || 1;
      const expVal = details.user?.exp || 0;
      const clearanceVal = details.user?.clearanceCount || 0;
      const referVal = details.user?.referCount || 0;
      return {
        userId: u.telegram_id,
        name: nameVal,
        avatar: avatarVal,
        Level: levelVal,
        EXP: expVal,
        ZP: u.balance || details.resources?.coins || 0,
        clearanceCount: clearanceVal,
        referCount: referVal,
        user: {
          name: nameVal,
          avatar: avatarVal,
          level: levelVal,
          exp: expVal,
          clearanceCount: clearanceVal,
          referCount: referVal
        }
      };
    });

    if (req.query.category === "referrals") {
      subset.sort((a, b) => b.referCount - a.referCount);
    } else if (req.query.category === "vaults") {
      subset.sort((a, b) => b.clearanceCount - a.clearanceCount || b.ZP - a.ZP);
    } else {
      subset.sort((a, b) => b.ZP - a.ZP);
    }

    res.json(subset.slice(0, 20));
  }
});

// Crews list (Group Sync Protocol)
app.get("/api/crews/:crewName/members", async (req, res) => {
  const { crewName } = req.params;
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*");

    if (error) throw error;

    const filtered = (data || [])
      .map(u => {
        let state = u.state_json;
        if (typeof state === "string") {
          try {
            state = JSON.parse(state);
          } catch (e) {
            return null;
          }
        }
        return state;
      })
      .filter(state => state && state.crew?.name?.toLowerCase() === crewName.toLowerCase());

    res.json(filtered);
  } catch (err: any) {
    const items = Array.from(localCache.users.values())
      .map(u => {
        let state = u.state_json;
        if (typeof state === "string") {
          try {
            state = JSON.parse(state);
          } catch (e) {
            return null;
          }
        }
        return state;
      })
      .filter(state => state && state.crew?.name?.toLowerCase() === crewName.toLowerCase());
    res.json(items);
  }
});

// Crews Chat Sync Protocol
const crewChats: Record<string, Array<{ id: string; sender: string; avatar: string; message: string; timestamp: string }>> = {};

app.get("/api/crews/:crewName/chat", (req, res) => {
  const { crewName } = req.params;
  const key = crewName.toLowerCase();
  const messages = crewChats[key] || [];
  res.json(messages);
});

app.post("/api/crews/:crewName/chat", (req, res) => {
  const { crewName } = req.params;
  const { sender, avatar, message } = req.body;
  const key = crewName.toLowerCase();
  
  if (!sender || !message) {
    return res.status(400).json({ error: "Missing identity credentials or payload messages" });
  }

  if (!crewChats[key]) {
    crewChats[key] = [];
  }

  const dateStr = "Just now";
  const newMsg = {
    id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    sender,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sender}`,
    message,
    timestamp: dateStr
  };

  crewChats[key].push(newMsg);
  res.status(201).json(newMsg);
});

// Serve frontend routing nicely in production modes
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind server listener cleanly
  const isVercel = !!process.env.VERCEL;
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    console.log("[Server] Running in serverless function execution frame");
  }
}

// Bootstrapper trigger
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  startServer().catch(console.error);
}

export default app;
