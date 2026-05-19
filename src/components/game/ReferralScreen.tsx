import { useGame } from "../../App";
import { Share2, Users, Gift, Copy, Check, ChevronRight, Trophy } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export default function ReferralScreen() {
  const { user, triggerHaptic } = useGame();
  const [copied, setCopied] = useState(false);
  const inviteLink = `https://t.me/ClueVaultBot?start=ref_${user.name.toLowerCase().replace(/\s+/g, '_')}`;

  const milestones = [
    { count: 1, reward: "Bonus Key", reached: true },
    { count: 5, reward: "Rare Vault", reached: false },
    { count: 10, reward: "Premium Hint Pack", reached: false },
    { count: 25, reward: "Exclusive Badge", reached: false },
  ];

  const copyLink = () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    triggerHaptic("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    triggerHaptic("medium");
    if (navigator.share) {
      navigator.share({
        title: "Join my crew in ClueVault!",
        text: "Help me decrypt mysteries and unlock vaults in this Telegram Mini App.",
        url: inviteLink,
      });
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      {!user.onboarded && (
        <div className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex items-center justify-between gap-4">
           <div>
              <h3 className="text-[10px] font-black uppercase text-amber-500 mb-0.5">Observation Mode</h3>
              <p className="text-[8px] text-white/40 uppercase font-bold">Log in to recruit agents.</p>
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
        <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Referral</h1>
        <p className="text-sm text-white/50 italic font-medium">Expand the network. Get paid.</p>
      </header>

      {/* Invite Card */}
      <div className="glass rounded-[2.5rem] p-8 border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-16 h-16 bg-amber-500 rounded-[1.5rem] flex items-center justify-center text-black mb-6 glow-gold">
            <Share2 size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Recruit Agents</h2>
          <p className="text-sm text-white/50 mb-8 leading-relaxed">
            Send your unique encryption link to other players. When they join your crew, you both extract a bonus.
          </p>
          
          <div className="flex gap-2">
            <div className="flex-1 glass-dark rounded-2xl p-4 text-[10px] font-mono text-white/40 truncate">
              {inviteLink}
            </div>
            <button 
              onClick={copyLink}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                copied ? "bg-emerald-500 text-white" : "bg-white text-black"
              )}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] pointer-events-none" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl border-white/5 text-center">
          <div className="text-2xl font-black italic text-blue-500">12</div>
          <div className="text-[8px] font-black uppercase tracking-widest text-white/30">Total Invites</div>
        </div>
        <div className="glass p-5 rounded-3xl border-white/5 text-center">
          <div className="text-2xl font-black italic text-amber-500">1.2k</div>
          <div className="text-[8px] font-black uppercase tracking-widest text-white/30">Earned Coins</div>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2">Growth Milestones</h3>
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={i} className={cn(
              "glass rounded-2xl p-4 flex items-center justify-between border-white/5",
              m.reached && "bg-white/5"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  m.reached ? "bg-amber-500 text-black" : "bg-white/5 text-white/20"
                )}>
                  {m.reached ? <Trophy size={20} /> : <Users size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight">{m.count} Invites</h4>
                  <p className="text-[10px] text-amber-500 font-bold uppercase">{m.reward}</p>
                </div>
              </div>
              {m.reached ? (
                <div className="text-[8px] font-black bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded uppercase">Claimed</div>
              ) : (
                <div className="text-[8px] font-black text-white/20 uppercase tracking-widest">In Progress</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <button className="w-full bg-blue-500/20 text-blue-400 py-4 rounded-[1.5rem] font-black uppercase italic text-sm border border-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2">
        <Gift size={18} /> View Referral Leaderboard
      </button>
    </div>
  );
}
