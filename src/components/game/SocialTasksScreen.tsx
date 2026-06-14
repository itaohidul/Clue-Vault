import { useState, useEffect } from "react";
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
  Tv, 
  Sparkles, 
  Eye, 
  RefreshCw,
  Coins,
  Key,
  Cpu,
  Database,
  Lock,
  Timer,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, safeOpenLink } from "../../lib/utils";
import { triggerAd } from "../../lib/adEngine";

interface TaskState {
  id: string;
  name: string;
  type: 'ad_pop' | 'ad_interstitial' | 'ad_gamma' | 'link_alpha' | 'link_beta';
  completed: boolean;
  rewardCoins: number;
  rewardKeys: number;
  rewardMats: number;
  link?: string;
}

const INITIAL_BATCH: TaskState[] = [
  { id: "task_1", name: "Sponsor Broadcast Alpha [Pop]", type: "ad_pop", completed: false, rewardCoins: 600, rewardKeys: 1, rewardMats: 0 },
  { id: "task_2", name: "Sponsor Broadcast Alpha [Pop] II", type: "ad_pop", completed: false, rewardCoins: 600, rewardKeys: 1, rewardMats: 0 },
  { id: "task_3", name: "Sponsor Broadcast Beta [Interstitial]", type: "ad_interstitial", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_4", name: "Sponsor Broadcast Beta [Interstitial] II", type: "ad_interstitial", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_5", name: "Sponsor Broadcast Beta [Interstitial] III", type: "ad_interstitial", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_6", name: "Sponsor Broadcast Gamma [Direct]", type: "ad_gamma", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_7", name: "Sponsor Broadcast Gamma [Direct] II", type: "ad_gamma", completed: false, rewardCoins: 500, rewardKeys: 1, rewardMats: 0 },
  { id: "task_8", name: "Quantum Link Access [Alpha]", type: "link_alpha", link: "https://omg10.com/4/11030039", completed: false, rewardCoins: 375, rewardKeys: 0, rewardMats: 2 },
  { id: "task_9", name: "Quantum Link Access [Alpha] II", type: "link_alpha", link: "https://omg10.com/4/11030039", completed: false, rewardCoins: 375, rewardKeys: 0, rewardMats: 2 },
  { id: "task_10", name: "Frequency Link Audit [Beta]", type: "link_beta", link: "https://omg10.com/4/6430252", completed: false, rewardCoins: 375, rewardKeys: 0, rewardMats: 2 }
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

  // Unskippable Quest Ad state
  const [showQuestAd, setShowQuestAd] = useState(false);
  const [questAdCountdown, setQuestAdCountdown] = useState(5);
  const [activeQuestTask, setActiveQuestTask] = useState<any | null>(null);
  const [currentQuestAdIndex, setCurrentQuestAdIndex] = useState(0);

  const QUEST_ADS = [
    { title: "Defect Detector Pro Security Guard", desc: "Automate your defense grid node to block inbound packet injections. No root access keys required.", mockUrl: "guard.defector.node" },
    { title: "Z-Alloy Synthesizer Rig 3.0", desc: "Process base metals at 99.8% precision rate to feed your local vault core memory.", mockUrl: "alloy.synthesizer.clue" },
    { title: "Consensus VPN Multi-Hop Routing", desc: "Secure your public IP packets across 20 global nodes behind anti-firewalls.", mockUrl: "consensusvpn.encrypt" }
  ];

  // Quest unskippable ad timer countdown
  useEffect(() => {
    let timer: any;
    if (showQuestAd && questAdCountdown > 0) {
      timer = setInterval(() => {
        setQuestAdCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showQuestAd, questAdCountdown]);

  // Load or initialize persistent batch list (10 tasks)
  const [batchTasks, setBatchTasks] = useState<TaskState[]>(() => {
    const saved = localStorage.getItem("cluevault_tasks_batch_state");
    if (saved) {
      try {
        return JSON.parse(saved);
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
      [taskId]: Date.now() + 240 * 1000 // 4 minutes
    };
    saveTaskCooldowns(nextCooldowns);
  };

  // Loading indicator for active task triggers
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState<{ active: boolean; clueAwarded: number } | null>(null);

  // Link task countdown
  const [linkCountdown, setLinkCountdown] = useState<number>(5);

  const [activeAd, setActiveAd] = useState<TaskState | null>(null);

  // Ad watch state validation structure to avoid instant rewarded exploits
  const [adWatchState, setAdWatchState] = useState<{
    active: boolean;
    task: TaskState | null;
    countdown: number;
    error: string | null;
  }>({ active: false, task: null, countdown: 0, error: null });

  // Add effect for SocialTasks ad error handling only
  useEffect(() => {
    if (adWatchState.error) {
      const timer = setTimeout(() => {
        setAdWatchState(prev => ({ ...prev, error: null, active: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [adWatchState.error]);

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

  // Handle claiming in Supabase database (Show unskippable ad instead of opening random links)
  const handleClaimSupabaseTask = async (task: any) => {
    if (completedTaskIds.includes(task.id) || !user.onboarded) return;

    triggerHaptic("medium");
    setClaimingTaskId(task.id);

    try {
      // Trigger prioritized ad flow: Rewarded -> Interstitial -> Popunder -> Direct
      await triggerAd('rewarded');

      // On successful ad engagement (or fallback success)
      const success = await claimSupabaseTask(task.id);
      if (success) {
        const randomClue = Math.floor(Math.random() * 15) + 1;
        updateResources({ clue: randomClue });
        
        // Log transaction to cloud and local instantly
        const claimRewardZP = task.reward || 1000;
        const claimRewardKeys = task.reward_keys || task.rewardKeys || 1;
        
        logTransaction(randomClue, "task_completion", "Clue");
        logTransaction(claimRewardZP, "task_completion", "ZP");
        
        addTransaction({ type: "task_completion", amount: randomClue, currency: "CLUE" });
        addTransaction({ type: "task_completion", amount: claimRewardZP, currency: "ZP" });
        addTransaction({ type: "task_completion", amount: claimRewardKeys, currency: "KEY" });
        
        // Trigger rewarded ad break at task completion
        await triggerAd('rewarded');

        loadTransactions();
        setSuccessAnimation({ active: true, clueAwarded: randomClue });
        triggerHaptic("success");
      }
    } catch (e) {
      console.error("Ad error during task claim:", e);
    } finally {
      setClaimingTaskId(null);
    }
  };

  // Handle Community Tasks
  const handleCommunityAction = (task: any) => {
    if (task.completed || !user.onboarded) return;

    safeOpenLink(task.link);
    triggerHaptic("medium");

    setTimeout(async () => {
      const nextTasks = communityTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
      saveCommunityState(nextTasks);
      
      // Calculate random clue reward
      const clueTokens = Math.floor(Math.random() * 20) + 1;
      completeMission({ coins: task.reward, keys: 1, clue: clueTokens, xp: true });
      
      // Trigger ad break at natural break (completing a task)
      await triggerAd('rewarded');

      setSuccessAnimation({ active: true, clueAwarded: clueTokens });
      triggerHaptic("success");
    }, 1500);
  };

  // Safely execute Ads
  const executeAdWithTimeout = (adFn: () => any, timeoutMs: number = 4000) => {
    let completed = false;
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn("Clip ad network timeout. Invoking local user fallback reward.");
          resolve();
        }
      }, timeoutMs);

      try {
        const result = adFn();
        if (result && typeof result.then === 'function') {
          result.then(() => {
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          }).catch((err: any) => {
            console.error("Ad promise error fallback:", err);
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          });
        } else {
          setTimeout(() => {
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          }, 1500);
        }
      } catch (err) {
        console.error("Ad exception fallback launched:", err);
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });
  };

  // Handle interactive closure of active sponsor transmissions
  const handleCloseActiveAd = (isTap: boolean) => {
    if (!activeAd) return;
    const task = activeAd;
    const randomClue = Math.floor(Math.random() * 20) + 1;

    // Complete & Reward
    completeMission({ 
      coins: task.rewardCoins, 
      keys: task.rewardKeys, 
      clue: randomClue, 
      xp: true 
    });

    // Update state
    const nextTasks = batchTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
    saveBatchState(nextTasks);
    
    setActiveAd(null);
    setLoadingTaskId(null);
    setSuccessAnimation({ active: true, clueAwarded: randomClue });
    triggerHaptic("success");

    // Start task-specific cooling timer!
    startTaskCooldown(task.id);

    if (isTap) {
      // ONLY open target link when they purposefully click/tap
      safeOpenLink(task.link || "https://omg10.com/4/11030019");
    }
  };

  // Handle completing a task in the dynamic 10-task batch
  const handleBatchTaskAction = async (task: TaskState) => {
    if (task.completed || !user.onboarded) return;

    const randomClue = Math.floor(Math.random() * 20) + 1;

    // Reject if task specific cooldown is active
    const remaining = getRemainingCooldown(task.id);
    if (remaining > 0) {
      triggerHaptic("error");
      return;
    }

    setLoadingTaskId(task.id);
    triggerHaptic("medium");

     // Handle ads format with immersive custom activeAd frame
     if (task.type === 'ad_pop' || task.type === 'ad_interstitial' || task.type === 'ad_gamma') {
       if (task.type === 'ad_gamma') {
         // ad_gamma: Open safe interactive activeAd frame nicely
         setActiveAd(task);
         setLoadingTaskId(null);
       } else {
         
         setAdWatchState({
           active: true,
           task,
           countdown: 0,
           error: null
         });

         // Prioritize rewarded interstitials for all ad tasks
         const adType = 'rewarded';
         
         const onComplete = () => {
           const randomClue = Math.floor(Math.random() * 20) + 1;
           completeMission({
             coins: task.rewardCoins,
             keys: task.rewardKeys,
             baseMaterials: task.rewardMats,
             clue: randomClue,
             xp: true
           });

           const nextTasks = batchTasks.map(t => t.id === task.id ? { ...t, completed: true } : t);
           saveBatchState(nextTasks);
           
           setAdWatchState({ active: false, task: null, countdown: 0, error: null });
           setLoadingTaskId(null);
           setSuccessAnimation({ active: true, clueAwarded: randomClue });
           triggerHaptic("success");
           startTaskCooldown(task.id);
           alert('You have seen an ad!');
         };

         const onError = (e: any) => {
           console.error("Ad Engine Execution Error:", e);
           setAdWatchState({ active: false, task: null, countdown: 0, error: "SIGNAL TRANSMISSION FAILED" });
           setLoadingTaskId(null);
           triggerHaptic("error");
         };

         try {
           triggerAd(adType).then(onComplete).catch(onError);
         } catch (err) {
           console.error("SDK Call Exception:", err);
           onError(err);
         }
       }
       return;
     }

    // Handle Link matching
      if (task.link) {
        safeOpenLink(task.link);
      }

      setLinkCountdown(5);
      const interval = setInterval(() => {
        setLinkCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            
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

            // Cooldown starts for links too
            startTaskCooldown(task.id);
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
  };

  // Convert elements & ZP to refresh the batch & bypass cooldown
  const handleConvertRefresh = async () => {
    const costZP = 7200;
    const costElements = 10;

    if (resources.coins >= costZP && resources.baseMaterials >= costElements) {
      // Deduct resources
      updateResources({ 
        coins: -costZP, 
        baseMaterials: -costElements 
      });

      // Log the spend in transaction logs
      logTransaction(-costZP, "task_refresh", "ZP");
      addTransaction({ type: "task_refresh", amount: -costZP, currency: "ZP" });
      addTransaction({ type: "task_refresh", amount: -costElements, currency: "ELEMENT" });

      // Reset all tasks to ready
      const resetBatch = INITIAL_BATCH.map(t => ({ ...t, completed: false }));
      saveBatchState(resetBatch);

      // Instantly clear all active individual task cooldowns!
      saveTaskCooldowns({});

      triggerHaptic("success");
      setSuccessAnimation({ active: true, clueAwarded: 0 }); 
    } else {
      triggerHaptic("error");
    }
  };

  const completedCount = batchTasks.filter(t => t.completed).length;
  const completedSupabaseCount = supabaseTasks.filter(t => completedTaskIds.includes(t.id)).length;
  const totalSupabaseCount = supabaseTasks.length;

  return (
    <div className="p-5 pb-24 space-y-6">
      
      {/* Resource Balances Header */}
      <div className="glass rounded-[2rem] border-white/5 p-4 bg-gradient-to-r from-neutral-950 via-neutral-900 to-black shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <span className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest block mb-2 px-1">🟢 CURRENT DECIPHER ASSETS</span>
        
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">ZP (COINS)</span>
            <span className="text-xs font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Coins size={11} className="text-amber-400" />
              {resources.coins.toLocaleString()}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">ELEMENTS</span>
            <span className="text-xs font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Cpu size={11} className="text-emerald-400" />
              {resources.baseMaterials}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">KEYS</span>
            <span className="text-xs font-black text-cyan-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Key size={11} className="text-cyan-400" />
              {resources.keys}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">CLUE BAL</span>
            <span className="text-xs font-black text-violet-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Sparkles size={11} className="text-violet-400" />
              {resources.clue}
            </span>
          </div>
        </div>
      </div>

      {!user.onboarded && (
        <div className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex items-center justify-between gap-4">
           <div>
              <h3 className="text-[10px] font-black uppercase text-amber-500 mb-0.5">Observation Mode</h3>
              <p className="text-[8px] text-white/40 uppercase font-bold">Log in to link credentials.</p>
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem("cluevault_onboarding_skipped");
               localStorage.removeItem("cluevault_onboarding_hidden");
               window.location.reload();
             }}
             className="bg-amber-500 text-black px-4 py-2 rounded-xl font-black uppercase italic text-[8px]"
           >
             Login
           </button>
        </div>
      )}

      <header>
        <div className="flex items-center gap-2 mb-1">
           <Shield size={16} className="text-amber-500" />
           <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Global Rewards Hub</span>
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Earn Network</h1>
        <p className="text-sm text-white/50 italic font-medium">Bypass anti-bot firewalls to sync secure decryption assets.</p>
      </header>



      {/* Section 1: Dynamic 10-Task Decryption Batch */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 bg-white/[0.01] border border-white/5 py-2 px-4 rounded-3xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">I. Active Decryption Batch</h3>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Radial Progress Ring Component */}
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
                  animate={{ strokeDashoffset: 2 * Math.PI * 20 - (Math.min(completedCount, 10) / 10) * (2 * Math.PI * 20) }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center -mt-0.5">
                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                  {completedCount}
                </span>
                <span className="text-[7px] font-mono text-white/30 font-black leading-none mt-0.5">
                  /10
                </span>
              </div>
            </div>
            
            <div className="flex flex-col text-right leading-none">
              <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">BATCH STATUS</span>
              <span className="text-[7.5px] font-mono font-black text-white/35 uppercase mt-0.5">
                {completedCount === 10 ? "FULLY SECURED" : "SYNCING CORES"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl p-3 text-center">
          <p className="text-[9px] text-amber-400 font-black uppercase tracking-wider">
            ⚙️ ACTIVE RECON TRANSMISSION FLOW
          </p>
          <p className="text-[8px] text-white/40 uppercase font-bold mt-0.5">
            To prevent ad-network blockage, a defensive 4-minute cooldown is in place between clicks.
          </p>
        </div>

        <AnimatePresence>
          {adWatchState.error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 text-rose-200 p-4 rounded-2xl flex items-start gap-3 overflow-hidden mb-4"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                <AlertTriangle size={18} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-rose-400 block tracking-wider leading-none">COMMUNICATION LIMITER</span>
                <span className="text-[9px] uppercase font-bold text-white/50 block mt-1 tracking-tight">{adWatchState.error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {batchTasks.map((task) => {
            const isLoading = loadingTaskId === task.id;
            const remainingSecs = getRemainingCooldown(task.id);
            const isCooldownActive = remainingSecs > 0;
            const isAd = task.type === 'ad_pop' || task.type === 'ad_interstitial' || task.type === 'ad_gamma';

            return (
              <div
                key={task.id}
                className={cn(
                  "relative block w-full glass rounded-3xl p-5 border-white/5 overflow-hidden transition-all duration-300",
                  task.completed && !isCooldownActive ? "opacity-35" : "hover:border-white/10"
                )}
              >
                {/* Blurring Canvas Overlay for active cooldowns */}
                {isCooldownActive && (
                  <div className="absolute inset-0 bg-neutral-950/75 backdrop-blur-[8px] z-10 flex items-center justify-between p-5 border border-rose-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 animate-pulse">
                        <Timer size={18} />
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase text-rose-500 block tracking-widest leading-none">TELEMETRY LOCKOUT</span>
                        <span className="text-[10px] text-white/50 uppercase font-bold block mt-1 tracking-tight">STABILIZING FREQUENCY FEED</span>
                      </div>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 rounded-xl text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <span className="text-xs font-mono font-black text-rose-500 tracking-wider">
                        {(() => {
                          const mins = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
                          const secs = (remainingSecs % 60).toString().padStart(2, '0');
                          return `${mins}:${secs}`;
                        })()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                      task.completed 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                        : isAd 
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      {task.completed ? (
                        <CheckCircle2 size={24} />
                      ) : isLoading ? (
                        <RefreshCw className="animate-spin" size={20} />
                      ) : isAd ? (
                        <Tv size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-white/95">
                        {task.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-black font-mono text-amber-400">
                          +{task.rewardCoins} ZP
                        </span>
                        {task.rewardKeys > 0 && (
                          <span className="text-[9px] font-black font-mono text-cyan-400 flex items-center gap-0.5">
                            • <Key size={8} /> +{task.rewardKeys} Key
                          </span>
                        )}
                        {task.rewardKeys > 0 && (
                          <div className="flex items-center gap-1">
                            <Key size={10} className="text-amber-500" />
                            <span className="text-white/40">{task.rewardKeys}</span>
                          </div>
                        )}
                        {task.rewardMats > 0 && (
                          <span className="text-[9px] font-black font-mono text-emerald-400 flex items-center gap-0.5">
                            • <Cpu size={8} /> +{task.rewardMats} Elements
                          </span>
                        )}
                        <span className="text-[9px] font-black font-mono text-violet-400 block sm:inline">
                          • +1-20 Clue
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {task.completed ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl block text-center min-w-[100px]">
                        SECURED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleBatchTaskAction(task)}
                        disabled={isLoading || isCooldownActive || !user.onboarded}
                        className={cn(
                          "px-4 py-2.5 rounded-xl font-black uppercase italic tracking-tighter text-[9px] active:scale-95 transition-all text-center min-w-[100px]",
                          isCooldownActive
                            ? "bg-white/5 border border-white/10 text-rose-500 cursor-not-allowed font-mono font-bold"
                            : isAd
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : "bg-blue-500 text-white hover:bg-blue-400"
                        )}
                      >
                        {isLoading 
                          ? (isAd 
                              ? (adWatchState.active && adWatchState.task?.id === task.id 
                                  ? "VERIFYING..." 
                                  : "BROADCASTING...")
                              : `SYNCING (${linkCountdown}S)`)
                          : isCooldownActive
                            ? (() => {
                                const mins = Math.floor(remainingSecs / 60).toString().padStart(2, '0');
                                const secs = (remainingSecs % 60).toString().padStart(2, '0');
                                return `${mins}:${secs}`;
                              })()
                            : isAd 
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

      {/* Section 2: Conversion Refresh Override */}
      <section className="glass rounded-[2rem] border-amber-500/20 bg-gradient-to-r from-amber-500/[0.04] to-black p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-amber-500 animate-pulse" />
          <h3 className="text-sm font-black uppercase italic tracking-tight">Convert Elements & ZP to Refresh</h3>
        </div>
        <p className="text-[10px] text-white/50 uppercase font-black leading-relaxed">
          Exhausted your 10-task batch, or blocked by a rate limit? Inject energy coordinates back to instantly reload all 10 tasks and erase active cooldowns!
        </p>

        <div className="flex items-center justify-between border-t border-dashed border-white/5 pt-4">
          <div className="space-y-1 text-left">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block">OVERRIDE FEE REQ</span>
            <div className="flex gap-3">
              <span className="text-[10px] font-mono font-black text-amber-500 flex items-center gap-1">
                <Coins size={11} /> 7200 ZP
              </span>
              <span className="text-[10px] font-mono font-black text-emerald-400 flex items-center gap-1">
                <Cpu size={11} /> 10 Elements
              </span>
            </div>
          </div>

          <button
            onClick={handleConvertRefresh}
            disabled={resources.coins < 7200 || resources.baseMaterials < 10}
            className={cn(
              "px-5 py-3 rounded-xl font-black uppercase text-[10px] italic active:scale-95 transition-all text-black",
              (resources.coins >= 7200 && resources.baseMaterials >= 10)
                ? "bg-gradient-to-r from-amber-500 to-amber-600 glow-gold hover:from-amber-400 hover:to-amber-500"
                : "bg-white/5 text-white/20 border border-white/5 cursor-default"
            )}
          >
            {(resources.coins >= 7200 && resources.baseMaterials >= 10) ? "Force Refresh Batch" : "Insufficient Assets"}
          </button>
        </div>
      </section>

      {/* Section 3: One-Time Telegram Community Credentials */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] px-1">II. Social Security Verification</h3>
        <div className="space-y-3">
          {communityTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => handleCommunityAction(task)}
              disabled={task.completed || !user.onboarded}
              className={cn(
                "w-full glass rounded-3xl p-5 border-white/5 flex items-center justify-between group transition-all text-left",
                task.completed ? "opacity-50 grayscale cursor-default" : "hover:border-white/10 active:scale-[0.98]",
                !user.onboarded && "opacity-30 grayscale cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0",
                  task.completed ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40 group-hover:bg-amber-500 group-hover:text-black"
                )}>
                  {task.completed ? <CheckCircle2 size={24} /> : <task.icon size={24} />}
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight text-white/95">{task.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[10px] font-black text-amber-500">+{task.reward} ZP</span>
                     <span className="text-[9px] text-white/20 uppercase font-black tracking-widest">• Secured link</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/20">
                 {task.completed ? (
                   <span className="text-[10px] font-black uppercase italic text-emerald-500">Secured</span>
                 ) : (
                   <>
                     <ExternalLink size={14} className="group-hover:text-amber-500 transition-colors" />
                     <ChevronRight size={18} />
                   </>
                 )}
              </div>
            </button>
          ))}
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
            {/* Radial Progress Ring Component */}
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
                <span className="text-[7px] font-mono text-white/30 font-black leading-none mt-0.5">
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
                        <span className="text-[9px] font-black font-mono text-amber-400">
                          +{Number(task.reward).toLocaleString()} ZP
                        </span>
                        <span className="text-[9px] font-black font-mono text-violet-400 block sm:inline">
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

      {/* Immersive Fullscreen Active Ad telemetry Stream */}
      <AnimatePresence>
        {activeAd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/98 z-50 flex flex-col justify-between p-6 overflow-y-auto"
          >
            {/* Topbar of transmission stream */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest">
                  LIVE SPONSOR TELEMETRY DECODE
                </span>
              </div>
              <button 
                onClick={() => handleCloseActiveAd(false)}
                className="bg-white/5 border border-white/10 text-white/60 hover:text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>← BACK</span>
              </button>
            </div>

            {/* Immersive Main Sponsor Board card */}
            <div className="my-auto max-w-md mx-auto w-full space-y-6 text-center">
              <div className="glass rounded-[3rem] p-6 border-amber-500/30 bg-gradient-to-t from-neutral-950 to-amber-500/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                
                {/* Visual telemetry node */}
                <div 
                  onClick={() => handleCloseActiveAd(true)}
                  className="w-full aspect-video rounded-[1.8rem] bg-neutral-900 border border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden cursor-pointer hover:border-amber-500/40 select-none transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] animate-pulse"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/[0.03] to-violet-500/[0.03]" />
                  <Database size={48} className="text-amber-500/65 mb-4" />
                  <span className="text-[11px] font-black uppercase text-amber-500/80 tracking-widest block mb-1">
                    [ SPONSOR LINK DIRECTORY ]
                  </span>
                  <p className="text-[14px] font-black uppercase text-white tracking-tight px-4 mb-2">
                    {activeAd.name}
                  </p>
                  <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                    TAP GRAPHIC TO OPEN WEBLINK
                  </span>
                </div>

                {/* Sub banner text */}
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-black uppercase italic tracking-tighter text-white">Interactive Sponsor Channel Code</h4>
                  <p className="text-[10px] text-white/40 leading-relaxed font-bold">
                    Tapping the sponsor banner or backing out returns you instantly to the secure node while unlocking rewards coordinate buffers!
                  </p>
                </div>
              </div>

              {/* Mega CTA Button action to tap the ad directly */}
              <button
                onClick={() => handleCloseActiveAd(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black py-4 rounded-xl font-black uppercase italic tracking-tight active:scale-95 transition-all text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
              >
                <span>DECODE SPONSOR CHANNEL WEB & SECURE</span>
                <ExternalLink size={14} />
              </button>
            </div>

            {/* Bottom info banner */}
            <div className="text-center pt-4 border-t border-white/5">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.15em] block">
                SYSTEM CORRELATION FEEDBACK SECURED — SAFE EXIT EMULATOR ENABLED
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unskippable Quest Ad Overlay */}
      <AnimatePresence>
        {showQuestAd && activeQuestTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-6 text-left"
          >
            <motion.div
              initial={{ scale: 0.9, rotateX: 10, y: 20 }}
              animate={{ scale: 1, rotateX: 0, y: 0 }}
              exit={{ scale: 0.9, rotateX: -10, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-sm bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              {/* Ad Badge */}
              <div className="flex justify-between items-center bg-white/5 border border-white/5 px-3.5 py-1.5 rounded-2xl">
                <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Sponsored Network Broadcast
                </span>
                <span className="text-[9px] font-mono font-black text-white/40 uppercase">
                  Mandatory Sync Ad
                </span>
              </div>

              {/* Video simulation placeholder */}
              <div className="aspect-video bg-neutral-950/80 rounded-2xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent opacity-70" />
                <Tv size={36} className="text-amber-500/30 animate-bounce mb-2" />
                <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">Streaming Sponsor Feed</span>
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/80 px-2.5 py-1 rounded-lg border border-white/5 text-[8px] font-mono text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> BUFFERING SECURE STREAM
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase text-white tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500 shrink-0" />
                  {QUEST_ADS[currentQuestAdIndex].title}
                </h3>
                <p className="text-[10px] text-white/50 leading-relaxed font-bold uppercase">
                  {QUEST_ADS[currentQuestAdIndex].desc}
                </p>
                <div className="text-[8px] font-mono text-white/30 pt-2 border-t border-white/5 flex justify-between uppercase">
                  <span>Route Node: {QUEST_ADS[currentQuestAdIndex].mockUrl}</span>
                  <span className="text-amber-500/60">unskippable ad flow</span>
                </div>
              </div>

              {/* Status Actions */}
              <div className="bg-black/40 border border-white/5 p-4 rounded-3xl space-y-3.5 text-center">
                {questAdCountdown > 0 ? (
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-[11px] font-black uppercase text-amber-500 tracking-wider animate-pulse">
                      Anti-bot security verification in progress
                    </span>
                    <p className="text-[20px] font-mono font-black text-white">
                      {questAdCountdown}s remaining
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic("success");
                      setShowQuestAd(false);
                      setClaimingTaskId(activeQuestTask.id);
                      setLinkCountdown(5);
                      
                      // execute claim
                      claimSupabaseTask(activeQuestTask.id).then((verified) => {
                        setClaimingTaskId(null);
                        if (verified) {
                          const randomClue = Math.floor(Math.random() * 10) + 1;
                          updateResources({ clue: randomClue });
                          
                          // Log transactions to ledger (cloud and local)
                          const claimRewardZP = activeQuestTask.reward || 1000;
                          const claimRewardKeys = activeQuestTask.reward_keys || activeQuestTask.rewardKeys || 1;
                          
                          logTransaction(randomClue, "task_completion", "Clue");
                          logTransaction(claimRewardZP, "task_completion", "ZP");
                          
                          addTransaction({ type: "task_completion", amount: randomClue, currency: "CLUE" });
                          addTransaction({ type: "task_completion", amount: claimRewardZP, currency: "ZP" });
                          addTransaction({ type: "task_completion", amount: claimRewardKeys, currency: "KEY" });

                          // trigger ad
                          triggerAd('rewarded');

                          setSuccessAnimation({ active: true, clueAwarded: randomClue });
                          triggerHaptic("success");
                          loadTasksAndCompletions();
                          loadTransactions();
                        } else {
                          triggerHaptic("error");
                        }
                        setActiveQuestTask(null);
                      });
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black uppercase italic tracking-wider rounded-xl text-[10px] active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Synchronize & Verify Quest Rewards
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 glass rounded-[2.5rem] border-white/5 space-y-4">
         <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] text-center italic">Encryption Standards</h4>
         <p className="text-[10px] text-white/40 text-center leading-relaxed font-bold">
            Social data is encrypted using the ClueVault Signal Protocol. Batch operations lock limits to prevent anti-bot network blockages. Bypassing limits is allowed via Elements injection points.
         </p>
      </div>
    </div>
  );
}
