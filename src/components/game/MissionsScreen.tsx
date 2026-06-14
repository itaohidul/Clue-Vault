import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../App";
import { Search, Zap, Clock, Star, ChevronRight, Lock, Target, Eye, X, Shield, Cpu, RefreshCw, CheckCircle2, Share2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import ReferralScreen from "./ReferralScreen";
import SocialTasksScreen from "./SocialTasksScreen";
import { RIDDLES } from "../../data/gameConfig";
import { triggerAd } from "../../lib/adEngine";

// Mini-game component for interactive missions
function DecryptionGame({ onComplete, onCancel }: { onComplete: () => void; onCancel: () => void }) {
  const { triggerHaptic } = useGame();
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState<"idle" | "playing" | "success" | "error">("idle");
  const [activeNode, setActiveNode] = useState<number | null>(null);

  const nodes = [
    { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
    { icon: Target, color: "text-red-400", bg: "bg-red-400/10" },
    { icon: Cpu, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  ];

  const generateSequence = useCallback(() => {
    const newSeq = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4));
    setSequence(newSeq);
    setUserSequence([]);
    setStatus("playing");
    playSequence(newSeq);
  }, []);

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
      // Trigger ad at the natural break (end of game)
      triggerAd('rewarded');
      setTimeout(() => onComplete(), 1200);
    }
  };

  useEffect(() => {
    generateSequence();
  }, [generateSequence]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn("text-amber-500", isPlaying && "animate-spin")} size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
            {isPlaying ? "Transmitting Pattern..." : "Sync Required"}
          </span>
        </div>
        <button onClick={onCancel} className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white/20">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Decryption Terminal</h2>
          <p className="text-xs text-white/40 max-w-[200px] mx-auto italic">
            Match the signal pattern to bypass the encryption layer.
          </p>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 gap-4">
          {nodes.map((node, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNodeClick(i)}
              className={cn(
                "w-32 h-32 rounded-[2rem] border-2 transition-all flex items-center justify-center shadow-lg",
                activeNode === i 
                  ? `${node.bg} border-white scale-105 glow-gold` 
                  : "bg-white/5 border-white/5",
                status === "error" && activeNode === i && "border-red-500 bg-red-500/20",
                status === "success" && "border-emerald-500 bg-emerald-500/20"
              )}
            >
              <node.icon 
                size={40} 
                className={cn(
                  "transition-all",
                  activeNode === i ? "text-white scale-110" : "text-white/20"
                )} 
              />
            </motion.button>
          ))}
        </div>

        {/* Progress Dots */}
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

      {status === "success" && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500 text-black py-4 rounded-2xl text-center font-black uppercase italic text-sm mb-12 shadow-xl"
        >
          Encryption Bypassed
        </motion.div>
      )}
    </div>
  );
}

export default function MissionsScreen() {
  const { user, completeMission, unlockedTabs, triggerHaptic, consumeEnergy, riddleState } = useGame();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  
  const currentRiddle = RIDDLES.find(r => r.id === riddleState.activeRiddleId);

  const isUnlocked = (tab: string) => {
    if (tab === "daily" || tab === "tasks" || tab === "referral") return true;
    return unlockedTabs.includes(tab);
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <header>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Missions</h1>
        <p className="text-sm text-white/50 italic font-medium">Solve the mysteries. Earn the rewards.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
        {["daily", "tasks", "referral"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all relative overflow-hidden",
              activeTab === tab ? "bg-amber-500 text-black shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            <span className="relative z-10">{tab}</span>
            {!isUnlocked(tab) && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                <Lock size={10} className="text-white/40" />
              </div>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {(activeTab === "daily" || isUnlocked(activeTab)) ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            key={activeTab}
            className="space-y-4"
          >
            {activeTab === "referral" ? (
              <ReferralScreen />
            ) : activeTab === "tasks" ? (
              <SocialTasksScreen />
            ) : (
              <>
                {activeTab === "daily" && (
                  <div className="glass rounded-[2rem] border-amber-500/30 overflow-hidden relative">
                     <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Current Intel...</span>
                             <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                               {riddleState.activeRiddleId ? `Riddle Case #${riddleState.activeRiddleId.substring(1)}` : "No Active Case"}
                             </h2>
                          </div>
                          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 glow-blue">
                             <Search size={20} />
                          </div>
                        </div>

                        <div className="glass-dark rounded-2xl p-4 border-white/5 mb-6 space-y-3">
                          {riddleState.activeRiddleId && currentRiddle ? (
                            <>
                              {[0, 1, 2].map(idx => (
                                <div key={idx} className={cn(
                                  "flex gap-3 items-start p-2 rounded-xl border transition-all",
                                  idx < riddleState.unlockedParts ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/5 opacity-40"
                                )}>
                                   <div className={cn(
                                     "w-5 h-5 rounded flex items-center justify-center text-[10px] font-black shrink-0",
                                     idx < riddleState.unlockedParts ? "bg-emerald-500 text-black" : "bg-white/10"
                                   )}>
                                     {idx + 1}
                                   </div>
                                   <p className="text-[11px] font-mono italic leading-relaxed text-white/80">
                                     {idx < riddleState.unlockedParts ? `"${currentRiddle.parts[idx]}"` : "Part Encrypted"}
                                   </p>
                                </div>
                              ))}
                            </>
                          ) : (
                            <p className="text-sm text-white/70 italic leading-relaxed font-mono text-center py-4">
                              "Access any vault in the Vault Room to begin decrypting a new riddle case."
                            </p>
                          )}
                        </div>

                        <button 
                          onClick={() => navigate("/app/vault")}
                          className="w-full py-4 rounded-2xl font-black uppercase italic active:scale-95 transition-all text-black bg-amber-500 hover:bg-amber-400 glow-gold"
                        >
                          Open Vaults to Progress
                        </button>

                        <div className="mt-4 bg-amber-500/10 border border-dashed border-amber-500/20 rounded-xl p-3 text-center">
                          <p className="text-[10px] text-amber-400 font-black uppercase tracking-wider">⚡ RIDDLE TRACKER</p>
                          <p className="text-[9px] text-white/50 uppercase font-bold mt-1 leading-relaxed">
                            Every vault you clear unlocks a part of the active riddle. Complete all 3 parts to solve the mystery!
                          </p>
                        </div>
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                  </div>
                )}
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

