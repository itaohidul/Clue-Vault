import { useState } from "react";
import { useGame } from "../../App";
import { 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  ChevronRight, 
  ExternalLink, 
  Shield, 
  Tv, 
  Sparkles, 
  Eye, 
  RefreshCw,
  Coins
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export default function SocialTasksScreen() {
  const { user, completeMission, triggerHaptic } = useGame();
  
  // Section 1: Community
  const [communityTasks, setCommunityTasks] = useState([
    { 
      id: "join_tg", 
      title: "Join Telegram Community", 
      icon: MessageSquare, 
      reward: 500, 
      link: "https://t.me/cluevault_group",
      completed: false 
    },
    { 
      id: "follow_news", 
      title: "Follow Announcements", 
      icon: Bell, 
      reward: 300, 
      link: "https://t.me/cluevault_channel",
      completed: false 
    },
  ]);

  // Section 2: Ads State
  const [ad1Loading, setAd1Loading] = useState(false);
  const [ad2Loading, setAd2Loading] = useState(false);

  // Section 3: Visit Links
  const [reconTasks, setReconTasks] = useState([
    {
      id: "recon_omega",
      title: "Reconnaissance Alpha",
      desc: "Visit and scroll Omega feed for 5s to sync signals.",
      link: "https://omg10.com/4/11030039",
      reward: 750,
      completed: false
    },
    {
      id: "recon_vault",
      title: "Frequency Audit",
      desc: "Analyze secondary node and stream matching data.",
      link: "https://omg10.com/4/6430252",
      reward: 750,
      completed: false
    }
  ]);

  const [visitingId, setVisitingId] = useState<string | null>(null);
  const [timerCount, setTimerCount] = useState(5);

  // Handle Community Tasks
  const handleCommunityAction = (task: any) => {
    if (task.completed || !user.onboarded) return;

    window.open(task.link, "_blank");
    triggerHaptic("medium");

    setTimeout(() => {
      setCommunityTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      completeMission({ coins: task.reward, xp: true });
      triggerHaptic("success");
    }, 2000);
  };

  // Safely execute Ads with a timeout to prevent hanging / adex timeout issues from blocking users
  const executeAdWithTimeout = (adFn: () => any, timeoutMs: number = 4000) => {
    let completed = false;
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          console.warn("Clip ad network timeout. Invoking local user fallback reward.");
          resolve();
        }
      }, timeoutMs);

      try {
        const result = adFn();
        if (result && typeof result.then === 'function') {
          result.then(() => {
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          }).catch((err: any) => {
            console.error("Ad promise error fallback:", err);
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          });
        } else {
          // Non-promise or synchronous return, resolve after 1500ms
          setTimeout(() => {
            if (!completed) {
              completed = true;
              clearTimeout(timer);
              resolve();
            }
          }, 1500);
        }
      } catch (err) {
        console.error("Ad exception fallback launched:", err);
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });
  };

  // Handle Watching Ads (Section 2)
  const watchAd = async (format: 'popup' | 'interstitial') => {
    if (!user.onboarded) return;

    if (format === 'popup') {
      setAd1Loading(true);
      triggerHaptic("medium");

      const showAd = (window as any).show_11030019;
      if (typeof showAd === "function") {
        await executeAdWithTimeout(() => showAd('pop'), 4000);
        completeMission({ coins: 1200, xp: true });
        triggerHaptic("success");
        setAd1Loading(false);
      } else {
        // Sandboxed fallback for preview
        setTimeout(() => {
          completeMission({ coins: 1200, xp: true });
          triggerHaptic("success");
          setAd1Loading(false);
        }, 2000);
      }
    } else {
      setAd2Loading(true);
      triggerHaptic("medium");

      const showAd = (window as any).show_11030019;
      if (typeof showAd === "function") {
        await executeAdWithTimeout(() => showAd(), 4000);
        completeMission({ coins: 1000, xp: true });
        triggerHaptic("success");
        setAd2Loading(false);
      } else {
        // Sandboxed fallback for preview
        setTimeout(() => {
          completeMission({ coins: 1000, xp: true });
          triggerHaptic("success");
          setAd2Loading(false);
        }, 2000);
      }
    }
  };

  // Handle Visit and Scroll Tasks (Section 3)
  const handleReconAction = (task: any) => {
    if (task.completed || !user.onboarded || visitingId) return;

    window.open(task.link, "_blank");
    triggerHaptic("medium");
    setVisitingId(task.id);
    setTimerCount(5);

    const interval = setInterval(() => {
      setTimerCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setReconTasks(prevTasks => prevTasks.map(t => t.id === task.id ? { ...t, completed: true } : t));
          completeMission({ coins: task.reward, xp: true });
          triggerHaptic("success");
          setVisitingId(null);
          return 5;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      {!user.onboarded && (
        <div className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex items-center justify-between gap-4">
           <div>
              <h3 className="text-[10px] font-black uppercase text-amber-500 mb-0.5">Observation Mode</h3>
              <p className="text-[8px] text-white/40 uppercase font-bold">Log in to link credentials.</p>
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem("cluevault_onboarding_skipped");
               window.location.reload();
             }}
             className="bg-amber-500 text-black px-4 py-2 rounded-xl font-black uppercase italic text-[8px]"
           >
             Login
           </button>
        </div>
      )}

      <header>
        <div className="flex items-center gap-2 mb-1">
           <Shield size={16} className="text-amber-500" />
           <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Network Expansion</span>
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Social Network</h1>
        <p className="text-sm text-white/50 italic font-medium">Link credentials and stream transmission waves.</p>
      </header>

      {/* Section 1: Broadcast Transmissions (Ad rewards) - Moved to top & highly polished */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">I. HIGH-YIELD BROADCAST CHANNELS</h3>
          <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20">
            SIGNAL: ONLINE (MAX PAYOUT)
          </span>
        </div>
        
        <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-2xl p-3 text-center">
          <p className="text-[9px] text-amber-300 font-black uppercase tracking-wider">
            ⚡ SUPPORT THE PROJECT & EARN CONTINUOUS BOUNTIES
          </p>
          <p className="text-[8px] text-white/40 uppercase font-bold mt-0.5">
            Watch sponsors broadcasts entirely to credit rewards instantly. No limits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <motion.button
            onClick={() => watchAd('popup')}
            disabled={ad1Loading || !user.onboarded}
            className={cn(
              "glass rounded-[2rem] p-6 border flex flex-col justify-between text-left group gap-4 relative overflow-hidden transition-all duration-300 shadow-xl",
              !user.onboarded 
                ? "opacity-35 cursor-not-allowed" 
                : "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] active:scale-[0.98]"
            )}
          >
            {/* Ambient Background Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-500" />
            
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-black group-hover:scale-110 transition-all duration-300">
                {ad1Loading ? <RefreshCw className="animate-spin" size={20} /> : <Tv size={20} />}
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black uppercase bg-amber-500 text-black px-2 py-0.5 rounded-full tracking-widest block font-mono">
                  POPUP FEED
                </span>
                <span className="text-[7px] text-emerald-400 font-bold block mt-1">HIGH MULTIPLIER</span>
              </div>
            </div>
            
            <div className="relative z-10">
              <h4 className="text-sm font-black uppercase tracking-tight mb-1 group-hover:text-amber-400 transition-colors">Decrypt Core Terminal Feed</h4>
              <p className="text-[10px] text-white/50 mb-4 leading-relaxed">Extract deep-archive assets by connecting fully with sponsored network beams.</p>
              
              <div className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[12px] font-black text-amber-500 font-mono tracking-tight flex items-center gap-1">
                  <Coins size={14} className="animate-bounce" /> +1,200 ZP
                </span>
                <span className="text-[8px] text-[#34d399] font-black bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                  INSTANT CREDIT
                </span>
              </div>
            </div>
            
            {ad1Loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 z-25 backdrop-blur-xs">
                <RefreshCw className="animate-spin text-amber-500" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 animate-pulse">Decrypting Signal...</span>
              </div>
            )}
          </motion.button>

          <motion.button
            onClick={() => watchAd('interstitial')}
            disabled={ad2Loading || !user.onboarded}
            className={cn(
              "glass rounded-[2rem] p-6 border flex flex-col justify-between text-left group gap-4 relative overflow-hidden transition-all duration-300 shadow-xl",
              !user.onboarded 
                ? "opacity-35 cursor-not-allowed" 
                : "border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-transparent to-transparent hover:border-blue-500/50 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] active:scale-[0.98]"
            )}
          >
            {/* Ambient Background Glow Effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-500" />
            
            <div className="flex items-center justify-between w-full relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-black group-hover:scale-110 transition-all duration-300">
                {ad2Loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
              </div>
              <div className="text-right">
                <span className="text-[8px] font-black uppercase bg-blue-500 text-black px-2 py-0.5 rounded-full tracking-widest block font-mono">
                  VIDEO STREAM
                </span>
                <span className="text-[7px] text-emerald-400 font-bold block mt-1">REPEATABLE BOUNTY</span>
              </div>
            </div>
            
            <div className="relative z-10">
              <h4 className="text-sm font-black uppercase tracking-tight mb-1 group-hover:text-blue-400 transition-colors">Premium Intercellular Feed</h4>
              <p className="text-[10px] text-white/50 mb-4 leading-relaxed">Establish telemetry connection for immediate coin payout and network credits.</p>
              
              <div className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl">
                <span className="text-[12px] font-black text-blue-400 font-mono tracking-tight flex items-center gap-1">
                  <Coins size={14} className="animate-pulse" /> +1,000 ZP
                </span>
                <span className="text-[8px] text-[#38bdf8] font-black bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/15">
                  UNLIMITED PLAYS
                </span>
              </div>
            </div>
            
            {ad2Loading && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 z-25 backdrop-blur-xs">
                <RefreshCw className="animate-spin text-blue-400" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 animate-pulse">Uplinking stream...</span>
              </div>
            )}
          </motion.button>

        </div>
      </section>

      {/* Section 2: Community Credentials */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] mb-2 px-1">II. Credential Verification</h3>
        <div className="space-y-3">
          {communityTasks.map((task) => (
            <motion.button
              key={task.id}
              onClick={() => handleCommunityAction(task)}
              disabled={task.completed || !user.onboarded}
              className={cn(
                "w-full glass rounded-3xl p-5 border-white/5 flex items-center justify-between group transition-all",
                task.completed ? "opacity-50 grayscale" : "hover:border-white/10 active:scale-[0.98]",
                !user.onboarded && "opacity-30 grayscale cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                  task.completed ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40 group-hover:bg-amber-500 group-hover:text-black"
                )}>
                  {task.completed ? <CheckCircle2 size={24} /> : <task.icon size={24} />}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black uppercase tracking-tight">{task.title}</h4>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-amber-500">+{task.reward} ZP</span>
                     <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">• Secured link</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/20">
                 {task.completed ? (
                   <span className="text-[10px] font-black uppercase italic text-emerald-500">Secured</span>
                 ) : (
                   <>
                     <ExternalLink size={14} className="group-hover:text-amber-500 transition-colors" />
                     <ChevronRight size={18} />
                   </>
                 )}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Section 3: Recon Acquisitions */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] mb-2 px-1">III. Recon Acquisitions</h3>
        <div className="space-y-3">
          {reconTasks.map((task) => {
            const isVisitingThis = visitingId === task.id;
            return (
              <motion.button
                key={task.id}
                onClick={() => handleReconAction(task)}
                disabled={task.completed || !user.onboarded || (visitingId !== null && !isVisitingThis)}
                className={cn(
                  "w-full glass rounded-3xl p-5 border-white/5 flex items-center justify-between group transition-all relative overflow-hidden",
                  task.completed ? "opacity-50 grayscale" : "hover:border-white/10 active:scale-[0.98]",
                  (!user.onboarded || (visitingId !== null && !isVisitingThis)) && "opacity-30 grayscale cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-4 relative z-10 w-full justify-between">
                  <div className="flex items-center gap-4 text-left">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      task.completed ? "bg-emerald-500 text-black" : "bg-white/5 text-white/40 group-hover:bg-amber-500 group-hover:text-black"
                    )}>
                      {task.completed ? <CheckCircle2 size={24} /> : <Eye size={24} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-tight">{task.title}</h4>
                      <p className="text-[10px] text-white/40 max-w-[210px] mb-1">{task.desc}</p>
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-amber-500">+{task.reward} ZP</span>
                         <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">• Visit & Scroll</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {task.completed ? (
                      <span className="text-[10px] font-black uppercase italic text-emerald-500">Secured</span>
                    ) : isVisitingThis ? (
                      <div className="flex flex-col items-end">
                        <RefreshCw className="animate-spin text-amber-500 mb-1" size={14} />
                        <span className="text-[9px] font-black uppercase text-amber-500">SYNCHRONIZING ({timerCount}S)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/20">
                        <ExternalLink size={14} className="group-hover:text-amber-500 transition-colors" />
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </div>
                </div>

                {isVisitingThis && (
                  <motion.div 
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="absolute bottom-0 left-0 h-1 bg-amber-500 glow-gold opacity-80"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      <div className="p-6 glass rounded-[2.5rem] border-white/5 space-y-4">
         <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] text-center italic">Encryption Standards</h4>
         <p className="text-[10px] text-white/40 text-center leading-relaxed font-medium">
            Social data is encrypted using the ClueVault Signal Protocol. Joining communities speeds up frag-extraction and unlocks high-tier mission intel.
         </p>
      </div>
    </div>
  );
}
