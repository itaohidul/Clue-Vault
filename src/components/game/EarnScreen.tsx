import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useGame } from "../../App";
import { 
  TrendingUp, 
  Flame, 
  Lock, 
  Unlock, 
  Vote, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  HelpCircle, 
  ChevronRight, 
  Plus, 
  Check, 
  Clock, 
  Coins,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Award
} from "lucide-react";
import { cn } from "../../lib/utils";

export default function EarnScreen() {
  const { user, resources, updateResources, crew, triggerHaptic } = useGame();

  // Component UI State
  const [stakingAmount, setStakingAmount] = useState<string>("");
  const [selectedStakingOption, setSelectedStakingOption] = useState<string>("30day");
  const [hasVoted, setHasVoted] = useState<Record<number, boolean>>({});
  const [antiBotProgress, setAntiBotProgress] = useState<number>(0);
  const [calibrationActive, setCalibrationActive] = useState<boolean>(false);
  const [calibrationStep, setCalibrationStep] = useState<number>(0);
  const [calibrationTarget, setCalibrationTarget] = useState<number>(0);
  const [claimedReward, setClaimedReward] = useState<number | null>(null);

  // Global pool estimates
  const DAILY_POOL = 120000; // 120,000 CLUE
  const GLOBAL_ACTIVITY_SCORE = 20000000; // 20,000,000

  // 1. Get Clearance Rank Bracket and Caps based on User Level
  const getClearanceBracket = (level: number) => {
    const lvl = Math.floor(level);
    if (lvl <= 5) return { name: "Beginner", cap: 100, desc: "Level 1-5" };
    if (lvl <= 15) return { name: "Explorer", cap: 250, desc: "Level 6-15" };
    if (lvl <= 30) return { name: "Vault Hunter", cap: 500, desc: "Level 16-30" };
    if (lvl <= 50) return { name: "Cipher Elite", cap: 1000, desc: "Level 31-50" };
    if (lvl <= 75) return { name: "Shadow Operator", cap: 1500, desc: "Level 51-75" };
    return { name: "Vault Master", cap: 2500, desc: "Level 76-100" };
  };

  const bracket = getClearanceBracket(user.level || 1);

  // 2. Multpliers calculations
  // A) Streak Mult
  const getStreakMultiplier = (streak: number) => {
    if (streak >= 30) return { pct: 40, label: "30D Streak Boost" };
    if (streak >= 14) return { pct: 20, label: "14D Streak Boost" };
    if (streak >= 7) return { pct: 10, label: "7D Streak Boost" };
    if (streak >= 3) return { pct: 5, label: "3D Streak Boost" };
    return { pct: 0, label: "No Streak Boost" };
  };
  const streakMult = getStreakMultiplier(user.streak || 1);

  // B) Staking Mult
  const getStakingMultiplier = (tier: string) => {
    switch (tier) {
      case "flexible": return { pct: 5, label: "Flexible Staking" };
      case "30day": return { pct: 10, label: "30D Vault Lock" };
      case "90day": return { pct: 20, label: "90D Vault Lock" };
      case "365day": return { pct: 40, label: "365D Premium Lock" };
      default: return { pct: 0, label: "No Active Lock" };
    }
  };
  const stakingMult = getStakingMultiplier(resources.stakingTier || "none");

  // C) Crew Bonus
  const getCrewMultiplier = (c: any) => {
    if (!c) return { pct: 0, label: "No Crew" };
    if (c.rank <= 10) return { pct: 20, label: "Top 10 Crew Bonus" };
    if (c.rank <= 25) return { pct: 10, label: "Top 25 Crew Bonus" };
    return { pct: 5, label: "Crew Member" };
  };
  const crewMult = getCrewMultiplier(crew);

  // D) Total combined multiplier percentage (additive or compound, let's use sum)
  const totalMultiplierPct = streakMult.pct + stakingMult.pct + crewMult.pct;
  const multiplierScalar = 1 + totalMultiplierPct / 100;

  // 3. User Estimated Reward Share calculation
  const calculatedShare = (resources.activityScore / GLOBAL_ACTIVITY_SCORE) * DAILY_POOL;
  const multipliedEarnings = calculatedShare * multiplierScalar;
  // Apply Cap rule
  const finalEarning = Math.min(multipliedEarnings, bracket.cap);

  // Staking Options List
  const STAKING_OPTIONS = [
    { id: "flexible", name: "Flexible", duration: "Withdraw Anytime", apy: "2.5% APY", boost: "+5%", desc: "No minimum lock constraint" },
    { id: "30day", name: "30-Day Vault", duration: "30 Days Lock", apy: "8.0% APY", boost: "+10%", desc: "Medium lock cycle" },
    { id: "90day", name: "90-Day Vault", duration: "90 Days Lock", apy: "18.5% APY", boost: "+20%", desc: "High yield cycle" },
    { id: "365day", name: "365-Day Premium", duration: "365 Days Lock", apy: "45.0% APY", boost: "+40%", desc: "Elite VIP lock tier" }
  ];

  // Live Proposals Array
  const DAO_PROPOSALS = [
    { 
      id: 124, 
      title: "Sustainable Reward Pool Expansion Policy", 
      desc: "Raise daily pool to 135,000 $CLUE funded by transaction buybacks.",
      options: ["Approve Plan", "Reject & Keep 120K", "Abstain"],
      votes: 11482 
    },
    { 
      id: 125, 
      title: "Season 3 Stealth Protocol Styling Theme", 
      desc: "Integrate custom 'Cyberpunk Dark Carbon' themes with emerald matrix layouts.",
      options: ["Carbon Matrix Theme", "Midnight Cobalt Theme", "Retro Amber Dome"],
      votes: 9481 
    }
  ];

  // Claim simulation
  const handleClaimReward = () => {
    if (finalEarning <= 0.05) {
      triggerHaptic("error");
      return;
    }
    const rewardValue = Math.round(finalEarning * 100) / 100;
    
    updateResources({
      clue: rewardValue,
      activityScore: -resources.activityScore // Reset score
    });
    setClaimedReward(rewardValue);
    triggerHaptic("success");
    setTimeout(() => {
      setClaimedReward(null);
    }, 4000);
  };

  // Staking Execute Code
  const handleStakingSubmit = () => {
    const amount = parseFloat(stakingAmount);
    if (isNaN(amount) || amount <= 0) {
      triggerHaptic("error");
      return;
    }
    if (resources.clue < amount) {
      triggerHaptic("error");
      return;
    }

    // Update resources: lock CLUE
    updateResources({
      clue: -amount,
      stakedClue: amount,
      stakingTier: selectedStakingOption,
      activityScore: 100 // Reward +100 score for staking contribution
    });

    setStakingAmount("");
    triggerHaptic("success");
  };

  const handleUnstake = () => {
    if (resources.stakedClue <= 0) {
      triggerHaptic("error");
      return;
    }
    const refund = resources.stakedClue;
    updateResources({
      clue: refund,
      stakedClue: -refund,
      stakingTier: "none"
    });
    triggerHaptic("success");
  };

  // Cast Voted in DAO
  const handleVote = (proposalId: number, index: number) => {
    if (hasVoted[proposalId]) return;
    setHasVoted(prev => ({ ...prev, [proposalId]: true }));
    
    // Reward +50 Activity Score for Governance participation
    updateResources({
      activityScore: 50
    });
    triggerHaptic("success");
  };

  // Mini Human Calibration Game
  const startHumanCalibration = () => {
    triggerHaptic("medium");
    setCalibrationStep(1);
    setCalibrationTarget(Math.floor(Math.random() * 4) + 1);
    setCalibrationActive(true);
  };

  const handleWatchAd = (type: 'interstitial' | 'direct') => {
    triggerHaptic("medium");
    if (type === 'direct') {
      if ((window as any).openDirectLink) {
        (window as any).openDirectLink();
        updateResources({ activityScore: 100 }); // High reward for priority link
      }
    } else {
      const showAd = (window as any).show_11030019;
      if (typeof showAd === "function") {
        try {
          showAd({
            type: 'inApp',
            inAppSettings: {
              frequency: 1,
              capping: 1,
              interval: 0,
              timeout: 1,
              everyPage: true
            }
          });
          updateResources({ activityScore: 50 }); // Reward for standard ad
        } catch (e) {
          console.warn("Ad call failed:", e);
        }
      }
    }
  };

  const clickCalibrationCircle = (id: number) => {
    if (id === calibrationTarget) {
      triggerHaptic("success");
      if (calibrationStep >= 3) {
        // Human confirmed!
        setAntiBotProgress(100);
        setCalibrationActive(false);
        updateResources({
          activityScore: 60
        });
      } else {
        setCalibrationStep(prev => prev + 1);
        setCalibrationTarget(Math.floor(Math.random() * 4) + 1);
      }
    } else {
      triggerHaptic("error");
      // reset calibration
      setCalibrationStep(1);
      setCalibrationTarget(Math.floor(Math.random() * 4) + 1);
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      
      {/* Page Title Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1 select-none flex items-center gap-2">
            <Coins className="text-amber-500 shrink-0" size={28} />
             CLUE ENGINE
          </h1>
          <p className="text-xs text-white/50 italic">Sustainable Earning Model & Reward Pools</p>
        </div>
        <div className="glass px-3 py-1.5 rounded-2xl flex flex-col items-end border-amber-500/20 bg-amber-500/5">
           <span className="text-[8px] font-black uppercase text-amber-500/60 leading-none">Your Balance</span>
           <span className="text-md font-black italic">{resources.clue ? resources.clue.toFixed(1) : "0.0"} $CLUE</span>
        </div>
      </div>

      {/* EXCLUSIVE EARNING OPERATIONS */}
      <div className="glass border border-amber-500/10 bg-amber-500/[0.01] p-5 rounded-3xl space-y-4">
        <div>
          <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-1.5">
            <Zap size={18} className="text-amber-500" /> BOOSTER OPERATIONS
          </h3>
          <p className="text-[10px] text-white/50 uppercase font-bold">Fast-track activity score through external network signal verification</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
           <button 
             onClick={() => handleWatchAd('direct')}
             className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 p-4 rounded-2xl transition-transform active:scale-95"
           >
              <div className="flex justify-between items-center relative z-10">
                 <div className="text-left">
                    <span className="text-[8px] font-black uppercase text-black/60 tracking-widest bg-white/30 px-1.5 py-0.5 rounded">Priority Earn</span>
                    <h4 className="text-lg font-black uppercase italic text-white leading-none mt-1">DIRECT SIGNAL</h4>
                    <p className="text-[9px] text-white/70 font-bold uppercase mt-0.5">Instant +100 Activity Score</p>
                 </div>
                 <ArrowUpRight className="text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={24} />
              </div>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none" />
           </button>

           <button 
             onClick={() => handleWatchAd('interstitial')}
             className="bg-white/5 hover:bg-white/10 border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-95"
           >
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                    <Activity size={24} />
                 </div>
                 <div className="text-left">
                    <h4 className="text-sm font-black uppercase italic leading-none">OVERLAY SIGNAL</h4>
                    <span className="text-[10px] font-bold text-white/30 tracking-tight">+50 Activity Score</span>
                 </div>
              </div>
              <ChevronRight className="text-white/20" size={20} />
           </button>
        </div>
      </div>

      {/* Philosophy Header Core */}
      <div className="glass !bg-black/60 border border-white/5 p-4 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-15">
          <Activity size={40} className="text-amber-500 animate-pulse" />
        </div>
        <h3 className="text-xs font-black uppercase text-amber-500 tracking-[0.2em] mb-1.5">Ecosystem Policy</h3>
        <p className="text-[10px] uppercase font-bold text-white/40 leading-relaxed mb-1">
          $CLUE tokens are distributed proportionally through daily activity contributions.
        </p>
        <span className="text-[8px] uppercase tracking-wider font-extrabold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
          Anti-Bot Protected • Sustainable Rewards
        </span>
      </div>

      {/* CLUEVAULT Progression & Clearance Limit */}
      <div className="glass border border-white/5 p-5 rounded-3xl relative overflow-hidden space-y-4">
         <div className="flex justify-between items-center">
            <div>
               <span className="text-[8.5px] font-black uppercase text-white/40 tracking-wider">CLEARANCE TIER</span>
               <h4 className="text-xl font-black uppercase italic text-amber-500">{bracket.name}</h4>
            </div>
            <div className="text-right">
               <span className="text-[8.5px] font-black uppercase text-white/40 tracking-wider">DAILY CAP EXTREMUM</span>
               <h4 className="text-sm font-mono font-black text-white">{bracket.cap} CLUE</h4>
            </div>
         </div>
         <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5">
               <div className="text-amber-500/80 font-mono font-black italic text-sm">{resources.activityScore} pts</div>
               <div className="text-[8px] font-black uppercase text-white/30 tracking-widest mt-0.5">Accrued Today</div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-2.5">
               <div className="text-white font-mono font-black italic text-sm">+{totalMultiplierPct}%</div>
               <div className="text-[8px] font-black uppercase text-white/30 tracking-widest mt-0.5">Yield Multiplier</div>
            </div>
         </div>
         <div className="bg-white/5 rounded-full h-1 overflow-hidden">
            <div 
              className="h-full bg-amber-500" 
              style={{ width: `${Math.min(100, (resources.activityScore / 1000) * 100)}%` }} 
            />
         </div>
         <div className="flex justify-between text-[8px] font-black uppercase text-white/20">
            <span>Score Progress</span>
            <span>Target: 1000 Pts</span>
         </div>
      </div>

      {/* Main Earning & Simulation Panel */}
      <div className="glass border border-amber-500/20 bg-amber-500/[0.02] p-5 rounded-3xl space-y-4 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">Live Reward Pool</span>
             </div>
             <h3 className="text-2xl font-black italic leading-none">{DAILY_POOL.toLocaleString()} $CLUE</h3>
             <p className="text-[8px] font-bold uppercase tracking-widest text-white/40">Allocated Daily Community Rewards</p>
          </div>
          <button 
             onClick={handleClaimReward}
             disabled={finalEarning <= 0.05}
             className="bg-amber-500 hover:bg-amber-400 disabled:opacity-20 text-black px-4 py-3 rounded-2xl font-black uppercase italic text-[10px] flex items-center gap-1.5 glow-gold transition-colors"
          >
             Claim CLUE <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Dynamic Formula Display */}
        <div className="glass shadow-inner bg-black/40 border border-white/5 rounded-2xl p-3 space-y-2.5">
           <div className="flex justify-between items-center text-[9px] font-black uppercase text-white/40">
             <span>Your Share Calculation</span>
             <HelpCircle size={12} className="text-white/20" />
           </div>
           
           <div className="flex flex-col gap-1.5">
             <div className="flex justify-between text-xs font-black uppercase italic">
                <span className="text-white/60 font-medium">Accumulated Score</span>
                <span className="text-amber-500 font-mono tracking-tight">{resources.activityScore} PTS</span>
             </div>
             <div className="flex justify-between text-xs font-black uppercase italic">
                <span className="text-white/60 font-medium">Simulated Global Score</span>
                <span className="font-mono text-white/60 tracking-tight">{GLOBAL_ACTIVITY_SCORE.toLocaleString()} PTS</span>
             </div>
             <div className="h-px bg-white/5" />
             <div className="flex justify-between text-xs font-black uppercase italic">
                <span className="text-white/60 font-medium font-bold">Unboosted Base Share</span>
                <span className="font-mono text-white tracking-tight">{calculatedShare.toFixed(3)} CLUE</span>
             </div>
             <div className="flex justify-between text-[11px] font-black uppercase italic text-amber-500">
                <span className="font-medium">Total Multiplier applied</span>
                <span className="font-bold font-mono">x{multiplierScalar.toFixed(2)}</span>
             </div>
           </div>

           <div className="border-t border-dashed border-white/10 pt-2.5 flex justify-between items-end">
              <span className="text-[10px] font-black uppercase text-white/30">ESTIMATED DISPATCH TODAY</span>
              <div className="text-right">
                 {finalEarning >= bracket.cap && (
                   <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded mr-1.5 font-bold">CAP REACHED</span>
                 )}
                 <span className="text-lg font-black font-mono italic text-emerald-400">+{finalEarning.toFixed(2)} CLUE</span>
              </div>
           </div>
        </div>

        {/* Claim Rewards Pop-Up Notice */}
        <AnimatePresence>
          {claimedReward !== null && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              className="absolute inset-0 bg-black/95 flex flex-col justify-center items-center text-center p-5 z-20"
            >
               <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-black mb-3 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <Check size={28} strokeWidth={3} />
               </div>
               <h4 className="text-lg font-black uppercase italic tracking-tighter text-emerald-400">DISPATCHING TRANSACTION</h4>
               <p className="text-xs text-white/60 font-medium px-4 mt-1">Successfully claimed <strong className="text-white">+{claimedReward} $CLUE</strong> into local player hot wallet!</p>
               <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest font-mono mt-3">TX_HASH: 0x5a1b...{Math.random().toString(16).substring(2, 6).toUpperCase()}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Breakdown of active Multipliers */}
        <div className="space-y-2">
           <h4 className="text-[9px] font-black uppercase tracking-widest text-white/30">Active Yield Multipliers</h4>
           <div className="grid grid-cols-3 gap-2">
              <div className={cn("glass p-2.5 rounded-2xl text-center border-white/5", streakMult.pct > 0 ? "border-amber-500/30 bg-amber-500/5 text-amber-500" : "text-white/40")}>
                 <Flame size={12} className="mx-auto mb-1" />
                 <div className="text-xs font-black">+{streakMult.pct}%</div>
                 <div className="text-[7px] uppercase font-bold tracking-tight">Streak</div>
              </div>
              <div className={cn("glass p-2.5 rounded-2xl text-center border-white/5", stakingMult.pct > 0 ? "border-blue-500/30 bg-blue-500/5 text-blue-500" : "text-white/40")}>
                 <Lock size={12} className="mx-auto mb-1" />
                 <div className="text-xs font-black">+{stakingMult.pct}%</div>
                 <div className="text-[7px] uppercase font-bold tracking-tight">Staking</div>
              </div>
              <div className={cn("glass p-2.5 rounded-2xl text-center border-white/5", crewMult.pct > 0 ? "border-indigo-500/30 bg-indigo-500/5 text-indigo-500" : "text-white/40")}>
                 <Check size={12} className="mx-auto mb-1" />
                 <div className="text-xs font-black">+{crewMult.pct}%</div>
                 <div className="text-[7px] uppercase font-bold tracking-tight">Crew Base</div>
              </div>
           </div>
        </div>
      </div>

      {/* STAKING SYSTEMS */}
      <div className="glass border border-white/5 p-5 rounded-3xl space-y-4">
        <div className="flex justify-between items-start">
           <div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-1.5">
                <Lock size={18} className="text-blue-500" /> STAKING VAULTS
              </h3>
              <p className="text-[10px] text-white/50 uppercase font-bold">Lock CLUE to secure governance voting and earn scaling multipliers</p>
           </div>
           {resources.stakedClue > 0 && (
             <button 
               onClick={handleUnstake}
               className="text-[8px] font-black uppercase bg-white/10 text-white hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/10"
             >
               Unstake
             </button>
           )}
        </div>

        {/* Current Staked status */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex justify-between items-center">
           <div>
              <span className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none">Your Locked Staking</span>
              <h4 className="text-md font-black italic mt-0.5">{resources.stakedClue ? resources.stakedClue.toFixed(1) : "0.0"} $CLUE</h4>
           </div>
           <div className="text-right">
              <span className="text-[8px] font-black uppercase text-white/30 tracking-widest leading-none">Active Multiplier Boost</span>
              <h4 className="text-md font-mono font-black text-blue-500">+{stakingMult.pct}%</h4>
           </div>
        </div>

        {/* Choose Staking Option Card Grid */}
        <div className="space-y-2">
           {STAKING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { setSelectedStakingOption(opt.id); triggerHaptic("light"); }}
                className={cn(
                  "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between",
                  selectedStakingOption === opt.id 
                    ? "bg-blue-500/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                )}
              >
                <div className="space-y-0.5">
                   <div className="flex items-center gap-2">
                     <span className="text-xs font-black uppercase leading-none">{opt.name}</span>
                     <span className="text-[8px] font-black text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded leading-none">{opt.duration}</span>
                   </div>
                   <p className="text-[9px] text-white/40 font-bold uppercase">{opt.desc}</p>
                </div>
                <div className="text-right">
                   <div className="text-xs font-black italic text-emerald-400 leading-none">{opt.apy}</div>
                   <div className="text-[9px] font-black text-blue-400 uppercase mt-1">Boost: {opt.boost}</div>
                </div>
              </button>
           ))}
        </div>

        {/* Interactive Stake Submit panel */}
        <div className="flex gap-2">
           <input 
             value={stakingAmount}
             onChange={(e) => setStakingAmount(e.target.value)}
             placeholder="Amount to Stake..."
             type="number"
             className="flex-1 bg-white/[0.03] outline-none border border-white/5 rounded-2xl py-3.5 px-4 font-mono font-bold text-xs uppercase focus:border-blue-500/50 text-blue-500"
           />
           <button 
             onClick={handleStakingSubmit}
             className="bg-blue-500 hover:bg-blue-400 text-black font-black uppercase italic tracking-wider text-xs px-6 py-3.5 rounded-2xl flex items-center gap-1.5 transition-colors shadow-lg"
           >
             Lock Stake <Plus size={14} strokeWidth={3} />
           </button>
        </div>
      </div>

      {/* DAO & GOVERNANCE voting panel */}
      <div className="glass border border-white/5 p-5 rounded-3xl space-y-4">
         <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-1.5">
              <Vote size={18} className="text-indigo-500" /> GOVERNANCE SYSTEM
            </h3>
            <p className="text-[10px] text-white/50 uppercase font-bold">1 CLUE = 1 Vote Core Power • Cast ballot to influence theme features</p>
         </div>

         {/* Governance proposal cards */}
         <div className="space-y-3.5">
            {DAO_PROPOSALS.map((prop) => (
               <div key={prop.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                     <span className="text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black">ACTIVE POLL</span>
                     <span className="text-[8.5px] font-mono text-white/30 font-bold">{prop.votes.toLocaleString()} POWER CAST</span>
                  </div>
                  <div>
                     <h4 className="text-xs font-black uppercase trailing-tight text-white/80">{prop.title}</h4>
                     <p className="text-[9px] text-white/40 uppercase font-bold mt-1 leading-relaxed">{prop.desc}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                     {prop.options.map((opt, optIdx) => (
                        <button
                          key={optIdx}
                          disabled={hasVoted[prop.id]}
                          onClick={() => handleVote(prop.id, optIdx)}
                          className={cn(
                            "py-2 px-1.5 text-center rounded-xl font-black uppercase italic text-[8.5px] border transition-all truncate",
                            hasVoted[prop.id] 
                              ? "bg-white/5 border-white/5 text-white/30 cursor-not-allowed" 
                              : "glass bg-white/[0.01] border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-white/60"
                          )}
                        >
                           {opt}
                        </button>
                     ))}
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* BOT DEFENSE / ANTI-FARMING HUB */}
      <div className="glass border border-white/5 p-5 rounded-3xl space-y-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-3 opacity-10">
            <Cpu size={24} className="text-amber-500 animate-spin" />
         </div>
         <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-1.5">
              <ShieldCheck size={18} className="text-emerald-500" /> HUMAN CALIBRATION
            </h3>
            <p className="text-[10px] text-white/50 uppercase font-bold">Defend ecosystem from automated script farmers. Verified accounts earn score multipliers.</p>
         </div>

         {/* Status box */}
         <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
               <div>
                  <h4 className="text-xs font-black uppercase text-emerald-500 leading-none">Guard active</h4>
                  <span className="text-[8px] font-mono uppercase text-emerald-500/60 font-bold">Calibration Verified Human</span>
               </div>
            </div>
            <div className="text-xs font-mono font-bold text-white/40">100% SECURITY</div>
         </div>

         {/* Human proof click challenge */}
         {!calibrationActive ? (
            <button 
              onClick={startHumanCalibration}
              className="w-full bg-white/5 hover:bg-amber-500/10 text-white hover:text-amber-500 border border-white/5 py-3 rounded-2xl font-black uppercase italic text-[10px] flex items-center justify-center gap-1.5 transition-all"
            >
               Run Behavioral Calibration <RefreshCw size={12} />
            </button>
         ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4 text-center">
               <div>
                  <h4 className="text-xs font-black uppercase italic text-amber-500 leading-none">CALIBRATING SIGNAL LINE</h4>
                  <p className="text-[9px] text-white/40 uppercase font-medium mt-1">Tap node <strong className="text-white">#{calibrationTarget}</strong> of 4 (Step {calibrationStep}/3)</p>
               </div>
               <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((id) => (
                     <button
                       key={id}
                       onClick={() => clickCalibrationCircle(id)}
                       className={cn(
                         "aspect-square rounded-full border flex items-center justify-center font-bold text-sm transition-all",
                         id === calibrationTarget 
                           ? "bg-amber-500 hover:bg-amber-400 border-amber-500 text-black shadow-lg" 
                           : "bg-white/5 border-white/5 hover:border-white/10 text-white/50"
                       )}
                     >
                        {id}
                     </button>
                  ))}
               </div>
            </div>
         )}
      </div>

    </div>
  );
}
