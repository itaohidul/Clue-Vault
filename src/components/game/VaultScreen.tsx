import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../../App";
import { useUserStore } from "../../store/userStore";
import { Lock, Key, Zap, Package, Eye, ArrowRight, ShieldCheck, Star, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

const VAULTS = [
  { id: 1, type: "Standard", color: "from-slate-500 to-slate-800", keys: 1, status: "ready" },
  { id: 2, type: "Gold", color: "from-amber-600 to-amber-900 border-amber-500/30", keys: 3, status: "locked", lockText: "LVL 5 REQ" },
  { id: 3, type: "Elite", color: "from-blue-600 to-indigo-900 border-blue-500/30", keys: 5, status: "locked", lockText: "CREW UNLOCK" },
  { id: 4, type: "Mystery", color: "from-purple-600 to-black border-purple-500/30", keys: 10, status: "locked", lockText: "STREAK 14D" },
];

export default function VaultScreen() {
  const navigate = useNavigate();
  const { user, resources, updateResources, triggerHaptic } = useGame();
  const [opening, setOpening] = useState<number | null>(null);
  const [showReward, setShowReward] = useState<any>(false);
  const [showKeyShortage, setShowKeyShortage] = useState<{ required: number; current: number } | null>(null);

  const openVault = (vault: any) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    if (resources.keys >= vault.keys) {
      setOpening(vault.id);
      updateResources({ keys: -vault.keys });
      triggerHaptic("medium");
      
      setTimeout(() => {
        const rewardCoins = vault.id === 1 ? 750 : vault.id === 2 ? 2500 : 5000;
        const rewardMats = vault.id === 1 ? 12 : vault.id === 2 ? 40 : 100;
        
        // Atomically award prizes, refill energy, and reset Decryption Game (completedToday = false)
        useUserStore.setState((state) => {
          const nextResources = {
            ...state.resources,
            coins: state.resources.coins + rewardCoins,
            baseMaterials: state.resources.baseMaterials + rewardMats,
            energy: state.resources.maxEnergy || 100, // Fully restore energy!
          };
          const nextUser = {
            ...state.user,
            completedToday: false
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
        
        setOpening(null);
        setShowReward({ coins: rewardCoins, mats: rewardMats });
      }, 3000);
    } else {
      triggerHaptic("error");
      setShowKeyShortage({ required: vault.keys, current: resources.keys });
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Vaults</h1>
          <p className="text-sm text-white/50 italic font-medium">Extract high-value assets.</p>
        </div>
        <div className="glass px-3 py-1 rounded-full flex items-center gap-2 border-blue-500/20">
           <Key size={14} className="text-blue-500" />
           <span className="text-xs font-black">{resources.keys}</span>
        </div>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {VAULTS.map((vault) => {
          const isLocked = vault.status === 'locked';
          const canAfford = resources.keys >= vault.keys;

          return (
            <motion.div
              key={vault.id}
              whileTap={!isLocked ? { scale: 0.95 } : {}}
              className={cn(
                "relative aspect-square rounded-[2.5rem] p-6 border flex flex-col items-center justify-center overflow-hidden transition-all duration-500",
                !isLocked ? "bg-gradient-to-br border-white/10 hover:border-white/30" : "bg-white/5 border-white/5 opacity-60 grayscale cursor-not-allowed",
                vault.color
              )}
            >
              {!isLocked ? (
                <>
                   <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 bg-black/30 rounded-3xl flex items-center justify-center backdrop-blur-md">
                         <Lock size={32} className={cn("text-white/80", opening === vault.id && "animate-spin")} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-1">{vault.type} Vault</h3>
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-block",
                          canAfford ? "bg-black/40 text-white" : "bg-red-500/20 text-red-500"
                        )}>
                          COST: {vault.keys} KEY
                        </div>
                      </div>
                      <button 
                        onClick={() => openVault(vault)}
                        disabled={opening !== null || !canAfford}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase italic tracking-tight transition-all",
                          canAfford ? "bg-white text-black active:scale-95" : "bg-white/10 text-white/20"
                        )}
                      >
                        {opening === vault.id ? "System Check..." : "Initialize Unlock"}
                      </button>
                   </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <Lock size={24} className="text-white/20" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{vault.lockText}</span>
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
              { icon: Zap, label: "ZP", val: "500+" },
              { icon: Star, label: "XP", val: "200+" },
              { icon: Package, label: "MAT", val: "10+" },
              { icon: Eye, label: "INTEL", val: "RARE" }
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
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-xs font-black text-amber-500">+{showReward.coins}</span>
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Coins</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-4 flex flex-col items-center">
                    <span className="text-xs font-black text-blue-500">+{showReward.mats}</span>
                    <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Materials</span>
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
