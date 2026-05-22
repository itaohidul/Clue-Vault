import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useUserStore } from "../store/userStore";
import axios from "axios";

// Helper for Base API URL (useful for production/vercel deployments)
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_BASE });

interface MongoSyncContextType {
  userId: string | null;
  isSyncing: boolean;
  isCloudLoaded: boolean;
  dbConnected: boolean | null;
  error: string | null;
  setError: (err: string | null) => void;
  syncLocalToCloud: () => Promise<void>;
}

const MongoSyncContext = createContext<MongoSyncContextType | null>(null);

export const useMongoSync = () => {
  const context = useContext(MongoSyncContext);
  if (!context) {
    throw new Error("useMongoSync must be used within a MongoSyncProvider");
  }
  return context;
};

export default function MongoSyncProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const isSyncingFromCloudRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize User ID from Telegram or LocalStorage
  useEffect(() => {
    let id = localStorage.getItem("cluevault_mongo_id");
    
    // Check if we are in Telegram
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
       id = tg.initDataUnsafe.user.id.toString();
    }

    if (!id) {
      id = "anon_" + Math.random().toString(36).substring(2, 15);
    }
    
    setUserId(id);
    localStorage.setItem("cluevault_mongo_id", id);
  }, []);

  const checkMongoConn = async (retryCount = 0) => {
    try {
      setDbConnected(null); // Reset to loading
      const res = await api.get("/api/db-status", { timeout: 8000 });
      if (res.data.connected) {
        setDbConnected(true);
        setError(null);
      } else {
        const errorMsg = res.data.error || "Database Offline";
        
        // If pending, retry
        if (errorMsg.includes("Pending") && retryCount < 5) {
          console.log(`Connection pending... retry ${retryCount}`);
          setTimeout(() => checkMongoConn(retryCount + 1), 2000);
          return;
        }
        
        setDbConnected(false);
        setError(errorMsg);
      }
    } catch (err: any) {
      setDbConnected(false);
      const serverMsg = err.response?.data?.error || err.message;
      const serverDetails = err.response?.data?.details || "";
      const serverIp = err.response?.data?.ip || "";
      
      let fullError = `${serverMsg}`;
      if (serverMsg.includes("Whitelist") || serverMsg.includes("0.0.0.0/0")) {
         fullError = "Fix Required: Whitelist 0.0.0.0/0 in MongoDB Atlas Network Access.";
      }

      if (serverDetails && !fullError.includes(serverDetails)) {
        fullError += `\n(${serverDetails})`;
      }
      if (serverIp && !fullError.includes(serverIp)) {
        fullError += `\nServer IP: ${serverIp}`;
      }
      
      setError(fullError);
      console.error("Connectivity check failed", err);
    }
  };

  useEffect(() => {
    checkMongoConn();
  }, []);

  // Map frontend state to MongoDB structure with exact requested names
  const mapStateToMongo = (state: any) => {
    // ONLY extract data fields, exclude action functions
    const dataOnly = {
      user: state.user,
      resources: state.resources,
      purchases: state.purchases,
      crew: state.crew,
      base: state.base,
      unlockedTabs: state.unlockedTabs,
      riddleState: state.riddleState
    };

    return {
      ...dataOnly,
      name: state.user?.name,
      avatar: state.user?.avatar,
      Level: state.user?.level,
      EXP: state.user?.exp,
      ZP: state.resources?.coins,
      key: state.resources?.keys,
      Clue: state.resources?.clue,
      referCount: state.user?.referCount,
      referralCode: state.user?.referralCode,
    };
  };

  const mapMongoToState = (cloudData: any) => {
    // If the data came from our mapped structure, restore it to the zustand expected nested structure
    return {
      user: {
        ...(cloudData.user || {}),
        name: cloudData.name || cloudData.user?.name,
        avatar: cloudData.avatar || cloudData.user?.avatar,
        level: cloudData.Level ?? cloudData.user?.level,
        exp: cloudData.EXP ?? cloudData.user?.exp,
        referCount: cloudData.referCount ?? cloudData.user?.referCount,
        referralCode: cloudData.referralCode || cloudData.user?.referralCode,
      },
      resources: {
        ...(cloudData.resources || {}),
        coins: cloudData.ZP ?? cloudData.resources?.coins,
        keys: cloudData.key ?? cloudData.resources?.keys,
        clue: cloudData.Clue ?? cloudData.resources?.clue,
      },
      crew: cloudData.crew,
      base: cloudData.base,
      purchases: cloudData.purchases || [],
      unlockedTabs: cloudData.unlockedTabs || ["daily"],
      riddleState: cloudData.riddleState || { activeRiddleId: null, unlockedParts: 0 },
    };
  };

  // Sync function exposed to manual calls
  const syncLocalToCloud = async () => {
    // If we're not connected, try to reconnect first
    if (dbConnected === false || dbConnected === null) {
      setIsSyncing(true);
      try {
        const res = await api.get("/api/db-status");
        if (res.data.connected) {
          setDbConnected(true);
          setError(null);
        } else {
          setDbConnected(false);
          setError(`Cloud Error: ${res.data.error || "Connection failed balance check"}`);
          if (res.data.details) console.log("DB Details:", res.data.details);
          setIsSyncing(false);
          return; 
        }
      } catch (err: any) {
        setDbConnected(false);
        const serverMsg = err.response?.data?.error || err.message;
        const serverDetails = err.response?.data?.details || "";
        setError(`Backend Error: ${serverMsg} ${serverDetails ? "(" + serverDetails + ")" : ""}`);
        setIsSyncing(false);
        return;
      }
    }

    if (!userId) return;
    setIsSyncing(true);
    try {
      const currentState = useUserStore.getState();
      const payload = mapStateToMongo(currentState);
      await api.post(`/api/user/${userId}`, payload, { timeout: 15000 });
      console.log("Manual sync success");
      setError(null);
    } catch (err: any) {
      console.error("Manual sync failed", err);
      const serverMsg = err.response?.data?.error || err.message;
      const serverDetails = err.response?.data?.details || "";
      setError(`Cloud Sync Failed: ${serverMsg} ${serverDetails ? "(" + serverDetails + ")" : ""}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch from MongoDB on Load
  useEffect(() => {
    if (!userId || dbConnected === false) return;

    const fetchUser = async () => {
      setIsSyncing(true);
      try {
        const response = await api.get(`/api/user/${userId}`);
        const cloudData = response.data;
        
        if (cloudData) {
          isSyncingFromCloudRef.current = true;
          
          const nextState = mapMongoToState(cloudData);

          useUserStore.setState(nextState);
          // Persist to localStorage as well so it's consistent on next reload
          localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(nextState));

          isSyncingFromCloudRef.current = false;
          setIsCloudLoaded(true);
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          // New user, push current local state to cloud immediately to preserve "website info"
          await syncLocalToCloud();
          setIsCloudLoaded(true);
        } else {
          console.error("Failed to fetch user from Mongo", err);
          setError("Cloud sync failed. Operating in local mode.");
        }
      } finally {
        setIsSyncing(false);
      }
    };

    fetchUser();
  }, [userId, dbConnected]);

  // Subscribe to changes with debounce for auto-sync
  useEffect(() => {
    if (!userId || dbConnected === false) return;

    const unsubscribe = useUserStore.subscribe((state) => {
      if (isSyncingFromCloudRef.current) return;
      
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      syncTimeoutRef.current = setTimeout(() => {
        pushUpdateInternal(state);
      }, 5000); // Increased debounce to 5s for stability
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId, dbConnected]);

  const pushUpdateInternal = async (state: any) => {
    if (!userId || !dbConnected) return;
    try {
      const payload = mapStateToMongo(state);
      await api.post(`/api/user/${userId}`, payload);
    } catch (err) {
      console.error("Auto-sync push failed", err);
    }
  };

  return (
    <MongoSyncContext.Provider
      value={{
        userId,
        isSyncing,
        isCloudLoaded,
        dbConnected,
        error,
        setError,
        syncLocalToCloud
      }}
    >
      {children}
    </MongoSyncContext.Provider>
  );
}
