import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../App";
import { useUserStore } from "../../store/userStore";
import { Lock, Key, Zap, Package, Eye, ArrowRight, ShieldCheck, Star, AlertTriangle, X } from "lucide-react";
import { cn } from "../../lib/utils";

const VAULTS = [
  { id: 1, type: "Standard", color: "from-slate-500 to-slate-800", keys: 1 },
  { id: 2, type: "Gold", color: "from-amber-600 to-amber-900 border-amber-500/30", keys: 3 },
  { id: 3, type: "Elite", color: "from-blue-600 to-indigo-900 border-blue-500/30", keys: 5 },
  { id: 4, type: "Mystery", color: "from-purple-600 to-black border-purple-500/30", keys: 10 },
  
  // 5 vaults following 20 levels gap to unlock each higher vaults!
  { id: 5, type: "Omega Node", color: "from-rose-600 to-indigo-950 border-rose-500/30", keys: 2 },
  { id: 6, type: "Prime Core", color: "from-emerald-600 to-cyan-950 border-emerald-500/30", keys: 4 },
  { id: 7, type: "Cosmic Matrix", color: "from-violet-600 to-pink-950 border-violet-500/30", keys: 6 },
  { id: 8, type: "Infinity Singularity", color: "from-amber-600 to-red-950 border-amber-500/30", keys: 8 },
  { id: 9, type: "Clue Source", color: "from-cyan-500 to-blue-950 border-cyan-500/30", keys: 10 },
];

interface DecryptionBypassProps {
  vaultName: string;
  onComplete: () => void;
  onCancel: () => void;
}

function VaultBypassTerminal({ vaultName, onComplete, onCancel }: DecryptionBypassProps) {
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
    const newSeq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
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
        <button onClick={onCancel} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/20">
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
  const { user, resources, updateResources, crew, triggerHaptic } = useGame();
  const [opening, setOpening] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<any>(false);
  const [showKeyShortage, setShowKeyShortage] = useState<{ required: number; current: number } | null>(null);
  const [activeDecryptionVault, setActiveDecryptionVault] = useState<any | null>(null);

  const getVaultStatus = (vault: any) => {
    if (vault.id === 1) return { isLocked: false, lockReason: "" };
    if (vault.id === 2) {
      const locked = user.level < 5;
      return { isLocked: locked, lockReason: locked ? "LVL 5 REQ" : "" };
    }
    if (vault.id === 3) {
      const locked = !crew && user.level < 10;
      return { isLocked: locked, lockReason: locked ? "CREW OR Lvl 10" : "" };
    }
    if (vault.id === 4) {
      const locked = user.streak < 14 && user.level < 15;
      return { isLocked: locked, lockReason: locked ? "STREAK 14D / Lvl 15" : "" };
    }
    
    // Level 20+ dynamic vaults (following 20 levels gap formula)
    const requiredLevel = 20 + (vault.id - 5) * 20;
    const locked = user.level < requiredLevel;
    return { isLocked: locked, lockReason: locked ? `LVL ${requiredLevel} REQ` : "" };
  };

  const getVaultRewards = (vaultId: number) => {
    if (vaultId === 1) return { coins: 750, mats: 12, exp: 50 };
    if (vaultId === 2) return { coins: 2500, mats: 40, exp: 120 };
    if (vaultId === 3) return { coins: 5000, mats: 80, exp: 200 };
    if (vaultId === 4) return { coins: 10000, mats: 150, exp: 350 };
    
    // High-tier vaults scaled up by multiplier (vaultId 5+)
    const tier = vaultId - 4; // 1, 2, 3, 4, 5
    return {
      coins: Math.round(15000 * Math.pow(2.2, tier - 1)),
      mats: Math.round(300 * Math.pow(2.0, tier - 1)),
      exp: Math.round(400 * Math.pow(2.0, tier - 1))
    };
  };

  const handleApplyRewards = (rewards: any) => {
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

      const nextUser = {
        ...state.user,
        completedToday: false, // Reset Decryption Game!
        level: newLevel,
        exp: newExp,
        maxExp: newMaxExp
      };

      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: nextUser,
        resources: nextResources,
        crew: state.crew,
        base: state.base,
        unlockedTabs: state.unlockedTabs,
      }));

      return {
        user: nextUser,
        resources: nextResources
      };
    });

    setShowReward({ coins: rewardCoins, mats: rewardMats, exp: rewardExp });
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

    if (resources.keys >= vault.keys) {
      setOpening(vault.id);
      updateResources({ keys: -vault.keys });
      triggerHaptic("medium");
      
      if (vault.id >= 5) {
        // High Rewards level 20+ vault: Must bypass only 1 system-terminal mission to extraction!
        setTimeout(() => {
          setOpening(null);
          setActiveDecryptionVault(vault);
        }, 2000);
      } else {
        // Normal Vault 1-4
        setTimeout(() => {
          const rewards = getVaultRewards(vault.id);
          handleApplyRewards(rewards);
          setOpening(null);
        }, 3000);
      }
    } else {
      triggerHaptic("error");
      setShowKeyShortage({ required: vault.keys, current: resources.keys });
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <AnimatePresence>
        {activeDecryptionVault && (
          <VaultBypassTerminal
            vaultName={activeDecryptionVault.type}
            onComplete={() => {
              const rewards = getVaultRewards(activeDecryptionVault.id);
              handleApplyRewards(rewards);
              setActiveDecryptionVault(null);
            }}
            onCancel={() => {
              // Cancel closes terminal but refunds the key
              updateResources({ keys: activeDecryptionVault.keys });
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
          const canAfford = resources.keys >= vault.keys;

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
                          COST: {vault.keys} {vault.keys === 1 ? 'KEY' : 'KEYS'}
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
              { icon: Star, label: "XP", val: "50 - 6.4k" },
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
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider mb-6 animate-pulse">
                🔓 NEW SIGNAL DECRYPTED: Another Mystery Game is now playable!
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-8">
                 <div className="bg-white/5 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-xs font-black text-amber-500">+{showReward.coins}</span>
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Coins</span>
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
              <h2 className="text-2xl font-black uppercase italic tracking-tighter text-red-500 mb-2">Insufficient Keys</h2>
              <p className="text-white/80 text-[11px] uppercase font-bold leading-relaxed mb-6">
                You need <span className="text-red-400">{showKeyShortage.required} Keys</span> to unlock this vault. You currently have <span className="text-amber-500">{showKeyShortage.current} Keys</span>.
              </p>
              
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
                  <Key size={14} /> Complete Tasks & Get Keys
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
