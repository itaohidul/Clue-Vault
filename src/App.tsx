/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, createContext, useContext, Component, ReactNode } from "react";
import { Home, ClipboardList, Shield, Warehouse, Lock, Trophy, User, ShoppingCart, Settings, HelpCircle, Users, Cpu, Coins } from "lucide-react";
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
import TelegramProvider from "./providers/TelegramProvider";
import { useUserStore } from "./store/userStore";
import cluevaultLogo from "./assets/images/cluevault_logo_1779272321887.png";
import SupabaseSyncProvider, { useSupabaseSync } from "./components/SupabaseSyncProvider";

// Simple Game Context
const GameContext = createContext<any>(null);

export const useGame = () => useContext(GameContext);

// Declare types for Telegram WebApp
declare global {
  interface Window {
    Telegram?: any;
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
  const [initSyncCompleted, setInitSyncCompleted] = useState(false);
  const [showBypass, setShowBypass] = useState(false);
  const [dismissedSyncError, setDismissedSyncError] = useState(false);

  const [firstRouteLogged, setFirstRouteLogged] = useState(false);

  // Sync state with Telegram WebApp Backend on load
  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    // Show bypass button after 2.5 seconds of loading
    const bypassTimer = setTimeout(() => {
      setShowBypass(true);
    }, 2500);

    if (tg && tg.initData) {
      console.log("[DIAG] Telegram context detected, initiating handshake...");
      // Extended failsafe for mobile data: reduced to 500ms so shell renders immediately while sync proceeds in background.
      const failSafeTimer = setTimeout(() => {
        console.log("[DIAG] Startup failsafe elapsed (500ms). Rendering shell immediately in background sync mode.");
        setInitSyncCompleted(true);
      }, 500);

      syncWithBackend(tg.initData).then(() => {
        clearTimeout(failSafeTimer);
        clearTimeout(bypassTimer);
        console.log("[DIAG] WebApp handshake success.");
        setInitSyncCompleted(true);
      }).catch((err) => {
        clearTimeout(failSafeTimer);
        console.error("[DIAG] WebApp handshake failed, continuing to shell.", err);
        setInitSyncCompleted(true);
      });
    } else {
      console.log("[DIAG] No Telegram initData, scheduling instant browser mount.");
      const timer = setTimeout(() => {
        setInitSyncCompleted(true);
      }, 200);
      return () => {
        clearTimeout(timer);
        clearTimeout(bypassTimer);
      };
    }
    return () => clearTimeout(bypassTimer);
  }, [syncWithBackend]);

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
    if (tg && location.pathname === "/") {
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

  // Register In-App Interstitial Ad Engine with robust initialization and navigation sync
  useEffect(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 15;
    
    const initAds = () => {
      if (!initSyncCompleted) return;

      const showAd = (window as any).show_11030019;
      if (typeof showAd === "function") {
        try {
          showAd({
            type: 'inApp',
            inAppSettings: {
              frequency: 2,
              capping: 0.1,
              interval: 30,
              timeout: 5,
              everyPage: false
            }
          });
          console.log("ClueVault Ad Engine: Global Telemetry Frequency Active");
        } catch (e) {
          console.warn("Telemetry signal injection failed:", e);
        }
      } else if (attempts < MAX_ATTEMPTS) {
        attempts++;
        setTimeout(initAds, 1000); // Exponential backoff or steady retry for script load
      }
    };

    initAds();
  }, [initSyncCompleted, location.pathname]); // Re-verify on navigation to maintain SDK session in SPA mode

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
                  <Link to="/app/earn" onClick={() => triggerHaptic("light")} className="bg-amber-500/10 hover:bg-amber-500/25 px-2.5 py-1.5 rounded-xl text-amber-500 transition-all border border-amber-500/20 flex items-center gap-1.5">
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
                    localStorage.clear();
                    console.log("[DIAG] Cleared localStorage to bypass crash loop");
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
