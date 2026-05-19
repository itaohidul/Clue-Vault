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
  RefreshCw 
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

      {/* Section 1: Community Credentials */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] mb-2 px-1">I. Credential Verification</h3>
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

      {/* Section 2: Broadcast Transmissions (Ad rewards) */}
      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-white/40 tracking-[0.15em] mb-2 px-1">II. Broadcast Transmissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          <motion.button
            onClick={() => watchAd('popup')}
            disabled={ad1Loading || !user.onboarded}
            className={cn(
              "glass rounded-3xl p-5 border-white/5 flex flex-col justify-between text-left group gap-4 relative overflow-hidden transition-all",
              !user.onboarded ? "opacity-35 cursor-not-allowed" : "hover:border-amber-500/30 active:scale-[0.98]"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                {ad1Loading ? <RefreshCw className="animate-spin" size={18} /> : <Tv size={18} />}
              </div>
              <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">POPUP AD</span>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight mb-1">Decrypt Memory Matrix</h4>
              <p className="text-[10px] text-white/40 mb-3">Watch sponsored broadcast fully to receive terminal assets.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-amber-500">+1,200 ZP</span>
                <span className="text-[9px] text-white/20 uppercase font-black">• Instantly</span>
              </div>
            </div>
            {ad1Loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                <div className="text-center">
                  <RefreshCw className="animate-spin text-amber-500 mx-auto mb-1" size={20} />
                  <span className="text-[8px] font-black uppercase text-amber-500">Decrypting...</span>
                </div>
              </div>
            )}
          </motion.button>

          <motion.button
            onClick={() => watchAd('interstitial')}
            disabled={ad2Loading || !user.onboarded}
            className={cn(
              "glass rounded-3xl p-5 border-white/5 flex flex-col justify-between text-left group gap-4 relative overflow-hidden transition-all",
              !user.onboarded ? "opacity-35 cursor-not-allowed" : "hover:border-amber-500/30 active:scale-[0.98]"
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all">
                {ad2Loading ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
              </div>
              <span className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">VIDEO AD</span>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-tight mb-1">Frequency Uplink</h4>
              <p className="text-[10px] text-white/40 mb-3">Connect to the sponsor frequency stream for immediate payout.</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-amber-500">+1,000 ZP</span>
                <span className="text-[9px] text-white/20 uppercase font-black">• Unlimited</span>
              </div>
            </div>
            {ad2Loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-xs">
                <div className="text-center">
                  <RefreshCw className="animate-spin text-amber-500 mx-auto mb-1" size={20} />
                  <span className="text-[8px] font-black uppercase text-amber-500">Uplinking...</span>
                </div>
              </div>
            )}
          </motion.button>

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
