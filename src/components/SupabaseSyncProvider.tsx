import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useUserStore } from "../store/userStore";
import axios from "axios";

// Base API URL configuration
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_BASE });

interface SupabaseTask {
  id: number;
  title: string;
  reward: number;
  type: string;
  link: string;
  created_at?: string;
}

interface SupabaseTransaction {
  id: number;
  telegram_id: string;
  amount: number;
  type: string;
  created_at: string;
}

interface SupabaseSyncContextType {
  userId: string | null;
  isSyncing: boolean;
  isCloudLoaded: boolean;
  dbConnected: boolean | null;
  error: string | null;
  setError: (err: string | null) => void;
  syncLocalToCloud: () => Promise<void>;
  
  // Supabase dynamic state properties
  tasks: SupabaseTask[];
  completedTaskIds: number[];
  transactions: SupabaseTransaction[];
  claimSupabaseTask: (taskId: number) => Promise<boolean>;
  loadTransactions: () => Promise<void>;
  loadTasksAndCompletions: () => Promise<void>;
}

const SupabaseSyncContext = createContext<SupabaseSyncContextType | null>(null);

export const useSupabaseSync = () => {
  const context = useContext(SupabaseSyncContext);
  if (!context) {
    throw new Error("useSupabaseSync must be used within a SupabaseSyncProvider");
  }
  return context;
};

export default function SupabaseSyncProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isCloudLoaded, setIsCloudLoaded] = useState<boolean>(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(true);
  const [error, setError] = useState<string | null>(null);

  // Supabase task completion and logs sync sets
  const [tasks, setTasks] = useState<SupabaseTask[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<SupabaseTransaction[]>([]);
  
  const isSyncingFromCloudRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize unique identity (Telegram context preferred)
  useEffect(() => {
    let id = localStorage.getItem("cluevault_supabase_id");
    
    // Check if we are connected to Telegram WebApp framework
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
       id = tg.initDataUnsafe.user.id.toString();
    }

    if (!id) {
      id = "anon_" + Math.random().toString(36).substring(2, 11);
    }
    
    setUserId(id);
    localStorage.setItem("cluevault_supabase_id", id);
  }, []);

  // Map state converters
  const mapStateToSupabasePayload = (state: any) => {
    return {
      user: state.user,
      resources: state.resources,
      purchases: state.purchases,
      crew: state.crew,
      base: state.base,
      unlockedTabs: state.unlockedTabs,
      riddleState: state.riddleState,
      completedTaskIds: state.completedTaskIds || []
    };
  };

  const mapSupabaseToState = (cloudData: any) => {
    return {
      user: {
        ...(cloudData.user || {}),
        name: cloudData.name || cloudData.user?.name || "Agent",
        avatar: cloudData.avatar || cloudData.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`,
        level: cloudData.Level ?? cloudData.user?.level ?? 1,
        exp: cloudData.EXP ?? cloudData.user?.exp ?? 0,
        referCount: cloudData.referCount ?? cloudData.user?.referCount ?? 0,
        referralCode: cloudData.referralCode || cloudData.user?.referralCode,
      },
      resources: {
        ...(cloudData.resources || {}),
        coins: cloudData.ZP ?? cloudData.resources?.coins ?? 1000,
        keys: cloudData.key ?? cloudData.resources?.keys ?? 5,
        clue: cloudData.Clue ?? cloudData.resources?.clue ?? 0,
      },
      crew: cloudData.crew || null,
      base: cloudData.base || { level: 1, energy: 100 },
      purchases: cloudData.purchases || [],
      unlockedTabs: cloudData.unlockedTabs || ["daily"],
      riddleState: cloudData.riddleState || { activeRiddleId: null, unlockedParts: 0 },
    };
  };

  // Push local updates back up to Supabase with debounce
  const syncLocalToCloud = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const currentState = useUserStore.getState();
      const payload = mapStateToSupabasePayload(currentState);
      await api.post(`/api/user/${userId}`, payload, { timeout: 8000 });
      console.log("Supabase secure payload synchronized successfully");
      setError(null);
    } catch (err: any) {
      console.warn("Local storage mirror active (Supabase connection offline mode)");
    } finally {
      setIsSyncing(false);
    }
  };

  const loadTransactions = async () => {
    if (!userId) return;
    try {
      const response = await api.get(`/api/transactions/${userId}`);
      if (Array.isArray(response.data)) {
        setTransactions(response.data);
      }
    } catch (err) {
      console.warn("Could not retrieve transaction logs offline.");
    }
  };

  const loadTasksAndCompletions = async () => {
    if (!userId) return;
    try {
      const [tasksRes, completionsRes] = await Promise.all([
        api.get("/api/tasks"),
        api.get(`/api/user/${userId}/tasks`)
      ]);
      setTasks(tasksRes.data || []);
      setCompletedTaskIds(completionsRes.data || []);
    } catch (err) {
      console.warn("Offline tasks loaded.");
    }
  };

  // Submit claiming for rewards
  const claimSupabaseTask = async (taskId: number): Promise<boolean> => {
    if (!userId) return false;
    try {
      const response = await api.post("/api/tasks/claim", { userId, taskId });
      if (response.data?.success) {
        // Boost local game store state ZP
        const reward = response.data.reward || 0;
        const currentCoins = useUserStore.getState().resources?.coins || 0;
        
        // Push state update globally on userStore
        useUserStore.setState((state: any) => ({
          resources: {
            ...(state.resources || {}),
            coins: currentCoins + reward
          }
        }));

        // Refresh completed tasks lists & ledger histories
        setCompletedTaskIds(prev => [...prev, taskId]);
        await loadTransactions();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Supabase claiming failed.", err);
      return false;
    }
  };

  // Pre-load state when user connects
  useEffect(() => {
    if (!userId) return;

    const fetchUserAndAssets = async () => {
      setIsSyncing(true);
      try {
        // Query server db state verify to show exact sync metrics
        const verifyRes = await api.get<any>("/api/db-verify");
        setDbConnected(verifyRes.data?.readyState === 1);

        // Telegram user loader
        const response = await api.get(`/api/user/${userId}`);
        const cloudData = response.data;
        
        if (cloudData) {
          isSyncingFromCloudRef.current = true;
          const nextState = mapSupabaseToState(cloudData);

          useUserStore.setState(nextState);
          localStorage.setItem("cluevault_game_state_zustand", JSON.stringify(nextState));

          isSyncingFromCloudRef.current = false;
        }
        setIsCloudLoaded(true);
      } catch (err: any) {
        setIsCloudLoaded(true);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchUserAndAssets();
    loadTasksAndCompletions();
    loadTransactions();
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
      const payload = mapStateToSupabasePayload(state);
      await api.post(`/api/user/${userId}`, payload);
    } catch (err) {
      // Ignore background post failures silently to keep gameplay perfectly smooth
    }
  };

  return (
    <SupabaseSyncContext.Provider
      value={{
        userId,
        isSyncing,
        isCloudLoaded,
        dbConnected,
        error,
        setError,
        syncLocalToCloud,
        tasks,
        completedTaskIds,
        transactions,
        claimSupabaseTask,
        loadTransactions,
        loadTasksAndCompletions
      }}
    >
      {children}
    </SupabaseSyncContext.Provider>
  );
}
