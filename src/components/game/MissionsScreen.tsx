import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../App";
import { Search, Zap, Clock, Star, ChevronRight, Lock, Target, Eye, X, Shield, Cpu, RefreshCw, CheckCircle2, Share2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import ReferralScreen from "./ReferralScreen";
import SocialTasksScreen from "./SocialTasksScreen";

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
  const { user, completeMission, unlockedTabs, triggerHaptic, consumeEnergy } = useGame();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(false);
  const [clue, setClue] = useState<any>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [gameMode, setGameMode] = useState<"none" | "daily" | "side">("none");

  const fetchDailyClue = async () => {
    setLoading(true);
    // Simulation of fetching a story fragment
    setTimeout(() => {
      setClue({
         title: "The Sector 7 Archive",
         clue: "A hidden vault was recently discovered in the underground network. The first clue is already active: 'The code is hidden where shadows repeat twice.' Locate the entry point to bypass security.",
         difficulty: "Expert",
         reward: "300 Z + 1K",
         energyCost: 15
      });
      setLoading(false);
    }, 1500);
  };

  useEffect(() => {
    fetchDailyClue();
  }, []);

  const handleStartMission = () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    if (!user.completedToday) {
      const cost = clue?.energyCost || 10;
      // Consume energy if available, otherwise bypass for unlimited gameplay!
      if (consumeEnergy(cost)) {
        // consumed successfully
      }
      setGameMode("daily");
      triggerHaptic("medium");
    }
  };

  const onDailyComplete = () => {
    setGameMode("none");
    completeMission({ coins: 300, keys: 1, xp: true, fragments: 2, isDaily: true });
  };

  const handleSideMission = (m: any) => {
    if (m.type === "Social") {
      navigate("/app/social-tasks");
      return;
    }
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    if (consumeEnergy(m.energyCost)) {
      setCompleting(m.id);
      triggerHaptic("medium");
      setTimeout(() => {
        completeMission({ coins: m.reward, xp: true, baseMaterials: m.mats });
        setCompleting(null);
        triggerHaptic("success");
      }, 1500);
    }
  };

  const missions = [
    { id: 1, title: "Social Tasks", type: "Social", reward: "Multi", mats: "Multi", icon: Share2, difficulty: "Easy", desc: "Join community and follow news for rewards.", energyCost: 0 },
    { id: 2, title: "The Mole", type: "Sponsored", reward: 500, mats: 25, icon: Target, difficulty: "Medium", desc: "Visit our partner site and find the secret code.", energyCost: 10 },
    { id: 3, title: "Night Shift", type: "Event", reward: 1200, mats: 50, icon: Zap, difficulty: "Hard", desc: "Investigate unusual activity in Sector 4.", energyCost: 20 },
  ];

  const isUnlocked = (tab: string) => {
    if (tab === "daily" || tab === "tasks" || tab === "referral") return true;
    return unlockedTabs.includes(tab);
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <AnimatePresence>
        {gameMode === "daily" && (
          <DecryptionGame 
            onComplete={onDailyComplete}
            onCancel={() => setGameMode("none")}
          />
        )}
      </AnimatePresence>

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
                             <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Incoming Transmission...</span>
                             <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">
                               {loading ? "Scanning Frequencies..." : clue?.title || "Classified Intel"}
                             </h2>
                          </div>
                          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 glow-blue">
                             <Search size={20} />
                          </div>
                        </div>

                        <div className="glass-dark rounded-2xl p-4 border-white/5 mb-6">
                          {loading ? (
                            <div className="space-y-2 animate-pulse">
                               <div className="h-4 bg-white/5 rounded-full w-3/4" />
                               <div className="h-4 bg-white/5 rounded-full w-1/2" />
                            </div>
                          ) : (
                            <p className="text-sm text-white/70 italic leading-relaxed font-mono">
                              "{clue?.clue || "A mysterious message awaits your decryption. Higher clearance required."}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-3 text-center">
                             <div>
                                <div className="text-[8px] font-bold uppercase text-white/30">Target</div>
                                <div className="text-xs font-black text-amber-500 uppercase">{clue?.difficulty || "Expert"}</div>
                             </div>
                             <div className="w-px h-6 bg-white/10" />
                             <div>
                                <div className="text-[8px] font-bold uppercase text-white/30">Energy</div>
                                <div className="text-xs font-black text-red-500 uppercase">{clue?.energyCost || 15}</div>
                             </div>
                             <div className="w-px h-6 bg-white/10" />
                             <div>
                                <div className="text-[8px] font-bold uppercase text-white/30">Reward</div>
                                <div className="text-xs font-black text-blue-500 uppercase">{clue?.reward || "300 Z + 1K"}</div>
                             </div>
                          </div>
                          <button className="text-[10px] font-black uppercase text-amber-500 border-b border-amber-500/50 pb-0.5">
                            Intel Hint
                          </button>
                        </div>

                        <button 
                          onClick={handleStartMission}
                          disabled={user.completedToday}
                          className={cn(
                            "w-full py-4 rounded-2xl font-black uppercase italic active:scale-95 transition-all text-black",
                            user.completedToday ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default" : "bg-amber-500 hover:bg-amber-400 glow-gold"
                          )}
                        >
                          {user.completedToday ? (
                            <div className="flex flex-col items-center justify-center py-1">
                              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"><CheckCircle2 size={16} /> Mission Complete</span>
                            </div>
                          ) : "Start Deciphering"}
                        </button>

                        {user.completedToday && (
                          <div className="mt-4 bg-amber-500/10 border border-dashed border-amber-500/20 rounded-xl p-3 text-center">
                            <p className="text-[10px] text-amber-400 font-black uppercase tracking-wider">⚡ UNLIMITED GAMEPLAY MODE ACTIVE</p>
                            <p className="text-[9px] text-white/50 uppercase font-bold mt-1 leading-relaxed">
                              Unlock any Vault in the <span className="text-amber-500">Vault Room</span> using keys to instantly decrypt another transmission and refresh this game!
                            </p>
                          </div>
                        )}
                     </div>
                     <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                  </div>
                )}

                {/* Other Missions */}
                <h3 className="text-xs font-black uppercase tracking-widest text-white/30 pl-2">Available Operations</h3>
                {missions.map((mission) => (
                  <motion.div 
                    onClick={() => handleSideMission(mission)}
                    whileTap={{ scale: 0.98 }}
                    key={mission.id} 
                    className="glass rounded-2xl p-4 flex items-center gap-4 border-white/5 group cursor-pointer"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                      completing === mission.id ? "bg-amber-500 text-black animate-pulse" : "bg-white/5 text-white/40 group-hover:bg-amber-500/20 group-hover:text-amber-500"
                    )}>
                       <mission.icon size={22} className={completing === mission.id ? "animate-spin" : ""} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-sm font-black uppercase tracking-tight">{mission.title}</h4>
                        <div className="flex gap-2">
                           {mission.energyCost > 0 && <span className="text-[10px] font-bold text-red-500">-{mission.energyCost} E</span>}
                           <span className="text-[10px] font-bold text-amber-500">+{mission.reward} ZP</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-white/40 leading-tight">{mission.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-white/20" />
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        ) : (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="h-64 flex flex-col items-center justify-center text-center p-10 space-y-4"
           >
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/20">
                 <Lock size={32} />
              </div>
              <div>
                <h3 className="font-black uppercase italic">Access Denied</h3>
                <p className="text-xs text-white/40">Complete the Daily Mystery Mission to unlock extra operations.</p>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

