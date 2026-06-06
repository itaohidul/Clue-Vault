import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useUserStore } from "../store/userStore";
import axios from "axios";

// Base API URL configuration
const API_BASE = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_BASE, timeout: 20000 }); // Safe, relaxed 20s timeout for mobile data and slower connections

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
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPendingStateRef = useRef<any>(null);
  const isSyncInProgressRef = useRef(false);

  // Initialize unique identity (Telegram context preferred)
  useEffect(() => {
    // Check if URL suggests we are running inside Telegram interface, or user agent
    const isTelegramEnvironment = 
      typeof window !== 'undefined' && (
        window.location.search.includes('tgWebAppData') || 
        window.location.hash.includes('tgWebAppData') || 
        navigator.userAgent.toLowerCase().includes('telegram') ||
        (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData)
      );

    const resolveIdentity = (allowAnonymousFallback = false) => {
      let id = localStorage.getItem("cluevault_supabase_id");
      
      const nativeTgUser = 
        window.Telegram && 
        window.Telegram.WebApp && 
        window.Telegram.WebApp.initDataUnsafe && 
        window.Telegram.WebApp.initDataUnsafe.user;

      if (nativeTgUser && nativeTgUser.id) {
        const nativeId = nativeTgUser.id.toString();
        setUserId(nativeId);
        localStorage.setItem("cluevault_supabase_id", nativeId);
        console.log("[Identity Resolver] Native Telegram user resolved:", nativeId);
        return true;
      }
      
      // If we are in Telegram, ALWAYS prioritize waiting for the SDK polling to succeed, and do not fall back to anonymous ID instantly
      if (isTelegramEnvironment && !allowAnonymousFallback) {
        if (id && !id.startsWith("anon_")) {
          // If we had a real cached ID previously, we can set that safely
          setUserId(id);
          return true;
        }
        // Return false to let the polling timer catch the SDK injections
        return false;
      }

      // If we are not in Telegram, or we timed out, fall back safely
      if (!id) {
        id = "anon_" + Math.random().toString(36).substring(2, 11);
      }
      
      setUserId(id);
      localStorage.setItem("cluevault_supabase_id", id);
      console.log("[Identity Resolver] Fallback ID resolved:", id);
      return true;
    };

    // Run first resolve pass
    const resolvedNatively = resolveIdentity(false);
    if (resolvedNatively && !isTelegramEnvironment) return;

    // Set up polling fallback for asynchronous Telegram SDK load
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const success = resolveIdentity(attempts >= 15); // force fallback on last attempt
      if (success || attempts >= 15) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // Map state converters
  const mapStateToSupabasePayload = (state: any) => {
    const realReferrals = (state.user?.referrals || []).filter((r: any) => !r.isSimulated);
    const updatedUser = {
      ...state.user,
      referrals: realReferrals,
      referCount: realReferrals.length
    };
    return {
      user: updatedUser,
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
        name: cloudData.username || cloudData.name || cloudData.user?.name || "Agent",
        avatar: cloudData.avatar || cloudData.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=agent`,
        level: cloudData.level ?? cloudData.Level ?? cloudData.user?.level ?? 1,
        exp: cloudData.exp ?? cloudData.EXP ?? cloudData.user?.exp ?? 0,
        referCount: cloudData.referCount ?? cloudData.user?.referCount ?? 0,
        referralCode: cloudData.referralCode || cloudData.user?.referralCode,
        referrals: cloudData.user?.referrals || cloudData.referrals || [],
        onboarded: cloudData.onboarded ?? cloudData.user?.onboarded ?? false,
      },
      resources: {
        ...(cloudData.resources || {}),
        coins: cloudData.balance ?? cloudData.coins ?? cloudData.ZP ?? cloudData.resources?.coins ?? 1000,
        keys: cloudData.keys ?? cloudData.key ?? cloudData.resources?.keys ?? 5,
        clue: cloudData.clue ?? cloudData.Clue ?? cloudData.resources?.clue ?? 0,
        baseMaterials: cloudData.baseMaterials ?? cloudData.resources?.baseMaterials ?? 0,
        fragments: cloudData.fragments ?? cloudData.resources?.fragments ?? 0,
        energy: cloudData.energy ?? cloudData.resources?.energy ?? 100,
        maxEnergy: cloudData.maxEnergy ?? cloudData.resources?.maxEnergy ?? 100,
        stakedClue: cloudData.stakedClue ?? cloudData.resources?.stakedClue ?? 0,
        stakingTier: cloudData.stakingTier ?? cloudData.resources?.stakingTier ?? "none",
        activityScore: cloudData.activityScore ?? cloudData.resources?.activityScore ?? 0,
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
      lastPendingStateRef.current = null;
    } catch (err: any) {
      console.warn("Local storage mirror active (Supabase connection offline mode)");
      lastPendingStateRef.current = useUserStore.getState();
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
        // Boost local game store state ZP and Keys
        const reward = response.data.reward || 0;
        const rewardKeys = response.data.rewardKeys || 1;
        
        // Push state update globally on userStore
        useUserStore.setState((state: any) => {
          const currentCoins = state.resources?.coins || 0;
          const currentKeys = state.resources?.keys || 0;
          return {
            resources: {
              ...(state.resources || {}),
              coins: currentCoins + reward,
              keys: currentKeys + rewardKeys
            }
          };
        });

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

  // Pre-load state when user connects via a single consolidated Handshake HTTP request
  useEffect(() => {
    if (!userId) return;

    const fetchUserAndAssets = async () => {
      console.log(`[Startup Handshake] Initializing consolidated fetch for userId: ${userId}`);
      setIsSyncing(true);
      const controller = new AbortController();
      const handshakeTimeout = setTimeout(() => {
        console.warn("[Startup Handshake] 25-second mobile timeout reached. Aborting request and unlocking with local state.");
        controller.abort();
      }, 25000); // 25s mobile-friendly resilient fallback handshake

      try {
        // Telegram user parameters
        let queryParams = "";
        if (
          window.Telegram &&
          window.Telegram.WebApp &&
          window.Telegram.WebApp.initDataUnsafe
        ) {
          const utg = window.Telegram.WebApp.initDataUnsafe;
          const username = utg.user?.username || utg.user?.first_name || "";
          const startParam = utg.start_param || "";
          queryParams = `?username=${encodeURIComponent(username)}&referredBy=${encodeURIComponent(startParam)}`;
          console.log("[Startup Handshake] Context parameters:", { username, hasStartParam: !!startParam });
        }

        console.log(`[Startup Handshake] Executing consolidated startup payload: /api/startup/${userId}${queryParams ? ' with params' : ''}`);
        const response = await api.get(`/api/startup/${userId}${queryParams}`, { signal: controller.signal });
        const { dbConnected: dbReady, user: cloudData, tasks: tasksData, completedTaskIds: completionsData, transactions: transactionsData } = response.data;
        
        clearTimeout(handshakeTimeout);
        console.log("[Startup Handshake] Handshake received consolidated payload successfully.");

        // Apply Database status connection status
        setDbConnected(dbReady);

        // Apply state/tasks/completions/transactions lists simultaneously
        if (Array.isArray(tasksData)) setTasks(tasksData);
        if (Array.isArray(completionsData)) setCompletedTaskIds(completionsData);
        if (Array.isArray(transactionsData)) setTransactions(transactionsData);

        if (cloudData) {
          const nextState = mapSupabaseToState(cloudData);
          const localState = useUserStore.getState();

          const localIsNewer = 
            (localState?.user?.onboarded && !nextState?.user?.onboarded) ||
            ((localState?.user?.level || 1) > (nextState?.user?.level || 1)) ||
            ((localState?.resources?.coins || 0) > (nextState?.resources?.coins || 0)) ||
            ((localState?.resources?.clue || 0) > (nextState?.resources?.clue || 0));

          if (localIsNewer) {
            console.log("[Startup Handshake] Local client progress is newer. Syncing to cloud asynchronously.");
            pushUpdateInternal(true);
          } else {
            console.log("[Startup Handshake] Applying cloud synchronized status state.");
            isSyncingFromCloudRef.current = true;
            useUserStore.setState(nextState);
            isSyncingFromCloudRef.current = false;
          }
        }
        setIsCloudLoaded(true);
      } catch (err: any) {
        console.error("[Startup Handshake] Mobile signal handshake deferred. Proceeding with local cache immediately. Error:", err.message);
        setIsCloudLoaded(true); // Failsafe: unlock app even on network failure
      } finally {
        setIsSyncing(false);
        clearTimeout(handshakeTimeout);
      }
    };

    fetchUserAndAssets();
  }, [userId]);

  // Subscribe to changes with debounce for auto-sync silently
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = useUserStore.subscribe((state) => {
      if (isSyncingFromCloudRef.current) return;
      
      lastPendingStateRef.current = state;
      
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      
      syncTimeoutRef.current = setTimeout(() => {
        pushUpdateInternal();
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [userId]);

  // Add listener for background sync when app is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (lastPendingStateRef.current) {
          pushUpdateInternal(true); // Force push on hide
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userId]);

  const pushUpdateInternal = async (isForced = false, retryCount = 0) => {
    if (!userId) return;
    if (isSyncInProgressRef.current && !isForced) return;
    
    // Always sync the LATEST state
    const stateToSync = useUserStore.getState();
    const payload = mapStateToSupabasePayload(stateToSync);
    
    isSyncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      await api.post(`/api/user/${userId}`, payload, { 
        timeout: isForced ? 5000 : 10000 
      });
      
      // If we just synced the state that was pending, clear the pending flag
      if (lastPendingStateRef.current === stateToSync) {
        lastPendingStateRef.current = null;
      }
      
      setError(null);
      isSyncInProgressRef.current = false;
      setIsSyncing(false);
      
      // If new changes came in while we were syncing, trigger a follow-up sync
      if (lastPendingStateRef.current) {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => pushUpdateInternal(), 1000);
      }
    } catch (err: any) {
      isSyncInProgressRef.current = false;
      setIsSyncing(false);
      
      // Retry logic for background sync
      if (!isForced && retryCount < 5) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          pushUpdateInternal(false, retryCount + 1);
        }, delay);
      } else {
        console.warn("[Cloud Sync] Network handshake deferred. Local cache remains primary.");
        setError("SYNC_DEFERRED");
      }
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
