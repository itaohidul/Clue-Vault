import { motion } from "motion/react";
import { Zap, Shield, Trophy, Star, Clock, ChevronRight, Lock, Target, Flame } from "lucide-react";
import { cn } from "../../lib/utils";
import CountdownTimer from "../ui/CountdownTimer";

export default function EventHubScreen() {
  const events = [
    { 
      title: "Night Owl Protocol", 
      time: { h: 62, m: 14 }, 
      reward: "Double ZP", 
      status: "Active",
      color: "from-blue-600 to-indigo-900 border-blue-500/30"
    },
    { 
      title: "Vault Rush 2026", 
      time: { h: 4, m: 0 }, 
      reward: "Rare Keys x5", 
      status: "Upcoming",
      color: "from-amber-600 to-amber-900 border-amber-500/30"
    },
    { 
      title: "Crew War: Sector 7", 
      time: null, 
      reward: "Legendary Badge", 
      status: "Finished",
      color: "from-slate-700 to-slate-900 border-white/5 opacity-50"
    }
  ];

  return (
    <div className="p-5 pb-24 space-y-6">
      <header>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Event Hub</h1>
        <p className="text-sm text-white/50 italic font-medium">Temporary signals. High-stakes extraction.</p>
      </header>

      {/* Featured Banner */}
      <div className="relative aspect-[21/9] rounded-[2.5rem] overflow-hidden group">
         <img 
           src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80" 
           alt="Event Hero" 
           className="w-full h-full object-cover opacity-60"
           referrerPolicy="no-referrer"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
         <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
               <span className="text-[8px] font-black uppercase text-amber-500 tracking-[0.3em]">Priority Signal</span>
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Global Blackout</h2>
         </div>
         <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
            <Clock size={12} className="text-white/40" />
            <CountdownTimer hours={23} minutes={59} seconds={59} className="text-[10px] font-black font-mono" />
         </div>
      </div>

      {/* Event Grid */}
      <div className="space-y-4">
        {events.map((ev, i) => (
          <motion.div 
            key={i}
            whileTap={{ scale: 0.98 }}
            className={cn(
               "relative overflow-hidden glass rounded-[2rem] p-6 border bg-gradient-to-br",
               ev.color
            )}
          >
             <div className="relative z-10 flex justify-between items-start">
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      {ev.status === "Active" ? (
                        <Flame size={14} className="text-amber-500" />
                      ) : ev.status === "Upcoming" ? (
                        <Clock size={14} className="text-blue-400" />
                      ) : (
                        <Lock size={14} className="text-white/20" />
                      )}
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{ev.status}</span>
                   </div>
                   <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4">{ev.title}</h3>
                   
                   <div className="flex gap-4">
                      <div className="">
                         <div className="text-[8px] font-black uppercase text-white/30 mb-0.5">Time Limit</div>
                         <div className="text-xs font-black italic font-mono uppercase">
                            {ev.time ? (
                              <CountdownTimer hours={ev.time.h} minutes={ev.time.m} showSeconds={false} />
                            ) : "Ended"}
                             {ev.time && <span className="ml-1">Remaining</span>}
                         </div>
                      </div>
                      <div className="">
                         <div className="text-[8px] font-black uppercase text-white/30 mb-0.5">Grand Prize</div>
                         <div className="text-xs font-black italic text-amber-500">{ev.reward}</div>
                      </div>
                   </div>
                </div>
                <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center text-white/40">
                   <ChevronRight size={20} />
                </div>
             </div>

             {/* Background Decoration */}
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
          </motion.div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-8 border-white/5 text-center">
         <div className="w-16 h-16 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-white/20 mx-auto mb-4">
            <Target size={32} />
         </div>
         <h4 className="text-lg font-black uppercase italic tracking-tighter mb-2">Seasonal Season: Beta</h4>
         <p className="text-xs text-white/40 mb-6 italic">The first official season of ClueVault is approaching. Exclusive rewards will be available for all Day 1 agents.</p>
         <button className="text-[10px] font-black uppercase text-blue-500 border-b border-blue-500/40 pb-0.5">View Season Road-map</button>
      </div>
    </div>
  );
}
