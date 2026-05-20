import { motion } from "motion/react";
import { useGame } from "../../App";
import { Zap, Shield, Trophy, Key, Star, ChevronRight, Bell, Share2, Flame, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import CountdownTimer from "../ui/CountdownTimer";

export default function HomeScreen() {
  const { user, resources, crew, triggerHaptic } = useGame();

  const handleTileClick = () => {
    triggerHaptic("light");
  };

  return (
    <div className="p-5 pb-20 space-y-6">
      {!user.onboarded && (
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex flex-col gap-4 text-center"
        >
           <div>
              <h3 className="text-sm font-black uppercase italic tracking-wider text-amber-500 mb-1">Observation Mode Active</h3>
              <p className="text-[10px] text-white/50 uppercase font-bold px-4">Complete recruitment to interact with the mystery network and claim real rewards.</p>
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem("cluevault_onboarding_skipped");
               window.location.reload();
             }}
             className="w-full bg-amber-500 text-black py-4 rounded-2xl font-black uppercase italic text-[10px] glow-gold"
           >
             Initialize Recruitment
           </button>
        </motion.div>
      )}

      {/* Top Bar: Energy & Fragments */}
      <div className="flex gap-3">
         <div className="flex-1 glass rounded-2xl p-3 border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-center mb-1">
               <div className="flex items-center gap-1.5 overflow-hidden">
                  <Zap size={14} className="text-amber-500 shrink-0" />
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest truncate">Energy</span>
               </div>
               <span className="text-[10px] font-black italic">{resources.energy}/{resources.maxEnergy}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${(resources.energy / resources.maxEnergy) * 100}%` }}
                 className="h-full bg-amber-500 glow-gold" 
               />
            </div>
         </div>
         <div className="flex-1 glass rounded-2xl p-3 border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
               <Star size={14} className="text-blue-500" />
               <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Fragments</span>
            </div>
            <span className="text-sm font-black italic">{resources.fragments}</span>
         </div>
      </div>

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Authenticated Agent</h1>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">{user.name || "Agent"}</h2>
        </div>
        <div className="text-right">
           <div className="text-[10px] font-black uppercase text-amber-500 mb-1">Level {Math.floor(user.level)}</div>
           <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${(user.level % 1) * 100}%` }} />
           </div>
        </div>
      </header>

      {/* Streak Milestone Banner - PROMINENT */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/30 rounded-3xl p-5"
      >
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
             <div className="relative">
                <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                   <Flame size={32} strokeWidth={2.5} className="animate-pulse" />
                </div>
                <div className="absolute -top-2 -right-2 bg-black border border-amber-500 text-amber-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                   {user.streak}D
                </div>
             </div>
             <div>
                <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Streak Bonus</h3>
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-1">
                   {7 - (user.streak % 7)} Days to next Milestone
                </p>
             </div>
          </div>
          <div className="text-right">
             <div className="text-[8px] font-black uppercase text-amber-500/60 mb-1">Weekly Prize</div>
             <div className="text-xs font-black italic">CLUE FRAGMENT X5</div>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-4 flex gap-1">
           {[1, 2, 3, 4, 5, 6, 7].map((day) => (
             <div 
               key={day} 
               className={cn(
                 "h-1.5 flex-1 rounded-full overflow-hidden",
                 day <= (user.streak % 7 || (user.streak > 0 ? 7 : 0))
                  ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                  : "bg-white/10"
               )} 
             />
           ))}
        </div>
        
        {/* Scanning Line Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20" />
      </motion.div>

      {/* CLUE REWARD ENGINE HUB LINK */}
      <Link to="/app/earn" onClick={handleTileClick}>
        <motion.div 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-black to-black border border-emerald-500/25 rounded-3xl p-5 flex flex-col justify-between shadow-[0_0_15px_rgba(16,185,129,0.05)]"
        >
          <div className="flex justify-between items-start mb-3">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">REWARD ENGINE ACTIVE</span>
              </div>
              <span className="text-[9px] font-mono font-black text-white bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">120K DAILY POOL</span>
          </div>
          
          <div className="flex justify-between items-end">
             <div>
                <h4 className="text-xl font-black uppercase italic tracking-tighter text-white">Your Reward Share</h4>
                <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest mt-0.5 font-mono">Accrued Today: {resources.activityScore || 0} PTS</p>
             </div>
             <div className="text-right">
                <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg">CALCULATE POOL</span>
             </div>
          </div>
        </motion.div>
      </Link>

      {/* Daily Clue Preview */}
      <motion.div 
        onClick={handleTileClick}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden glass rounded-3xl p-6 border-amber-500/20"
      >
        <div className="absolute top-0 right-0 p-4">
           <Zap size={32} className="text-amber-500/20 animate-pulse" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">System Link Active</span>
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-1">Today's Clue Drop</h3>
          <p className="text-sm text-white/50 mb-6 max-w-[80%]">The encrypted message from Sector 7 has been decrypted. Retrieve the key before the signal fades.</p>
          <Link 
            to="/app/missions"
            className="inline-flex items-center gap-2 bg-amber-500 text-black px-6 py-3 rounded-2xl font-black uppercase italic text-sm glow-gold"
          >
            Continue Mission <ChevronRight size={16} />
          </Link>
        </div>
        {/* Background Graphic */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/5 blur-3xl rounded-full" />
      </motion.div>

      {/* Grid Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Crew Status */}
        <Link 
          to="/app/crew" 
          onClick={handleTileClick}
          className="glass p-5 rounded-3xl border-blue-500/10 space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-all">
            <Users size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white/30">Crew Intel</h4>
            <div className="text-sm font-black italic">{crew?.name || "No Crew"}</div>
            <div className="text-[10px] font-bold text-blue-500 uppercase">{crew ? `Rank #${crew.rank}` : "Join Now"}</div>
          </div>
        </Link>

        {/* Vault Status */}
        <Link 
          to="/app/vault" 
          onClick={handleTileClick}
          className="glass p-5 rounded-3xl border-amber-500/10 space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white/30">Next Vault</h4>
            <div className="text-sm font-black italic">
              Ready In <CountdownTimer hours={2} minutes={15} showSeconds={false} className="font-mono" />
            </div>
            <div className="text-[10px] font-bold text-amber-500 uppercase">Requires 1 Key</div>
          </div>
        </Link>
      </div>

      {/* Active Event Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-3xl p-6 border border-blue-500/20">
         <div className="flex justify-between items-center relative z-10">
            <div>
              <div className="text-[10px] font-black uppercase text-blue-400 mb-1">Live Event</div>
              <h4 className="text-lg font-black uppercase italic tracking-tighter">Night Owl Protocol</h4>
              <p className="text-xs text-white/60">Double rewards for all stealth ops.</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
               <Trophy className="text-blue-400" size={24} />
            </div>
         </div>
         <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 blur-[50px]" />
      </div>

      {/* Base Preview */}
      <Link to="/app/base">
        <motion.div 
          onClick={handleTileClick}
          whileTap={{ scale: 0.98 }}
          className="glass rounded-3xl p-5 border-white/5 cursor-pointer"
        >
          <div className="flex justify-between items-end mb-4">
            <div>
              <h4 className="text-[10px] font-black uppercase text-white/30 mb-1">Base Progression</h4>
              <div className="text-lg font-black uppercase italic tracking-tighter">Underground Lab</div>
            </div>
            <div className="text-xs font-bold text-amber-500 uppercase">Level 2</div>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-amber-500 w-[65%] rounded-full glow-gold" />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/20">
             <span>650 / 1000 XP</span>
             <span>5 Rooms Unlocked</span>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
