import { useState } from "react";
import { Trophy, Shield, Users, Search, ChevronRight, Crown, Medal, Flame } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

import { useGame } from "../../App";

export default function LeaderboardScreen() {
  const { user } = useGame();
  const [category, setCategory] = useState("crews");

  const topCrews = [
    { name: "Night Owls", points: 28400, rank: 1, trend: "up" },
    { name: "Shadow Legion", points: 26150, rank: 2, trend: "down" },
    { name: "Neon Phantoms", points: 24900, rank: 3, trend: "stable" },
    { name: "Void Runners", points: 21200, rank: 4, trend: "up" },
    { name: "Code Breakers", points: 19800, rank: 5, trend: "up" },
  ];

  return (
    <div className="p-5 pb-24 space-y-6">
      <header>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Leaderboards</h1>
        <p className="text-sm text-white/50 italic font-medium">The elite hierarchies.</p>
      </header>

      {/* Categories */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
        {["crews", "solvers", "referrals"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
              category === cat ? "bg-amber-500 text-black shadow-lg" : "text-white/40 hover:text-white/60"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Top 3 Podium (Mental Representation) */}
      <div className="flex items-end justify-center gap-2 pt-10 pb-4">
         <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-14 h-14 glass rounded-[1.5rem] border-slate-400/30 flex flex-col items-center justify-center relative">
               <Medal className="text-slate-400 absolute -top-3" size={24} />
               <span className="text-xs font-black italic">#2</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-white/40 px-1">Shadow Legion</span>
         </div>

         <div className="flex flex-col items-center gap-2 -translate-y-6">
            <div className="w-20 h-20 glass rounded-[2rem] border-amber-500/50 flex flex-col items-center justify-center relative glow-gold">
               <Crown className="text-amber-500 absolute -top-4 scale-125" size={32} />
               <span className="text-lg font-black italic text-amber-500">#1</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight text-white italic">Night Owls</span>
         </div>

         <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-12 h-12 glass rounded-[1.2rem] border-amber-700/30 flex flex-col items-center justify-center relative">
               <Medal className="text-amber-700 absolute -top-2" size={20} />
               <span className="text-xs font-black italic">#3</span>
            </div>
            <span className="text-[8px] font-black uppercase tracking-tight text-white/40 px-1">Neon Phantoms</span>
         </div>
      </div>

      {/* Rankings List */}
      <div className="space-y-3">
         {topCrews.map((crew, i) => (
           <motion.div 
             initial={{ opacity: 0, x: -10 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: i * 0.1 }}
             key={i} 
             className={cn(
               "glass rounded-2xl p-4 flex items-center gap-4 border-white/5",
               crew.rank === 1 && "border-amber-500/10 bg-amber-500/5"
             )}
           >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black italic">
                 {crew.rank}
              </div>
              <div className="flex-1">
                 <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    {crew.name}
                    {crew.rank === 1 && <Flame size={12} className="text-amber-500" />}
                 </h4>
                 <div className="flex items-center gap-1">
                   <div className="h-1 w-12 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(crew.points / 30000) * 100}%` }} 
                      />
                   </div>
                   <span className="text-[8px] font-black text-white/30 truncate">{crew.points.toLocaleString()} PTS</span>
                 </div>
              </div>
              <div className="text-right">
                 <div className={cn(
                   "text-[10px] font-bold uppercase",
                   crew.trend === "up" ? "text-emerald-500" : crew.trend === "down" ? "text-red-500" : "text-white/20"
                 )}>
                    {crew.trend === "up" ? "▲" : crew.trend === "down" ? "▼" : "•"}
                 </div>
              </div>
           </motion.div>
         ))}
      </div>

      {user.onboarded && (
        <div className="glass rounded-2xl p-4 border-amber-500/20 bg-amber-500/5 mt-8 flex justify-between items-center">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black font-black italic">12</div>
              <div>
                 <h4 className="text-xs font-black uppercase">Your Crew</h4>
                 <p className="text-[10px] font-bold text-white/40 uppercase">Top 15% Rank</p>
              </div>
           </div>
           <button className="text-[10px] font-black uppercase text-amber-500 flex items-center gap-1">
              See Stats <ChevronRight size={14} />
           </button>
        </div>
      )}
    </div>
  );
}
