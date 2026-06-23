import { useState, useEffect, useRef } from "react";
import { useGame } from "../../App";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useLedgerStore } from "../../store/ledgerStore";
import { 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink, 
  Shield, 
  Sparkles, 
  RefreshCw,
  Coins,
  Key,
  Database,
  Lock,
  AlertTriangle,
  Play,
  Activity,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, safeOpenLink } from "../../lib/utils";
import { adManager } from "../../lib/adManager";

interface TaskState {
  id: string;
  name: string;
  type: 'decrypt_node' | 'link_alpha' | 'link_beta' | 'interstitial_task' | 'rewarded_interstitial_task' | 'pop_task';
  completed: boolean;
  rewardCoins: number;
  rewardKeys: number;
  rewardMats: number;
  link?: string;
}

const INITIAL_BATCH: TaskState[] = [
  // Interstitial Tasks (In-App Interstitial on play broadcast)
  { id: "task_inter_1", name: "In-App Interstitial Alpha Probe", type: "interstitial_task", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_inter_2", name: "In-App Interstitial Beta Gateway", type: "interstitial_task", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_inter_3", name: "In-App Interstitial Gamma Beacon", type: "interstitial_task", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_inter_4", name: "In-App Interstitial Delta Synchronizer", type: "interstitial_task", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },

  // Rewarded Interstitial Tasks (3 -> 4 multiplied!)
  { id: "task_rew_inter_1", name: "Rewarded Interstitial Transmission Alfa", type: "rewarded_interstitial_task", completed: false, rewardCoins: 800, rewardKeys: 2, rewardMats: 0 },
  { id: "task_rew_inter_2", name: "Rewarded Interstitial Transmission Beta", type: "rewarded_interstitial_task", completed: false, rewardCoins: 800, rewardKeys: 2, rewardMats: 0 },
  { id: "task_rew_inter_3", name: "Rewarded Interstitial Transmission Gamma", type: "rewarded_interstitial_task", completed: false, rewardCoins: 800, rewardKeys: 2, rewardMats: 0 },
  { id: "task_rew_inter_4", name: "Rewarded Interstitial Transmission Delta", type: "rewarded_interstitial_task", completed: false, rewardCoins: 800, rewardKeys: 2, rewardMats: 0 },

  // Rewarded Popup Tasks (3 -> 4 multiplied!)
  { id: "task_pop_1", name: "Rewarded Popup Signal Channel 1", type: "pop_task", completed: false, rewardCoins: 1000, rewardKeys: 3, rewardMats: 1 },
  { id: "task_pop_2", name: "Rewarded Popup Signal Channel 2", type: "pop_task", completed: false, rewardCoins: 1000, rewardKeys: 3, rewardMats: 1 },
  { id: "task_pop_3", name: "Rewarded Popup Signal Channel 3", type: "pop_task", completed: false, rewardCoins: 1000, rewardKeys: 3, rewardMats: 1 },
  { id: "task_pop_4", name: "Rewarded Popup Signal Channel 4", type: "pop_task", completed: false, rewardCoins: 1000, rewardKeys: 3, rewardMats: 1 }
];

export default function SocialTasksScreen() {
  const { user, resources, updateResources, completeMission, triggerHaptic } = useGame();
  const { 
    tasks: supabaseTasks, 
    completedTaskIds, 
    claimSupabaseTask, 
    logTransaction,
    transactions,
    loadTransactions,
    loadTasksAndCompletions
  } = useSupabaseSync();
  const { addTransaction } = useLedgerStore();

  const [claimingTaskId, setClaimingTaskId] = useState<number | null>(null);

  // Synchronous atomic lockouts to prevent rapid dual clicking
  const isClaimingSupabaseRef = useRef(false);
  const claimingCommunityIdsRef = useRef<string[]>([]);

  // Load or initialize persistent batch list (12 tasks)
  const [batchTasks, setBatchTasks] = useState<TaskState[]>(() => {
    const saved = localStorage.getItem("cluevault_tasks_batch_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force complete migration: ensure exactly the correct number of tasks, matching active ad-task IDs only
        const isValid = Array.isArray(parsed) && 
                        parsed.length === INITIAL_BATCH.length && 
                        parsed.every((p: any) => INITIAL_BATCH.some(init => init.id === p.id));
        if (isValid) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse batch state:", e);
      }
    }
    return INITIAL_BATCH;
  });

  // Persist batch state
  const saveBatchState = (tasks: TaskState[]) => {
    setBatchTasks(tasks);
    localStorage.setItem("cluevault_tasks_batch_state", JSON.stringify(tasks));
  };

  // Task specific cooldown state mapped by taskId
  const [taskCooldowns, setTaskCooldowns] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("cluevault_task_cooldowns_state");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {};
  });

  const [now, setNow] = useState(Date.now());

  // On mount safety sweep to release any expired task cooldowns immediately
  useEffect(() => {
    const currentTime = Date.now();
    let stateChanged = false;
    const updatedTasks = batchTasks.map(t => {
      if (t.completed) {
        const cooldownUntil = taskCooldowns[t.id] || 0;
        if (currentTime >= cooldownUntil) {
          stateChanged = true;
          return { ...t, completed: false };
        }
      }
      return t;
    });

    if (stateChanged) {
      saveBatchState(updatedTasks);
      const nextCooldowns = { ...taskCooldowns };
      updatedTasks.forEach(t => {
        if (!t.completed) {
          delete nextCooldowns[t.id];
        }
      });
      saveTaskCooldowns(nextCooldowns);
    }
  }, []);

  // Set up repeating interval to update 'now' and dynamically release completed tasks when cooldown expires
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      let stateChanged = false;
      const updatedTasks = batchTasks.map(t => {
        if (t.completed) {
          const cooldownUntil = taskCooldowns[t.id] || 0;
          if (cooldownUntil > 0 && currentTime >= cooldownUntil) {
            stateChanged = true;
            return { ...t, completed: false };
          }
        }
        return t;
      });

      if (stateChanged) {
        saveBatchState(updatedTasks);
        
        // Also clear out the cooled down task ids from taskCooldowns to keep it clean
        const nextCooldowns = { ...taskCooldowns };
        updatedTasks.forEach(t => {
          if (!t.completed) {
            delete nextCooldowns[t.id];
          }
        });
        saveTaskCooldowns(nextCooldowns);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [batchTasks, taskCooldowns]);

  const saveTaskCooldowns = (cooldowns: Record<string, number>) => {
    setTaskCooldowns(cooldowns);
    localStorage.setItem("cluevault_task_cooldowns_state", JSON.stringify(cooldowns));
  };

  const getRemainingCooldown = (taskId: string) => {
    const until = taskCooldowns[taskId] || 0;
    return Math.max(0, Math.ceil((until - now) / 1000));
  };

  const startTaskCooldown = (taskId: string) => {
    const nextCooldowns = {
      ...taskCooldowns,
      [taskId]: Date.now() + 6 * 60 * 60 * 1000 // 6 hours
    };
    saveTaskCooldowns(nextCooldowns);
  };

  // Loading indicator for active task triggers
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<{ active: boolean; clueAwarded: number } | null>(null);

  // Link task countdown
  const [linkCountdown, setLinkCountdown] = useState<number>(5);

  // One-time telegram community links
  const [communityTasks, setCommunityTasks] = useState(() => {
    const saved = localStorage.getItem("cluevault_oneoff_tasks");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatically migrate old links to new active targets while preserving completion states
        return parsed.map((t: any) => {
          const icon = t.id === "join_tg" ? MessageSquare : Bell;
          return {
            ...t,
            icon,
            link: t.id === "join_tg" ? "https://t.me/Cluevaultchat" : "https://t.me/Cluevaultofficial"
          };
        });
      } catch {}
    }
    return [
      { id: "join_tg", title: "Join Telegram Community", icon: MessageSquare, reward: 250, link: "https://t.me/Cluevaultchat", completed: false },
      { id: "follow_news", title: "Follow Announcements", icon: Bell, reward: 150, link: "https://t.me/Cluevaultofficial", completed: false },
    ];
  });

  const saveCommunityState = (tasks: typeof communityTasks) => {
    setCommunityTasks(tasks);
    localStorage.setItem("cluevault_oneoff_tasks", JSON.stringify(tasks));
  };

  // Handle claiming in Supabase database (Proceeds directly, completely bypassing ads!)
  const handleClaimSupabaseTask = async (task: any) => {
    if (completedTaskIds.includes(task.id) || !user.onboarded || isClaimingSupabaseRef.current) return;

    isClaimingSupabaseRef.current = true;
    triggerHaptic("medium");
    setClaimingTaskId(task.id);

    try {
      const success = await claimSupabaseTask(task.id);
      if (success) {
        const randomClue = Math.floor(Math.random() * 15) + 1;
        updateResources({ clue: randomClue });
        
        const claimRewardZP = task.reward || 1000;
        const claimRewardKeys = task.reward_keys || task.rewardKeys || 1;
        
        logTransaction(randomClue, "task_completion", "Clue");
        logTransaction(claimRewardZP, "task_completion", "ZP");
        
        addTransaction({ type: "task_completion", amount: randomClue, currency: "CLUE" });
        addTransaction({ type: "task_completion", amount: claimRewardZP, currency: "ZP" });
        addTransaction({ type: "task_completion", amount: claimRewardKeys, currency: "KEY" });

        loadTransactions();
        setSuccessAnimation({ active: true, clueAwarded: randomClue });
        triggerHaptic("success");
      }
    } catch (e) {
      console.error("Error during task claim:", e);
    } finally {
      setClaimingTaskId(null);
      isClaimingSupabaseRef.current = false;
    }
  };

  // Handle Community Tasks
  const handleCommunityAction = (task: any) => {
    if (task.completed || !user.onboarded || claimingCommunityIdsRef.current.includes(task.id)) return;

    claimingCommunityIdsRef.current.push(task.id);
    safeOpenLink(task.link);
    triggerHaptic("medium");

    setTimeout(async () => {
      try {
        const nextTasks = communityTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
        saveCommunityState(nextTasks);
        
        const clueTokens = Math.floor(Math.random() * 20) + 1;
        completeMission({ coins: task.reward, keys: 1, clue: clueTokens, xp: true });
        
        setSuccessAnimation({ active: true, clueAwarded: clueTokens });
        triggerHaptic("success");
      } finally {
        claimingCommunityIdsRef.current = claimingCommunityIdsRef.current.filter(id => id !== task.id);
      }
    }, 1500);
  };

  // Handle completing a task in the dynamic 10-task batch
  const handleBatchTaskAction = async (task: TaskState) => {
    if (task.completed || !user.onboarded) return;

    const randomClue = Math.floor(Math.random() * 20) + 1;

    const remaining = getRemainingCooldown(task.id);
    if (remaining > 0) {
      triggerHaptic("error");
      return;
    }

    setLoadingTaskId(task.id);
    triggerHaptic("medium");

    const onComplete = () => {
      completeMission({
        coins: task.rewardCoins,
        keys: task.rewardKeys,
        baseMaterials: task.rewardMats,
        clue: randomClue,
        xp: true
      });

      const nextTasks = batchTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
      saveBatchState(nextTasks);
      
      setLoadingTaskId(null);
      logTransaction(task.rewardCoins, "task_completion", "ZP");
      logTransaction(randomClue, "task_completion", "Clue");
      addTransaction({ type: "task_completion", amount: task.rewardCoins, currency: "ZP" });
      addTransaction({ type: "task_completion", amount: randomClue, currency: "CLUE" });
      setSuccessAnimation({ active: true, clueAwarded: randomClue });
      triggerHaptic("success");
      startTaskCooldown(task.id);
    };

    if (task.type === 'interstitial_task') {
      // Trigger In-App Interstitial and await completion
      adManager.triggerInAppInterstitial()
        .then((success) => {
          if (success) {
            onComplete();
          } else {
            console.warn("In-App Interstitial play failed or was closed.");
            setLoadingTaskId(null);
            triggerHaptic("error");
          }
        })
        .catch(() => {
          setLoadingTaskId(null);
          triggerHaptic("error");
        });
    } else if (task.type === 'rewarded_interstitial_task') {
      // Trigger Rewarded Interstitial
      adManager.triggerRewardedInterstitial()
        .then((success) => {
          if (success) {
            onComplete();
          } else {
            console.warn("Rewarded Interstitial play failed or was closed.");
            setLoadingTaskId(null);
            triggerHaptic("error");
          }
        })
        .catch(() => {
          setLoadingTaskId(null);
          triggerHaptic("error");
        });
    } else if (task.type === 'pop_task') {
      // Trigger Rewarded Popup
      adManager.triggerRewardedPopup()
        .then((success) => {
          if (success) {
            onComplete();
          } else {
            console.warn("Rewarded Popup play failed or was closed.");
            setLoadingTaskId(null);
            triggerHaptic("error");
          }
        })
        .catch(() => {
          setLoadingTaskId(null);
          triggerHaptic("error");
        });
    } else {
      // Fallback: trigger general ad interstitial to ensure ads show as much as possible! Do not reward for free.
      adManager.triggerRewardedInterstitial()
        .then((success) => {
          if (success) {
            onComplete();
          } else {
            console.warn("Ad play failed or was closed.");
            setLoadingTaskId(null);
            triggerHaptic("error");
          }
        })
        .catch(() => {
          setLoadingTaskId(null);
          triggerHaptic("error");
        });
    }
  };

  // Convert elements & ZP to refresh the batch & bypass cooldown
  const handleConvertRefresh = async () => {
    const costZP = 12000;
    const costElements = 50;

    if (resources.coins >= costZP && resources.baseMaterials >= costElements) {
      updateResources({ 
        coins: -costZP, 
        baseMaterials: -costElements 
      });

      logTransaction(-costZP, "task_refresh", "ZP");
      addTransaction({ type: "task_refresh", amount: -costZP, currency: "ZP" });
      addTransaction({ type: "task_refresh", amount: -costElements, currency: "ELEMENT" });

      const resetBatch = INITIAL_BATCH.map(t => ({ ...t, completed: false }));
      saveBatchState(resetBatch);

      const nextCooldowns = { ...taskCooldowns };
      resetBatch.forEach(t => {
        delete nextCooldowns[t.id];
      });
      saveTaskCooldowns(nextCooldowns);

      setSuccessAnimation({ active: true, clueAwarded: 0 });
      triggerHaptic("success");
    } else {
      triggerHaptic("error");
    }
  };

  const completedCount = batchTasks.filter((t) => t.completed).length;
  const completedSupabaseCount = supabaseTasks.filter((t: any) => completedTaskIds.includes(t.id)).length;
  const totalSupabaseCount = supabaseTasks.length;

  return (
    <div className="p-5 pb-24 space-y-6">
      
      {/* Dynamic Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1 select-none flex items-center gap-2">
            <Shield className="text-emerald-500 shrink-0" size={28} />
            SECURITY CORPS
          </h1>
          <p className="text-xs text-white/50 italic">Resolve Signal Node Vault Incongruences</p>
        </div>
        <div className="glass px-3 py-1.5 rounded-2xl flex flex-col items-end border-emerald-500/20 bg-emerald-500/5">
           <span className="text-[8px] font-black uppercase text-emerald-500/60 leading-none">Cores Synced</span>
           <span className="text-md font-black italic">{completedCount + completedSupabaseCount} verified</span>
        </div>
      </div>

      {/* Section 1: Telegram Channels and Announcements (Community Tasks) */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] px-1">I. Social Community Access Points</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {communityTasks.map((task) => {
             const Icon = task.icon;
             const isPending = claimingCommunityIdsRef.current.includes(task.id);
             return (
               <button
                 key={task.id}
                 onClick={() => handleCommunityAction(task)}
                 disabled={task.completed || isPending || !user.onboarded}
                 className={cn(
                   "group text-left glass border-white/5 hover:border-white/10 p-4.5 rounded-3xl relative overflow-hidden transition-all duration-300 w-full flex items-center justify-between",
                   task.completed ? "opacity-35" : "hover:scale-[1.01]"
                 )}
               >
                  <div className="flex items-center gap-3.5">
                     <div className={cn(
                       "w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors",
                       task.completed 
                         ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                         : "bg-blue-500/10 text-blue-400 border-blue-500/20 group-hover:border-blue-400/30"
                     )}>
                        {task.completed ? (
                          <CheckCircle2 size={20} />
                        ) : isPending ? (
                          <RefreshCw className="animate-spin" size={20} />
                        ) : (
                          <Icon size={20} />
                        )}
                     </div>
                     <div>
                        <h4 className="text-xs font-black uppercase tracking-tight text-white/95 leading-none">{task.title}</h4>
                        <span className="text-[9px] font-mono font-black text-amber-500 mt-1 block">+{task.reward} ZP +1 KEY</span>
                     </div>
                  </div>
                  <div>
                    {task.completed ? (
                      <span className="text-[10px] font-black uppercase italic text-emerald-500">Secured</span>
                    ) : (
                      <>
                        <ExternalLink size={14} className="group-hover:text-amber-500 transition-colors" />
                      </>
                    )}
                  </div>
               </button>
             );
          })}
        </div>
      </section>

      {/* Section 2: Dynamic 10-Task Security Batch */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1 bg-white/[0.01] border border-white/5 py-2 px-4 rounded-3xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.15em]">II. Dynamic Security Transmissions</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="transparent"
                  stroke="rgba(245, 158, 11, 0.08)"
                  strokeWidth="3.5"
                />
                <motion.circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ 
                    strokeDashoffset: 2 * Math.PI * 20 - (completedCount / batchTasks.length) * (2 * Math.PI * 20) 
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center -mt-0.5">
                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                  {completedCount}
                </span>
                <span className="text-[7.5px] font-mono text-white/30 font-black leading-none mt-0.5">
                  /{batchTasks.length}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col text-right leading-none">
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">BATCH RESOLUTION</span>
              <span className="text-[7.5px] font-mono font-black text-white/35 uppercase mt-0.5">
                {completedCount === batchTasks.length ? "FULLY SECURED" : "SYNCING CORES"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl p-3 text-center">
          <p className="text-[9px] text-amber-400 font-black uppercase tracking-wider">
            ⚙️ ACTIVE RECON TRANSMISSION FLOW
          </p>
          <p className="text-[8px] text-white/40 uppercase font-bold mt-0.5">
            A defensive 6-hour cooldown is in place between clicks to safeguard node integrity.
          </p>
        </div>

        <div className="space-y-3">
          {batchTasks.map((task) => {
            const isLoading = loadingTaskId === task.id;
            const remainingSecs = getRemainingCooldown(task.id);
            const isCooldownActive = remainingSecs > 0;
            const isDecrypt = task.type === 'decrypt_node';
            const isAdTask = task.type === 'interstitial_task' || task.type === 'rewarded_interstitial_task' || task.type === 'pop_task';

            return (
              <div
                key={task.id}
                className={cn(
                  "relative block w-full glass rounded-3xl p-5 border-white/5 overflow-hidden transition-all duration-300",
                  task.completed ? "opacity-35" : "hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                      task.completed 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                        : isDecrypt
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : isAdTask
                            ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                            : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {task.completed ? (
                        <CheckCircle2 size={24} />
                      ) : isLoading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : isDecrypt ? (
                        <Shield size={20} />
                      ) : isAdTask ? (
                        <Play size={20} className="fill-violet-400 text-violet-400 ml-0.5" />
                      ) : (
                        <ExternalLink size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-white/95">
                        {task.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] font-black font-mono text-amber-500 leading-none">
                          +{task.rewardCoins} ZP
                        </span>
                        {task.rewardKeys > 0 && (
                          <span className="text-[9.5px] font-black font-mono text-violet-400 leading-none flex items-center gap-0.5">
                            • <Key size={10} className="inline" /> +{task.rewardKeys} Key
                          </span>
                        )}
                        {task.rewardMats > 0 && (
                          <span className="text-[9.5px] font-black font-mono text-emerald-400 leading-none">
                            • +{task.rewardMats} Element
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    {task.completed ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl block text-center min-w-[100px]">
                          SECURED
                        </span>
                        {getRemainingCooldown(task.id) > 0 && (
                          <span className="text-[8.5px] font-mono font-black text-rose-400 uppercase flex items-center justify-center gap-1 border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 rounded-md animate-pulse min-w-[100px]">
                            BREAK: {(() => {
                              const rem = getRemainingCooldown(task.id);
                              const mins = Math.floor(rem / 60).toString().padStart(2, '0');
                              const secs = (rem % 60).toString().padStart(2, '0');
                              return `${mins}:${secs}`;
                            })()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleBatchTaskAction(task)}
                        disabled={isLoading || isCooldownActive || !user.onboarded}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-black uppercase italic tracking-tighter text-[9px] active:scale-95 transition-all text-center min-w-[100px]",
                          isCooldownActive
                            ? "bg-white/5 border border-white/10 text-rose-500 cursor-not-allowed font-mono font-bold"
                            : isDecrypt
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : isAdTask
                                ? "bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white border border-violet-500/30"
                                : "bg-blue-500 text-white hover:bg-blue-400"
                        )}
                      >
                        {isLoading 
                          ? (isDecrypt 
                              ? "DECRYPTING..."
                              : isAdTask
                                ? "PLAYING..."
                                : `SYNCING (${linkCountdown}S)`)
                          : isCooldownActive
                            ? (() => {
                                const mins = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
                                const secs = (remainingSecs % 60).toString().padStart(2, '0');
                                return `${mins}:${secs}`;
                              })()
                            : isDecrypt 
                              ? "DECRYPT NODE" 
                              : isAdTask
                                ? "PLAY BROADCAST"
                                : "VISIT FREQ"
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Conversion Refresh Override */}
      <section className="glass rounded-[2rem] border-amber-500/20 bg-gradient-to-r from-amber-500/[0.04] to-black p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-amber-500 animate-pulse" />
          <h3 className="text-sm font-black uppercase italic tracking-tight">Convert Elements & ZP to Refresh</h3>
        </div>
        <p className="text-[10px] text-white/50 uppercase font-black leading-relaxed">
          Exhausted your 12-task batch, or blocked by a rate limit? Inject energy coordinates back to instantly reload all 12 tasks and erase active cooldowns!
        </p>

        <div className="flex items-center justify-between border-t border-dashed border-white/5 pt-4">
          <div className="space-y-1 text-left">
            <div className="text-[8px] font-black text-white/30 uppercase tracking-widest leading-none">REFRESH PRICE</div>
            <div className="text-[10px] text-white/60 font-black uppercase">
              <strong className="text-amber-500 font-mono">12,000 ZP</strong> + <strong className="text-emerald-500 font-mono">50 Elements</strong>
            </div>
          </div>
          
          <button
            onClick={handleConvertRefresh}
            disabled={resources.coins < 12000 || resources.baseMaterials < 50 || !user.onboarded}
            className={cn(
              "px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider active:scale-95 transition-all text-center border",
              (resources.coins >= 12000 && resources.baseMaterials >= 50)
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black border-amber-500/25 cursor-pointer hover:shadow-lg hover:shadow-amber-500/5"
                : "bg-white/[0.01] border-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            INJECT REFRESH REGEN
          </button>
        </div>
      </section>

      {/* Section 4: Live Cloud Database Quest Cores */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1 bg-white/[0.01] border border-white/5 py-2 px-4 rounded-3xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.15em]">III. Cloud Sync Database Quests</h3>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="transparent"
                  stroke="rgba(16, 185, 129, 0.08)"
                  strokeWidth="3.5"
                />
                <motion.circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ 
                    strokeDashoffset: 2 * Math.PI * 20 - (totalSupabaseCount > 0 ? (Math.min(completedSupabaseCount, totalSupabaseCount) / totalSupabaseCount) : 0) * (2 * Math.PI * 20) 
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center -mt-0.5">
                <span className="text-[11px] font-mono font-black text-emerald-400 leading-none">
                  {completedSupabaseCount}
                </span>
                <span className="text-[7.5px] font-mono text-white/30 font-black leading-none mt-0.5">
                  /{totalSupabaseCount}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col text-right leading-none">
              <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">CLOUD STORAGE</span>
              <span className="text-[7.5px] font-mono font-black text-white/35 uppercase mt-0.5">
                {completedSupabaseCount === totalSupabaseCount && totalSupabaseCount > 0 ? "FULLY SYNCED" : "UNRESOLVED"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest leading-none mb-1">
            ⚡ REAL-TIME SECURE CLOUD CORES
          </p>
          <p className="text-[8px] text-white/40 uppercase font-bold">
            All balance changes are saved in real-time to your secure public users and transactions tables on the cloud network.
          </p>
        </div>

        <div className="space-y-3">
          {supabaseTasks.map((task) => {
            const isCompleted = completedTaskIds.includes(task.id);
            const isClaiming = claimingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={cn(
                  "relative block w-full glass rounded-3xl p-5 border-white/5 overflow-hidden transition-all duration-300",
                  isCompleted ? "opacity-35" : "hover:border-white/10"
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                      isCompleted 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 size={24} />
                      ) : isClaiming ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : (
                        <Sparkles size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-white/95">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] font-black font-mono text-amber-400">
                          +{Number(task.reward).toLocaleString()} ZP
                        </span>
                        <span className="text-[9.5px] font-black font-mono text-violet-400 block sm:inline">
                          • +Welcome Bonus Decryption
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isCompleted ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl block text-center min-w-[100px]">
                        RESOLVED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaimSupabaseTask(task)}
                        disabled={isClaiming || claimingTaskId !== null || !user.onboarded}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-black uppercase italic tracking-tighter text-[9px] active:scale-[0.95] transition-all text-center min-w-[100px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                        )}
                      >
                        {isClaiming 
                          ? `SYNCING (${linkCountdown}S)`
                          : "DECRYPT KEY"
                        }
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 5: Real-Time Transaction Ledger */}
      <section className="space-y-3">
         <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] px-1">IV. Secure Transaction Log Ledger</h3>
         <div className="glass rounded-[2rem] border-white/5 p-5 bg-gradient-to-b from-neutral-950 to-black space-y-4 max-h-[250px] overflow-y-auto">
           {transactions.length === 0 ? (
              <div className="py-6 text-center">
                 <Database size={24} className="text-white/10 mx-auto mb-2" />
                 <p className="text-[9px] text-white/30 uppercase font-bold">No transactions found on the database logs. Set up missions to log records.</p>
              </div>
           ) : (
              <div className="space-y-3.5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center text-left py-1 border-b border-white/[0.02]">
                     <div>
                       <span className="text-[10px] font-black text-white/90 block uppercase">
                          {tx.type === "welcome_package" ? "WELCOME IDENTITY DEPOSIT" : 
                           tx.type === "referral_bonus" ? "AGENT COMPATRIOT BONUS" : 
                           "TACTICAL TASK CRITICAL PAYOUT"}
                       </span>
                       <span className="text-[8px] font-mono text-white/45 block mt-0.5">
                          DATE: {new Date(tx.created_at).toLocaleString()}
                       </span>
                     </div>
                     <div className="text-right">
                       <span className="text-xs font-mono font-black text-emerald-400">
                          +{Number(tx.amount).toLocaleString()} ZP
                       </span>
                     </div>
                  </div>
                ))}
              </div>
           )}
         </div>
      </section>

      {/* Animation Success Overlay for clue tokens */}
      <AnimatePresence>
        {successAnimation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-6"
          >
            <div className="glass rounded-[3.5rem] p-8 max-w-sm w-full text-center border-amber-500/40 bg-gradient-to-b from-neutral-950 to-black space-y-6">
              <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-[2.2rem] flex items-center justify-center text-black mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)] border border-amber-400/20">
                <Sparkles size={40} className="animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-amber-500">
                  {successAnimation.clueAwarded > 0 ? "COORDINATES SECURED" : "BATCH REGENERATED"}
                </h3>
                <p className="text-[10px] text-white/40 uppercase font-black tracking-wider mt-1">
                  {successAnimation.clueAwarded > 0 ? "Extraction cycle complete." : "Force rewrite payload injected."}
                </p>
              </div>

              {successAnimation.clueAwarded > 0 && (
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                  <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest block mb-2">TELEMETRY REWARDS EXPELLED</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-black text-violet-400 font-mono flex items-center gap-1.1">
                      <Sparkles size={16} /> +{successAnimation.clueAwarded} CLUE
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSuccessAnimation(null)}
                className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase italic tracking-tight active:scale-95 transition-all text-xs"
              >
                Close Session Link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center pt-2">
         <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] text-center italic">Encryption Standards</h4>
         <p className="text-[10px] text-white/40 text-center leading-relaxed font-bold">
            Social data is encrypted using the ClueVault Signal Protocol. Batch operations lock limits to prevent anti-bot network blockages. Bypassing limits is allowed via Elements injection points.
         </p>
      </div>

    </div>
  );
}
