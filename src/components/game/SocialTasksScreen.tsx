import { useState } from "react";
import { useGame } from "../../App";
import { MessageSquare, Bell, CheckCircle2, ChevronRight, ExternalLink, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function SocialTasksScreen() {
  const { user, completeMission, triggerHaptic } = useGame();
  const [tasks, setTasks] = useState([
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

  const handleTaskAction = (task: any) => {
    if (task.completed || !user.onboarded) return;

    window.open(task.link, "_blank");
    triggerHaptic("medium");

    // Simulate verification
    setTimeout(() => {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
      completeMission({ coins: task.reward, xp: true });
      triggerHaptic("success");
    }, 2000);
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
        <p className="text-sm text-white/50 italic font-medium">Link your credentials to the network frequencies.</p>
      </header>


      <div className="space-y-3">
        {tasks.map((task) => (
          <motion.button
            key={task.id}
            onClick={() => handleTaskAction(task)}
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
                   <span className="text-[10px] text-white/20 uppercase font-black tracking-widest">• Verified Channel</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-white/20">
               {task.completed ? (
                 <span className="text-[10px] font-black uppercase italic">Secured</span>
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

      <div className="p-6 glass rounded-[2.5rem] border-white/5 space-y-4">
         <h4 className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em] text-center italic">Encryption Standards</h4>
         <p className="text-[10px] text-white/40 text-center leading-relaxed font-medium">
            Social data is encrypted using the ClueVault Signal Protocol. Joining communities speeds up frag-extraction and unlocks high-tier mission intel.
         </p>
      </div>
    </div>
  );
}
