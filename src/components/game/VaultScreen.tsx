import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../App";
import { useUserStore, getTzDateString } from "../../store/userStore";
import { Lock, Key, Zap, Package, Eye, ArrowRight, ShieldCheck, Star, AlertTriangle, X, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import { VAULT_CONFIG, RIDDLES, Riddle } from "../../data/gameConfig";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useLedgerStore } from "../../store/ledgerStore";

const VAULTS = VAULT_CONFIG.map(v => ({
  ...v,
  color: v.difficulty === 4 ? "from-slate-500 to-slate-800" : 
         v.difficulty === 6 ? "from-amber-600 to-amber-900 border-amber-500/30" : 
         "from-purple-600 to-black border-purple-500/30"
}));

interface DecryptionBypassProps {
  vaultName: string;
  difficulty: number;
  onComplete: () => void;
  onCancel: () => void;
}

function VaultBypassTerminal({ vaultName, difficulty, onComplete, onCancel }: DecryptionBypassProps) {
  const { triggerHaptic } = useGame();
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing" | "success" | "error">("idle");
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const nodes = [
    { label: "SHIELD", color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "CORES", color: "text-amber-400", bg: "bg-amber-400/10" },
    { label: "TARGET", color: "text-red-400", bg: "bg-red-400/10" },
    { label: "SYSTEMS", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  const generateSequence = () => {
    const newSeq = Array.from({ length: difficulty }, () => Math.floor(Math.random() * 4));
    setSequence(newSeq);
    setUserSequence([]);
    setStatus("playing");
    playSequence(newSeq);
  };

  const playSequence = async (seq: number[]) => {
    setIsPlaying(true);
    for (let i = 0; i < seq.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setActiveNode(seq[i]);
      triggerHaptic("light");
      await new Promise((r) => setTimeout(r, 400));
      setActiveNode(null);
    }
    setIsPlaying(false);
  };

  const handleNodeClick = (index: number) => {
    if (isPlaying || status === "success" || status === "idle") return;

    triggerHaptic("medium");
    const newUserSeq = [...userSequence, index];
    setUserSequence(newUserSeq);
    setActiveNode(index);
    setTimeout(() => setActiveNode(null), 200);

    // Check correctness
    if (index !== sequence[newUserSeq.length - 1]) {
      setStatus("error");
      triggerHaptic("error");
      setTimeout(() => {
        setStatus("playing");
        setUserSequence([]);
        playSequence(sequence);
      }, 1000);
      return;
    }

    if (newUserSeq.length === sequence.length) {
      setStatus("success");
      triggerHaptic("success");
      setTimeout(() => onComplete(), 1200);
    }
  };

  useState(() => {
    generateSequence();
  });

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 font-mono">
            VAULT BYPASS SYSTEM PROTOCOL
          </span>
        </div>
        <button 
          onClick={() => { if (status === "playing") onCancel(); }} 
          disabled={status !== "playing"}
          className={cn("w-10 h-10 glass rounded-xl flex items-center justify-center text-white/20 active:scale-95 transition-all", status !== "playing" && "opacity-20 pointer-events-none")}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">{vaultName} Extraction</h2>
          <p className="text-xs text-white/40 max-w-[280px] mx-auto italic font-bold text-center">
            Match the high-frequency decryption pattern to dump the contents of this advanced vault.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {nodes.map((node, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNodeClick(i)}
              className={cn(
                "w-28 h-28 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-2 shadow-lg",
                activeNode === i 
                  ? `${node.bg} border-white scale-105 glow-gold` 
                  : "bg-white/5 border-white/5",
                status === "error" && activeNode === i && "border-red-500 bg-red-500/20",
                status === "success" && "border-emerald-500 bg-emerald-500/20"
              )}
            >
              <span className={cn("text-xs font-black tracking-widest", activeNode === i ? "text-white" : "text-white/20")}>
                {node.label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="flex gap-3">
          {sequence.map((_, i) => (
            <div 
              key={i}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                i < userSequence.length ? "bg-amber-500 scale-125 glow-gold" : "bg-white/10"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VaultScreen() {
  const navigate = useNavigate();
  const { user, resources, updateResources, crew, triggerHaptic, updateRiddleProgression } = useGame();
  const { logTransaction } = useSupabaseSync();
  const { addTransaction } = useLedgerStore();
  const [opening, setOpening] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<any>(false);
  const [showKeyShortage, setShowKeyShortage] = useState<{ required: number; current: number } | null>(null);
  const [activeDecryptionVault, setActiveDecryptionVault] = useState<any | null>(null);

  const getVaultStatus = (vault: any) => {
    if (vault.id === 1) return { isLocked: false, lockReason: "" };
    const requiredLevel = (vault.id - 1) * 3;
    const locked = user.level < requiredLevel;
    return { isLocked: locked, lockReason: locked ? `LVL ${requiredLevel} REQ` : "" };
  };

  const getVaultRewards = (vault: any) => {
    const tier = vault.rewardTier;
    if (tier === "Low") return { coins: 500 * vault.id, mats: 10 + vault.id * 5, exp: 40 + vault.id * 10 };
    if (tier === "Medium") return { coins: 5000 + vault.id * 1000, mats: 100 + vault.id * 20, exp: 300 + vault.id * 50 };
    return { coins: 50000 + vault.id * 5000, mats: 1000 + vault.id * 100, exp: 2000 + vault.id * 200 };
  };

  const handleApplyRewards = (rewards: any, riddleProg: any) => {
    const rewardCoins = rewards.coins;
    const rewardMats = rewards.mats;
    const rewardExp = rewards.exp;

    // Award rewards cleanly + handle level-up through EXP
    useUserStore.setState((state) => {
      let newExp = (state.user.exp || 0) + rewardExp;
      let newLevel = state.user.level || 1;
      let newMaxExp = state.user.maxExp || 100;

      while (newExp >= newMaxExp) {
        newExp -= newMaxExp;
        newLevel += 1;
        newMaxExp = newLevel * 100;
      }

      const nextResources = {
        ...state.resources,
        coins: state.resources.coins + rewardCoins,
        baseMaterials: state.resources.baseMaterials + rewardMats,
        energy: state.resources.maxEnergy || 100, // Fully restore energy!
      };

      // Referred user activity tracking
      const tz = state.user.timezone;
      const todayStr = getTzDateString(Date.now(), tz);
      const userLastActive = state.user.lastActiveDate || todayStr;

      let missionsToday = state.user.referredMissionsToday || 0;
      let vaultsToday = state.user.referredVaultsToday || 0;
      let consecutiveDays = state.user.referredConsecutiveDays || 0;

      if (userLastActive !== todayStr) {
        const metGoalYesterday = (missionsToday >= 5 && vaultsToday >= 15);
        const isConsecutive = (new Date(todayStr).getTime() - new Date(userLastActive).getTime()) <= 86400000 + 4 * 3600000;

        if (isConsecutive && metGoalYesterday) {
          consecutiveDays = Math.min(7, consecutiveDays + 1);
        } else {
          consecutiveDays = 0;
        }
        missionsToday = 0;
        vaultsToday = 0;
      }

      vaultsToday += 1;

      const goalMetBefore = (((state.user.referredMissionsToday || 0) >= 5) && ((state.user.referredVaultsToday || 0) >= 15));
      const goalMetNow = (missionsToday >= 5 && vaultsToday >= 15);
      if (!goalMetBefore && goalMetNow) {
        consecutiveDays = Math.min(7, consecutiveDays + 1);
      }

      const nextUser = {
        ...state.user,
        completedToday: false, // Reset Decryption Game!
        clearanceCount: (state.user.clearanceCount || 0) + 1, // Store decrypted vault counts
        level: newLevel,
        exp: newExp,
        maxExp: newMaxExp,
        referredMissionsToday: missionsToday,
        referredVaultsToday: vaultsToday,
        referredConsecutiveDays: consecutiveDays,
        lastActiveDate: todayStr
      };

      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: nextUser,
        resources: nextResources,
        crew: state.crew,
        base: state.base,
        unlockedTabs: state.unlockedTabs,
        riddleState: state.riddleState,
      }));

      return {
        user: nextUser,
        resources: nextResources
      };
    });

    // Log the vault reward in transaction history
    logTransaction(rewardCoins, "vault_reward", "ZP");
    logTransaction(rewardMats, "vault_reward", "Element");
    addTransaction({ type: "vault_reward", amount: rewardCoins, currency: "ZP" });
    addTransaction({ type: "vault_reward", amount: rewardMats, currency: "ELEMENT" });

    const riddleData = RIDDLES.find(r => r.id === riddleProg.riddleId);
    setShowReward({ 
      coins: rewardCoins, 
      mats: rewardMats, 
      exp: rewardExp, 
      riddlePart: riddleData?.parts[riddleProg.part - 1],
      isRiddleComplete: riddleProg.isComplete,
      riddleAnswer: riddleData?.answer
    });
  };

  const openVault = (vault: any) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    const statusCheck = getVaultStatus(vault);
    if (statusCheck.isLocked) {
      triggerHaptic("error");
      return;
    }

    if (resources.keys >= vault.cost) {
      setOpening(vault.id);
      updateResources({ keys: -vault.cost });
      logTransaction(-vault.cost, "vault_open", "Key");
      addTransaction({ type: "vault_open", amount: -vault.cost, currency: "KEY" });
      triggerHaptic("medium");
      
      // All vaults now have a decryption phase as per new requirement
      setTimeout(() => {
        setOpening(null);
        setActiveDecryptionVault(vault);
      }, 1500);
    } else {
      triggerHaptic("error");
      setShowKeyShortage({ required: vault.cost, current: resources.keys });
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <AnimatePresence>
        {activeDecryptionVault && (
          <VaultBypassTerminal
            vaultName={activeDecryptionVault.type}
            difficulty={activeDecryptionVault.difficulty}
            onComplete={() => {
              const rewards = getVaultRewards(activeDecryptionVault);
              const riddleProg = updateRiddleProgression();
              handleApplyRewards(rewards, riddleProg);
              setActiveDecryptionVault(null);
            }}
            onCancel={() => {
              // Cancel closes terminal but refunds the key
              updateResources({ keys: activeDecryptionVault.cost });
              logTransaction(activeDecryptionVault.cost, "vault_refund", "Key");
              addTransaction({ type: "vault_refund", amount: activeDecryptionVault.cost, currency: "KEY" });
              setActiveDecryptionVault(null);
              triggerHaptic("error");
            }}
          />
        )}
      </AnimatePresence>

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Vaults</h1>
          <p className="text-sm text-white/50 italic font-medium">Extract high-value assets and coordinates.</p>
        </div>
        <div className="glass px-3 py-1 rounded-full flex items-center gap-2 border-blue-500/20">
           <Key size={14} className="text-blue-500" />
           <span className="text-xs font-black">{resources.keys}</span>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {VAULTS.map((vault) => {
          const statusCheck = getVaultStatus(vault);
          const isLocked = statusCheck.isLocked;
          const lockText = statusCheck.lockReason;
          const canAfford = resources.keys >= vault.cost;

          return (
            <motion.div
              key={vault.id}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              className={cn(
                "relative aspect-square rounded-[2.5rem] p-4 border flex flex-col items-center justify-center overflow-hidden transition-all duration-500",
                !isLocked ? "bg-gradient-to-br border-white/10 hover:border-white/30" : "bg-white/5 border-white/5 opacity-60 grayscale cursor-not-allowed",
                vault.color
              )}
            >
              {!isLocked ? (
                <>
                   <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                      <div className="w-12 h-12 bg-black/30 rounded-2xl flex items-center justify-center backdrop-blur-md">
                         <Lock size={24} className={cn("text-white/80", opening === vault.id && "animate-spin")} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase italic tracking-tighter leading-none mb-1">{vault.type} Vault</h3>
                        <div className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full inline-block",
                          canAfford ? "bg-black/40 text-white" : "bg-red-500/20 text-red-500"
                        )}>
                          COST: {vault.cost} {vault.cost === 1 ? 'key' : 'key'}
                        </div>
                      </div>
                      <button 
                        onClick={() => openVault(vault)}
                        disabled={opening !== null || !canAfford}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase italic tracking-tight transition-all",
                          canAfford ? "bg-white text-black active:scale-95" : "bg-white/10 text-white/20"
                        )}
                      >
                        {opening === vault.id ? "Decrypting..." : "Open Vault"}
                      </button>
                   </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-center p-2">
                   <Lock size={20} className="text-white/20" />
                   <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">{lockText}</span>
                </div>
              )}
              
              {/* Background Texture */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                 <div className="w-full h-full border-[20px] border-black/10 rounded-[2.5rem]" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-4 border-black/10 rounded-full" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Rewards Preview */}
      <div className="glass rounded-[2rem] p-6 border-white/5">
         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Potential Drops</h4>
         <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Zap, label: "ZP", val: "750 - 150k" },
              { icon: Star, label: "EXP", val: "50 - 6.4k" },
              { icon: Package, label: "MAT", val: "12 - 4.8k" },
              { icon: Eye, label: "INTEL", val: "LEGEND" }
            ].map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                    <d.icon size={18} />
                 </div>
                 <span className="text-[8px] font-black uppercase text-white/40">{d.label}</span>
                 <span className="text-[9px] font-black text-amber-500">{d.val}</span>
              </div>
            ))}
         </div>
      </div>

      {/* Reward Modal */}
      <AnimatePresence>
        {showReward && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="glass rounded-[3rem] p-8 max-w-sm w-full text-center border-amber-500/50 glow-gold"
            >
              <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center text-black mx-auto mb-6 glow-gold">
                 <ShieldCheck size={48} />
              </div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2">Vault Cleared</h2>
              <p className="text-white/50 text-sm mb-4">Access granted. Resources extracted and transferred to your inventory.</p>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-2xl mb-6 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle size={14} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Intel Decrypted</span>
                </div>
                <p className="text-[11px] font-mono italic text-emerald-200/90 leading-relaxed text-left">
                  "{showReward.riddlePart}"
                </p>
                {showReward.isRiddleComplete && (
                   <div className="pt-2 border-t border-emerald-500/20 mt-2">
                     <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">Answer Found:</span>
                     <span className="text-xl font-black text-white italic tracking-tighter">{showReward.riddleAnswer}</span>
                   </div>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-8">
                 <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-xs font-black text-amber-500">+{showReward.coins}</span>
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">ZP</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-xs font-black text-blue-500">+{showReward.mats}</span>
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Materials</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-xs font-black text-violet-400">+{showReward.exp}</span>
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">EXP</span>
                 </div>
              </div>

              <button 
                onClick={() => setShowReward(false)}
                className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase italic active:scale-95 transition-all"
              >
                Continue Operations
              </button>
            </motion.div>
          </motion.div>
        )}

        {showKeyShortage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: 5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="glass rounded-[3rem] p-8 max-w-sm w-full text-center border-red-500/50"
            >
              <div className="w-20 h-20 bg-red-500/20 border border-red-500/40 rounded-[2.2rem] flex items-center justify-center text-red-500 mx-auto mb-6">
                 <AlertTriangle size={40} className="animate-pulse" />
              </div>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-red-500 mb-2">Insufficient key</h2>
            <p className="text-white/80 text-[11px] uppercase font-bold leading-relaxed mb-6">
              You need <span className="text-red-400">{showKeyShortage.required} key</span> to unlock this vault. You currently have <span className="text-amber-500">{showKeyShortage.current} key</span>.
            </p>
          </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center mb-6">
                <p className="text-[10px] text-amber-500 font-extrabold uppercase tracking-wide">💡 CLUE CREDITS NOTATION</p>
                <p className="text-[9px] text-white/50 leading-relaxed uppercase font-bold mt-1">
                  Decryption keys cannot be obtained through standard missions. Watch ads & earn instantly under Earn Network!
                </p>
              </div>

              <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowKeyShortage(null);
                      navigate("/app/social-tasks");
                    }}
                    className="w-full bg-amber-500 font-sans text-black py-4 rounded-xl font-black uppercase italic tracking-tight active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Key size={14} /> Complete Tasks & Get key
                  </button>
                <button 
                  onClick={() => setShowKeyShortage(null)}
                  className="w-full bg-white/10 text-white/60 py-3 rounded-xl font-black uppercase text-[10px] hover:text-white transition-all"
                >
                  Cancel Operation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
