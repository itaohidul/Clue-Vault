import { useGame } from "../../App";
import { ShoppingCart, Zap, Key, Package, Star, Shield, Gift, Sparkles, ChevronRight, Clock } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../../lib/utils";

export default function ShopScreen() {
  const { user, resources, buyItem, triggerHaptic } = useGame();

  const packs = [
    { name: "Starter Kit", price: "$2.99", cost: 0, reward: { keys: 10, coins: 5000 }, items: "10 Keys, 5k Coins", highlight: true, icon: Gift },
    { name: "Agent Bundle", price: "$9.99", cost: 0, reward: { keys: 50, coins: 25000 }, items: "50 Keys, 25k Coins, Rare Skin", highlight: false, icon: Shield },
    { name: "Global Pass", price: "$19.99", cost: 0, reward: { keys: 100, coins: 100000 }, items: "Unlimited Hints, Season Rewards", highlight: false, icon: Sparkles },
  ];

  const coinPacks = [
    { name: "Key Cluster", cost: 1000, reward: { keys: 5 }, items: "5 Decryption Keys", icon: Key },
    { name: "Material Crate", cost: 500, reward: { baseMaterials: 20 }, items: "20 Construction Mats", icon: Package },
  ];

  const handlePurchase = (pack: any) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    if (pack.cost === 0) {
      // Simulate real money purchase
      buyItem({ cost: 0, reward: pack.reward });
    } else {
      buyItem(pack);
    }
  };

  return (
    <div className="p-5 pb-24 space-y-6">
      {!user.onboarded && (
        <div className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex items-center justify-between gap-4">
           <div>
              <h3 className="text-[10px] font-black uppercase text-amber-500 mb-0.5">Observation Mode</h3>
              <p className="text-[8px] text-white/40 uppercase font-bold">Log in to interact with the market.</p>
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
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-1">Black Market</h1>
          <p className="text-sm text-white/50 italic font-medium">Acquire prohibited tech.</p>
        </div>
        <div className="glass px-3 py-1 rounded-full flex items-center gap-2 border-amber-500/20">
           <Zap size={14} className="text-amber-500" />
           <span className="text-xs font-black">{resources.coins}</span>
        </div>
      </header>

      {/* Featured Offer */}
      <div className="relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-transparent to-transparent z-0" />
         <div className="glass rounded-[2.5rem] p-8 border-amber-500/30 relative z-10">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <div className="bg-amber-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mb-2 inline-block">Flash Deal</div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">Crypto Key Cluster</h2>
                  <p className="text-xs text-white/40">20 High-Frequency Decryption Keys</p>
               </div>
               <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-black glow-gold">
                  <Key size={24} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex items-center justify-between">
               <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black italic">$4.99</span>
                  <span className="text-[10px] text-white/20 line-through font-bold">$12.99</span>
               </div>
               <button 
                onClick={() => handlePurchase({ cost: 0, reward: { keys: 20 } })}
                className="bg-white text-black px-6 py-3 rounded-2xl font-black uppercase italic text-xs active:scale-95 transition-all shadow-xl"
               >
                  Acquire Now
               </button>
            </div>
         </div>
         <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 blur-[60px] rounded-full" />
      </div>

      {/* Item Grid */}
      <div className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2">Operational Packs</h3>
         <div className="grid grid-cols-1 gap-3">
            {packs.map((pack, i) => (
              <motion.div 
                onClick={() => handlePurchase(pack)}
                whileTap={{ scale: 0.98 }}
                key={i} 
                className={cn(
                  "glass rounded-3xl p-5 flex items-center justify-between border-white/5 cursor-pointer",
                  pack.highlight && "border-amber-500/20 bg-amber-500/5"
                )}
              >
                 <div className="flex items-center gap-4">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        pack.highlight ? "bg-amber-500 text-black" : "bg-white/5 text-white/40"
                    )}>
                       <pack.icon size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black uppercase tracking-tight">{pack.name}</h4>
                       <p className="text-[10px] text-white/30 font-bold uppercase truncate max-w-[120px]">{pack.items}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-sm font-black italic mb-1">{pack.price}</div>
                    <div className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Buy</div>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Coin Items */}
       <div className="space-y-4">
         <h3 className="text-xs font-black uppercase tracking-widest text-white/30 px-2">Resource Exchange</h3>
         <div className="grid grid-cols-1 gap-3">
            {coinPacks.map((pack, i) => (
              <motion.div 
                onClick={() => handlePurchase(pack)}
                whileTap={{ scale: 0.98 }}
                key={i} 
                className="glass rounded-3xl p-5 flex items-center justify-between border-white/5 cursor-pointer"
              >
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                       <pack.icon size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-black uppercase tracking-tight">{pack.name}</h4>
                       <p className="text-[10px] text-white/30 font-bold uppercase">{pack.items}</p>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-sm font-black italic mb-1 text-amber-500">{pack.cost} ZP</div>
                    <div className="text-[8px] font-black uppercase text-white/40 tracking-widest">Swap</div>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Reward Ads */}
      <div className="glass rounded-[2rem] p-6 border-blue-500/10 bg-blue-500/5">
         <div className="flex items-center gap-3 mb-4">
            <Clock size={18} className="text-blue-400" />
            <h4 className="text-xs font-black uppercase italic tracking-tighter">Daily Bonus Stream</h4>
         </div>
         <p className="text-[10px] text-white/40 mb-4 leading-relaxed italic">Synchronize with our partner signals for 30 seconds to receive a free Clue Hint or Key Fragment.</p>
         <button 
           onClick={() => {
             triggerHaptic("medium");
             setTimeout(() => {
               buyItem({ cost: 0, reward: { keys: 1 } });
             }, 5000);
           }}
           className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/20 transition-all"
         >
            Watch Signal Uplink
         </button>
      </div>
    </div>
  );
}
