import { useGame } from "../../App";
import { Warehouse, Hammer, Zap, Package, Settings, ChevronRight, Globe, Lock, Palette, Layout, Terminal, Radio, Shield, Cpu, Database, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { cn } from "../../lib/utils";

const THEMES = [
  { id: "Cyber Lab", name: "Neon District", img: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?auto=format&fit=crop&q=80" },
  { id: "Underground Bunker", name: "Deep Bunker", img: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&q=80" },
  { id: "Secret Archive", name: "Lost Library", img: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&q=80" },
  { id: "Space", name: "Void Station", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80" },
];

export default function BaseScreen() {
  const { user, base, resources, upgradeBaseRoom, setBaseStyle, triggerHaptic } = useGame();
  const [isTheming, setIsTheming] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const ROOM_TYPES = [
    { id: "command", name: "Command Room", icon: Shield, desc: "Unlock higher level daily mysteries.", cost: 300, mats: 10 },
    { id: "clue_lab", name: "Clue Lab", icon: Cpu, desc: "Faster story fragment extraction.", cost: 400, mats: 15 },
    { id: "vault_room", name: "Vault Room", icon: Lock, desc: "Bonus coins from all vaults.", cost: 500, mats: 25 },
    { id: "storage", name: "Storage Room", icon: Database, desc: "Increase maximum energy capacity.", cost: 600, mats: 30 },
  ];

  const currentTheme = THEMES.find(t => t.id === base.style) || THEMES[0];

  const handleUpgrade = (room: any, level: number) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    const coinsCost = room.cost * (level + 1);
    const matsCost = room.mats * (level + 1);

    if (resources.coins >= coinsCost && resources.baseMaterials >= matsCost) {
      setUpgrading(room.id);
      triggerHaptic("medium");
      
      setTimeout(() => {
        upgradeBaseRoom(room.id, coinsCost, matsCost);
        setUpgrading(null);
      }, 1500);
    } else {
      triggerHaptic("error");
    }
  };

  const handleThemeChange = (themeId: string) => {
     setBaseStyle(themeId);
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Base Ops</h1>
          <p className="text-[10px] text-white/50 italic font-bold uppercase tracking-widest leading-none">Sector {base.level} | {base.style}</p>
        </div>
        <button 
          onClick={() => setIsTheming(true)}
          className="w-10 h-10 glass rounded-xl flex items-center justify-center text-amber-500 border-amber-500/20"
        >
          <Palette size={20} />
        </button>
      </header>

      {/* Visual Context */}
      <div className="relative aspect-video glass rounded-[2.5rem] border-white/5 overflow-hidden group">
         <AnimatePresence mode="wait">
            <motion.img 
              key={base.style}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.4, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={currentTheme.img} 
              alt="Base Visual" 
              className="w-full h-full object-cover transition-transform duration-1000"
              referrerPolicy="no-referrer"
            />
         </AnimatePresence>
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
         <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
            <div className="flex flex-col gap-1">
               <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse delay-75" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
               </div>
               <h2 className="text-2xl font-black uppercase italic tracking-tighter">{currentTheme.name}</h2>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black glow-gold">
               <Warehouse size={24} strokeWidth={2.5} />
            </div>
         </div>
      </div>

      {/* Base Resources */}
      <div className="grid grid-cols-2 gap-3">
         <div className="glass rounded-2xl p-4 border-white/5 bg-amber-500/5 text-center">
            <div className="text-[8px] font-black uppercase text-amber-500/50 mb-1">Available Budget</div>
            <div className="text-xl font-black italic tracking-tighter">{resources.coins} ZP</div>
         </div>
         <div className="glass rounded-2xl p-4 border-white/5 bg-blue-500/5 text-center">
            <div className="text-[8px] font-black uppercase text-blue-400/50 mb-1">Core Materials</div>
            <div className="text-xl font-black italic tracking-tighter">{resources.baseMaterials} MAT</div>
         </div>
      </div>

      {/* Room Upgrades */}
      <div className="space-y-3">
         {ROOM_TYPES.map((room) => {
            const roomData = base.rooms.find((r: any) => r.id === room.id);
            const level = roomData?.level || 0;
            const coinsCost = room.cost * (level + 1);
            const matsCost = room.mats * (level + 1);
            const canAfford = resources.coins >= coinsCost && resources.baseMaterials >= matsCost;

            return (
              <div 
                key={room.id}
                className={cn(
                  "glass rounded-3xl p-5 border-white/5 relative overflow-hidden transition-all",
                  level === 0 && "opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                   <div className="flex gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg",
                        level > 0 ? "bg-amber-500 text-black glow-gold" : "bg-white/5 text-white/20"
                      )}>
                         <room.icon size={22} />
                      </div>
                      <div>
                         <h4 className="text-sm font-black uppercase tracking-tight">{room.name}</h4>
                         <p className="text-[10px] text-white/30 font-bold uppercase">Current Lv. {level}</p>
                      </div>
                   </div>
                   {level === 0 && <span className="bg-white/5 text-white/20 text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Locked</span>}
                </div>
                
                <p className="text-[10px] text-white/40 mb-5 italic">{room.desc}</p>

                <div className="flex items-center justify-between gap-4">
                   <div className="flex gap-3">
                      <div className="text-[8px] font-black text-amber-500 uppercase">{coinsCost} ZP</div>
                      <div className="text-[8px] font-black text-blue-500 uppercase">{matsCost} M</div>
                   </div>
                   <button 
                     onClick={() => handleUpgrade(room, level)}
                     disabled={upgrading !== null || !canAfford}
                     className={cn(
                        "flex-1 py-3 rounded-xl font-black uppercase italic text-[10px] transition-all",
                        canAfford ? "bg-white text-black active:scale-95 shadow-xl" : "bg-white/5 text-white/20 cursor-not-allowed"
                     )}
                   >
                     {upgrading === room.id ? "Constructing..." : level > 0 ? "Upgrade Room" : "Build Room"}
                   </button>
                </div>

                {upgrading === room.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                  >
                     <Hammer className="text-amber-500 animate-bounce" size={24} />
                     <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Syncing Blueprint</div>
                  </motion.div>
                )}
              </div>
            );
         })}
      </div>

      {/* Theme Picker Modal */}
      <AnimatePresence>
        {isTheming && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setIsTheming(false)}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full glass-dark rounded-[3rem] p-8 border-t border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
               <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-8 text-center text-white">Base Ambience</h3>
               <div className="grid grid-cols-2 gap-3 mb-8">
                  {THEMES.map((theme) => (
                    <button 
                      key={theme.id}
                      onClick={() => handleThemeChange(theme.id)}
                      className={cn(
                        "relative aspect-video rounded-2xl overflow-hidden border-2 transition-all",
                        base.style === theme.id ? "border-amber-500 scale-105 shadow-xl" : "border-white/5"
                      )}
                    >
                       <img src={theme.img} alt={theme.name} className="w-full h-full object-cover opacity-60" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                       <span className="absolute bottom-2 left-2 text-[8px] font-black uppercase italic tracking-tight">{theme.name}</span>
                    </button>
                  ))}
               </div>
               <button onClick={() => setIsTheming(false)} className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase italic text-sm shadow-xl active:scale-95 transition-all">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
