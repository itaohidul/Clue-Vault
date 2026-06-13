/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, createContext, useContext, Component, ReactNode, useRef } from "react";
import { Home, ClipboardList, Shield, Warehouse, Lock, Trophy, User, ShoppingCart, Settings, HelpCircle, Users, Cpu, Coins, Award, Sparkles, Zap, ChevronRight } from "lucide-react";
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
import EarnScreen from "./components/game/EarnScreen";
import WalletDexScreen from "./components/game/WalletDexScreen";
import TelegramProvider from "./providers/TelegramProvider";
import { TwaAnalyticsProvider } from "./lib/telegramAnalytics";
import { useUserStore } from "./store/userStore";
import cluevaultLogo from "./assets/images/cluevault_logo_1779272321887.png";
import SupabaseSyncProvider, { useSupabaseSync } from "./components/SupabaseSyncProvider";
import { initInAppAds } from "./lib/adEngine";


// Simple Game Context
const GameContext = createContext<any>(null);

export const useGame = () => useContext(GameContext);

// Declare types for Telegram WebApp
declare global {
  interface Window {
    Telegram?: { WebApp?: any; WebView?: any };
    show_11030019?: any;
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
    const hasTgUser = !!(
      window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user
    );
    if (step === 0 && !hasTgUser) {
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
              <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)] border border-amber-500/20 overflow-hidden">
                <img src={cluevaultLogo} alt="ClueVault Logo" className="w-full h-full object-cover rounded-[2.5rem]" referrerPolicy="no-referrer" />
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

const getClearanceBracket = (level: number) => {
  const lvl = Math.floor(level);
  if (lvl <= 5) return { name: "Beginner", cap: 100, desc: "Baseline security credential node" };
  if (lvl <= 15) return { name: "Explorer", cap: 250, desc: "Unlocked advanced cryptographic data trails" };
  if (lvl <= 30) return { name: "Vault Hunter", cap: 500, desc: "Deep decryption and rare artifacts tracker" };
  if (lvl <= 50) return { name: "Cipher Elite", cap: 1000, desc: "High-clearance security agent tier" };
  if (lvl <= 75) return { name: "Shadow Operator", cap: 1500, desc: "S-class classified decryption authorization" };
  return { name: "Vault Master", cap: 2500, desc: "Master of absolute security bypass systems" };
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isApp = location.pathname.startsWith("/app");
  
  const { 
    user, 
    resources, 
    finalizeOnboarding, 
    triggerHaptic, 
    syncWithBackend,
    isLoading
  } = useUserStore();

  const { userId, error: syncError, setError: setSyncError, syncLocalToCloud, isCloudLoaded } = useSupabaseSync();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showBypass, setShowBypass] = useState(false);
  const [dismissedSyncError, setDismissedSyncError] = useState(false);

  const [firstRouteLogged, setFirstRouteLogged] = useState(false);

  // Use a local state for the loading screen that resolves when isCloudLoaded is true
  const [initSyncCompleted, setInitSyncCompleted] = useState(false);

  useEffect(() => {
    if (isCloudLoaded) {
      setInitSyncCompleted(true);
    }
  }, [isCloudLoaded]);

  // Show bypass button after 5 seconds of loading
  useEffect(() => {
    if (!initSyncCompleted) {
      const bypassTimer = setTimeout(() => {
        setShowBypass(true);
      }, 5000);
      return () => clearTimeout(bypassTimer);
    }
  }, [initSyncCompleted]);

  const [levelUpData, setLevelUpData] = useState<{ oldLevel: number; newLevel: number } | null>(null);
  const prevLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (initSyncCompleted && user && user.level) {
      if (prevLevelRef.current === null) {
        prevLevelRef.current = user.level;
      } else if (user.level > prevLevelRef.current) {
        setLevelUpData({
          oldLevel: prevLevelRef.current,
          newLevel: user.level
        });
        try {
          triggerHaptic("heavy");
        } catch (e) {}
        prevLevelRef.current = user.level;
      } else if (user.level < prevLevelRef.current) {
        // Keeps state aligned if user switches profiles or resets cache
        prevLevelRef.current = user.level;
      }
    }
  }, [user?.level, initSyncCompleted, triggerHaptic]);

  // Track and log first route rendered
  useEffect(() => {
    if (!firstRouteLogged && initSyncCompleted) {
      console.log("[DIAG] First route rendered:", location.pathname);
      setFirstRouteLogged(true);
    }
  }, [location.pathname, initSyncCompleted, firstRouteLogged]);

  // Inside Telegram, automatically route from landing "/" to "/app/home"
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData && location.pathname === "/") {
      navigate("/app/home", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Support Onboarding popup selection
  useEffect(() => {
    const hidden = localStorage.getItem("cluevault_onboarding_hidden");
    const skipped = localStorage.getItem("cluevault_onboarding_skipped");
    if (!hidden && !skipped && isApp && !user.onboarded && initSyncCompleted) {
      setShowOnboarding(true);
    }
  }, [isApp, user.onboarded, initSyncCompleted]);

  // Handle Telegram BackButton dynamic visibility
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (tg.BackButton && typeof tg.BackButton.hide === 'function' && typeof tg.BackButton.show === 'function') {
      if (location.pathname === "/app/home" || location.pathname === "/" || location.pathname === "") {
        tg.BackButton.hide();
      } else {
        tg.BackButton.show();
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    initInAppAds({
      frequency: 1000,
      capping: 0.1, // Show up to 1000 ads within 6 minutes (basically unlimited)
      interval: 30, // 30 seconds between ads
      timeout: 30,  // 30 seconds initial delay on app start
      everyPage: false
    });
  }, []);

  // Handle BackButton click callbacks
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const handleBack = () => {
      navigate(-1);
    };

    if (tg.BackButton && typeof tg.BackButton.onClick === 'function' && typeof tg.BackButton.offClick === 'function') {
      tg.BackButton.onClick(handleBack);
      return () => {
        tg.BackButton.offClick(handleBack);
      };
    }
  }, [navigate]);

  // Handle Telegram MainButton on homepage (PLAY OPERATIONS)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    if (tg.MainButton && typeof tg.MainButton.setText === 'function' && typeof tg.MainButton.show === 'function' && typeof tg.MainButton.onClick === 'function' && typeof tg.MainButton.offClick === 'function' && typeof tg.MainButton.hide === 'function') {
      if (location.pathname === "/app/home") {
        tg.MainButton.setText("PLAY OPERATIONS");
        tg.MainButton.show();

        const handleMain = () => {
          navigate("/app/missions");
        };

        tg.MainButton.onClick(handleMain);
        return () => {
          if (tg.MainButton && typeof tg.MainButton.hide === 'function' && typeof tg.MainButton.offClick === 'function') {
            tg.MainButton.hide();
            tg.MainButton.offClick(handleMain);
          }
        };
      } else {
        tg.MainButton.hide();
      }
    }
  }, [location.pathname, navigate]);

  // Render Screen Preloader Loader Splash
  // Wait for initial sync – we allow entry even if cloud is still connecting to prevent mobile data hangs
  if (!initSyncCompleted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="w-20 h-20 bg-black/60 rounded-[2.5rem] border border-amber-500/30 flex items-center justify-center mx-auto relative overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <img src={cluevaultLogo} alt="ClueVault Logo" className="w-full h-full object-cover rounded-[2.5rem] p-1 animate-pulse" referrerPolicy="no-referrer" />
            <motion.div 
              className="absolute inset-x-0 h-0.5 bg-amber-500 shadow-[0_0_10px_#f59e0b]"
              animate={{ y: [-40, 40] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">SYNCING CREDENTIALS</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.25em] animate-pulse">Establishing Signal Line...</p>
          </div>

          <AnimatePresence>
            {showBypass && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2"
              >
                <button 
                  onClick={() => setInitSyncCompleted(true)}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-white/40 hover:text-white/60 transition-all active:scale-95"
                >
                  Bypass Signal Latency
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-48 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
            <motion.div 
              className="h-full bg-amber-500 glow-gold" 
              animate={{ x: [-192, 192] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              style={{ width: '48px' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-full bg-black overflow-hidden flex flex-col relative">

      <AnimatePresence>
        {showOnboarding && <OnboardingWizard onComplete={async (data) => {
          finalizeOnboarding(data);
          setShowOnboarding(false);
          // Instantly sync the user state to Supabase so that they aren't reverted to Observation Mode
          try {
            await syncLocalToCloud();
          } catch (err) {
            console.warn("Immediate state synchronization failed:", err);
          }
        }} />}
      </AnimatePresence>

      <AnimatePresence>
        {levelUpData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl overflow-y-auto"
          >
            {/* Background elements */}
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,transparent_70%)] pointer-events-none" />
            
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative z-10 glass rounded-[2.5rem] p-8 max-w-sm w-full text-center border-amber-500/50 glow-gold shadow-2xl bg-black/40"
            >
              {/* Confetti / Sparkle Decor */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center justify-center">
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    className="absolute inset-0 bg-amber-500/10 blur-xl w-32 h-32 -m-8 rounded-full"
                  />
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 rounded-[2.2rem] flex items-center justify-center text-black shadow-lg relative z-10 border border-amber-300">
                    <Award size={48} className="animate-bounce" />
                  </div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 bg-yellow-400 text-black p-1.5 rounded-full z-20 border border-black"
                  >
                    <Sparkles size={16} />
                  </motion.div>
                </div>
              </div>

              <div className="pt-14 mt-2">
                <span className="text-[10px] font-mono tracking-[0.4em] uppercase text-amber-500 font-bold block mb-1">
                  SECURITY CLEARANCE UPGRADE
                </span>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">
                  Level Escalated!
                </h2>
                
                {/* Level Display */}
                <div className="flex items-center justify-center gap-4 bg-white/5 border border-white/5 py-3 px-6 rounded-2xl my-4">
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-bold text-white/30 block leading-tight">PREVIOUS</span>
                    <span className="text-base font-mono text-white/50 line-through">LVL {levelUpData.oldLevel}</span>
                  </div>
                  <ChevronRight className="text-amber-500 animate-pulse animate-none" size={16} />
                  <div className="text-center">
                    <span className="text-[9px] uppercase font-black text-amber-500 block leading-tight animate-pulse animate-none">CURRENT</span>
                    <span className="text-xl font-mono text-amber-400 font-black">LVL {levelUpData.newLevel}</span>
                  </div>
                </div>

                {/* Bracket Reveal */}
                {(() => {
                  const bracket = getClearanceBracket(levelUpData.newLevel);
                  const isNewBracket = getClearanceBracket(levelUpData.oldLevel).name !== bracket.name;
                  return (
                    <div className="mb-6">
                      <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                        CURRENT BRACKET CLASS
                      </div>
                      <div className="text-base font-black text-white uppercase italic tracking-wide flex items-center justify-center gap-2">
                        <span>🛡️</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                          {bracket.name}
                        </span>
                        {isNewBracket && (
                          <span className="text-[8px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase font-sans animate-bounce animate-none">
                            PROMOTED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 mt-1 italic leading-snug px-2">
                        "{bracket.desc}"
                      </p>
                    </div>
                  );
                })()}

                {/* Active Bonus Grid */}
                <div className="space-y-2 text-left mb-6 mx-auto w-full">
                  <div className="text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                    NEW OPERATIONAL STAT BONUSES:
                  </div>

                  {/* Bonus 1: Daily Score Cap */}
                  {(() => {
                    const oldBracket = getClearanceBracket(levelUpData.oldLevel);
                    const newBracket = getClearanceBracket(levelUpData.newLevel);
                    return (
                      <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500 shrink-0" />
                          <div>
                            <div className="text-[9px] font-black text-white uppercase tracking-tight leading-none">Daily Reward Cap</div>
                            <div className="text-[8px] text-white/30 uppercase mt-0.5 font-bold leading-none">Earn cap in earn screen</div>
                          </div>
                        </div>
                        <div className="text-right font-mono text-[10px] leading-none">
                          <span className="text-white/40 line-through mr-1.5">{oldBracket.cap} ZP</span>
                          <span className="text-amber-500 font-black">+{newBracket.cap} ZP</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Bonus 2: Mission EXP Yield */}
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-violet-400 shrink-0" />
                      <div>
                        <div className="text-[9px] font-black text-white uppercase tracking-tight leading-none font-sans">Mission Base EXP</div>
                        <div className="text-[8px] text-white/30 uppercase mt-0.5 font-bold leading-none">Scales with level upgrade</div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[10px] leading-none">
                      <span className="text-white/40 line-through mr-1.5">+{40 + (levelUpData.oldLevel * 5)}</span>
                      <span className="text-violet-400 font-black">+{40 + (levelUpData.newLevel * 5)}</span>
                    </div>
                  </div>

                  {/* Bonus 3: Energy Restore Failsafe */}
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-emerald-400 animate-pulse shrink-0" />
                      <div>
                        <div className="text-[9px] font-black text-white uppercase tracking-tight leading-none">Terminal Energy</div>
                        <div className="text-[8px] text-white/30 uppercase mt-0.5 font-bold leading-none">Payload backup battery</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-black uppercase text-[7.5px] bg-emerald-500/10 px-1.5 py-0.5 rounded leading-none">RESTORED</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Action Button */}
                <button
                  onClick={() => {
                    try {
                      triggerHaptic("medium");
                    } catch (e) {}
                    setLevelUpData(null);
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-black py-4 rounded-2xl font-black uppercase italic active:scale-95 transition-all text-xs tracking-wider shadow-lg shadow-amber-500/10"
                >
                  Authorize Promotion & Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app/*" element={
            <div className="flex-1 flex flex-col relative pb-20 overflow-y-auto min-h-0 scroll-smooth">
              {/* Global App Header */}
              <header className="sticky top-0 z-40 glass-dark border-b border-white/5 py-3 px-5 flex justify-between items-center backdrop-blur-xl">
                <Link to="/app/home" className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30 flex items-center justify-center">
                    <img src={cluevaultLogo} alt="ClueVault" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-200">ClueVault</span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to="/app/wallet" onClick={() => triggerHaptic("light")} className="bg-amber-500/10 hover:bg-amber-500/25 px-2.5 py-1.5 rounded-xl text-amber-500 transition-all border border-amber-500/20 flex items-center gap-1.5">
                    <Coins size={14} className="shrink-0 leading-none" />
                    <span className="text-[10px] font-black italic tracking-tight">{resources.clue ? resources.clue.toFixed(1) : "0.0"}</span>
                  </Link>
                  <Link to="/app/shop" className="bg-white/5 hover:bg-amber-500/10 p-2 rounded-xl text-amber-500 transition-all border border-white/5">
                    <ShoppingCart size={18} />
                  </Link>
                  <Link to="/app/profile" className="relative w-8 h-8 rounded-lg overflow-hidden border border-amber-500/30">
                    <img src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=agent"} alt="Avatar" className="w-full h-full object-cover" />
                    {userId && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-500 border border-black rounded-full shadow-[0_0_8px_#f59e0b] animate-pulse" />
                    )}
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
                <Route path="earn" element={<EarnScreen />} />
                <Route path="wallet" element={<WalletDexScreen />} />
                <Route path="vaults" element={<Navigate to="/app/vault" replace />} />
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("[DIAG] Uncaught startup or runtime error captured in Boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white font-sans">
          <div className="space-y-6 max-w-sm w-full border border-red-500/30 bg-red-950/20 p-8 rounded-3xl backdrop-blur-md">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-500/20 text-3xl">
              ⚠️
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-tight text-red-500 italic">SYSTEM CRASH</h1>
              <p className="text-[10px] text-white/50 leading-relaxed">An unexpected startup or runtime error occurred. We can bypass this to run in offline/cleared mode.</p>
            </div>
            {this.state.error && (
              <pre className="text-[9px] text-red-300/80 bg-black/40 p-3 rounded-xl overflow-x-auto text-left font-mono max-h-32">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="pt-2">
              <button 
                onClick={() => {
                  try {
                    const savedId = localStorage.getItem("cluevault_supabase_id");
                    const onboardingHidden = localStorage.getItem("cluevault_onboarding_hidden");
                    const onboardingSkipped = localStorage.getItem("cluevault_onboarding_skipped");
                    
                    localStorage.clear();
                    
                    if (savedId) {
                      localStorage.setItem("cluevault_supabase_id", savedId);
                    }
                    if (onboardingHidden) {
                      localStorage.setItem("cluevault_onboarding_hidden", onboardingHidden);
                    }
                    if (onboardingSkipped) {
                      localStorage.setItem("cluevault_onboarding_skipped", onboardingSkipped);
                    }
                    console.log("[DIAG] Cleared state cache, but restored user session key:", savedId);
                  } catch (e) {}
                  window.location.reload();
                }} 
                className="w-full py-4 bg-red-600 hover:bg-red-700 active:scale-95 text-[10px] font-black uppercase tracking-wider rounded-2xl transition-all"
              >
                Reset Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function AppInner() {
  const store = useUserStore();

  // Diagnostic Startup Logging
  useEffect(() => {
    console.log("[DIAG] App mounted and active");
    console.log("[DIAG] Router initialized (HashRouter active)");
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      console.log("[DIAG] Telegram SDK detected:", { version: tg.version, platform: tg.platform });
    } else {
      console.log("[DIAG] Telegram SDK not found in window context (Guest Mode)");
    }

    const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log("[DIAG] Supabase configuration status:", { configured: hasSupabase });
    console.log("[DIAG] Auth system initialized:", store.user ? "YES" : "NO");
  }, []);

  // Energy Regeneration
  useEffect(() => {
    const timer = setInterval(() => {
      const energy = store.resources.energy;
      const maxEnergy = store.resources.maxEnergy || 100;
      if (energy < maxEnergy) {
        store.updateResources({ energy: 1 });
      }
    }, 300000); // 5 minutes

    return () => clearInterval(timer);
  }, [store]);

  return (
    <TelegramProvider>
      <TwaAnalyticsProvider
        projectId={import.meta.env.VITE_TELEMETREE_PROJECT_ID || "cluevault-project"}
        apiKey={import.meta.env.VITE_TELEMETREE_API_KEY || "eyJhcHBfbmFtZSI6ImNsdWV2YXVsdCIsImFwcF91cmwiOiJodHRwczovL3QubWUvY2x1ZXZhdWx0Ym90IiwiYXBwX2RvbWFpbiI6Imh0dHBzOi8vY2x1ZS12YXVsdC52ZXJjZWwuYXBwLyJ9!6Y2ufwQNDoAHOR3+U+W/dtYypxTxe5zw8UxBWh11OXc="}
        appName={import.meta.env.VITE_TELEMETREE_APP_NAME || "ClueVault"}
      >
        <SupabaseSyncProvider>
          <GameContext.Provider value={{ 
            user: store.user,
            resources: store.resources,
            crew: store.crew,
            base: store.base,
            unlockedTabs: store.unlockedTabs,
            loading: store.isLoading,
            updateResources: store.updateResources, 
            consumeEnergy: store.consumeEnergy,
            completeMission: store.completeMission, 
            buyItem: store.buyItem,
            claimReferralCommission: store.claimReferralCommission,
            addMockReferral: store.addMockReferral,
            simulateReferralDay: store.simulateReferralDay,
            updateCrewBadge: store.updateCrewBadge,
            joinCrew: store.joinCrew,
            leaveCrew: store.leaveCrew,
            claimDailyReward: store.claimDailyReward,
            riddleState: store.riddleState,
            updateRiddleProgression: store.updateRiddleProgression,
            upgradeBaseRoom: store.upgradeBaseRoom,
            setBaseStyle: store.setBaseStyle,
            finalizeOnboarding: store.finalizeOnboarding,
            triggerHaptic: store.triggerHaptic 
          }}>
            <HashRouter>
              <AppContent />
            </HashRouter>
          </GameContext.Provider>
        </SupabaseSyncProvider>
      </TwaAnalyticsProvider>
    </TelegramProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
