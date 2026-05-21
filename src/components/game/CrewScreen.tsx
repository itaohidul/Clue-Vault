import { useState } from "react";
import { useGame } from "../../App";
import { Users, Star, Trophy, MessageSquare, Shield, ChevronRight, UserPlus, Flame, Palette, Circle, Hexagon, Square, Diamond, Swords, Target, Eye, Crown, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

const ICONS = {
  Shield: Shield,
  Swords: Swords,
  Target: Target,
  Eye: Eye,
  Crown: Crown,
  Zap: Zap,
};

const SHAPES = {
  Circle: Circle,
  Hexagon: Hexagon,
  Square: Square,
  Diamond: Diamond,
};

const COLORS = [
  { name: "Amber", hex: "#f59e0b" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Rose", hex: "#f43f5e" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Silver", hex: "#94a3b8" },
];

export default function CrewScreen() {
  const { crew, updateCrewBadge, joinCrew, leaveCrew, boostCrew, resources, triggerHaptic } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteToast, setShowInviteToast] = useState(false);

  const AVAILABLE_CREWS = [
    { name: "Phantom Operatives", desc: "Decentralized code breakers and elite network nodes.", rank: 4, points: 12450, multiplier: "1.25x Earning" },
    { name: "Acolytes of Clue", desc: "Synthesizer mining clan studying absolute game consensus.", rank: 7, points: 9800, multiplier: "1.20x Earning" },
    { name: "Sovereign Nodes", desc: "Absolute TON ledger maximalists bypass sovereign locks.", rank: 12, points: 6450, multiplier: "1.15x Earning" },
  ];

  if (!crew) {
    return (
      <div className="p-5 pb-24 space-y-6 text-left">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Operation Alliances</span>
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">Syndicates</h1>
          <p className="text-sm text-white/50 italic font-medium leading-relaxed">Join a decentralized network of active agents to multiply on-chain rewards.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 px-1">Available Networks</h3>
          
          <div className="space-y-3.5">
            {AVAILABLE_CREWS.map((item, id) => (
              <div 
                key={id}
                className="glass rounded-3xl p-5 border-white/5 bg-gradient-to-br from-neutral-950 via-neutral-900 to-black hover:border-amber-500/10 transition-all space-y-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-black uppercase italic tracking-tight">{item.name}</h4>
                    <span className="text-[9px] font-black uppercase text-amber-500 font-mono italic">{item.multiplier}</span>
                  </div>
                  <span className="text-[10px] font-black font-mono text-white/30 uppercase bg-white/5 px-2.5 py-1 rounded-full">
                    Rank #{item.rank}
                  </span>
                </div>

                <p className="text-[10px] text-white/40 leading-relaxed font-bold">{item.desc}</p>

                <div className="flex justify-between items-center border-t border-dashed border-white/5 pt-4">
                  <div>
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest block">ALLIANCE POINTS</span>
                    <span className="text-sm font-black font-mono text-emerald-400 italic">{item.points.toLocaleString()} PTS</span>
                  </div>
                  <button 
                    onClick={() => {
                      joinCrew(item.name);
                      triggerHaptic("heavy");
                    }}
                    className="bg-amber-500 text-black px-5 py-2.5 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all shadow-md"
                  >
                    Syncreg Client
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const members = [
    { name: "Nightshade", points: 2450, rank: "General" },
    { name: "Echo_X", points: 1820, rank: "Veteran" },
    { name: "VoidWalker", points: 1650, rank: "Soldier" },
    { name: "Ghost_Agent", points: 1200, rank: "Soldier" },
    { name: "You (Active)", points: crew.points, rank: "Operator" },
  ].sort((a, b) => b.points - a.points);

  const handleInvite = () => {
    setShowInviteToast(true);
    triggerHaptic("success");
    setTimeout(() => {
      setShowInviteToast(false);
    }, 2500);
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Crews</h1>
          <p className="text-sm text-white/50 italic font-medium">Strength in numbers.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(true)}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-blue-400 border-white/5"
          >
             <Palette size={18} />
          </button>
          <button 
            onClick={leaveCrew}
            className="text-[9px] px-3 h-10 glass rounded-xl flex items-center justify-center text-red-400 border-red-500/20 font-black uppercase"
          >
             Leave
          </button>
        </div>
      </header>

      {/* Invite Toast */}
      <AnimatePresence>
        {showInviteToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-6 right-6 z-50 glass border-emerald-500/30 bg-emerald-500/10 p-3.5 rounded-2xl flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
               <Trophy size={16} />
            </div>
            <div>
               <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block">COPIED LINK</span>
               <p className="text-[10px] text-white/80 uppercase font-black tracking-tight">Alliance link copied back to Telegram clipboard!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crew Overview */}
      <div className="relative overflow-hidden glass rounded-[2.5rem] p-8 border-blue-500/20 bg-gradient-to-br from-blue-900/10 to-transparent">
         <div className="flex flex-col items-center text-center">
            {/* Custom Badge Display */}
            <div className="relative mb-4 group">
               <div 
                 className="w-24 h-24 flex items-center justify-center relative transition-transform duration-500 group-hover:rotate-12"
                 style={{ color: crew.badge.color }}
               >
                  {/* Dynamic Shape */}
                  {(() => {
                    const ShapeIcon = SHAPES[crew.badge.shape as keyof typeof SHAPES] || Circle;
                    return <ShapeIcon className="absolute inset-0 w-full h-full opacity-20" strokeWidth={1} />;
                  })()}
                  
                  {/* Main Icon */}
                  <div 
                    className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-current text-black glow-blue transition-all"
                    style={{ filter: `drop-shadow(0 0 15px ${crew.badge.color}66)` }}
                  >
                     {(() => {
                       const IconComp = ICONS[crew.badge.icon as keyof typeof ICONS] || Shield;
                       return <IconComp size={32} strokeWidth={2.5} />;
                     })()}
                  </div>
               </div>
            </div>

            <h2 className="text-3xl font-black uppercase italic tracking-tighter">{crew.name}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Level 12</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono">#{crew.rank} Global</span>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="glass-dark rounded-2xl p-4 text-center border border-white/5">
               <div className="text-[10px] font-black uppercase text-white/20 mb-1">Weekly Pts</div>
               <div className="text-xl font-black italic text-amber-500">{crew.points}</div>
            </div>
            <div className="glass-dark rounded-2xl p-4 text-center border border-white/5">
               <div className="text-[10px] font-black uppercase text-white/20 mb-1">Members</div>
               <div className="text-xl font-black italic text-blue-500">25/30</div>
            </div>
         </div>
      </div>

      {/* Contributions */}
      <div className="space-y-4">
         <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Syndicate Leaderboard</h3>
         </div>
         
         <div className="space-y-3">
            {members.map((member, i) => (
              <div 
                key={i} 
                className={cn(
                  "glass rounded-3xl p-5 flex items-center gap-4 border-white/5",
                  member.name.includes("You") && "border-amber-400/20 bg-amber-500/[0.02]"
                )}
              >
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-black">
                    #{i + 1}
                 </div>
                 <div className="flex-1 text-left">
                    <h4 className="text-sm font-black uppercase">{member.name}</h4>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tight">{member.rank}</span>
                 </div>
                 <div className="text-right">
                    <div className="text-sm font-black italic text-amber-500 font-mono">{member.points}</div>
                    <div className="text-[8px] font-bold uppercase text-white/20">PTS</div>
                 </div>
              </div>
            ))}
         </div>
      </div>

      {/* Social Actions */}
      <div className="grid grid-cols-2 gap-4">
         <button 
           onClick={handleInvite}
           className="glass p-5 rounded-3xl flex flex-col items-center gap-2 border-amber-500/10 hover:bg-amber-500/5 transition-all group text-center justify-center"
         >
            <UserPlus size={20} className="text-amber-500" />
            <span className="text-xs font-black uppercase italic">Invite Agents</span>
         </button>
         <button 
           onClick={() => {
             if (resources.coins >= 100) {
               boostCrew(10);
             } else {
               triggerHaptic("error");
             }
           }}
           disabled={resources.coins < 100}
           className={cn(
             "glass p-5 rounded-3xl flex flex-col items-center gap-2 transition-all text-center justify-center border",
             resources.coins >= 100 ? "border-emerald-500/20 hover:bg-emerald-500/5 cursor-pointer text-white" : "border-white/5 text-white/30 cursor-not-allowed"
           )}
         >
            <Flame size={20} className={cn("text-emerald-400", resources.coins >= 100 && "animate-pulse")} />
            <span className="text-xs font-black uppercase italic">Boost Alliance</span>
            <span className="text-[8px] font-mono font-bold uppercase text-white/30 mt-0.5">COST: 100 ZP</span>
         </button>
      </div>

      {/* Badge Editor Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md"
            onClick={() => setIsEditing(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full max-w-md glass-dark rounded-t-[3rem] p-8 border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="w-12 h-1.5 bg-white/10 mx-auto rounded-full mb-8" />
               <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8">Badge Designer</h3>

               <div className="space-y-8">
                  {/* Colors */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Color Scheme</label>
                    <div className="flex justify-between">
                       {COLORS.map((c) => (
                         <button 
                           key={c.hex}
                           onClick={() => updateCrewBadge({ color: c.hex })}
                           className={cn(
                             "w-10 h-10 rounded-full border-2 transition-all",
                             crew.badge.color === c.hex ? "border-white scale-110" : "border-transparent"
                           )}
                           style={{ backgroundColor: c.hex }}
                         />
                       ))}
                    </div>
                  </div>

                  {/* Shapes */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Emblem Shape</label>
                    <div className="flex justify-between bg-white/5 p-2 rounded-2xl">
                       {Object.entries(SHAPES).map(([name, Icon]) => (
                         <button 
                           key={name}
                           onClick={() => updateCrewBadge({ shape: name })}
                           className={cn(
                             "flex-1 flex items-center justify-center p-3 rounded-xl transition-all",
                             crew.badge.shape === name ? "bg-white/10 text-white" : "text-white/20"
                           )}
                         >
                            <Icon size={24} />
                         </button>
                       ))}
                    </div>
                  </div>

                  {/* Icons */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-3">Central Icon</label>
                    <div className="grid grid-cols-6 gap-2">
                       {Object.entries(ICONS).map(([name, Icon]) => (
                         <button 
                           key={name}
                           onClick={() => updateCrewBadge({ icon: name })}
                           className={cn(
                             "aspect-square flex items-center justify-center rounded-xl transition-all",
                             crew.badge.icon === name ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" : "bg-white/5 text-white/20"
                           )}
                         >
                            <Icon size={20} />
                         </button>
                       ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => setIsEditing(false)}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase italic active:scale-95 transition-all text-sm"
                  >
                    Deploy Badge
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
