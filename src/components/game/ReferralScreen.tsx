import { useGame } from "../../App";
import { useUserStore } from "../../store/userStore";
import { Share2, Users, Gift, Copy, Check, ChevronRight, Trophy, Coins, Zap, Sparkles, UserPlus, Pause, Play, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function ReferralScreen() {
  const { user, resources, claimReferralCommission, addMockReferral, triggerHaptic } = useGame();
  const [copied, setCopied] = useState(false);
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
      // Say each referred agent solves and yields 0.01 to 0.04 coins per tick (2 seconds)
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
      };
      
      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: nextUser,
        resources: state.resources,
        crew: state.crew,
        base: state.base,
        unlockedTabs: state.unlockedTabs,
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

  // List of mock agents generated from current referral count
  const agentNames = [
    "Vesper_Decrypt", "Neon_Cipher", "Spectre_X", "Glitch_Solver", 
    "Kernel_Breaker", "Zero_Cool", "Cyber_Ghost", "Hash_Master",
    "Vault_Runner", "Code_Phantom", "Bit_Cracker", "Shadow_Lock"
  ];
  
  const agentTasks = [
    "Cracking Layer-2 Ledger Protocol...",
    "Decrypting Dark-Net Intel Database...",
    "Staking CLUE Tokens inside Node Cluster...",
    "Exploiting Central Decryption Relay...",
    "Extracting Encoded Blockchain Frag...",
    "Idle - Recharging Cybernetic Battery."
  ];

  const mockReferralList = Array.from({ length: user.referCount || 0 }).map((_, idx) => {
    const seed = idx + 1;
    const name = agentNames[idx % agentNames.length] + `_${seed}`;
    const status = agentTasks[(idx * 3 + 1) % agentTasks.length];
    const commRate = (0.1 + (idx % 5) * 0.1).toFixed(1); // 0.1% to 0.5%
    const isIdle = status.startsWith("Idle");
    return {
      name,
      status,
      commRate,
      isIdle,
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${name}`
    };
  });

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
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
            <Users size={14} /> Referred Agents List
          </h3>
          <span className="text-[9px] font-mono font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md mt-0.5">
            Active: {mockReferralList.filter(a => !a.isIdle).length}
          </span>
        </div>

        {mockReferralList.length === 0 ? (
          <div className="glass rounded-2xl p-8 border-dashed border-white/10 text-center uppercase">
            <p className="text-[10px] text-white/30 font-black tracking-tight leading-loose">
              No deployed cyber agents detected in your network.<br />
              Use the simulator recruit button above or copy your deep-link to gather recruits.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockReferralList.map((agent, i) => (
              <div key={i} className="glass rounded-2xl p-4 border-white/5 flex items-center gap-3 animate-fade-in">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                  <img src={agent.avatar} alt="agent" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-black truncate text-white">{agent.name}</span>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md font-mono">
                      {agent.commRate}% Comm
                    </span>
                  </div>
                  <span className={cn(
                    "text-[8px] uppercase tracking-tight block font-semibold truncate",
                    agent.isIdle ? "text-white/30" : "text-amber-500"
                  )}>
                    {agent.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
