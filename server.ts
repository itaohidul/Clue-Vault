import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { supabase } from "./src/lib/supabase";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// In-memory fallback dataset (to ensure robust, continuous operation even when Supabase is initializing/credentials are blank)
const localCache = {
  users: new Map<string, any>(),
  tasks: [
    { id: 1, title: "Decrypt Dark Web Intel Folder", reward: 5000, type: "social", link: "https://x.com" },
    { id: 2, title: "Initialize Proxy Connection Protocol", reward: 7500, type: "channel", link: "https://t.me" },
    { id: 3, title: "Verify TON Wallet Integration", reward: 15000, type: "wallet", link: "https://ton.org" },
    { id: 4, title: "Solve Cyber Crypt Riddle Challenge", reward: 20000, type: "riddle", link: "" }
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

// Supabase Connection Status Helper
app.get("/api/db-verify", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    res.json({
      hasUri: true,
      readyState: 1,
      dbName: "Supabase Active Cluster"
    });
  } catch (err: any) {
    res.json({
      hasUri: false,
      readyState: 0,
      dbName: "Supabase Connection Pending",
      warning: "Using secure serverless memory cache (local sandbox fallback). Please supply NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to sync to live database."
    });
  }
});

app.get("/api/db-status", async (req, res) => {
  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    res.json({ connected: true, database: "Supabase PostgreSQL Database" });
  } catch (err: any) {
    res.json({ connected: false, database: "Encrypted Cloud Memory Fallback" });
  }
});

// Get User State (Auto-Registration + Referral Tracker)
app.get("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const usernameQuery = (req.query.username as string) || "Agent_" + userId.slice(-4);
  const referredByCode = req.query.referredBy as string;

  try {
    // Attempt Supabase fetch
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (user) {
      return res.json(user.state_json || user);
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
          updatedReferrerState.user.referCount = (updatedReferrerState.user.referCount || 0) + 1;
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
    console.warn("[DB Fallback] Fetch user failed, using in-memory local cache", err.message);
    
    // In-memory fallback check
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
              value.state_json.user.referCount += 1;
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

    res.json(cachedUser.state_json);
  }
});

// Update/Save Game State
app.post("/api/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const payload = req.body;

  try {
    const updatedBalance = payload.ZP ?? payload.resources?.coins ?? 0;
    const { error } = await supabase
      .from("users")
      .update({
        balance: updatedBalance,
        state_json: payload
      })
      .eq("telegram_id", userId);

    if (error) throw error;
    res.json({ success: true, message: "Saved to Supabase database" });

  } catch (err: any) {
    console.warn(`[DB Fallback] Update failed, falling back to local memory store`, err.message);
    
    const cachedUser = localCache.users.get(userId) || {};
    localCache.users.set(userId, {
      ...cachedUser,
      telegram_id: userId,
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
        { title: "Deface Syndicate Access Terminal", reward: 2500, type: "social", link: "https://x.com" },
        { title: "Subscribe to CipherNet Intel Hub", reward: 5000, type: "channel", link: "https://t.me" },
        { title: "Authorize Safe Ledger Gateway", reward: 12000, type: "wallet", link: "https://ton.org" },
        { title: "Solve Cryptography Riddle Challenge", reward: 15000, type: "riddle", link: "" }
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
    const updatedState = { ...user.state_json };
    if (updatedState.resources) {
      updatedState.resources.coins = (updatedState.resources.coins || 0) + rewardCoins;
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

    res.json({ success: true, reward: rewardCoins });

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
    if (user) {
      user.balance += task.reward;
      if (user.state_json.resources) {
        user.state_json.resources.coins += task.reward;
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

    res.json({ success: true, reward: task.reward });
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
    const sortField = category === "referrals" ? "referCount" : "balance";

    let items: any[] = [];
    if (category === "referrals") {
      // Find all and sort by refer count
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("balance", { ascending: false }) // Fallback to balance
        .limit(20);

      if (error) throw error;
      items = data || [];
    } else {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("balance", { ascending: false })
        .limit(20);

      if (error) throw error;
      items = data || [];
    }

    // Convert internal database schema to leaderboard visualizer specs
    const scoredLeaderboard = items.map((u: any) => {
      const details = u.state_json || {};
      return {
        userId: u.telegram_id,
        name: u.username || details.user?.name || "Agent_" + u.telegram_id?.slice(-4),
        avatar: details.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegram_id}`,
        Level: details.user?.level || 1,
        EXP: details.user?.exp || 0,
        ZP: u.balance,
        referCount: details.user?.referCount || 0
      };
    });

    if (scoredLeaderboard.length === 0) throw new Error("Supabase returned empty leaderboard");
    res.json(scoredLeaderboard);
  } catch (err: any) {
    console.warn("[DB Fallback] Leaderboard fallback", err.message);
    const subset = Array.from(localCache.users.values()).map(u => {
      const details = u.state_json || {};
      return {
        userId: u.telegram_id,
        name: u.username || "Operator",
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u.telegram_id}`,
        Level: details.user?.level || 1,
        EXP: details.user?.exp || 0,
        ZP: u.balance,
        referCount: details.user?.referCount || 0
      };
    });
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

    const filtered = data
      .filter(u => u.state_json?.crew?.name?.toLowerCase() === crewName.toLowerCase())
      .map(u => u.state_json);

    res.json(filtered);
  } catch (err: any) {
    const items = Array.from(localCache.users.values())
      .map(u => u.state_json)
      .filter(u => u.crew && u.crew.name?.toLowerCase() === crewName.toLowerCase());
    res.json(items);
  }
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
