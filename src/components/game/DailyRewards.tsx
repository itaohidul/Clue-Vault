import { Calendar, CheckCircle2, ChevronRight, Gift, Lock, Timer } from "lucide-react";
import { motion } from "motion/react";
import { useUserStore } from "../../store/userStore";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useLedgerStore } from "../../store/ledgerStore";
import { cn } from "../../lib/utils";
import { adManager } from "../../lib/adManager";

export default function DailyRewards() {
  const { user, claimDailyReward, triggerHaptic } = useUserStore();
  const { logTransaction } = useSupabaseSync();
  const { addTransaction } = useLedgerStore();
  
  const lastClaim = user.lastDailyClaim || 0;

  const lastDate = new Date(lastClaim).toDateString();
  const nowDate = new Date().toDateString();
  const isClaimedToday = lastClaim !== 0 && lastDate === nowDate;

  // Streak logic (1-based index)
  const currentStreak = user.streak || 1;
  const nextStreak = isClaimedToday ? currentStreak : currentStreak; // currentStreak is what we HAVE or what we ARE ON

  // Calculate days of the week based on current streak
  // We'll show a week view that adapts to the current streak
  const weekStart = Math.floor((currentStreak - 1) / 7) * 7;
  const days = Array.from({ length: 7 }, (_, i) => {
    const dayNum = weekStart + i + 1;
    let reward = "ZP";
    let amount = Math.round((250 + (dayNum * 50)) / 2);
    let icon = <Gift size={16} />;

    if (dayNum % 5 === 0) {
      reward = "Element";
      amount = Math.round((20 * (dayNum / 5)) / 2);
      icon = <Gift size={16} className="text-emerald-500" />;
    }
    if (dayNum % 7 === 0) {
      reward = "Key";
      amount = 1;
      icon = <Gift size={16} className="text-amber-500" />;
    }

    const isPast = dayNum < currentStreak || (dayNum === currentStreak && isClaimedToday);
    const isCurrent = dayNum === currentStreak && !isClaimedToday;
    const isFuture = dayNum > currentStreak || (dayNum === currentStreak && isClaimedToday);

    return {
      dayNum,
      reward,
      amount,
      icon,
      isPast,
      isCurrent,
      isFuture
    };
  });

  const handleClaim = async () => {
    if (isClaimedToday) return;
    const success = await adManager.triggerRewardedPopup();
    if (!success) return;
    claimDailyReward();
    
    // Log rewards based on streak
    const nextStreak = user.streak || 1; // Store will have incremented this if not today
    const coinsReward = Math.round((250 + (nextStreak * 50)) / 2);
    const elementsReward = Math.round((nextStreak % 5 === 0 ? 20 * (nextStreak / 5) : 0) / 2);
    const keysReward = nextStreak % 7 === 0 ? 1 : 0;

    if (coinsReward > 0) {
      logTransaction(coinsReward, "daily_reward", "ZP");
      addTransaction({ type: "daily_reward", amount: coinsReward, currency: "ZP" });
    }
    if (elementsReward > 0) {
      logTransaction(elementsReward, "daily_reward", "Element");
      addTransaction({ type: "daily_reward", amount: elementsReward, currency: "ELEMENT" });
    }
    if (keysReward > 0) {
      logTransaction(keysReward, "daily_reward", "Key");
      addTransaction({ type: "daily_reward", amount: keysReward, currency: "KEY" });
    }
  };

  return (
    <div className="glass border border-white/5 rounded-3xl overflow-hidden mb-6">
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
             <Calendar size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase italic tracking-tight">Daily Transmission</h3>
            <p className="text-[9px] text-white/50 uppercase font-bold tracking-widest">Streak: {user.streak || 0} Days</p>
          </div>
        </div>
        {isClaimedToday ? (
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black text-emerald-500 uppercase italic">Secured</span>
           </div>
        ) : (
           <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
              <Timer size={12} className="text-amber-500" />
              <span className="text-[10px] font-black text-amber-500 uppercase italic">Pending</span>
           </div>
        )}
      </div>

      <div className="p-4">
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
          {days.map((day) => (
            <div 
              key={day.dayNum}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-300",
                day.isPast ? "bg-emerald-500/5 border-emerald-500/20 opacity-60" : 
                day.isCurrent ? "bg-amber-500/10 border-amber-500/50 glow-gold scale-105 z-10" :
                "bg-white/5 border-white/5"
              )}
            >
               <span className={cn(
                 "text-[8px] font-black uppercase mb-1",
                 day.isCurrent ? "text-amber-500" : "text-white/30"
               )}>Day {day.dayNum}</span>
               
               <div className={cn(
                 "w-8 h-8 rounded-xl flex items-center justify-center mb-1",
                 day.isPast ? "text-emerald-500" :
                 day.isCurrent ? "bg-amber-500 text-black" :
                 "text-white/20"
               )}>
                 {day.isPast ? <CheckCircle2 size={16} /> : day.icon}
               </div>

               <span className={cn(
                 "text-[9px] font-black",
                 day.isCurrent ? "text-white" : "text-white/40"
               )}>{day.amount} {day.reward}</span>

               {day.isCurrent && (
                 <motion.div 
                   layoutId="active-indicator"
                   className="absolute -inset-1 border border-amber-500/30 rounded-[1.2rem] pointer-events-none"
                 />
               )}
            </div>
          ))}
        </div>

        <button 
          onClick={handleClaim}
          disabled={isClaimedToday}
          className={cn(
            "w-full py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all active:scale-95 flex items-center justify-center gap-2",
            isClaimedToday 
              ? "bg-white/5 text-white/20 border border-white/5 cursor-default" 
              : "bg-amber-500 hover:bg-amber-400 text-black glow-gold"
          )}
        >
          {isClaimedToday ? "Next Reward Tomorrow" : (
            <>
              Claim Daily Intel <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
