import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Sandbox in-memory data store to mimic MongoDB storage
const userStore = new Map<string, any>();

// Seed with some simulated leaderboard data if empty
const seedLeaderboard = () => {
  const seedAgents = [
    { userId: "anon_alpha", name: "Agent Alpha", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=alpha", Level: 42, EXP: 8400, ZP: 125000, referCount: 15, crew: { name: "Shadow Syndicate" } },
    { userId: "anon_omega", name: "Agent Omega", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=omega", Level: 38, EXP: 7600, ZP: 98000, referCount: 12, crew: { name: "Shadow Syndicate" } },
    { userId: "anon_cipher", name: "Cipher Ghost", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=cipher", Level: 35, EXP: 7000, ZP: 84000, referCount: 9, crew: { name: "Hex Decryptors" } },
    { userId: "anon_neon", name: "Neon Phantom", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=neon", Level: 28, EXP: 5600, ZP: 61000, referCount: 7, crew: { name: "Hex Decryptors" } },
    { userId: "anon_spectre", name: "Spectre Operator", avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=spectre", Level: 22, EXP: 4400, ZP: 34000, referCount: 4, crew: { name: "Zero Day Guild" } }
  ];
  for (const agent of seedAgents) {
    userStore.set(agent.userId, agent);
  }
};
seedLeaderboard();

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-verify", (req, res) => {
  res.json({
    hasUri: false,
    readyState: 1, // Mimic connected
    dbName: "Virtual Encrypted Memory Cache"
  });
});

app.post("/api/auth/telegram", (req, res) => {
  res.json({ 
    success: true, 
    user: { 
      id: "tg_" + Date.now(), 
      username: "Agent" 
    } 
  });
});

app.get("/api/db-status", (req, res) => {
  res.json({ 
    connected: true, 
    database: "Encrypted Device Memory" 
  });
});

// User State Sync
app.get("/api/user/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const user = userStore.get(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Retrieve User state from virtual database failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/user/:userId", (req, res) => {
  const { userId } = req.params;
  try {
    const payload = {
      ...req.body,
      userId,
      updatedAt: new Date(),
    };
    
    // Explicitly merge or save the user info
    const existing = userStore.get(userId) || {};
    const updated = { ...existing, ...payload };
    userStore.set(userId, updated);
    
    console.log(`[Virtual DB] Successfully saved state for user ${userId}.`);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`[Virtual DB] Save User failed for ${userId}:`, err.message);
    res.status(500).json({ 
      error: "Internal server error during save",
      details: err.message
    });
  }
});

// Leaderboard
app.get("/api/leaderboard", (req, res) => {
  try {
    const { category } = req.query;
    const sortField = category === "referrals" ? "referCount" : "ZP";
    
    const items = Array.from(userStore.values());
    items.sort((a, b) => {
      const valA = a[sortField] !== undefined ? a[sortField] : (a.resources?.coins || 0);
      const valB = b[sortField] !== undefined ? b[sortField] : (b.resources?.coins || 0);
      return (valB as number) - (valA as number);
    });

    res.json(items.slice(0, 20));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Crews
app.get("/api/crews/:crewName/members", (req, res) => {
  try {
    const { crewName } = req.params;
    const items = Array.from(userStore.values()).filter(
      u => u.crew && u.crew.name?.toLowerCase() === crewName.toLowerCase()
    );
    
    items.sort((a, b) => {
      const scoreA = a.resources?.activityScore || 0;
      const scoreB = b.resources?.activityScore || 0;
      return scoreB - scoreA;
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

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

  // Standalone server start: only listen when not running as a Vercel Serverless Function
  const isVercel = !!process.env.VERCEL;
  if (!isVercel) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    console.log("[Server] Server running in Vercel serverless mode");
  }
}

// Start server locally / in container preview
const isVercel = !!process.env.VERCEL;
if (!isVercel) {
  startServer().catch(console.error);
}

export default app;
