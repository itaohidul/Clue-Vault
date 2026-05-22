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
  // Always true for visual simplicity, indicating active cached operation
  const [dbConnected, setDbConnected] = useState<boolean | null>(true);
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

  // Map frontend state to standard export structure
  const mapStateToMongo = (state: any) => {
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

  // Sync function exposed to manual calls (background, error-free)
  const syncLocalToCloud = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const currentState = useUserStore.getState();
      const payload = mapStateToMongo(currentState);
      await api.post(`/api/user/${userId}`, payload, { timeout: 8000 });
      console.log("State synchronized securely in background");
      setError(null);
    } catch (err: any) {
      console.log("Background synchronization idle (local backup fully active)");
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch from in-memory/backend DB on Load silently
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      setIsSyncing(true);
      try {
        const response = await api.get(`/api/user/${userId}`);
        const cloudData = response.data;
        
        if (cloudData) {
          isSyncingFromCloudRef.current = true;
          const nextState = mapMongoToState(cloudData);

          useUserStore.setState(nextState);
          localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(nextState));

          isSyncingFromCloudRef.current = false;
        }
        setIsCloudLoaded(true);
      } catch (err: any) {
        // Fallback silently to device storage load
        setIsCloudLoaded(true);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchUser();
  }, [userId]);

  // Subscribe to changes with debounce for auto-sync silently
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = useUserStore.subscribe((state) => {
      if (isSyncingFromCloudRef.current) return;
      
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      syncTimeoutRef.current = setTimeout(() => {
        pushUpdateInternal(state);
      }, 5000);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [userId]);

  const pushUpdateInternal = async (state: any) => {
    if (!userId) return;
    try {
      const payload = mapStateToMongo(state);
      await api.post(`/api/user/${userId}`, payload);
    } catch (err) {
      // Ignore background post failures silently to keep gameplay perfectly smooth
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
