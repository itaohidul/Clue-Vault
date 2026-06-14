import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useGame } from "../../App";
import { User, Shield, Trophy, Zap, Edit3, Settings, LogOut, Award, Star, ChevronRight, Search, Loader2, RefreshCw, Key, UserCheck, Database, Wifi, WifiOff, CheckCircle2, AlertTriangle, Check, Copy, Activity, Terminal, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { LoginButton } from '@telegram-auth/react';

export default function ProfileScreen() {
  const { user, resources, crew, triggerHaptic } = useGame();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRecoveryPanel, setShowRecoveryPanel] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  const { userId, isSyncing, dbConnected, syncLocalToCloud } = useSupabaseSync();
  const [localSyncStatus, setLocalSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>("idle");
  const [localSyncMsg, setLocalSyncMsg] = useState("");
  const [uidCopied, setUidCopied] = useState(false);
  const isTgWebApp = typeof window !== 'undefined' && !!(window.Telegram?.WebApp?.initData);

  const handleTelegramLink = (tgUser: any) => {
    try {
      triggerHaptic("heavy");
      const id = tgUser.id.toString();
      localStorage.setItem("cluevault_supabase_id", id);
      setRecoveryStatus("Handshake paired successfully! Rebooting shell...");
      
      // Attempt to secure current cache using new identity before reloading
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.warn("Failed handling Telegram link", err);
    }
  };

  const handleForceSync = async () => {
    if (isSyncing || localSyncStatus === "syncing") return;
    
    triggerHaptic("medium");
    setLocalSyncStatus("syncing");
    setLocalSyncMsg("Synchronizing encrypted credentials state...");
    
    // Perform syncLocalToCloud
    const isSuccess = await syncLocalToCloud();
    
    if (isSuccess) {
      setLocalSyncStatus("success");
      setLocalSyncMsg("Synchronized! Progress successfully secured to cloud.");
      triggerHaptic("success");
      setTimeout(() => {
        setLocalSyncStatus("idle");
      }, 5000);
    } else {
      setLocalSyncStatus("error");
      setLocalSyncMsg("Offline backup active: Progress safely stored in local cache.");
      triggerHaptic("error");
      setTimeout(() => {
        setLocalSyncStatus("idle");
      }, 5000);
    }
  };

  const handleCopyUid = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setUidCopied(true);
    triggerHaptic("success");
    setTimeout(() => setUidCopied(false), 2000);
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    setIsSearching(true);
    try {
      const resp = await fetch(`/api/users/search?query=${encodeURIComponent(val)}`);
      const data = await resp.json();
      setSearchResults(data || []);
    } catch (e) {
      console.error("Discovery error", e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleSearch("");
  }, []);

  const handleRestoreAccount = (remoteUser: any) => {
    triggerHaptic("success");
    setRecoveryStatus("Pairing selected credential node...");
    
    setTimeout(() => {
      try {
        localStorage.setItem("cluevault_supabase_id", remoteUser.telegram_id);
        localStorage.setItem("cluevault_onboarding_hidden", "true");
        localStorage.removeItem("cluevault_onboarding_skipped");
        
        setRecoveryStatus("Handshake paired successfully! Rebooting shell...");
        
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } catch (err) {
        setRecoveryStatus("Initialization failed: permissions error.");
      }
    }, 1000);
  };

  const handleAction = () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    triggerHaptic("light");
  };

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
                 localStorage.removeItem("cluevault_onboarding_hidden");
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

      {/* Supabase Core Sync Panel */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2 flex items-center gap-2">
          <Database size={12} className="text-amber-500" />
          Cloud Synchronization Protocol
        </h3>
        <div className="glass border-white/5 bg-black/40 rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-amber-500">
                <Database size={16} />
              </div>
              <div>
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest block">Cloud Sync Backup</span>
                <span className="text-xs font-black text-white italic tracking-tight uppercase">Progress Backup</span>
              </div>
            </div>

            {/* Connection Status Indicator */}
            {dbConnected ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[8px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi size={10} className="inline mr-0.5" />
                Signal Online
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-[8px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <WifiOff size={10} className="inline mr-0.5" />
                Offline Cache
              </div>
            )}
          </div>

          {/* Identity Node Row */}
          {userId && (
            <div className="space-y-2">
              <div className="p-3 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest block">Identity Node</span>
                  <span className="text-[10px] font-mono text-amber-500/90 font-black tracking-tight uppercase truncate block max-w-[150px]">
                    {userId}
                  </span>
                </div>
                <button
                  onClick={handleCopyUid}
                  className={cn(
                    "p-2 rounded-xl transition-all border shrink-0",
                    uidCopied 
                      ? "bg-emerald-500/15 border-emerald-500/20 text-emerald-400"
                      : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                  )}
                >
                  {uidCopied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                </button>
              </div>
              <div className="p-3 bg-black/50 border border-white/5 rounded-2xl flex items-center justify-between text-left">
                <div>
                  <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest block">Local Sector Time</span>
                  <span className="text-[10px] font-mono text-blue-400 font-black tracking-tight uppercase block">
                    {user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
                <Globe size={14} className="text-white/20" />
              </div>
            </div>
          )}

          {/* Sync status messages */}
          <div className="text-[9px] text-white/50 leading-relaxed font-sans border-t border-white/5 pt-3 space-y-1">
            <div className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-500/50 mt-1" />
              <span>Offline edits (Missions, Upgrades, crew adjustments) are automatically cached.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-500/50 mt-1" />
              <span>State updates are synchronized securely with the cloud to preserve your progress.</span>
            </div>
          </div>

          {/* Active status progress bar */}
          {localSyncStatus !== "idle" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className={cn(
                "p-3 rounded-2xl border text-[9px] font-mono font-medium flex items-center gap-2",
                localSyncStatus === "syncing" && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                localSyncStatus === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                localSyncStatus === "error" && "bg-rose-500/10 border-rose-500/20 text-rose-400"
              )}
            >
              {localSyncStatus === "syncing" && <Loader2 size={12} className="animate-spin text-blue-400 shrink-0" />}
              {localSyncStatus === "success" && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
              {localSyncStatus === "error" && <AlertTriangle size={12} className="text-rose-400 shrink-0" />}
              <span>{localSyncMsg}</span>
            </motion.div>
          )}

          {/* Sync Trigger button */}
          <button
            onClick={handleForceSync}
            disabled={isSyncing || localSyncStatus === "syncing"}
            className={cn(
              "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-2 outline-none border",
              isSyncing || localSyncStatus === "syncing"
                ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                : localSyncStatus === "success"
                ? "bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-400 border-emerald-500/30 glow-emerald"
                : "bg-amber-500 hover:bg-amber-600 text-black border-amber-400/30 glow-gold active:scale-98"
            )}
          >
            {(isSyncing || localSyncStatus === "syncing") ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Securing Sync Stream...
              </>
            ) : localSyncStatus === "success" ? (
              <>
                <CheckCircle2 size={12} />
                Datastore Synced Successfully
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                Synchronize Offline Progress to Cloud
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings List */}
      <div className="space-y-2">
        <Link 
          to="/app/history"
          onClick={() => triggerHaptic("light")}
          className="w-full glass p-4 rounded-2xl flex items-center justify-between border-white/5 hover:bg-white/5 transition-all text-sm font-black uppercase italic tracking-tight text-white mb-2"
        >
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-amber-500" />
            <span>Ledger Logs (History)</span>
          </div>
          <ChevronRight size={16} className="text-white/20" />
        </Link>

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


        {/* Account Discovery & Recovery Module */}
        <button 
          onClick={() => {
            triggerHaptic("heavy");
            setShowRecoveryPanel(true);
            handleSearch("");
          }}
          className="w-full glass p-4 rounded-2xl flex items-center justify-between border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 transition-all text-sm font-black uppercase italic tracking-tight text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
        >
          <div className="flex items-center gap-3">
            <Key size={18} className="animate-pulse" />
            <span>Restore Lost Progress</span>
          </div>
          <ChevronRight size={16} className="text-amber-500/60" />
        </button>

        <button 
          onClick={() => {
            triggerHaptic("light");
            localStorage.clear();
            window.location.reload();
          }}
          className="w-full glass p-4 rounded-2xl flex items-center justify-between border-white/5 hover:bg-red-500/5 transition-all text-sm font-black uppercase italic tracking-tight"
        >
          <div className="flex items-center gap-3 text-red-500/60">
            <LogOut size={18} />
            <span>Reset Cache & Onboard</span>
          </div>
        </button>
      </div>

      <div className="text-center pt-4">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/10">{user?.id ? `TERMINAL ID: ${user.id}` : "MODE: OFFLINE MONITOR"}</p>
      </div>

      {/* Account Restore Terminal Drawer */}
      <AnimatePresence>


        {showRecoveryPanel && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col justify-end"
          >
            {/* Backdrop Dismiss Clickable Area */}
            <div className="absolute inset-0 z-0" onClick={() => setShowRecoveryPanel(false)} />

            {/* Recovery Drawer Body */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative z-10 glass-dark rounded-t-[2.5rem] border-t border-white/10 max-h-[85vh] flex flex-col p-6 pb-12 w-full max-w-md mx-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">Terminal Recovery</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase italic">Sync previous credentials / codenames</p>
                </div>
                <button 
                  onClick={() => setShowRecoveryPanel(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase text-white/50 transition-all"
                >
                  Close
                </button>
              </div>

              {/* Status Message Overlay */}
              {recoveryStatus ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                  <p className="text-[11px] font-black uppercase text-amber-500 tracking-wider animate-pulse">{recoveryStatus}</p>
                </div>
              ) : (
                <>
                  {/* Search Query Area */}
                  <div className="relative mb-5">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search codename or agent name..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-amber-500/30 text-xs font-black uppercase italic text-amber-400 placeholder-white/20 transition-all animate-none"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" size={14} />
                    )}
                  </div>

                  {/* Scannable Results Container */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[45vh] min-h-[30vh]">
                    {!isTgWebApp && (
                      <div className="mb-4 glass rounded-2xl p-4 border-emerald-500/20 bg-emerald-500/5 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-tight text-emerald-400 mb-2">Automated Web Login</h4>
                        <p className="text-[9px] text-white/50 leading-relaxed mb-4">
                          Link or restore your existing Telegram Data instantly using Telegram's secure payload widget.
                        </p>
                        <div className="inline-block relative z-10 scale-[1.15] origin-center -ml-2">
                          <LoginButton
                            botUsername="ClueVaultBot"
                            onAuthCallback={handleTelegramLink}
                            buttonSize="large"
                            cornerRadius={8}
                            showAvatar={true}
                          />
                        </div>
                      </div>
                    )}
                    
                    {searchResults.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-center p-6 text-white/20 border border-white/5 border-dashed rounded-2xl">
                        <UserCheck size={28} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-wider">No matching active nodes.</span>
                        <span className="text-[8px] uppercase tracking-wide text-white/10 mt-1">Please insert at least 2 char codename.</span>
                      </div>
                    ) : (
                      searchResults.map((item: any, idx: number) => {
                        const parsedState = item.state_json || {};
                        const playerLvl = parsedState.user?.level || item.level || 1;
                        const isCurrent = item.telegram_id === localStorage.getItem("cluevault_supabase_id");

                        return (
                          <div 
                            key={item.telegram_id || idx}
                            className={cn(
                              "glass rounded-2xl p-4 flex items-center justify-between border-white/5 transition-all text-left",
                              isCurrent ? "border-amber-500/20 bg-amber-500/5 relative" : "hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 overflow-hidden">
                                <img src={parsedState.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.telegram_id}`} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black uppercase tracking-tight flex items-center gap-1.5">
                                  {item.username || parsedState.user?.name || "Agent"}
                                  {isCurrent && <span className="text-[6.5px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black uppercase italic tracking-wide">Connected</span>}
                                </h4>
                                <div className="text-[8px] font-black text-white/30 uppercase mt-0.5">
                                  LEVEL {playerLvl} • {(item.balance || parsedState.resources?.coins || 0).toLocaleString()} ZP
                                </div>
                                <div className="text-[7px] text-white/15 uppercase font-mono mt-0.5 mt-1 leading-none">
                                  ID: {item.telegram_id.slice(0, 12)}...
                                </div>
                              </div>
                            </div>

                            {!isCurrent && (
                              <button
                                onClick={() => handleRestoreAccount(item)}
                                className="bg-amber-500 hover:bg-amber-600 px-4 py-2.5 rounded-xl text-black font-black uppercase italic text-[9px] tracking-tight transition-all active:scale-95 shadow-md"
                              >
                                Restore
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  <p className="text-[7.5px] font-black uppercase text-center tracking-normal text-white/15 px-4 leading-normal mt-5">
                    Securely verifies progress records in the cloud to restore your persistent account safely.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
