import { useGame } from "../../App";
import { useUserStore } from "../../store/userStore";
import { Share2, Users, Gift, Copy, Check, ChevronRight, Trophy, Coins, Zap, Sparkles, UserPlus, Pause, Play, RotateCcw, ShieldCheck, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function ReferralScreen() {
  const { user, resources, claimReferralCommission, addMockReferral, simulateReferralDay, triggerHaptic } = useGame();
  const [copied, setCopied] = useState(false);
  const [verificationPromo, setVerificationPromo] = useState<{ name: string; coins: number; keys: number } | null>(null);
  const [isSimActive, setIsSimActive] = useState(() => {
    const saved = localStorage.getItem("cluevault_sandbox_yield_active");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("cluevault_sandbox_yield_active", String(isSimActive));
  }, [isSimActive]);
  
  const referralCode = user.referralCode || "CV-RESET";
  const inviteLink = `https://t.me/cluevaultbot?start=ref_${referralCode}`;

  // Passive real-time commission ticker
  useEffect(() => {
    const referCount = user.referCount || 0;
    if (referCount === 0 || !isSimActive) return;

    const interval = setInterval(() => {
      // Passive commission rate from referrals (0.1% - 0.5% of their solving, simulated)
      const commissionRate = 0.01 + Math.random() * 0.03; // average 0.025 coins per referral
      const addedCommission = parseFloat((referCount * commissionRate).toFixed(4));
      
      useUserStore.setState((state) => ({
        user: {
          ...state.user,
          referralCommission: parseFloat(((state.user.referralCommission || 0) + addedCommission).toFixed(4))
        }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [user.referCount, isSimActive]);

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    triggerHaptic("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    triggerHaptic("medium");
    if (navigator.share) {
      navigator.share({
        title: "Join my crew in ClueVault!",
        text: "Help me decrypt mysteries and unlock vaults in this Telegram Mini App.",
        url: inviteLink,
      }).catch(err => console.log(err));
    } else {
      copyLink();
    }
  };

  const resetSimulation = () => {
    triggerHaptic("heavy");
    useUserStore.setState((state) => {
      const nextUser = {
        ...state.user,
        referCount: 0,
        referralCommission: 0,
        claimedCommission: 0,
        referrals: [],
      };
      
      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: nextUser,
        resources: state.resources,
        crew: state.crew,
        base: state.base,
        unlockedTabs: state.unlockedTabs,
        riddleState: state.riddleState,
      }));
      
      return { user: nextUser };
    });
  };

  // Milestones
  const milestones = [
    { count: 1, reward: "100 ZP Bonus", reached: (user.referCount || 0) >= 1 },
    { count: 3, reward: "+1 Core key", reached: (user.referCount || 0) >= 3 },
    { count: 5, reward: "Rare Decryption Vault", reached: (user.referCount || 0) >= 5 },
    { count: 10, reward: "Premium Hint Pack", reached: (user.referCount || 0) >= 10 },
  ];

  const handleSimulateDay = (agentId: string) => {
    if (!simulateReferralDay) return;
    const res = simulateReferralDay(agentId);
    if (res && res.rewarded) {
      const agentObj = (user.referrals || []).find(r => r.id === agentId);
      setVerificationPromo({
        name: agentObj?.name || "Agent",
        coins: res.coins,
        keys: res.keys
      });
    }
  };

  const localReferralsList = user.referrals || [];
  const unclaimed = user.referralCommission || 0;

  return (
    <div className="pb-16 space-y-6">
      <header className="flex justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5">
        <div>
          <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest block leading-none">Referral Program</span>
          <h1 className="text-xl font-black uppercase italic tracking-tighter mt-1">Crew Decryption Network</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-2xl border border-amber-500/15">
          <Coins size={14} className="animate-spin" style={{ animationDuration: '6s' }} />
          <span className="text-[10px] font-mono font-black">{resources.coins} ZP</span>
        </div>
      </header>

      {/* Referral Link & Code Card */}
      <div className="glass rounded-[2rem] p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight">Decryption Referral</h3>
                <p className="text-[9px] text-white/40 uppercase font-bold">Earn passive commissions</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black bg-white/10 px-3 py-1 rounded-xl text-white/70 border border-white/5">CV CODE: {referralCode}</span>
          </div>

          <p className="text-[10px] text-white/50 leading-relaxed uppercase font-semibold">
            Invite colleagues using your secure Telegram deep link. Receive <span className="text-amber-400">0.1% to 0.5%</span> of all coins and clues decoded by your crew in real-time!
          </p>

          <div className="flex gap-2">
            <div className="flex-1 bg-black/30 rounded-2xl p-3 text-[10px] font-mono text-white/40 truncate flex items-center border border-white/5 select-all">
              {inviteLink}
            </div>
            <button 
              onClick={copyLink}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shrink-0",
                copied ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-white text-black border-white hover:bg-white/90 active:scale-95"
              )}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
            <button 
              onClick={shareLink}
              className="px-4 h-11 bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-black rounded-2xl text-[10px] font-black uppercase tracking-wider italic shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Verification Instructions Banner */}
      <div className="glass rounded-[2rem] p-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent space-y-4">
        <h3 className="text-xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" /> Active Agent Verification Criteria
        </h3>
        <p className="text-[10px] text-white/70 leading-relaxed uppercase font-semibold">
          To verify referred recruits and unlock premium rewards, they must complete the active training protocol:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/30 border border-white/5 rounded-2xl p-3 space-y-1">
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block font-mono">STEP 1</span>
            <span className="text-sm font-black text-white italic font-mono">7 DAYS</span>
            <p className="text-[8px] text-white/40 uppercase font-bold leading-tight">Consecutive usage of cluevault miniapp</p>
          </div>
          <div className="bg-black/30 border border-white/5 rounded-2xl p-3 space-y-1">
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block font-mono">STEP 2</span>
            <span className="text-sm font-black text-white italic font-mono">5 MISSIONS</span>
            <p className="text-[8px] text-white/40 uppercase font-bold leading-tight">Must complete at least 5 decrypt tasks per day</p>
          </div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-3">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          <p className="text-[9px] text-emerald-400 leading-normal uppercase font-black">
            Successful Verification Unlock: <span className="text-white">+25,000 ZP Coins</span> &amp; <span className="text-white">+5 Core Scanning Keys</span> credited instantly!
          </p>
        </div>
      </div>

      {/* Stats - Referral Network Commission */}
      <div className="glass rounded-[2rem] p-6 border-white/5 space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white/40">Vault Commission</h3>
            <p className="text-[9px] text-amber-500 font-bold uppercase mt-0.5">Real-time passive mining</p>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-black uppercase text-white/30 leading-none">Yield Rate</div>
            <div className="text-xs font-black text-emerald-400 font-mono mt-0.5">
              +{Math.min(0.5, parseFloat(((user.referCount || 0) * 0.1).toFixed(1)))}% Comm/Tick
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Total Referrals</span>
            <span className="text-2xl font-black italic text-blue-500 font-mono">
              {user.referCount || 0}
            </span>
          </div>
          <div className="bg-black/20 border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Claimed Bonus</span>
            <span className="text-2xl font-black italic text-emerald-500 font-mono">
              {Math.round(user.claimedCommission || 0)} <span className="text-xs text-emerald-500/70">ZP</span>
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-amber-500 animate-pulse" />
              <div className="min-w-0">
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block font-sans">Unclaimed Commission</span>
                <span className="text-xl font-black font-mono text-white tracking-tight mt-0.5">
                  {unclaimed.toFixed(4)} <span className="text-xs text-white/40">ZP</span>
                </span>
              </div>
            </div>
            <button
              onClick={claimReferralCommission}
              disabled={unclaimed <= 0}
              className={cn(
                "px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider italic transition-all",
                unclaimed > 0 
                  ? "bg-emerald-500 text-black shadow-[0_0_15px_#10b981] active:scale-95" 
                  : "bg-white/5 text-white/30 border border-white/5 cursor-not-allowed"
              )}
            >
              Claim ZP
            </button>
          </div>
        </div>
      </div>

      {/* Mock Recruiter Simulator Action */}
      <div className="glass rounded-[2rem] p-6 border-blue-500/15 bg-blue-500/5 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wide text-blue-400">Sandbox Referral Recruiter</h4>
            <p className="text-[9px] text-white/40 leading-relaxed uppercase font-semibold">
              Force recruit a mock agent in the sandbox preview to simulate commission yields and live stats!
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <UserPlus size={16} />
          </div>
        </div>

        <button 
          onClick={addMockReferral}
          className="w-full bg-blue-500 hover:bg-blue-400 active:scale-95 transition-all text-black py-3.5 rounded-2xl font-black uppercase italic tracking-widest text-[10px] flex items-center justify-center gap-2"
        >
          <Sparkles size={14} /> Recruit Mock Agent (+1 Refer Count)
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => {
              triggerHaptic("medium");
              setIsSimActive(!isSimActive);
            }}
            className={cn(
              "py-3 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 border",
              isSimActive 
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]" 
                : "bg-white/5 text-white/50 border-white/5"
            )}
          >
            {isSimActive ? (
              <>
                <Pause size={12} /> Pause Yields
              </>
            ) : (
              <>
                <Play size={12} /> Resume Yields
              </>
            )}
          </button>

          <button 
            onClick={resetSimulation}
            className="py-3 rounded-xl text-[9px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <RotateCcw size={12} /> Reset Crew
          </button>
        </div>
      </div>

      {/* Milestones Progress */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2 flex items-center gap-2">
          <Trophy size={14} className="text-amber-500" /> Milestone Unlocks
        </h3>
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={i} className={cn(
              "glass rounded-2xl p-4 flex items-center justify-between border-white/5",
              m.reached && "bg-emerald-500/5 border-emerald-500/10"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  m.reached 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                    : "bg-white/5 text-white/20 border-white/5"
                )}>
                  <Users size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-tight">{m.count} Recruits</h4>
                  <p className={cn("text-[9px] font-bold uppercase", m.reached ? "text-emerald-400" : "text-white/40")}>{m.reward}</p>
                </div>
              </div>
              <div>
                {m.reached ? (
                  <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg">Unlocked</span>
                ) : (
                  <span className="text-[8px] font-black uppercase bg-white/5 text-white/20 px-2 py-1 rounded-lg">Locked</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Referrals Breakdown */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <Users size={14} /> Referred Network Agents ({localReferralsList.length})
          </h3>
          <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/10">
            Verified: {localReferralsList.filter(a => a.status === 'verified').length} / {localReferralsList.length}
          </span>
        </div>

        {localReferralsList.length === 0 ? (
          <div className="glass rounded-3xl p-8 border-dashed border-white/10 text-center uppercase">
            <p className="text-[10px] text-white/30 font-black tracking-tight leading-loose">
              No deployed cyber agents detected in your network.<br />
              Use the sandbox recruit button above or invite real colleagues using your referral link.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {localReferralsList.map((agent) => {
              const remains = 7 - (agent.consecutiveDays || 0);
              const percent = Math.min(100, Math.round(((agent.consecutiveDays || 0) / 7) * 100));
              
              return (
                <div key={agent.id} className="glass rounded-3xl p-5 border-white/5 space-y-4 animate-fade-in relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shrink-0 bg-black/40 shadow-inner flex items-center justify-center">
                      <img src={agent.avatar} alt="ref-avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white truncate font-mono">{agent.name}</span>
                        {agent.status === 'verified' ? (
                          <span className="text-[8px] font-black tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            <ShieldCheck size={10} /> Verified
                          </span>
                        ) : (
                          <span className="text-[8px] font-black tracking-wider uppercase text-amber-500 bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            Unverified
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] text-white/30 uppercase font-bold block mt-1">
                        JOINED: {new Date(agent.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Active Training Meters */}
                  <div className="space-y-3 bg-black/25 border border-white/5 rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-wider">Consecutive Progress</span>
                      <span className="text-[10px] font-black font-mono text-white tracking-widest">{agent.consecutiveDays || 0} / 7 DAYS</span>
                    </div>

                    {/* Progress blocks */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const isMet = (agent.consecutiveDays || 0) > i;
                        return (
                          <div 
                            key={i} 
                            className={cn(
                              "h-1.5 rounded-md transition-all shadow-inner",
                              isMet 
                                ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" 
                                : "bg-white/5"
                            )} 
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px]">
                      <span className="font-bold text-white/40 uppercase">Missions Today</span>
                      <span className={cn(
                        "font-black font-mono px-2 py-0.5 rounded-md uppercase",
                        (agent.missionsToday || 0) >= 5 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                          : "bg-white/5 text-white/50"
                      )}>
                        {agent.missionsToday || 0} / 5 TASKS
                      </span>
                    </div>
                  </div>

                  {agent.status !== 'verified' && (
                    <button
                      onClick={() => handleSimulateDay(agent.id)}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/35 text-amber-400 py-3 rounded-2xl text-[9px] font-black uppercase italic tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Sparkles size={11} className="text-amber-500" /> Simulate Active Training Day (+5 Missions)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verification Celebration Modal Overlay */}
      <AnimatePresence>
        {verificationPromo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass max-w-sm w-full bg-gradient-to-b from-amber-500/10 via-black to-black border border-amber-500/30 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-radial-gradient from-amber-500/20 to-transparent pointer-none" />
              
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-black mx-auto shadow-[0_0_30px_rgba(245,158,11,0.4)] relative">
                <ShieldCheck size={32} className="animate-pulse" />
                <Sparkles size={16} className="absolute -top-1 -right-1 text-white animate-bounce" />
              </div>

              <div className="space-y-2 relative z-10">
                <span className="text-[10px] uppercase font-black tracking-widest text-amber-500 block">Recruit Certified!</span>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Verification Complete</h3>
                <p className="text-[10px] text-white/60 leading-relaxed uppercase font-semibold">
                  Agent <span className="text-amber-400 font-bold">{verificationPromo.name}</span> completed the 7 days protocol and is now a Verified Colleague.
                </p>
              </div>

              {/* Reward Grid */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
                  <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Coin Cargo</span>
                  <span className="text-lg font-black font-mono text-white tracking-tight">+{verificationPromo.coins}</span>
                  <span className="text-[9px] font-black text-emerald-500 font-mono block mt-0.5">ZP Coins</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                  <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest block mb-1">Scanning Cargo</span>
                  <span className="text-lg font-black font-mono text-white tracking-tight">+{verificationPromo.keys}</span>
                  <span className="text-[9px] font-black text-amber-500 font-mono block mt-0.5">Core Keys</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  triggerHaptic('success');
                  setVerificationPromo(null);
                }}
                className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-black py-4 rounded-2xl font-black uppercase italic tracking-widest text-[11px] shadow-[0_0_20px_rgba(245,158,11,0.25)] relative z-10"
              >
                Secure Assets &amp; Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
