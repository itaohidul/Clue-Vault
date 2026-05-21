import { useState, useEffect } from "react";
import { useGame } from "../../App";
import { Users, Star, Trophy, MessageSquare, Shield, ChevronRight, UserPlus, Flame, Palette, Circle, Hexagon, Square, Diamond, Swords, Target, Eye, Crown, Zap, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import axios from "axios";

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
  const { crew, updateCrewBadge, joinCrew, leaveCrew, resources, triggerHaptic, user: currentUserState } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteToast, setShowInviteToast] = useState(false);
  const [interactingCrew, setInteractingCrew] = useState<any | null>(null);
  const [crewMembers, setCrewMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const AVAILABLE_CREWS = [
    { name: "Phantom Operatives", desc: "Decentralized code breakers and elite network nodes.", rank: 4, points: 124500, multiplier: "1.25x Earning" },
    { name: "Acolytes of Clue", desc: "Synthesizer mining clan studying absolute game consensus.", rank: 7, points: 98000, multiplier: "1.20x Earning" },
    { name: "Sovereign Nodes", desc: "Absolute TON ledger maximalists bypass sovereign locks.", rank: 11, points: 64500, multiplier: "1.15x Earning" },
  ];

  const fetchCrewMembers = async (crewName: string) => {
    setLoadingMembers(true);
    try {
      const response = await axios.get(`/api/crews/${crewName}/members`);
      setCrewMembers(response.data);
    } catch (e) {
      console.error("Failed to fetch crew members", e);
      // Fallback with mock if mongo fails for some reason
      setCrewMembers([
        { user: { name: "Agent Echo", level: 5, avatar: "" }, resources: { activityScore: 100 } }
      ]);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (crew) {
      fetchCrewMembers(crew.name);
    }
  }, [crew?.name]);

  if (!crew && !interactingCrew) {
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setInteractingCrew(item);
                        fetchCrewMembers(item.name);
                        triggerHaptic("light");
                      }}
                      className="bg-white/10 text-white px-4 py-2.5 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all"
                    >
                      View Members
                    </button>
                    <button 
                      onClick={() => {
                        joinCrew(item.name);
                        triggerHaptic("heavy");
                      }}
                      className="bg-amber-500 text-black px-5 py-2.5 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all shadow-md"
                    >
                      Syncreg Join
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Interacting with a crew you haven't joined yet
  const displayedCrew = interactingCrew || crew;
  const isJoined = !!crew && (!interactingCrew || interactingCrew.name === crew.name);

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
          {isJoined && (
            <button 
              onClick={() => setIsEditing(true)}
              className="w-10 h-10 glass rounded-xl flex items-center justify-center text-blue-400 border-white/5"
            >
               <Palette size={18} />
            </button>
          )}
          {interactingCrew ? (
            <button 
              onClick={() => setInteractingCrew(null)}
              className="text-[9px] px-3 h-10 glass rounded-xl flex items-center justify-center text-white/50 border-white/10 font-black uppercase"
            >
               Back
            </button>
          ) : (
            <button 
              onClick={leaveCrew}
              className="text-[9px] px-3 h-10 glass rounded-xl flex items-center justify-center text-red-400 border-red-500/20 font-black uppercase"
            >
               Leave
            </button>
          )}
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
                 style={{ color: displayedCrew.badge?.color || '#3b82f6' }}
               >
                  {/* Dynamic Shape */}
                  {(() => {
                    const ShapeIcon = SHAPES[(displayedCrew.badge?.shape || 'Circle') as keyof typeof SHAPES] || Circle;
                    return <ShapeIcon className="absolute inset-0 w-full h-full opacity-20" strokeWidth={1} />;
                  })()}
                  
                  {/* Main Icon */}
                  <div 
                    className="w-16 h-16 rounded-[2rem] flex items-center justify-center bg-current text-black glow-blue transition-all"
                    style={{ filter: `drop-shadow(0 0 15px ${displayedCrew.badge?.color || '#3b82f6'}66)` }}
                  >
                     {(() => {
                       const IconComp = ICONS[(displayedCrew.badge?.icon || 'Shield') as keyof typeof ICONS] || Shield;
                       return <IconComp size={32} strokeWidth={2.5} />;
                     })()}
                  </div>
               </div>
            </div>

            <h2 className="text-3xl font-black uppercase italic tracking-tighter">{displayedCrew.name}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Syndicate</span>
               <div className="w-1 h-1 rounded-full bg-white/20" />
               <span className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono">
                 {displayedCrew.points?.toLocaleString()} PTS
               </span>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="glass-dark rounded-2xl p-4 text-center border border-white/5">
               <div className="text-[10px] font-black uppercase text-white/20 mb-1">Status</div>
               <div className="text-xl font-black italic text-emerald-500">REALTIME</div>
            </div>
            <div className="glass-dark rounded-2xl p-4 text-center border border-white/5">
               <div className="text-[10px] font-black uppercase text-white/20 mb-1">Total Signals</div>
               <div className="text-xl font-black italic text-blue-500">{crewMembers.length || '...'}</div>
            </div>
         </div>
      </div>

      {/* Contributions */}
      <div className="space-y-4">
         <div className="flex justify-between items-center px-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/30">Active Syndicate Agents</h3>
         </div>
         
         <div className="space-y-3">
            {loadingMembers && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase text-white/20 tracking-widest">Scanning Network...</span>
              </div>
            )}
            
            {!loadingMembers && crewMembers.map((member, i) => (
              <div 
                key={member.id || i} 
                className={cn(
                  "glass rounded-3xl p-5 flex items-center gap-4 border-white/5",
                  (member.id === currentUserState.id?.toString() || member.user?.name === currentUserState.name) && "border-emerald-400/20 bg-emerald-500/[0.02]"
                )}
              >
                 <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                    {member.user?.avatar ? <img src={member.user.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-white/20" />}
                 </div>
                 <div className="flex-1 text-left">
                    <div className="flex items-center gap-1.5">
                       <h4 className="text-sm font-black uppercase truncate max-w-[120px]">{member.user?.name || "Agent"}</h4>
                       {i === 0 && <Crown size={12} className="text-amber-500" />}
                    </div>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tight">LVL {member.user?.level || 1} • {member.user?.username || "Incognito"}</span>
                 </div>
                 <div className="text-right">
                    <div className="text-sm font-black italic text-amber-500 font-mono">{(member.resources?.activityScore || 0).toLocaleString()}</div>
                    <div className="text-[8px] font-bold uppercase text-white/20">SCORE</div>
                 </div>
              </div>
            ))}
            
            {!loadingMembers && crewMembers.length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-3xl">
                <p className="text-[10px] font-black uppercase text-white/20 tracking-widest">No agents detected in this syndicate yet.</p>
              </div>
            )}
         </div>
      </div>

      {/* Social Actions */}
      <div className="grid grid-cols-2 gap-4">
         <button 
           onClick={handleInvite}
           className="glass p-5 rounded-3xl flex flex-col items-center gap-2 border-amber-500/10 hover:bg-amber-500/5 transition-all group text-center justify-center opacity-50"
           disabled
         >
            <UserPlus size={20} className="text-amber-500" />
            <span className="text-xs font-black uppercase italic">Invite Friends</span>
            <span className="text-[8px] uppercase font-bold text-white/20 mt-1">Coming Soon</span>
         </button>
         {isJoined ? (
            <div className="glass p-5 rounded-3xl flex flex-col items-center gap-2 border-emerald-500/10 text-center justify-center">
              <Shield size={20} className="text-emerald-400" />
              <span className="text-xs font-black uppercase italic">Syncreg Active</span>
              <span className="text-[8px] font-mono font-bold uppercase text-white/30 mt-0.5">VAULTED PROFILE</span>
            </div>
         ) : (
            <button 
              onClick={() => {
                joinCrew(displayedCrew.name);
                setInteractingCrew(null);
                triggerHaptic("heavy");
              }}
              className="glass p-5 rounded-3xl flex flex-col items-center gap-2 border-amber-500/10 hover:bg-amber-500/5 transition-all text-center justify-center"
            >
               <Users size={20} className="text-amber-400" />
               <span className="text-xs font-black uppercase italic">Join Syndicate</span>
               <span className="text-[8px] font-mono font-bold uppercase text-white/30 mt-0.5">#{interactingCrew?.points.toLocaleString()} PTS</span>
            </button>
         )}
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
