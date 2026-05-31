import { useState, useEffect } from "react";
import { Trophy, Shield, Users, Search, ChevronRight, Crown, Medal, Flame, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";
import axios from "axios";

import { useGame } from "../../App";

export default function LeaderboardScreen() {
  const { user } = useGame();
  const [category, setCategory] = useState("solvers");
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  const fetchLeaderboard = async (cat: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/leaderboard?category=${cat}`, { timeout: 10000 });
      setLeaderboardData(response.data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(category);
  }, [category]);

  return (
    <div className="p-5 pb-24 space-y-6">
      <header>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Leaderboards</h1>
        <p className="text-sm text-white/50 italic font-medium">The elite hierarchies.</p>
      </header>

      {/* Categories */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
        {["solvers", "referrals"].map((cat) => (
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

      {/* Top 3 Podium */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
           <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
           <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Scanning Network...</span>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-center gap-2 pt-10 pb-4">
            {leaderboardData[1] && (
               <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="w-14 h-14 glass rounded-[1.5rem] border-slate-400/30 flex flex-col items-center justify-center relative overflow-hidden">
                     {leaderboardData[1].user?.avatar && <img src={leaderboardData[1].user.avatar} className="w-full h-full object-cover opacity-50" />}
                     <Medal className="text-slate-400 absolute -top-3" size={24} />
                     <span className="text-xs font-black italic relative z-10">#2</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tight text-white/40 px-1 truncate max-w-[80px]">
                    {leaderboardData[1].user?.name || "Agent"}
                  </span>
               </div>
            )}

            {leaderboardData[0] && (
               <div className="flex flex-col items-center gap-2 -translate-y-6">
                  <div className="w-20 h-20 glass rounded-[2rem] border-amber-500/50 flex flex-col items-center justify-center relative glow-gold overflow-hidden">
                     {leaderboardData[0].user?.avatar && <img src={leaderboardData[0].user.avatar} className="w-full h-full object-cover opacity-50" />}
                     <Crown className="text-amber-500 absolute -top-4 scale-125" size={32} />
                     <span className="text-lg font-black italic text-amber-500 relative z-10">#1</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tight text-white italic truncate max-w-[100px]">
                    {leaderboardData[0].user?.name || "Agent"}
                  </span>
               </div>
            )}

            {leaderboardData[2] && (
               <div className="flex flex-col items-center gap-2 mb-4">
                  <div className="w-12 h-12 glass rounded-[1.2rem] border-amber-700/30 flex flex-col items-center justify-center relative overflow-hidden">
                     {leaderboardData[2].user?.avatar && <img src={leaderboardData[2].user.avatar} className="w-full h-full object-cover opacity-50" />}
                     <Medal className="text-amber-700 absolute -top-2" size={20} />
                     <span className="text-xs font-black italic relative z-10">#3</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-tight text-white/40 px-1 truncate max-w-[80px]">
                    {leaderboardData[2].user?.name || "Agent"}
                  </span>
               </div>
            )}
          </div>

          <div className="space-y-3">
             {leaderboardData.map((item, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.05 }}
                 key={item.id} 
                 className={cn(
                   "glass rounded-2xl p-4 flex items-center gap-4 border-white/5",
                   i === 0 && "border-amber-500/10 bg-amber-500/5"
                 )}
               >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black italic">
                     {i + 1}
                  </div>
                  <div className="flex-1">
                     <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        {item.user?.name || "Anonymous"}
                        {i === 0 && <Flame size={12} className="text-amber-500" />}
                     </h4>
                     <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black text-white/30 truncate">
                         {category === "referrals" ? `${item.user?.referCount || 0} REFS` : `${(item.ZP || item.resources?.activityScore || 0).toLocaleString()} ZP`}
                       </span>
                       <div className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="text-[8px] font-bold text-white/20 uppercase truncate">
                         {item.crew?.name || "Loner"}
                       </span>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-[10px] font-bold uppercase text-white/20">
                        {category === "referrals" ? "REFS" : "ZP"}
                     </div>
                  </div>
               </motion.div>
             ))}
          </div>
        </>
      )}

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
