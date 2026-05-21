import { useGame } from "../../App";
import { User, Shield, Trophy, Zap, Edit3, Settings, LogOut, Award, Star, ChevronRight, Cloud, CloudOff } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useMongoSync } from "../MongoSyncProvider";

export default function ProfileScreen() {
  const { user, resources, crew, triggerHaptic } = useGame();

  const handleAction = () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    triggerHaptic("light");
  };

  const { userId, isSyncing, error: syncError, dbConnected, syncLocalToCloud } = useMongoSync();

  const achievements = [
    { name: "First Breach", icon: Zap, unlocked: true },
    { name: "Vault Master", icon: Shield, unlocked: true },
    { name: "Ghost Operative", icon: Award, unlocked: false },
    { name: "Crew Legend", icon: Trophy, unlocked: false },
  ];

  return (
    <div className="p-5 pb-24 space-y-8">
      <header className="text-center pt-8">
        {!user.onboarded && (
          <div className="mb-6 glass rounded-2xl p-4 border-amber-500/20 bg-amber-500/5 inline-block mx-auto">
             <p className="text-[8px] font-black uppercase text-amber-500 mb-2 italic">Credentials Not Found</p>
             <button 
               onClick={() => {
                 localStorage.removeItem("cluevault_onboarding_skipped");
                 window.location.reload();
               }}
               className="bg-amber-500 text-black px-6 py-2 rounded-xl font-black uppercase italic text-[10px] glow-gold"
             >
               Initialize Terminal
             </button>
          </div>
        )}
        <div className="relative inline-block mb-4">
          <div className="w-28 h-28 rounded-[2.5rem] overflow-hidden border-4 border-amber-500/30 glow-gold relative z-10">
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-500 text-black p-2 rounded-xl z-20 glow-gold">
            <Edit3 size={16} />
          </div>
          {/* Decorative Circles */}
          <div className="absolute -top-4 -left-4 w-12 h-12 bg-blue-500/10 blur-xl rounded-full" />
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-amber-500/10 blur-xl rounded-full" />
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">{user.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Clearance Level {user.level}</span>
          <div className="w-1 h-1 rounded-full bg-amber-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Elite Agent</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl border-white/5 flex flex-col items-center text-center">
          <span className="text-2xl font-black italic text-amber-500">{user.streak}D</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Active Streak</span>
        </div>
        <div className="glass p-5 rounded-3xl border-white/5 flex flex-col items-center text-center">
          <span className="text-2xl font-black italic text-blue-500">#{crew?.rank || "—"}</span>
          <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Global Rank</span>
        </div>
      </div>

      {/* Career Progress */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2">Mission Achievements</h3>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((ach, i) => (
            <div 
              key={i} 
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all",
                ach.unlocked 
                  ? "glass border-amber-500/20 text-amber-500" 
                  : "bg-white/5 border-white/5 text-white/10"
              )}
            >
              <ach.icon size={20} />
              <span className="text-[7px] font-black uppercase leading-tight text-center px-1">
                {ach.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud Sync Status */}
      <div className={cn(
        "glass p-5 rounded-3xl border transition-all duration-500",
        dbConnected === true ? "border-emerald-500/15 bg-emerald-500/5" : 
        dbConnected === false ? "border-red-500/15 bg-red-500/5" :
        "border-amber-500/15 bg-amber-500/5"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
            dbConnected === true ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
            dbConnected === false ? "bg-red-500/10 border-red-500/20 text-red-400" :
            "bg-amber-500/10 border-amber-500/20 text-amber-400"
          )}>
            {isSyncing ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : dbConnected === false ? (
              <CloudOff size={20} />
            ) : (
              <Cloud size={20} />
            )}
          </div>
          <div className="min-w-0">
            <span className={cn(
              "text-[10px] font-black uppercase block tracking-wider leading-none",
              dbConnected === true ? "text-emerald-400" : 
              dbConnected === false ? "text-red-400" :
              "text-amber-400"
            )}>
              {isSyncing ? "Synchronizing Vault..." : 
               dbConnected === true ? "Cloud Storage Active" :
               dbConnected === false ? "Connection Failed" :
               "Checking Data Link..."}
            </span>
            <span className="text-[9px] font-bold text-white/50 block tracking-tight font-mono truncate max-w-[140px] mt-1">
              {dbConnected === true ? "MONGODB ATLAS CONNECTED" : 
               dbConnected === false ? "MONGO OFFLINE" :
               "SECURE TUNNEL INITIALIZING..."}
            </span>
          </div>
        </div>
        <p className="text-[9px] text-white/40 leading-relaxed font-semibold uppercase mt-4">
          Your codename, ZP, key, upgrades, and terminal progress are automatically synchronized to your secure encrypted MongoDB Atlas vault.
        </p>

        <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
          <button 
            disabled={isSyncing}
            onClick={() => syncLocalToCloud()}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
              dbConnected === true 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" 
                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
            )}
          >
            {isSyncing ? "SYNCING..." : dbConnected === false ? "RETRY SYNC" : "FORCED BACKUP"}
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:bg-white/10 transition-all shrink-0"
          >
            <Settings size={18} />
          </button>
        </div>

        {syncError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-xl text-[8px] font-bold uppercase relative pr-8 mt-2 overflow-hidden">
            <p className="break-words">{syncError}</p>
            <div className="mt-2 pt-2 border-t border-red-500/10 opacity-50">
               <p>Please check your Atlas Network Access (IP 0.0.0.0/0) and ensure the password in MONGODB_URI is correct.</p>
            </div>
          </div>
        )}
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        <button 
          onClick={handleAction}
          className="w-full glass p-4 rounded-2xl flex items-center justify-between border-white/5 hover:bg-white/5 transition-all text-sm font-black uppercase italic tracking-tight"
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-white/40" />
            <span>Operational Settings</span>
          </div>
          <ChevronRight size={16} className="text-white/20" />
        </button>
        <button 
          onClick={handleAction}
          className="w-full glass p-4 rounded-2xl flex items-center justify-between border-white/5 hover:bg-white/5 transition-all text-sm font-black uppercase italic tracking-tight"
        >
          <div className="flex items-center gap-3 text-red-500/60">
            <LogOut size={18} />
            <span>Abandon Terminal</span>
          </div>
        </button>
      </div>

      <div className="text-center pt-4">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/10">ID: CV-882-AGENT-ALPHA</p>
      </div>
    </div>
  );
}
