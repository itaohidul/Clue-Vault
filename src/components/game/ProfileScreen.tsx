import { useGame } from "../../App";
import { User, Shield, Trophy, Zap, Edit3, Settings, LogOut, Award, Star, ChevronRight, Cloud, CloudOff } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import { useFirebaseSync } from "../FirebaseSyncProvider";

export default function ProfileScreen() {
  const { user, resources, crew, triggerHaptic } = useGame();

  const handleAction = () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    triggerHaptic("light");
  };

  const { firebaseUser, googleSignIn, googleSignOut, isSyncing } = useFirebaseSync();

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
      {firebaseUser ? (
        <div className="glass p-5 rounded-3xl border-emerald-500/15 bg-emerald-500/5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Cloud size={20} className="animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider leading-none">Cloud Sync Connected</span>
                <span className="text-[9px] font-bold text-white/50 block tracking-tight font-mono truncate max-w-[140px] mt-1">{firebaseUser.email}</span>
              </div>
            </div>
            <button 
              onClick={googleSignOut}
              disabled={isSyncing}
              className="bg-white/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all border border-white/5 active:scale-95 disabled:opacity-50 shrink-0"
            >
              Disconnect
            </button>
          </div>
          <p className="text-[9px] text-white/40 leading-relaxed font-semibold uppercase">
            Your codename, coins, keys, upgrades, and terminal progress are automatically synchronized to your secure Google Cloud vault.
          </p>
        </div>
      ) : (
        <div className="glass p-5 rounded-3xl border-amber-500/15 bg-amber-500/5 space-y-4 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <CloudOff size={20} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider leading-none">Secure Terminal Backup</span>
              <p className="text-[9px] text-white/40 leading-relaxed font-semibold uppercase">
                Your profile is currently running offline. Link a Google Account to secure your assets and prevent data loss.
              </p>
            </div>
          </div>
          <button 
            onClick={googleSignIn}
            disabled={isSyncing}
            className="w-full bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all text-black py-3.5 rounded-2xl font-black uppercase italic tracking-widest text-xs flex items-center justify-center gap-2 glow-gold disabled:opacity-50"
          >
            {isSyncing ? "Syncing Vault..." : "Sync Progress with Google"}
          </button>
        </div>
      )}

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
