/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, createContext, useContext } from "react";
import { Home, ClipboardList, Shield, Warehouse, Lock, Trophy, User, ShoppingCart, Settings, HelpCircle, Users, Cpu } from "lucide-react";
import { cn } from "./lib/utils";
import LandingPage from "./components/landing/LandingPage";
import AppNavbar from "./components/layout/AppNavbar";
import HomeScreen from "./components/game/HomeScreen";
import MissionsScreen from "./components/game/MissionsScreen";
import VaultScreen from "./components/game/VaultScreen";
import CrewScreen from "./components/game/CrewScreen";
import BaseScreen from "./components/game/BaseScreen";
import ProfileScreen from "./components/game/ProfileScreen";
import LeaderboardScreen from "./components/game/LeaderboardScreen";
import ShopScreen from "./components/game/ShopScreen";
import ReferralScreen from "./components/game/ReferralScreen";
import EventHubScreen from "./components/game/EventHubScreen";
import SocialTasksScreen from "./components/game/SocialTasksScreen";

// Simple Game Context
const GameContext = createContext<any>(null);

export const useGame = () => useContext(GameContext);

// Declare types for Telegram WebApp
declare global {
  interface Window {
    Telegram: any;
  }
}

function OnboardingWizard({ onComplete }: { onComplete: (data: any) => void }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: "",
    crew: null,
    baseStyle: "Cyber Lab"
  });

  const next = () => {
    if (step === 0 && !window.Telegram?.WebApp?.initDataUnsafe?.user) {
      // In a real scenario, this would be where we explain Telegram is required
    }
    setStep(s => s + 1);
  };

  const CREWS = [
    { name: "Night Owls", color: "text-blue-400", desc: "Specializing in stealth and decryption." },
    { name: "Iron Guard", color: "text-red-400", desc: "Brute force vault specialists." },
    { name: "Shadow Syndicate", color: "text-emerald-400", desc: "Collaborative network of elite agents." },
  ];

  const BASES = [
    { name: "Cyber Lab", icon: Cpu, desc: "A high-tech digital fortress." },
    { name: "Underground Bunker", icon: Shield, desc: "Deeply insulated and secure." },
    { name: "Secret Archive", icon: Lock, desc: "A library of lost knowledge." },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col p-6"
    >
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="text-center space-y-6">
              <div className="w-24 h-24 bg-amber-500 rounded-[2.5rem] flex items-center justify-center text-black mx-auto glow-gold">
                <Shield size={48} />
              </div>
               <h2 className="text-4xl font-black uppercase italic tracking-tighter">Recruitment Initialized</h2>
               <p className="text-white/50 text-sm italic">"Several hidden vaults were sealed years ago. Only crews capable of solving the mystery network can unlock them."</p>
               <div className="space-y-4">
                  <button onClick={next} className="w-full bg-white text-black py-5 rounded-3xl font-black uppercase italic tracking-widest text-sm shadow-xl">Complete Recruitment</button>
                  <button onClick={() => onComplete(null)} className="text-[10px] font-black uppercase text-white/30 hover:text-white/50 transition-colors py-2 px-6">View Only Mode</button>
               </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="w-full space-y-6">
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Choose Display Name</h3>
               <input 
                 autoFocus
                 type="text" 
                 placeholder="Enter Codename..."
                 className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 outline-none focus:border-amber-500/50 transition-all font-black uppercase italic text-amber-500"
                 onChange={(e) => setData({...data, name: e.target.value})}
               />
               <button onClick={next} disabled={!data.name} className="w-full bg-amber-500 disabled:opacity-30 text-black py-5 rounded-3xl font-black uppercase italic tracking-widest text-sm shadow-xl">Confirm Codename</button>
            </motion.div>
          )}

          {step === 2 && (
             <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="w-full space-y-6">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Select Your Crew</h3>
                <div className="space-y-3">
                   {CREWS.map(c => (
                     <button 
                        key={c.name}
                        onClick={() => setData({...data, crew: { name: c.name, badge: { icon: "Shield", color: "#f59e0b", shape: "Hexagon" }, rank: 1, points: 0 }})}
                        className={cn(
                          "w-full p-5 rounded-2xl border transition-all text-left group",
                          data.crew?.name === c.name ? "bg-white/10 border-amber-500" : "bg-white/5 border-white/5"
                        )}
                     >
                       <div className={cn("text-lg font-black uppercase italic", c.color)}>{c.name}</div>
                       <div className="text-[10px] text-white/30 font-bold uppercase">{c.desc}</div>
                     </button>
                   ))}
                </div>
                <button onClick={next} disabled={!data.crew} className="w-full bg-amber-500 disabled:opacity-30 text-black py-5 rounded-3xl font-black uppercase italic tracking-widest text-sm shadow-xl">Join Crew</button>
             </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="w-full space-y-6">
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Initialize Area</h3>
               <div className="grid grid-cols-1 gap-3">
                  {BASES.map(b => (
                    <button 
                       key={b.name}
                       onClick={() => setData({...data, baseStyle: b.name})}
                       className={cn(
                        "w-full p-5 rounded-2xl border transition-all text-left flex items-center gap-4",
                        data.baseStyle === b.name ? "bg-white/10 border-amber-500" : "bg-white/5 border-white/5"
                      )}
                    >
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-amber-500">
                        <b.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="text-lg font-black uppercase italic">{b.name}</div>
                        <div className="text-[10px] text-white/30 font-bold uppercase">{b.desc}</div>
                      </div>
                    </button>
                  ))}
               </div>
               <button onClick={() => onComplete(data)} className="w-full bg-emerald-500 text-black py-5 rounded-3xl font-black uppercase italic tracking-widest text-sm shadow-xl">Construct Base</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const isApp = location.pathname.startsWith("/app");
  const { user, finalizeOnboarding } = useGame();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hidden = localStorage.getItem("cluevault_onboarding_hidden");
    const skipped = localStorage.getItem("cluevault_onboarding_skipped");
    if (!hidden && !skipped && isApp && !user.onboarded) {
      setShowOnboarding(true);
    }
  }, [isApp, user.onboarded]);

  return (
    <div className="min-h-screen bg-black overflow-hidden flex flex-col">
      <AnimatePresence>
        {showOnboarding && <OnboardingWizard onComplete={(data) => {
          finalizeOnboarding(data);
          setShowOnboarding(false);
        }} />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={
            <div className="flex-1 flex flex-col relative pb-20 overflow-y-auto">
              {/* Global App Header */}
              <header className="sticky top-0 z-40 glass-dark border-b border-white/5 py-3 px-5 flex justify-between items-center backdrop-blur-xl">
                <Link to="/app/home" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500 flex items-center justify-center rounded-lg glow-gold">
                    <Shield className="text-black" size={18} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tighter italic">ClueVault</span>
                </Link>
                <div className="flex items-center gap-3">
                  <Link to="/app/shop" className="bg-white/5 hover:bg-amber-500/10 p-2 rounded-xl text-amber-500 transition-all border border-white/5">
                    <ShoppingCart size={18} />
                  </Link>
                  <Link to="/app/profile" className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30">
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  </Link>
                </div>
              </header>

              <Routes>
                <Route path="home" element={<HomeScreen />} />
                <Route path="missions" element={<MissionsScreen />} />
                <Route path="vault" element={<VaultScreen />} />
                <Route path="crew" element={<CrewScreen />} />
                <Route path="base" element={<BaseScreen />} />
                <Route path="profile" element={<ProfileScreen />} />
                <Route path="leaderboard" element={<LeaderboardScreen />} />
                <Route path="shop" element={<ShopScreen />} />
                <Route path="referral" element={<ReferralScreen />} />
                <Route path="events" element={<EventHubScreen />} />
                <Route path="social-tasks" element={<SocialTasksScreen />} />
                <Route path="*" element={<Navigate to="/app/home" />} />
              </Routes>
              <AppNavbar />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState(() => {
    const saved = localStorage.getItem("cluevault_game_state");
    if (saved) return JSON.parse(saved);
    
    return {
      user: {
        name: "",
        level: 1,
        streak: 1,
        completedToday: false,
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
        onboarded: false,
      },
      resources: {
        coins: 100,
        keys: 1,
        fragments: 0,
        baseMaterials: 0,
        energy: 100,
        maxEnergy: 100,
      },
      crew: null, // User starts without a crew
      base: {
        style: "Cyber Lab",
        rooms: [
          { id: "command", name: "Command Room", level: 1, type: "primary" }
        ],
        level: 1,
      },
      activeMission: null,
      unlockedTabs: ["daily"],
      inventory: [],
      lastEnergyUpdate: Date.now(),
    };
  });

  // Energy Regeneration
  useEffect(() => {
    const timer = setInterval(() => {
      setGameState((prev: any) => {
        if (prev.resources.energy >= prev.resources.maxEnergy) return prev;
        
        const now = Date.now();
        const elapsed = (now - prev.lastEnergyUpdate) / 1000; // seconds
        if (elapsed >= 300) { // 1 energy every 5 minutes
          const gained = Math.floor(elapsed / 300);
          return {
            ...prev,
            resources: {
              ...prev.resources,
              energy: Math.min(prev.resources.maxEnergy, prev.resources.energy + gained)
            },
            lastEnergyUpdate: now
          };
        }
        return prev;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem("cluevault_game_state", JSON.stringify(gameState));
  }, [gameState]);

  // Telegram SDK Init
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user && !gameState.user.onboarded) {
        setGameState((prev: any) => ({
          ...prev,
          user: {
            ...prev.user,
            name: tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || "Agent",
            avatar: tg.initDataUnsafe.user.photo_url || prev.user.avatar
          }
        }));
      }
      tg.BackButton.onClick(() => {
        if (window.location.pathname === "/app/home") {
          tg.close();
        } else {
          window.history.back();
        }
      });
    }
  }, [gameState.user.onboarded]);

  const triggerHaptic = (style: any = "light") => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (style === "success") tg.HapticFeedback.notificationOccurred("success");
      else if (style === "error") tg.HapticFeedback.notificationOccurred("error");
      else tg.HapticFeedback.impactOccurred(style);
    } else if (navigator.vibrate) {
      navigator.vibrate(style === "success" ? [10, 30, 10] : 10);
    }
  };

  const updateResources = (diff: any) => {
    setGameState((prev: any) => ({
      ...prev,
      resources: { ...prev.resources, ...diff }
    }));
    triggerHaptic("light");
  };

  const consumeEnergy = (amount: number) => {
    if (gameState.resources.energy >= amount) {
      updateResources({ energy: gameState.resources.energy - amount });
      return true;
    }
    triggerHaptic("error");
    return false;
  };

  const completeMission = (reward: any) => {
    setGameState((prev: any) => ({
      ...prev,
      resources: { 
        ...prev.resources, 
        coins: prev.resources.coins + (reward.coins || 0),
        keys: prev.resources.keys + (reward.keys || 0),
        fragments: prev.resources.fragments + (reward.fragments || 0),
        baseMaterials: prev.resources.baseMaterials + (reward.baseMaterials || 0),
      },
      user: { ...prev.user, completedToday: true, level: prev.user.level + (reward.xp ? 0.1 : 0) },
      unlockedTabs: Array.from(new Set([...prev.unlockedTabs, "bonus", "crew", "referral"]))
    }));
    triggerHaptic("success");
  };

  const finalizeOnboarding = (data: any) => {
    if (!data) {
      // User chose view-only
      setGameState((prev: any) => ({
        ...prev,
        user: { ...prev.user, onboarded: false }
      }));
      localStorage.setItem("cluevault_onboarding_skipped", "true");
      return;
    }
    setGameState((prev: any) => ({
      ...prev,
      user: { ...prev.user, name: data.name, onboarded: true },
      crew: data.crew,
      base: { ...prev.base, style: data.baseStyle },
    }));
    localStorage.setItem("cluevault_onboarding_hidden", "true");
    localStorage.removeItem("cluevault_onboarding_skipped");
    triggerHaptic("success");
  };

  const buyItem = (item: any) => {
    if (gameState.resources.coins >= item.cost) {
      updateResources({ coins: gameState.resources.coins - item.cost, ...item.reward });
      triggerHaptic("success");
      return true;
    }
    triggerHaptic("error");
    return false;
  };

  const updateCrewBadge = (newBadge: any) => {
    setGameState((prev: any) => {
      if (!prev.crew) return prev;
      return {
        ...prev,
        crew: { ...prev.crew, badge: { ...prev.crew.badge, ...newBadge } }
      };
    });
  };

  const updateCrewHallTheme = (theme: string) => {
    setGameState((prev: any) => {
      if (!prev.crew) return prev;
      return {
        ...prev,
        crew: { ...prev.crew, hallTheme: theme }
      };
    });
  };

  return (
    <GameContext.Provider value={{ 
      ...gameState, 
      updateResources, 
      consumeEnergy,
      completeMission, 
      buyItem,
      updateCrewBadge,
      updateCrewHallTheme,
      finalizeOnboarding,
      triggerHaptic 
    }}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </GameContext.Provider>
  );
}
