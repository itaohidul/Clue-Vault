import express from "express";
import path from "path";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Mongoose Schema Definition
const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
  Level: Number,
  EXP: Number,
  ZP: Number,
  key: Number,
  Clue: Number,
  referCount: Number,
  referralCode: String,
  crew: {
    name: String,
    rank: String,
    icon: String,
    id: String,
  },
  resources: Object, // Keep original structures as backup
  user: Object,
  purchases: Array,
  unlockedTabs: [String],
  riddleState: {
    activeRiddleId: String,
    unlockedParts: Number,
  },
  updatedAt: { type: Date, default: Date.now },
}, { strict: false }); // Allow extra fields for flexibility during development

const User = mongoose.model("User", UserSchema);

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("CRITICAL: MONGODB_URI is missing.");
    throw new Error("MONGODB_URI not found in environment");
  }

  if (mongoose.connection.readyState === 1) return;
  
  if (mongoose.connection.readyState === 2) {
    console.log("[DB] Connection already in progress, waiting...");
    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (mongoose.connection.readyState !== 2) {
          clearInterval(check);
          resolve(null);
        }
      }, 500);
    });
    if (mongoose.connection.readyState === 1) return;
  }
  
  try {
    const maskedUri = uri.replace(/\/\/(.*):(.*)@/, "//***:***@");
    console.log(`[DB] Connecting to MongoDB Atlas...`);

    await mongoose.connect(uri, {
      dbName: "cluevault",
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log("[DB] Successfully connected to cluevault");
  } catch (err: any) {
    let serverIp = "unknown";
    try {
      const ipRes = await axios.get("https://api.ipify.org?format=json", { timeout: 2000 });
      serverIp = ipRes.data.ip;
    } catch (e) {}

    console.error("[DB] Connection failed:", err.message);
    throw new Error(`${err.message} (IP: ${serverIp})`);
  }
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/db-verify", (req, res) => {
  const uri = process.env.MONGODB_URI;
  res.json({
    hasUri: !!uri,
    readyState: mongoose.connection.readyState,
    dbName: mongoose.connection.db?.databaseName || "none"
  });
});

app.post("/api/auth/telegram", (req, res) => {
  const { initData } = req.body;
  res.json({ 
    success: true, 
    user: { 
      id: "tg_" + Date.now(), 
      username: "Agent" 
    } 
  });
});

app.get("/api/db-status", async (req, res) => {
  try {
    await connectDb();
    const isConnected = mongoose.connection.readyState === 1;
    if (isConnected) {
      res.json({ 
        connected: true, 
        database: mongoose.connection.db?.databaseName || "cluevault" 
      });
    } else {
      res.status(503).json({ 
        connected: false, 
        error: "Connection Pending (State: " + mongoose.connection.readyState + ")" 
      });
    }
  } catch (err: any) {
    console.error("[API] db-status error:", err.message);
    const isTimeout = err.message.includes("timeout") || err.message.includes("ETIMEDOUT");
    const isAuth = err.message.includes("Authentication failed") || err.message.includes("auth failed") || err.message.includes("bad auth");
    
    let userFriendlyError = "Database Offline";
    if (isTimeout) userFriendlyError = "Connection Timed Out. Check Atlas Network Access (0.0.0.0/0).";
    if (isAuth) userFriendlyError = "Authentication Failed. Verify password in MONGODB_URI.";
    
    res.status(500).json({ 
      connected: false, 
      error: userFriendlyError,
      details: err.message
    });
  }
});

// User State Sync
app.get("/api/user/:userId", async (req, res) => {
  try {
    await connectDb();
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Fetch User failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/user/:userId", async (req, res) => {
  try {
    await connectDb();
    const payload = {
      ...req.body,
      userId: req.params.userId,
      updatedAt: new Date(),
    };
    
    await User.findOneAndUpdate(
      { userId: req.params.userId },
      payload,
      { upsert: true, new: true }
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error("Save User failed", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    const { category } = req.query;
    await connectDb();
    const sortField = category === "referrals" ? "referCount" : "ZP";
    
    const leaderboard = await User.find({})
      .sort({ [sortField]: -1 })
      .limit(20)
      .lean();

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// Crews
app.get("/api/crews/:crewName/members", async (req, res) => {
  try {
    await connectDb();
    const members = await User.find({ "crew.name": req.params.crewName })
      .sort({ "resources.activityScore": -1 })
      .lean();
    res.json(members);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
