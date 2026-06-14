import React, { useState, useEffect } from "react";
import { useTelemetree } from "../../lib/telegramAnalytics";
import { useGame } from "../../App";
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Coins, 
  Key, 
  Layers, 
  TrendingUp, 
  ArrowRightLeft, 
  Info, 
  DollarSign, 
  Lock, 
  CheckCircle2, 
  ChevronRight, 
  AlertTriangle,
  Play,
  HelpCircle,
  Flame,
  Award,
  Circle,
  Sparkles,
  Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { triggerAd } from "../../lib/adEngine";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useLedgerStore } from "../../store/ledgerStore";

// Custom type for swap pairs
interface SwapOption {
  id: string;
  name: string;
  symbol: string;
  icon: any;
  color: string;
  glow: string;
}

// Ultra-Classy 3D Perspective Parallax Tilt Card Component
function TiltCard({ children, className, glowColor = "rgba(245,158,11,0.15)" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    // Calculate cursor position percentage from center (-1 to 1)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    setCoords({ x, y });
  };

  return (
    <motion.div
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setCoords({ x: 0, y: 0 });
      }}
      className={cn("relative transition-all duration-300", className)}
      style={{
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      animate={{
        rotateX: hovered ? -coords.y * 12 : 0,
        rotateY: hovered ? coords.x * 12 : 0,
        scale: hovered ? 1.025 : 1,
        boxShadow: hovered 
          ? `0 20px 40px -15px ${glowColor}, 0 0 50px -10px ${glowColor}` 
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
      transition={{
        type: "spring",
        stiffness: 250,
        damping: 18,
        mass: 0.8
      }}
    >
      <div style={{ transform: "translateZ(15px)" }} className="w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}

export default function WalletDexScreen() {
  const { user, resources, updateResources, triggerHaptic } = useGame();
  const { track } = useTelemetree();
  const { logTransaction } = useSupabaseSync();
  const { addTransaction } = useLedgerStore();
  
  const getTodayStr = () => {
    const tz = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    } catch {
      return new Date().toDateString();
    }
  };
  
  // Tab control: "wallet" (Ledger), "dex" (ClueDeX Swap Platform), or "spin" (USDT Spin section)
  const [activeTab, setActiveTab] = useState<"wallet" | "dex" | "spin">("wallet");

  // Custom dropdown & withdrawal/spin ad overlays
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);



  // Premium spin withdrawals
  const [showPremiumWithdrawModal, setShowPremiumWithdrawModal] = useState(false);
  const [premiumWithdrawAsset, setPremiumWithdrawAsset] = useState<"BTC" | "ETH" | "USDT" | null>(null);
  const [premiumWithdrawAmount, setPremiumWithdrawAmount] = useState<number>(0);
  const [premiumWithdrawUsd, setPremiumWithdrawUsd] = useState<number>(0);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [premiumWithdrawCountdown, setPremiumWithdrawCountdown] = useState(0);
  const [isPremiumWithdrawProcessing, setIsPremiumWithdrawProcessing] = useState(false);
  const [premiumWithdrawSuccess, setPremiumWithdrawSuccess] = useState(false);



  // Premium withdrawal timer countdown simulation
  useEffect(() => {
    let timer: any;
    if (isPremiumWithdrawProcessing && premiumWithdrawCountdown > 0) {
      timer = setInterval(() => {
        setPremiumWithdrawCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Completed! Reset balance and unlock victory signature
            setIsPremiumWithdrawProcessing(false);
            setPremiumWithdrawSuccess(true);
            
            // Log transaction instantly in ledger logs
            if (premiumWithdrawAsset) {
              try {
                logTransaction(-premiumWithdrawAmount, "premium_withdraw", premiumWithdrawAsset);
                addTransaction({ 
                  type: "premium_withdraw", 
                  amount: -premiumWithdrawAmount, 
                  currency: premiumWithdrawAsset.toUpperCase() as any 
                });
                // Trigger ad break (After a successful transaction)
                triggerAd('rewarded');
              } catch (txErr) {
                console.warn("Transaction logging failed on withdraw:", txErr);
              }
            }

            setSpinWinnings(old => {
              if (!premiumWithdrawAsset) return old;
              const next = { ...old, [premiumWithdrawAsset]: 0 };
              localStorage.setItem("cluevault_spin_winnings", JSON.stringify(next));
              return next;
            });

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPremiumWithdrawProcessing, premiumWithdrawCountdown, premiumWithdrawAsset]);

  useEffect(() => {
    track("view_section", { section: activeTab });
  }, [activeTab]);

  // USDT is persisted in localStorage - starts at 0.00 now (removed 150)
  const [usdtBalance, setUsdtBalance] = useState<number>(() => {
    const saved = localStorage.getItem("cluevault_wallet_usdt");
    if (saved === "150.00") return 0.00; // Force reset any old default
    return saved ? parseFloat(saved) : 0.00;
  });

  // BTC/ETH balances
  const [btcBalance, setBtcBalance] = useState<number>(() => {
    const saved = localStorage.getItem("cluevault_wallet_btc");
    return saved ? parseFloat(saved) : 0.00;
  });

  const [ethBalance, setEthBalance] = useState<number>(() => {
    const saved = localStorage.getItem("cluevault_wallet_eth");
    return saved ? parseFloat(saved) : 0.00;
  });

  // USDT Spin Tickets
  const [spinTickets, setSpinTickets] = useState<number>(() => {
    const saved = localStorage.getItem("cluevault_spin_tickets");
    return saved ? parseInt(saved) : 0; // Starts at 0 now so free spins aren't unlimited
  });

  // Track last active free spin local calendar day
  const [lastFreeSpinDate, setLastFreeSpinDate] = useState<string>(() => {
    return localStorage.getItem("cluevault_last_free_spin_date") || "";
  });

  const [isDailyFreeSpinActive, setIsDailyFreeSpinActive] = useState<boolean>(false);

  // Spin Wheel Pending Winnings Ledgers (Only premium BTC, ETH, USDT counts towards the withdrawal milestone)
  const [spinWinnings, setSpinWinnings] = useState<Record<string, number>>(() => {
    let parsed: any = {};
    try {
      const saved = localStorage.getItem("cluevault_spin_winnings");
      parsed = saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse spin winnings:", e);
    }
    return {
      BTC: parsed.BTC || 0,
      ETH: parsed.ETH || 0,
      USDT: parsed.USDT || 0
    };
  });

  // Spin Wheel Pending Game elements Lodged in a Separate direct vault
  const [spinGameWinnings, setSpinGameWinnings] = useState<Record<string, number>>(() => {
    let parsed: any = {};
    try {
      const saved = localStorage.getItem("cluevault_spin_game_winnings");
      parsed = saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse spin game winnings:", e);
    }
    return {
      CLUE: parsed.CLUE || 0,
      ZP: parsed.ZP || 0,
      KEY: parsed.KEY || 0
    };
  });

  const [popupType, setPopupType] = useState<"deposit" | "withdraw" | "swap_success" | "withdraw_winnings_fail" | "withdraw_winnings_success" | null>(null);
  const [swapSuccessDetails, setSwapSuccessDetails] = useState<any | null>(null);

  // Swap State
  const [fromAsset, setFromAsset] = useState<string>("CLUE");
  const [toAsset, setToAsset] = useState<string>("TICKET"); // default swap target is tickets!
  const [fromAmount, setFromAmount] = useState<string>("");
  const [toAmount, setToAmount] = useState<string>("0.00");
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Spin screen states
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [activeSliceResult, setActiveSliceResult] = useState<string | null>(null);
  const [earnedRewardAmount, setEarnedRewardAmount] = useState<number>(0);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [adClaimUnlocked, setAdClaimUnlocked] = useState(false);

  // Mock advertising banners for the simulated unskippable ad
  const AD_SPONSORS = [
    { title: "Decentered Node VPN Service", desc: "Encrypt your physical proxy signature using multi-hop consensus lines.", mockUrl: "decentervpn.node" },
    { title: "Quantum Decrypt Super-rigs", desc: "Rent our level 10 cooling servers to pre-decrypt Zenith vault gates with low fees.", mockUrl: "quantumminer.clue" },
    { title: "Elite Mercenary Bounty Guild", desc: "Hire legendary lvl 9 core operatives to complete hard daily events instantly.", mockUrl: "tacticalbounties.syndicate" }
  ];
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem("cluevault_wallet_usdt", usdtBalance.toFixed(2));
  }, [usdtBalance]);

  useEffect(() => {
    localStorage.setItem("cluevault_wallet_btc", btcBalance.toFixed(8));
  }, [btcBalance]);

  useEffect(() => {
    localStorage.setItem("cluevault_wallet_eth", ethBalance.toFixed(6));
  }, [ethBalance]);

  useEffect(() => {
    localStorage.setItem("cluevault_spin_tickets", spinTickets.toString());
  }, [spinTickets]);

  useEffect(() => {
    localStorage.setItem("cluevault_spin_winnings", JSON.stringify(spinWinnings));
  }, [spinWinnings]);

  useEffect(() => {
    localStorage.setItem("cluevault_spin_game_winnings", JSON.stringify(spinGameWinnings));
  }, [spinGameWinnings]);

  // List of supporting assets with conversion rates in USD (ticket price increased by 5x to 5.00)
  const ASSETS: Record<string, { name: string; symbol: string; icon: any; color: string; glow: string; rate: number; key: string }> = {
    CLUE: { name: "Clue Token", symbol: "CLUE", icon: Coins, color: "text-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.25)]", rate: 0.45, key: "clue" },
    ZP: { name: "Zenith Points", symbol: "ZP", icon: TrendingUp, color: "text-emerald-400", glow: "shadow-[0_0_15px_rgba(52,211,153,0.25)]", rate: 0.000025, key: "coins" },
    ELEMENT: { name: "System Elements", symbol: "ELEMENT", icon: Layers, color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.25)]", rate: 0.15, key: "baseMaterials" },
    KEY: { name: "Crypt Keys", symbol: "KEY", icon: Key, color: "text-violet-400", glow: "shadow-[0_0_15px_rgba(167,139,250,0.25)]", rate: 1.50, key: "keys" },
    USDT: { name: "Tether USDT", symbol: "USDT", icon: DollarSign, color: "text-teal-400", glow: "shadow-[0_0_15px_rgba(45,212,191,0.25)]", rate: 1.00, key: "usdt" },
    BTC: { name: "Bitcoin Ledger", symbol: "BTC", icon: Coins, color: "text-orange-500", glow: "shadow-[0_0_15px_rgba(249,115,22,0.25)]", rate: 65000.00, key: "btc" },
    ETH: { name: "Ethereum Network", symbol: "ETH", icon: Layers, color: "text-indigo-400", glow: "shadow-[0_0_15px_rgba(129,140,248,0.25)]", rate: 3500.00, key: "eth" },
    TICKET: { name: "USDT Spin Ticket", symbol: "TICKET", icon: Layers, color: "text-rose-400", glow: "shadow-[0_0_15px_rgba(244,63,94,0.25)]", rate: 5.00, key: "ticket" }
  };

  const getAssetBalance = (symbol: string): number => {
    if (symbol === "USDT") return usdtBalance;
    if (symbol === "TICKET") return spinTickets;
    if (symbol === "BTC") return btcBalance;
    if (symbol === "ETH") return ethBalance;
    const item = ASSETS[symbol];
    if (!item) return 0;
    return (resources as any)[item.key] || 0;
  };

  // Convert for beautiful formatted listing
  const getDisplayVal = (symbol: string) => {
    const val = getAssetBalance(symbol);
    if (symbol === "USDT") return `${val.toFixed(2)}`;
    if (symbol === "CLUE") return `${val.toFixed(2)}`;
    if (symbol === "ZP") return `${Math.round(val).toLocaleString()}`;
    if (symbol === "BTC") return `${val.toFixed(8)}`;
    if (symbol === "ETH") return `${val.toFixed(6)}`;
    if (symbol === "TICKET") return `${Math.round(val)}`;
    return `${val.toLocaleString()}`;
  };

  // Recalculate target output amount
  useEffect(() => {
    const amt = parseFloat(fromAmount);
    if (isNaN(amt) || amt <= 0) {
      setToAmount("0.00");
      setSwapError(null);
      return;
    }

    const fromRate = ASSETS[fromAsset]?.rate || 0;
    const toRate = ASSETS[toAsset]?.rate || 1;
    
    // Formula: outputValue = (inputValue * fromUsdRate) / toUsdRate
    const formulaOutput = (amt * fromRate) / toRate;
    
    // deduct 0.5% swap routing fee
    const feeImpact = formulaOutput * 0.995;
    
    if (toAsset === "ZP") {
      setToAmount(Math.round(feeImpact).toString());
    } else if (toAsset === "BTC") {
      setToAmount(feeImpact.toFixed(8));
    } else if (toAsset === "ETH") {
      setToAmount(feeImpact.toFixed(6));
    } else if (toAsset === "TICKET") {
      setToAmount(Math.floor(feeImpact).toString());
    } else {
      setToAmount(feeImpact.toFixed(toAsset === "USDT" ? 2 : 4));
    }

    // Live validation
    const currentBal = getAssetBalance(fromAsset);
    if (amt > currentBal) {
      setSwapError(`Insufficient ${fromAsset} payload in physical vault memory.`);
    } else {
      setSwapError(null);
    }
  }, [fromAmount, fromAsset, toAsset]);

  const handleActionClick = (type: "deposit" | "withdraw") => {
    triggerHaptic("medium");
    setPopupType(type);
  };

  const executeSwap = () => {
    const amtNum = parseFloat(fromAmount);
    if (isNaN(amtNum) || amtNum <= 0) return;

    const currentBal = getAssetBalance(fromAsset);
    if (amtNum > currentBal) {
      triggerHaptic("error");
      setSwapError(`Insufficient ${fromAsset} payload in physical vault memory.`);
      return;
    }

    if (fromAsset === toAsset) {
      triggerHaptic("error");
      setSwapError("Selected node loop represents matching source/dest pairs.");
      return;
    }

    triggerHaptic("heavy");
    setIsSwapping(true);

    setTimeout(() => {
      // Complete Swap in local memory/state
      const finalOutput = parseFloat(toAmount);
      
      // 1. Deduct source
      if (fromAsset === "USDT") {
        setUsdtBalance((prev) => prev - amtNum);
      } else if (fromAsset === "TICKET") {
        setSpinTickets((prev) => prev - amtNum);
      } else if (fromAsset === "BTC") {
        setBtcBalance((prev) => prev - amtNum);
      } else if (fromAsset === "ETH") {
        setEthBalance((prev) => prev - amtNum);
      } else {
        const fromKey = ASSETS[fromAsset].key;
        updateResources({ [fromKey]: -amtNum });
      }

      // 2. Add destination
      if (toAsset === "USDT") {
        setUsdtBalance((prev) => prev + finalOutput);
      } else if (toAsset === "TICKET") {
        setSpinTickets((prev) => prev + finalOutput);
      } else if (toAsset === "BTC") {
        setBtcBalance((prev) => prev + finalOutput);
      } else if (toAsset === "ETH") {
        setEthBalance((prev) => prev + finalOutput);
      } else {
        const toKey = ASSETS[toAsset].key;
        updateResources({ [toKey]: finalOutput });
      }

      setIsSwapping(false);
      
      // Log the swap in transaction history (log both sides of the trade)
      logTransaction(-amtNum, "swap", fromAsset);
      logTransaction(finalOutput, "swap", toAsset);
      addTransaction({ type: "swap", amount: -amtNum, currency: fromAsset as any });
      addTransaction({ type: "swap", amount: finalOutput, currency: toAsset as any });

      // Trigger ad break at natural break (After a successful transaction)
      triggerAd('rewarded');
      
      track("token_swap", {
        fromAsset,
        toAsset,
        fromAmount: amtNum,
        toAmount: finalOutput
      });
      setSwapSuccessDetails({
        isSpinReward: false,
        from: { amount: amtNum, symbol: fromAsset },
        to: { amount: finalOutput, symbol: toAsset }
      });
      setPopupType("swap_success");
      setFromAmount("");
      setToAmount("0.00");

      // Trigger ad at the natural break (successful transaction)
      triggerAd('rewarded');
    }, 1500);
  };

  const handleSwapAssets = () => {
    triggerHaptic("light");
    const temp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(temp);
    setFromAmount("");
    setToAmount("0.00");
  };

  // Aggregated value calculations combining standard + BTC + ETH + USDT
  const getAggregatedValue = () => {
    return (
      usdtBalance +
      btcBalance * 65000 +
      ethBalance * 3500 +
      (resources.clue || 0) * 0.45 +
      (resources.coins || 0) * 0.000025 +
      (resources.baseMaterials || 0) * 0.15 +
      (resources.keys || 0) * 1.50
    );
  };

  // Slices configuration for Vector Wheel
  const WHEEL_SLICES = [
    { item: "BTC", color: "#EAB308", bg: "bg-[#EAB308]/10", border: "border-[#EAB308]/30", fontColor: "text-[#EAB308]" },
    { item: "ETH", color: "#627EEA", bg: "bg-[#627EEA]/10", border: "border-[#627EEA]/30", fontColor: "text-[#627EEA]" },
    { item: "CLUE", color: "#FF5100", bg: "bg-[#FF5100]/10", border: "border-[#FF5100]/30", fontColor: "text-[#FF5100]" },
    { item: "USDT", color: "#2DD4BF", bg: "bg-[#2DD4BF]/10", border: "border-[#2DD4BF]/30", fontColor: "text-teal-400" },
    { item: "ZP", color: "#34D399", bg: "bg-[#34D399]/10", border: "border-[#34D399]/30", fontColor: "text-emerald-400" },
    { item: "KEY", color: "#A78BFA", bg: "bg-[#A78BFA]/10", border: "border-[#A78BFA]/30", fontColor: "text-violet-400" }
  ];

  // Calculate total US Dollar value currently won inside the spin buffer (Only premium crypto counts towards the gate)
  const getSpinWinningsTotalValue = () => {
    const btcVal = (spinWinnings.BTC || 0) * 65000;
    const ethVal = (spinWinnings.ETH || 0) * 3500;
    const usdtVal = (spinWinnings.USDT || 0) * 1.0;
    return btcVal + ethVal + usdtVal;
  };

  const totalWonUSDT = getSpinWinningsTotalValue();
  const WITHDRAWAL_GOAL_USDT = 10.00;
  const WITHDRAWAL_GOAL_BTC = 10.00 / 65000;
  const WITHDRAWAL_GOAL_ETH = 10.00 / 3500;
  
  const isUnlockedUSDT = (spinWinnings.USDT || 0) >= WITHDRAWAL_GOAL_USDT;
  const isUnlockedBTC = (spinWinnings.BTC || 0) >= WITHDRAWAL_GOAL_BTC;
  const isUnlockedETH = (spinWinnings.ETH || 0) >= WITHDRAWAL_GOAL_ETH;
  
  const progressPercent = Math.min(100, 
    (( (spinWinnings.USDT || 0) / WITHDRAWAL_GOAL_USDT ) * 33.3) + 
    (( (spinWinnings.BTC || 0) / WITHDRAWAL_GOAL_BTC ) * 33.3) +
    (( (spinWinnings.ETH || 0) / WITHDRAWAL_GOAL_ETH ) * 33.3));
    
  // Executed after unskippable spin ad initialization countdown completes
  const executeRealSpin = (isDailyFree: boolean) => {
    if (isDailyFree) {
      const todayStr = new Date().toDateString();
      setLastFreeSpinDate(todayStr);
      localStorage.setItem("cluevault_last_free_spin_date", todayStr);
      setIsDailyFreeSpinActive(true);
    } else {
      // Deduct ticket
      setSpinTickets(prev => {
        const next = Math.max(0, prev - 1);
        localStorage.setItem("cluevault_spin_tickets", next.toString());
        return next;
      });
      setIsDailyFreeSpinActive(false);
    }

    triggerHaptic("heavy");
    setIsWheelSpinning(true);
    
    // Determine the probability of hitting a premium slice (BTC, ETH, USDT) vs standard
    let premiumChance = 50; // Default 3 premium / 6 total = 50%
    if (totalWonUSDT >= 9.8) {
      premiumChance = 0.1; // Virtually impossible
    } else if (totalWonUSDT >= 9) {
      premiumChance = 1;
    } else if (totalWonUSDT >= 8) {
      premiumChance = 5;
    } else if (totalWonUSDT >= 5) {
      premiumChance = 20;
    }

    const rand = Math.random() * 100;
    let sliceIndex;
    
    if (rand < premiumChance) {
      // Pick one of the premium slots: 0 (BTC), 1 (ETH), 3 (USDT)
      const premiumIndices = [0, 1, 3];
      sliceIndex = premiumIndices[Math.floor(Math.random() * premiumIndices.length)];
    } else {
      // Pick one of the standard slots: 2 (CLUE), 4 (ZP), 5 (KEY)
      const standardIndices = [2, 4, 5];
      sliceIndex = standardIndices[Math.floor(Math.random() * standardIndices.length)];
    }

    const selectedSlice = WHEEL_SLICES[sliceIndex];
    
    // Slices are 60 degrees. Let's aim the needle at 360 minus the slice angle sector.
    const sliceAngle = 360 - (sliceIndex * 60 + 30);
    const extraRotations = 8 * 360; // 8 fast full spins
    const targetDegrees = extraRotations + sliceAngle;
    
    setSpinDegrees(targetDegrees);

    // Swap ad sponsor for next ad
    setCurrentAdIndex(Math.floor(Math.random() * AD_SPONSORS.length));

    setTimeout(() => {
      setIsWheelSpinning(false);
      
      // Calculate and globally decrease rewards half of what they used to get (halved 50%)
      let minAmt = 0;
      let maxAmt = 0;
      const item = selectedSlice.item;
      
      if (item === "BTC") {
        minAmt = 0.00000008; // halved from 0.00000015
        maxAmt = 0.00000025; // halved from 0.00000050
      } else if (item === "ETH") {
        minAmt = 0.0000015; // halved from 0.000003
        maxAmt = 0.0000055; // halved from 0.000011
      } else if (item === "CLUE") {
        minAmt = 0.01;      // halved from 0.02
        maxAmt = 0.04;      // halved from 0.08
      } else if (item === "USDT") {
        minAmt = 0.005;     // halved from 0.01
        maxAmt = 0.035;     // halved from 0.07
      } else if (item === "ZP") {
        minAmt = 150;       // halved from 300
        maxAmt = 600;       // halved from 1200
      } else if (item === "KEY") {
        minAmt = 0.0025;    // halved from 0.005
        maxAmt = 0.010;     // halved from 0.02
      }

      // Calculate dynamic reward multiplier based on proximity to the $10.00 goal
      // As the total value accumulated approaches $10, rewards decrease exponentially.
      // This creates a "Zeno's paradox" effect where they never actually reach $10.00.
      const rewardMultiplier = Math.max(0.001, Math.pow(1 - (totalWonUSDT / 10.00), 2.5));
      
      let wonAmount = (minAmt + Math.random() * (maxAmt - minAmt)) * rewardMultiplier;
      
      // Safety check: Ensure this reward doesn't push them over $10.00
      if (item === "BTC" || item === "ETH" || item === "USDT") {
        const itemVal = item === "BTC" ? 65000 : (item === "ETH" ? 3500 : 1);
        const projectedTotal = totalWonUSDT + (wonAmount * itemVal);
        if (projectedTotal >= 10.00) {
          // Force reward to be only enough to reach 99.9% of the way to the remaining gap
          const remainingGap = 10.00 - totalWonUSDT;
          wonAmount = (remainingGap * 0.9) / itemVal;
        }
      }
      
      let finalReward = 0;
      
      if (item === "ZP") {
        finalReward = Math.round(wonAmount);
      } else if (item === "BTC") {
        finalReward = parseFloat(wonAmount.toFixed(8));
      } else if (item === "ETH") {
        finalReward = parseFloat(wonAmount.toFixed(6));
      } else {
        finalReward = parseFloat(wonAmount.toFixed(4));
      }
      
      setActiveSliceResult(item);
      setEarnedRewardAmount(finalReward);
      
      // Trigger Ad Popups
      triggerHaptic("medium");
      setShowAdPopup(true);
      setAdCountdown(5);
      setAdClaimUnlocked(false);
    }, 4200);
  };

  // Spin rotation handle (Forces real ad at spin initialization)
  const handleStartSpin = (isDailyFree: boolean = false) => {
    if (isWheelSpinning) return;

    // Integrity checks
    if (isDailyFree) {
      const tz = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
      if (lastFreeSpinDate === todayStr) {
        triggerHaptic("error");
        return;
      }
    } else {
      if (spinTickets < 1) {
        triggerHaptic("error");
        return;
      }
    }

    track("spin_started", { isDailyFree });

    triggerHaptic("medium");
    // Use triggerAd for rewarded ad
    triggerAd('rewarded').then(() => {
      executeRealSpin(isDailyFree);
      alert('You have seen an ad!');
    }).catch((e: any) => {
      console.error("Spin ad engine error:", e);
      // Execute anyway as fallback to maintain UX
      executeRealSpin(isDailyFree);
    });
  };

  // Countdown clock control for Simulated Unskippable Ad
  useEffect(() => {
    let timer: any;
    if (showAdPopup && adCountdown > 0) {
      timer = setInterval(() => {
        setAdCountdown(prev => {
          if (prev <= 1) {
            setAdClaimUnlocked(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAdPopup, adCountdown]);

  const handleClaimReward = () => {
    if (!adClaimUnlocked || !activeSliceResult) return;
    triggerHaptic("success");
    
    track("spin_reward_claimed", {
      rewardAsset: activeSliceResult,
      rewardAmount: earnedRewardAmount,
      isPremiumCrypto: activeSliceResult === "BTC" || activeSliceResult === "ETH" || activeSliceResult === "USDT"
    });

    // Check if the result is premium crypto
    const isCrypto = activeSliceResult === "BTC" || activeSliceResult === "ETH" || activeSliceResult === "USDT";
    
    if (isCrypto) {
      setSpinWinnings(prev => {
        const updated = {
          ...prev,
          [activeSliceResult]: (prev[activeSliceResult] || 0) + earnedRewardAmount
        };
        localStorage.setItem("cluevault_spin_winnings", JSON.stringify(updated));
        return updated;
      });
    } else {
      setSpinGameWinnings(prev => {
        const updated = {
          ...prev,
          [activeSliceResult]: (prev[activeSliceResult] || 0) + earnedRewardAmount
        };
        localStorage.setItem("cluevault_spin_game_winnings", JSON.stringify(updated));
        return updated;
      });
    }

    // Save free spin date on successful claim of the daily free spin
    if (isDailyFreeSpinActive) {
      const todayStr = new Date().toDateString();
      setLastFreeSpinDate(todayStr);
      localStorage.setItem("cluevault_last_free_spin_date", todayStr);
      setIsDailyFreeSpinActive(false);
    }

    setShowAdPopup(false);
    setPopupType("swap_success");
    setSwapSuccessDetails({
      isSpinReward: true,
      from: { amount: 1, symbol: isDailyFreeSpinActive ? "DAILY SPIN" : "TICKET" },
      to: { amount: earnedRewardAmount, symbol: activeSliceResult }
    });
    
    // Smooth reset degree
    setSpinDegrees(prev => prev % 360);
  };

  // Triggers separate withdrawal flow of BTC, ETH, or USDT achieved from spin wheel
  const handleTriggerWithdraw = (asset: "BTC" | "ETH" | "USDT", amount: number, usdValue: number) => {
    triggerHaptic("medium");
    setPremiumWithdrawAsset(asset);
    setPremiumWithdrawAmount(amount);
    setPremiumWithdrawUsd(usdValue);
    setDestinationAddress("");
    setPremiumWithdrawCountdown(0);
    setIsPremiumWithdrawProcessing(false);
    setPremiumWithdrawSuccess(false);
    setShowPremiumWithdrawModal(true);
  };

  // Direct element conversion for in-game elements (bypasses milestone lock)
  const handleWithdrawGameWinnings = () => {
    triggerHaptic("success");
    
    updateResources({
      clue: (spinGameWinnings.CLUE || 0),
      coins: (spinGameWinnings.ZP || 0),
      keys: (spinGameWinnings.KEY || 0)
    });
    
    // Log spin rewards transaction for all currencies hitting main balance
    if (spinGameWinnings.ZP > 0) {
      logTransaction(spinGameWinnings.ZP, "spin_reward", "ZP");
      addTransaction({ type: "spin_reward", amount: spinGameWinnings.ZP, currency: "ZP" });
    }
    if (spinGameWinnings.CLUE > 0) {
      logTransaction(spinGameWinnings.CLUE, "spin_reward", "CLUE");
      addTransaction({ type: "spin_reward", amount: spinGameWinnings.CLUE, currency: "CLUE" });
    }
    if (spinGameWinnings.KEY > 0) {
      logTransaction(spinGameWinnings.KEY, "spin_reward", "KEY");
      addTransaction({ type: "spin_reward", amount: spinGameWinnings.KEY, currency: "KEY" });
    }

    // Reset game currency buffer
    setSpinGameWinnings({
      CLUE: 0,
      ZP: 0,
      KEY: 0
    });

    triggerHaptic("heavy");
    setPopupType("withdraw_winnings_success");
  };

  // Consolidates premium spin winnings into primary active wallet balances once threshold is reached
  // (Disabled as per user request to separate withdrawal limits)
  const handleConsolidatePremiumWinnings = () => {
    return;
  };

  return (
    <div className="p-5 pb-24 space-y-6 text-left">
      
      {/* Tab select header (Now features three dedicated, high-contrast sections) */}
      <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-2xl border border-white/5 gap-1.5">
        <button
          onClick={() => { triggerHaptic("light"); setActiveTab("wallet"); }}
          className={cn(
            "flex-1 py-2.5 text-[9px] font-black uppercase italic tracking-wider rounded-xl transition-all cursor-pointer text-center",
            activeTab === "wallet" 
              ? "bg-amber-500 text-black shadow-md glow-gold" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          Clue Wallet
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setActiveTab("dex"); }}
          className={cn(
            "flex-1 py-2.5 text-[9px] font-black uppercase italic tracking-wider rounded-xl transition-all cursor-pointer text-center",
            activeTab === "dex" 
              ? "bg-blue-500 text-black shadow-md glow-blue" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          ClueDeX Swap
        </button>
        <button
          onClick={() => { triggerHaptic("light"); setActiveTab("spin"); }}
          className={cn(
            "flex-1 py-2.5 text-[9px] font-black uppercase italic tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer text-center",
            activeTab === "spin" 
              ? "bg-rose-500 text-white border border-rose-400 shadow-md glow-emerald" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          )}
        >
          <span className="w-1 h-1 rounded-full bg-[#f43f5e] animate-pulse shrink-0" />
          ClueSPIN
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "wallet" ? (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header section with high tech indicator */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Decentralized Secure Ledger</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">Clue Wallet</h1>
              <p className="text-sm text-white/50 italic font-medium leading-relaxed">View cryptographically secured assets and swap signals instant consensus.</p>
            </div>

            {/* Primary Cyber Wallet Panel with 3D physical parallax scale */}
            <TiltCard className="overflow-hidden glass rounded-[2.5rem] p-6 border-amber-500/10 bg-gradient-to-br from-[#121214] via-black to-black space-y-6" glowColor="rgba(245, 158, 11, 0.2)">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.25em] block mb-1">AGGREGATED SECURE VALUE</span>
                  <span className="text-3xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-200">
                    ${getAggregatedValue().toFixed(2)}
                  </span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE SYNCING
                </span>
              </div>

              {/* Big Actions */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => handleActionClick("deposit")}
                  className="flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 font-black italic uppercase text-[10px] tracking-wider text-black rounded-2xl transition-all active:scale-95 cursor-pointer shadow-md glow-gold"
                >
                  <ArrowDownLeft size={16} />
                  Deposit Funds
                </button>
                <button
                  onClick={() => handleActionClick("withdraw")}
                  className="flex items-center justify-center gap-2 py-4 bg-white/5 border border-white/10 hover:bg-white/10 font-black italic uppercase text-[10px] tracking-wider text-white rounded-2xl transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowUpRight size={16} />
                  Withdraw Core
                </button>
              </div>
            </TiltCard>

            {/* In-Game Assets Grid */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Vault Inventory Ledger</h3>
                <span className="text-[7.5px] font-mono font-bold text-white/20 uppercase tracking-widest">Interactive 3D Grid</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                {Object.entries(ASSETS).map(([symbol, detail], index) => {
                  const IconComp = detail.icon;
                  // Specially designed futuristic continuous SVG trend signals
                  const SPARKLINE_DATA: Record<string, string> = {
                    BTC: "M 0 15 Q 15 -4 30 14 T 60 -12 T 85 8 T 100 -14",
                    ETH: "M 0 12 Q 15 15 30 2 T 60 16 T 85 -5 T 100 -12",
                    CLUE: "M 0 10 Q 15 20 35 6 T 65 14 T 85 2 T 100 -8",
                    USDT: "M 0 8 L 20 8 L 40 8 L 60 8 L 80 8 L 100 8",
                    ZP: "M 0 16 Q 20 4 40 18 T 70 -6 T 90 12 T 100 -18",
                    KEY: "M 0 8 Q 15 18 30 5 T 60 12 T 85 -8 T 100 -2",
                    ELEMENT: "M 0 14 Q 20 8 40 12 T 70 2 T 90 9 T 100 0",
                    TICKET: "M 0 12 Q 15 3 35 15 T 65 -5 T 85 10 T 100 -8"
                  };
                  return (
                    <motion.div 
                      key={symbol}
                      initial={{ opacity: 0, scale: 0.9, rotateX: 10, rotateY: -5, y: 15 }}
                      whileInView={{ opacity: 1, scale: 1, rotateX: 0, rotateY: 0, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ 
                        type: "spring",
                        stiffness: 70,
                        damping: 14,
                        delay: index * 0.03 
                      }}
                      whileHover={{ 
                        scale: 1.03, 
                        rotateX: -4, 
                        rotateY: 4, 
                        translateZ: 12,
                        boxShadow: "0 20px 40px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.12)"
                      }}
                      style={{ 
                        transformStyle: "preserve-3d", 
                        perspective: 1200 
                      }}
                      className="relative overflow-hidden group rounded-3xl p-4.5 border border-white/5 bg-gradient-to-br from-[#101115] via-[#090a0c] to-[#040506] hover:border-white/10 transition-colors cursor-default"
                    >
                      {/* Radial dynamic background glowing halo */}
                      <div 
                        className={cn(
                          "absolute -right-6 -bottom-6 w-24 h-24 rounded-full filter blur-[24px] opacity-15 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none",
                          detail.color.replace("text-", "bg-")
                        )} 
                      />

                      {/* Sparkline trend vector overlay */}
                      <div className="absolute inset-x-0 bottom-0 h-14 opacity-25 group-hover:opacity-45 transition-opacity duration-500 pointer-events-none">
                        <svg viewBox="0 0 100 20" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id={`gradLine-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor={symbol === "BTC" ? "#F7931A" : symbol === "ETH" ? "#627EEA" : symbol === "CLUE" ? "#F59E0B" : symbol === "USDT" ? "#2DD4BF" : symbol === "ZP" ? "#34D399" : symbol === "KEY" ? "#A78BFA" : symbol === "TICKET" ? "#F43F5E" : "#3b82f6"} stopOpacity="0.3" />
                              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* Shadow fill path */}
                          <path
                            d={`${SPARKLINE_DATA[symbol] || "M 0 10 Q 50 2 100 10"} L 100 20 L 0 20 Z`}
                            fill={`url(#gradLine-${symbol})`}
                          />
                          {/* Main stroke line path */}
                          <path
                            d={SPARKLINE_DATA[symbol] || "M 0 10 Q 50 2 100 10"}
                            fill="none"
                            stroke={symbol === "BTC" ? "#F7931A" : symbol === "ETH" ? "#627EEA" : symbol === "CLUE" ? "#F59E0B" : symbol === "USDT" ? "#2DD4BF" : symbol === "ZP" ? "#34D399" : symbol === "KEY" ? "#A78BFA" : symbol === "TICKET" ? "#F43F5E" : "#3b82f6"}
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            className="animate-pulse"
                          />
                        </svg>
                      </div>

                      <div className="flex items-center justify-between relative z-10" style={{ transform: "translateZ(20px)" }}>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2.5 rounded-xl bg-white/5 border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner relative overflow-hidden", detail.color)}>
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/10 pointer-events-none" />
                            <IconComp size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-neutral-200 transition-colors">{detail.name}</h4>
                              {symbol === "TICKET" && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[6px] font-black tracking-widest font-mono uppercase">SPIN-KEY</span>
                              )}
                            </div>
                            <span className="text-[8px] font-mono font-bold text-white/30 uppercase">Rate: ${detail.rate >= 1000 ? detail.rate.toLocaleString() : detail.rate.toFixed(4)}/u</span>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end">
                          <div className="text-xs font-mono font-black text-white italic tracking-tight">
                            {getDisplayVal(symbol)} <span className="text-[9px] text-white/40 not-italic font-sans">{symbol}</span>
                          </div>
                          <div className="text-[8.5px] font-mono font-bold text-white/30 group-hover:text-emerald-400 transition-colors">
                            ~${(getAssetBalance(symbol) * detail.rate).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Separate Withdrawal Gateways with a $10 minimum threshold check for BTC, ETH, and USDT achieved from spin wheel */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pl-1">
                <ArrowRightLeft size={16} className="text-amber-500" />
                <h3 className="text-sm font-black uppercase italic tracking-tight text-white">Premium Crypto Withdrawals</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["BTC", "ETH", "USDT"] as const).map((asset) => {
                  const amount = spinWinnings[asset] || 0;
                  const rate = ASSETS[asset]?.rate || 1;
                  const usdValue = amount * rate;
                  const hasReachedThreshold = usdValue >= 10.00;
                  const progress = Math.min(100, (usdValue / 10.00) * 100);

                  return (
                    <div key={asset}>
                      <TiltCard
                        className="glass rounded-3xl p-5 border border-white/5 bg-[#09090b] flex flex-col justify-between space-y-4 h-full"
                        glowColor={asset === "BTC" ? "rgba(245, 158, 11, 0.15)" : asset === "ETH" ? "rgba(99, 126, 234, 0.15)" : "rgba(45, 212, 191, 0.15)"}
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", ASSETS[asset]?.color)}>
                              {ASSETS[asset]?.name}
                            </span>
                            <span className="text-[8px] font-mono font-bold text-white/30 uppercase bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                              Spin Pool
                            </span>
                          </div>
                          <div className="text-lg font-mono font-black text-white italic truncate pt-1">
                            {amount.toFixed(asset === "BTC" ? 8 : asset === "ETH" ? 6 : 4)}
                            <span className="text-[9px] text-white/40 not-italic ml-1">{asset}</span>
                          </div>
                          <div className="text-[10px] font-mono text-white/40 font-bold">
                            Current Value: <span className="text-white">${usdValue.toFixed(2)} USD</span>
                          </div>
                        </div>

                        {/* Threshold status metrics */}
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <div className="flex justify-between text-[8px] font-mono font-bold uppercase text-white/30">
                            <span>Withdrawal threshold goal</span>
                            <span className={cn(hasReachedThreshold ? "text-emerald-400 font-black animate-pulse" : "text-white/40")}>
                              ${usdValue.toFixed(2)} / $10.00
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-500", hasReachedThreshold ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500")}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTriggerWithdraw(asset, amount, usdValue)}
                          disabled={!hasReachedThreshold}
                          className={cn(
                            "w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider italic flex items-center justify-center gap-1 outline-none border cursor-pointer active:scale-95 transition-all",
                            hasReachedThreshold
                              ? "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-600 glow-emerald"
                              : "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                          )}
                        >
                          {hasReachedThreshold ? "Trigger Outbound Disbursal" : "Min $10.00 Required"}
                        </button>
                      </TiltCard>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : activeTab === "dex" ? (
          <motion.div
            key="dex"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header section with high tech indicator */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Decentralized Atomic Swap Ledger</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">ClueDeX Exchange</h1>
              <p className="text-sm text-white/50 italic font-medium leading-relaxed">Exchange tokens instantly with zero security delay or dynamic gas nodes. Ticket conversions are priced at a 5x premium.</p>
            </div>

            {/* ClueDex Swap Platform (3D Tilt Card console with Custom 3D Dropdown dropdowns) */}
            <TiltCard className="glass rounded-[2.5rem] p-6 border border-blue-500/20 bg-gradient-to-br from-[#0c0d12] via-black to-[#050608] space-y-5" glowColor="rgba(59, 130, 246, 0.15)">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-1.5">
                  <ArrowRightLeft size={16} className="text-blue-400" />
                  <h3 className="text-sm font-black uppercase italic tracking-tight text-white">ClueDex Swap</h3>
                </div>
                <span className="text-[8px] font-mono font-bold uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Consensus Exchange</span>
              </div>

              <div className="space-y-3">
                {/* FROM INPUT CARD */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2 relative">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/30">
                    <label>Swap From</label>
                    <span className="font-mono">Vault Max: {getDisplayVal(fromAsset)} {fromAsset}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.00"
                      className="bg-transparent text-lg font-mono font-black outline-none text-white w-full italic"
                    />

                    {/* Highly polished tactile 3D custom dropdown trigger */}
                    <button
                      type="button"
                      onClick={() => { triggerHaptic("medium"); setShowFromSelector(true); }}
                      className="bg-white/5 border border-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-95 transition-all rounded-xl px-3 py-2 text-xs font-black uppercase italic tracking-wider text-amber-500 outline-none flex items-center gap-1.5 cursor-pointer"
                    >
                      {fromAsset}
                      <svg className="w-3 h-3 text-amber-500 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Percentage shortcuts */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    {["25%", "50%", "75%", "MAX"].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          const bal = getAssetBalance(fromAsset);
                          if (pct === "MAX") {
                            setFromAmount(bal.toString());
                          } else {
                            const decimal = parseFloat(pct) / 100;
                            setFromAmount((bal * decimal).toFixed(fromAsset === "ZP" ? 0 : 4));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-[8px] font-bold text-white/50 hover:text-white cursor-pointer"
                      >
                        {pct}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SWAP TOGGLE / SECURITY GATE LOCK */}
                {!(fromAsset === "USDT" || fromAsset === "BTC" || fromAsset === "ETH") ? (
                  <div className="flex justify-center -my-1.5 relative z-10">
                    <button
                      onClick={handleSwapAssets}
                      className="w-8 h-8 rounded-full bg-blue-500 text-black border border-blue-300 shadow-[0_0_10px_#3b82f6] flex items-center justify-center transition-transform active:rotate-180 cursor-pointer"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-center -my-1.5 relative z-10">
                    <div 
                      title="USDT, BTC and ETH can only be swapped out, not into."
                      className="w-8 h-8 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center text-rose-500 shadow-xl"
                    >
                      <Lock size={12} className="animate-pulse" />
                    </div>
                  </div>
                )}

                {/* TO INPUT CARD */}
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-white/30">
                    <label>Swap To (Estimated output)</label>
                    <span className="font-mono">Inventory: {getDisplayVal(toAsset)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-mono font-black text-white/40 italic">{toAmount}</span>

                    {/* Highly polished tactile 3D custom dropdown trigger */}
                    <button
                      type="button"
                      onClick={() => { triggerHaptic("medium"); setShowToSelector(true); }}
                      className="bg-white/5 border border-white/10 hover:border-white/20 hover:scale-[1.03] active:scale-95 transition-all rounded-xl px-3 py-2 text-xs font-black uppercase italic tracking-wider text-blue-400 outline-none flex items-center gap-1.5 cursor-pointer"
                    >
                      {toAsset}
                      <svg className="w-3 h-3 text-blue-400 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Error notification */}
              {swapError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-2xl flex items-center gap-2 text-[9px] font-sans font-medium text-rose-400">
                  <AlertTriangle size={14} className="shrink-0 text-rose-500" />
                  <span>{swapError}</span>
                </div>
              )}

              {/* Route Exchange Details */}
              {!swapError && fromAmount && (
                <div className="p-3 bg-white/5 border border-white/5 rounded-2xl space-y-1.5 text-[9px] text-white/50 font-mono">
                  <div className="flex justify-between">
                    <span>Rate Consensual Match</span>
                    <span>1 {fromAsset} ≈ {((ASSETS[fromAsset]?.rate || 0) / (ASSETS[toAsset]?.rate || 1)).toFixed(5)} {toAsset}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dynamic gas Fee (0.5%)</span>
                    <span className="text-blue-400">-{ (parseFloat(toAmount) * 0.005).toFixed(toAsset === "ZP" ? 0 : 4) } {toAsset}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-1.5 font-bold text-white">
                    <span>Slippage Safeguard</span>
                    <span>Enabled</span>
                  </div>
                </div>
              )}

              {/* Execution trigger */}
              <button
                onClick={executeSwap}
                disabled={isSwapping || !!swapError || !fromAmount}
                className={cn(
                  "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-2 outline-none border cursor-pointer",
                  !fromAmount || !!swapError || isSwapping
                    ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-black border-blue-400/30 glow-blue active:scale-95"
                )}
              >
                {isSwapping ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-black" />
                    Routing Consensus Blockchain Lock...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft size={14} />
                     Verify & Swap Asset
                  </>
                )}
              </button>
            </TiltCard>
          </motion.div>
        ) : (
          <motion.div
            key="spin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-center"
          >
            {/* Header section */}
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Isolator Quantum Wheel</span>
              </div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">ClueSPIN</h1>
              <p className="text-sm text-white/50 italic font-medium leading-relaxed font-sans">Exchange standard gaming tokens for tickets in DEX. Claim ultra jackpot tokens at a fraction of standard cost with higher stability and zero starting credentials.</p>
            </div>

            {/* Symmetrical Dual Modes: Daily Spin Status vs standard Tickets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Daily Free Spin Status Card */}
              <TiltCard className="rounded-[2rem] p-4 border border-amber-500/20 bg-neutral-950/80 text-left flex flex-col justify-between" glowColor="rgba(245, 158, 11, 0.15)">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                      <Flame size={18} className={lastFreeSpinDate !== getTodayStr() ? "animate-pulse" : ""} />
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-amber-500 uppercase tracking-widest block font-sans">Quantum Charge</span>
                      <span className="text-xs font-black text-white italic font-sans">Daily Free Spin</span>
                    </div>
                  </div>
                  <div>
                    {lastFreeSpinDate === getTodayStr() ? (
                      <span className="text-[7px] font-mono font-bold text-white/40 border border-white/10 px-2 py-0.5 rounded uppercase font-sans">CLAIMED</span>
                    ) : (
                      <span className="text-[7px] font-mono font-bold text-[#eab308] border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 rounded uppercase animate-pulse font-sans">READY</span>
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between">
                  <span className="text-[8px] text-white/40 uppercase font-sans">Resets calendar day</span>
                  {lastFreeSpinDate === getTodayStr() ? (
                    <span className="text-[8px] font-mono text-white/30 italic font-sans">Next active tomorrow</span>
                  ) : (
                    <button
                      onClick={() => handleStartSpin(true)}
                      disabled={isWheelSpinning}
                      className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded transition-all hover:bg-amber-500 hover:text-black cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      Spin Free
                    </button>
                  )}
                </div>
              </TiltCard>

              {/* Tickets counter */}
              <TiltCard className="rounded-[2rem] p-4 border border-rose-500/20 bg-neutral-950/80 text-left flex flex-col justify-between" glowColor="rgba(244, 63, 94, 0.15)">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                      <Coins size={18} />
                    </div>
                    <div>
                      <span className="text-[7.5px] font-bold text-rose-400 uppercase tracking-widest block font-sans">Inventory Nodes</span>
                      <span className="text-xs font-black text-white italic font-sans">USDT Spin Tickets</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-mono font-black text-rose-400 leading-none">{spinTickets}</span>
                    <span className="text-[7px] text-white/30 uppercase font-bold block font-sans">TICKETS</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between font-sans">
                  <span className="text-[8px] text-white/40 uppercase font-sans">Swap in Dex for more Keys</span>
                  {spinTickets > 0 ? (
                    <button
                      onClick={() => handleStartSpin(false)}
                      disabled={isWheelSpinning}
                      className="text-[8px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded transition-all hover:bg-rose-500 hover:text-white cursor-pointer"
                    >
                      Spin Ticket
                    </button>
                  ) : (
                    <span className="text-[8px] font-bold text-[#f43f5e]/50 uppercase font-sans animate-pulse">DEX Swap Required</span>
                  )}
                </div>
              </TiltCard>
            </div>

            {/* The Visual Spin Wheel Container */}
            <div 
              className="relative py-8 flex flex-col items-center justify-center overflow-visible"
              style={{ perspective: 1200 }}
            >
              
              {/* Outer classic 3D-angled wooden/brass Casing frame for authentic Roulette experience */}
              <div 
                className="relative w-80 h-80 rounded-full border-[14px] border-neutral-800 bg-gradient-to-br from-[#1a1b20] via-[#2e303a] to-[#0c0d11] flex items-center justify-center overflow-hidden transition-all duration-300"
                style={{
                  transform: "rotateY(-5deg) rotateX(15deg)",
                  transformStyle: "preserve-3d",
                  boxShadow: "0 25px 50px rgba(0,0,0,0.9), inset 0 2px 8px rgba(255,255,255,0.18)"
                }}
              >
                {/* 3D Glass shine layer reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none z-10 rounded-full" />
                
                {/* Inner track golden brass ring defining standard croupier ball track */}
                <div className="absolute w-[18.2rem] h-[18.2rem] rounded-full border-2 border-[#d4af37]/15 pointer-events-none" />

                {/* SVG Spinning Wheel */}
                <div 
                  className="w-72 h-72 rounded-full relative flex items-center justify-center"
                  style={{
                    transform: `rotate(${spinDegrees}deg)`,
                    transition: isWheelSpinning ? "transform 4.8s cubic-bezier(0.12, 0.8, 0.15, 1)" : "none",
                    transformStyle: "preserve-3d"
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <defs>
                      <linearGradient id="goldCap" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffe79a" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#876821" />
                      </linearGradient>
                      <linearGradient id="silverSpoke" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="50%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#334155" />
                      </linearGradient>

                      {/* Luxurious radial gradients for each slice sector to add depth */}
                      <radialGradient id="grad-BTC" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#2e2001" />
                        <stop offset="100%" stopColor="#eab308" />
                      </radialGradient>
                      <radialGradient id="grad-ETH" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#12183b" />
                        <stop offset="100%" stopColor="#4c66e2" />
                      </radialGradient>
                      <radialGradient id="grad-CLUE" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#401402" />
                        <stop offset="100%" stopColor="#ff5100" />
                      </radialGradient>
                      <radialGradient id="grad-USDT" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#073029" />
                        <stop offset="100%" stopColor="#1cb5a0" />
                      </radialGradient>
                      <radialGradient id="grad-ZP" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#063d21" />
                        <stop offset="100%" stopColor="#25bd7a" />
                      </radialGradient>
                      <radialGradient id="grad-KEY" cx="50%" cy="50%" r="50%">
                        <stop offset="20%" stopColor="#0a0a0d" />
                        <stop offset="70%" stopColor="#201540" />
                        <stop offset="100%" stopColor="#8751e0" />
                      </radialGradient>
                    </defs>

                    {/* Render Slices */}
                    {WHEEL_SLICES.map((slice, idx) => {
                      const startAngle = idx * 60;
                      const endAngle = (idx + 1) * 60;
                      // Path calculation for 60deg arc pie chart slice
                      const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
                      const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
                      const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
                      const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
                      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
                      
                      return (
                        <g key={slice.item}>
                          {/* Segment Sector Arc using rich metallic gradient */}
                          <path 
                            d={pathData} 
                            fill={`url(#grad-${slice.item})`}
                            stroke="#0a0b0e"
                            strokeWidth="1.2"
                          />
                          {/* Golden Inner Pocket Rim highlight */}
                          <path
                            d={`M ${x1 * 0.9 + 5} ${y1 * 0.9 + 5} A 40 40 0 0 1 ${x2 * 0.9 + 5} ${y2 * 0.9 + 5}`}
                            fill="none"
                            stroke="rgba(212,175,55,0.4)"
                            strokeWidth="0.8"
                          />
                        </g>
                      );
                    })}

                    {/* Highly polished golden dividers spoke lines radiating from center */}
                    {WHEEL_SLICES.map((slice, idx) => {
                      const angle = idx * 60;
                      const spokesX = 50 + 50 * Math.cos((Math.PI * angle) / 180);
                      const spokesY = 50 + 50 * Math.sin((Math.PI * angle) / 180);
                      return (
                        <line 
                          key={`boundary-${idx}`}
                          x1="50" 
                          y1="50" 
                          x2={spokesX} 
                          y2={spokesY} 
                          stroke="#d4af37" 
                          strokeWidth="0.8"
                          strokeOpacity="0.75"
                        />
                      );
                    })}

                    {/* Outer Wheel concentric rim ring */}
                    <circle cx="50" cy="50" r="49" fill="none" stroke="#d4af37" strokeWidth="1" strokeOpacity="0.4" />
                    <circle cx="50" cy="50" r="47.5" fill="none" stroke="#000000" strokeWidth="0.8" strokeOpacity="0.6" />

                    {/* Spherical brass separator pins around the roulette rim */}
                    {WHEEL_SLICES.map((slice, idx) => {
                      const angle = idx * 60;
                      const pinRadius = 45.2; // 90% radius
                      const pinX = 50 + pinRadius * Math.cos((Math.PI * angle) / 180);
                      const pinY = 50 + pinRadius * Math.sin((Math.PI * angle) / 180);
                      return (
                        <circle 
                          key={`brass-pin-${idx}`}
                          cx={pinX}
                          cy={pinY}
                          r="1.5"
                          fill="url(#goldCap)"
                          stroke="#000000"
                          strokeWidth="0.4"
                        />
                      );
                    })}

                    {/* Authentic 3D text labeling layer directly inside the SVG, making sure text aligns perfectly on the slice */}
                    {WHEEL_SLICES.map((slice, idx) => {
                      const angle = idx * 60 + 30; // Centered inside the 60deg arc
                      return (
                        <g key={`label-${slice.item}`} transform={`rotate(${angle}, 50, 50)`}>
                          {/* Miniature Coin Badge Graphic */}
                          <circle
                            cx="66"
                            cy="50"
                            r="4.2"
                            fill="#0c0d12"
                            stroke={slice.color}
                            strokeWidth="0.9"
                            style={{ filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.7))" }}
                          />
                          {/* Inner initial of asset */}
                          <text
                            x="66"
                            y="50.3"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={slice.color}
                            fontSize="4.2"
                            fontWeight="1000"
                            fontFamily="sans-serif"
                          >
                            {slice.item === "USDT" ? "T" : slice.item[0]}
                          </text>

                          {/* Beautiful bold curved text perpendicular to slice axis, reads as genuine roulette numbers */}
                          <text
                            x="82"
                            y="50"
                            transform="rotate(90, 82, 50)"
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="#ffffff"
                            fontSize="5.8"
                            fontWeight="1000"
                            fontFamily="'Space Grotesk', system-ui, sans-serif"
                            letterSpacing="0.04em"
                            style={{
                              paintOrder: "stroke fill",
                              stroke: "#090a0d",
                              strokeWidth: "1.6px",
                              strokeLinejoin: "round",
                              filter: "drop-shadow(0px 1.5px 2.5px rgba(0,0,0,0.95))"
                            }}
                          >
                            {slice.item}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  {/* Stunning mechanical 3D metallic central Spindle Core with 4 chrome spokes */}
                  <div className="absolute w-[3.5rem] h-[3.5rem] rounded-full bg-gradient-to-br from-neutral-600 via-neutral-800 to-neutral-950 border-[3.5px] border-neutral-700 z-12 shadow-2xl flex items-center justify-center">
                    
                    {/* Golden central dome */}
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 via-amber-500 to-amber-700 border border-amber-600/60 flex items-center justify-center shadow-lg relative">
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-white/40 top-0.5 left-0.5" />
                    </div>

                    {/* Classic 4-pronged silver wheel spokes/handles */}
                    {[0, 90, 180, 270].map((deg) => (
                      <div 
                        key={deg}
                        className="absolute w-[3px] h-6 bg-gradient-to-r from-neutral-600 to-neutral-300 origin-center"
                        style={{
                          transform: `rotate(${deg}deg) translateY(-11px)`,
                          borderRadius: "1px",
                          boxShadow: "0 1px 1px rgba(0,0,0,0.3)"
                        }}
                      >
                        {/* Metallic brass tip node on each spindle prong */}
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 absolute -top-1 -left-[1.5px] border border-amber-700/50 shadow" />
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Arrow Pointer needle (Stays centered at top pointing down, outside of 3D tilt frame for parallax) */}
              <div className="absolute top-6 left-1/2 -ml-3.5 z-20 w-7 h-9 pointer-events-none">
                <motion.div 
                  className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[20px] border-t-rose-500 drop-shadow-[0_0_15px_#f43f5e]"
                  animate={isWheelSpinning ? {
                    rotate: [0, -18, 14, -15, 10, -6, 0],
                    scaleY: [1, 0.9, 1.1, 0.95, 1]
                  } : { rotate: 0, scaleY: 1 }}
                  transition={isWheelSpinning ? {
                    repeat: Infinity,
                    duration: 0.28,
                    ease: "easeInOut"
                  } : { type: "spring", stiffness: 350, damping: 12 }}
                />
              </div>

              {/* Classy target prediction indicator overlay */}
              <div className="mt-5 px-4 py-2 rounded-2xl bg-[#111115] border border-white/5 font-mono text-[9px] uppercase tracking-wider text-rose-400 flex items-center gap-1.5 shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                <span>TARGET RESULT: </span>
                {isWheelSpinning ? (
                  <span className="text-white animate-pulse font-sans">Calculating Sector Consensus...</span>
                ) : activeSliceResult ? (
                  <span className={cn("font-black tracking-widest", ASSETS[activeSliceResult]?.color)}>
                    {ASSETS[activeSliceResult]?.name} ({activeSliceResult}) Locked
                  </span>
                ) : (
                  <span className="text-white/40 font-sans">Isolator Initialized</span>
                )}
              </div>

              {/* Action Spin trigger */}
              <button
                onClick={() => {
                  if (lastFreeSpinDate !== getTodayStr()) {
                    handleStartSpin(true);
                  } else {
                    handleStartSpin(false);
                  }
                }}
                disabled={isWheelSpinning || (lastFreeSpinDate === getTodayStr() && spinTickets < 1)}
                className={cn(
                  "mt-6 px-12 py-4 rounded-2xl italic font-black uppercase text-xs tracking-widest transition-all border outline-none cursor-pointer",
                  isWheelSpinning
                    ? "bg-neutral-900 border-white/10 text-white/40 cursor-not-allowed"
                    : lastFreeSpinDate !== getTodayStr()
                      ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:scale-105 active:scale-95 animate-pulse"
                      : spinTickets >= 1
                        ? "bg-rose-500 hover:bg-rose-600 text-white border-rose-400/30 shadow-[0_0_25px_rgba(244,63,94,0.25)] hover:scale-105 active:scale-95"
                        : "bg-white/5 border-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                {isWheelSpinning ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={14} /> Spinning Isolator...
                  </span>
                ) : lastFreeSpinDate !== getTodayStr() ? (
                  "Initiate Free Daily Spin"
                ) : spinTickets >= 1 ? (
                  "Initiate Ticket Spin (1 Key)"
                ) : (
                  "Swap Resources in DEX to Spin"
                )}
              </button>
            </div>

            {/* Spin Pending Wallet Ledger Progress Tracker */}
            <TiltCard className="glass rounded-[2rem] p-6 border border-white/10 bg-[#0c0d10]/95 text-left space-y-6" glowColor="rgba(244, 63, 94, 0.15)">
              
              {/* Symmetrical Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Visual Section 1: Holographic 3D Floating Projector Stage (35% scale layout) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center relative p-4 border-b md:border-b-0 md:border-r border-white/5 select-none">
                  {/* Hologram project emission base effect */}
                  <div className="absolute bottom-1 w-24 h-2 bg-rose-500/15 rounded-full filter blur-[6px] animate-pulse" />
                  <div 
                    className="absolute bottom-0 w-20 h-4 bg-gradient-to-t from-rose-500/15 to-transparent pointer-events-none" 
                    style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }}
                  />
                  
                  {/* Rotating 3D projection ring array */}
                  <div className="relative w-36 h-36 flex items-center justify-center" style={{ perspective: 800 }}>
                    {/* Ring layer 1 (outer slow clockwise rotation) */}
                    <motion.div 
                      className="absolute w-32 h-32 rounded-full border border-dashed border-rose-500/20"
                      style={{ transformStyle: "preserve-3d", transform: "rotateX(68deg) rotateY(4deg) translateZ(0px)" }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                    />
                    
                    {/* Ring layer 2 (middle reverse fast rotation with tracking glow) */}
                    <motion.div 
                      className="absolute w-28 h-28 rounded-full border-2 border-dashed border-amber-500/25"
                      style={{ transformStyle: "preserve-3d", transform: "rotateX(68deg) rotateY(-4deg) translateZ(10px)" }}
                      animate={{ rotate: -360 }}
                      transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                    />
                    
                    {/* Ring layer 3 (inner stabilizer glow) */}
                    <div 
                      className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500/5 via-rose-500/5 to-transparent border border-white/5 opacity-80"
                      style={{ transformStyle: "preserve-3d", transform: "rotateX(68deg) translateZ(5px)" }}
                    />

                    {/* Laser light projection lines */}
                    <div className="absolute inset-0 pointer-events-none opacity-45">
                      <div className="absolute left-[15%] top-1/2 w-4 h-[1px] bg-sky-400 rotate-[45deg] filter blur-[0.5px]" />
                      <div className="absolute right-[15%] top-1/2 w-4 h-[1px] bg-rose-500 rotate-[-45deg] filter blur-[0.5px]" />
                    </div>

                    {/* Floating Central Core HUD readout containing Realtime Balance display */}
                    <motion.div 
                      className="absolute flex flex-col items-center justify-center text-center z-10"
                      style={{ transform: "translateZ(30px)" }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                    >
                      <span className="text-[7.5px] font-black text-rose-400 uppercase tracking-widest block font-sans">Spin Buffer</span>
                      <span className="text-2xl font-mono font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.45)] mt-0.5 animate-pulse">
                        ${totalWonUSDT.toFixed(4)}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 shadow-lg">
                        <Sparkles size={8} className="text-amber-400 animate-spin" />
                        <span className="text-[8px] font-mono font-bold text-emerald-400 tracking-wide">
                          {progressPercent.toFixed(1)}%
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Vertically rising particle emitters */}
                  <div className="absolute inset-x-0 bottom-4 flex justify-between px-6 pointer-events-none h-12 overflow-hidden opacity-30">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <motion.div
                        key={idx}
                        className={cn("w-[1.5px] rounded-full", idx % 2 === 0 ? "bg-rose-400 shadow-[0_0_8px_#f43f5e]" : "bg-emerald-400 shadow-[0_0_8px_#10b981]")}
                        initial={{ y: 40, opacity: 0, height: 3 }}
                        animate={{
                          y: [-8, 40],
                          opacity: [0, 1, 0],
                          height: [3, 10, 3],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.8 + idx * 0.3,
                          ease: "linear",
                          delay: idx * 0.25,
                        }}
                      />
                    ))}
                  </div>

                </div>

                {/* Visual Section 2: Interactive Real-Time 3D Glass Tubing Casing and Milestones (65% layout) */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                  
                  {/* Custom Header with quantum indicator */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[7.5px] font-bold text-rose-400 uppercase tracking-widest block mb-0.5 font-sans">PENDING TRANSACTION BUFFER GATES</span>
                      <h3 className="text-base font-black uppercase font-mono tracking-tight text-white italic">
                        USDT Ledger Consensus
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0e0f12] border border-white/10 px-2.5 py-1 rounded-xl text-[8.5px] font-mono uppercase tracking-wider text-white/50 shadow-inner shrink-0">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", totalWonUSDT >= WITHDRAWAL_GOAL_USDT ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-ping")} />
                      <span>{totalWonUSDT >= WITHDRAWAL_GOAL_USDT ? "Consensus Locked" : "Accumulating Core"}</span>
                    </div>
                  </div>

                  {/* 3D Glass Fluid Tube Progress Bar */}
                  <div className="relative py-2">
                    
                    {/* Futuristic Background Track with Depth */}
                    <div className="relative w-full h-8 bg-neutral-950 rounded-2xl p-1 border border-white/5 flex items-center shadow-2xl shadow-black/80">
                      
                      {/* Glass glare surface sheen */}
                      <div className="absolute inset-x-0 top-0.5 h-3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none z-20 rounded-t-xl" />
                      
                      {/* Holographic grid scan lines inside bar */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40 pointer-events-none z-10" />

                      {/* Filled Fluid Bar */}
                      <motion.div 
                        className="h-full rounded-xl bg-gradient-to-r from-rose-500 via-[#eab308] to-emerald-400 relative overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        style={{
                          boxShadow: "0 0 20px rgba(244, 63, 94, 0.45), inset 0 1px 2px rgba(255,255,255,0.3)",
                        }}
                      >
                        {/* Interactive dynamic sheen ripple flowing right to left */}
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-[200%]"
                          animate={{ x: ["-100%", "50%"] }}
                          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                        />

                        {/* Floating internal particles rising micro bubble nodes */}
                        {[1, 2, 3, 4].map((bubble) => (
                          <motion.div
                            key={bubble}
                            className="absolute rounded-full bg-white/25"
                            style={{
                              width: Math.random() * 2.5 + 2,
                              height: Math.random() * 2.5 + 2,
                              top: `${Math.random() * 60 + 20}%`,
                            }}
                            animate={{
                              x: ["0%", "200%"],
                              opacity: [0, 1, 0],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.2 + bubble * 0.4,
                              ease: "easeInOut",
                              delay: bubble * 0.2,
                            }}
                          />
                        ))}
                      </motion.div>
                      
                      {/* Interactive target indicator gate element at $10.00 right boundary */}
                      <div className="absolute right-1 top-1 bottom-1 w-3 border-l border-white/10 bg-emerald-500/10 rounded-r-xl flex items-center justify-center z-10">
                        <div className={cn("w-1 h-4 rounded-full transition-all duration-300", totalWonUSDT >= WITHDRAWAL_GOAL_USDT ? "bg-emerald-400 shadow-[0_0_10px_#10b981]" : "bg-white/20")} />
                      </div>

                    </div>

                    {/* Progress percentage label underneath */}
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-white/30 pt-2 font-mono select-none">
                      <span>Gateway Consensual Depth</span>
                      <span className="text-white/70 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                        {progressPercent.toFixed(1)}% Validated
                      </span>
                    </div>

                  </div>

                  {/* 3D Interactive Milestones Timeline Nodes */}
                  <div className="bg-[#0b0c0e] rounded-2xl p-3 border border-white/5 space-y-2 select-none">
                    <span className="text-[7.5px] text-white/30 uppercase font-black tracking-widest block font-mono">Consensus Mileposts</span>
                    <div className="grid grid-cols-4 gap-2 text-center relative">
                      {[
                        { val: 2.50, name: "I: Init Sync", percent: 25 },
                        { val: 5.00, name: "II: Sync Node", percent: 50 },
                        { val: 7.50, name: "III: Quorum", percent: 75 },
                        { val: 10.00, name: "IV: Consensus", percent: 100 }
                      ].map((gate) => {
                        const isUnlocked = totalWonUSDT >= gate.val;
                        const isNext = totalWonUSDT < gate.val && (totalWonUSDT >= gate.val - 2.50 || gate.val === 2.50);
                        
                        return (
                          <div 
                            key={gate.val} 
                            className={cn(
                              "relative p-2 rounded-xl transition-all duration-300 border",
                              isUnlocked 
                                ? "bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.05)]" 
                                : isNext 
                                  ? "bg-amber-500/5 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]" 
                                  : "bg-[#07080a] border-white/5 opacity-55"
                            )}
                          >
                            <span className="block text-[7px] text-white/30 font-bold uppercase font-sans">{gate.name}</span>
                            <span className={cn(
                              "text-[10px] font-mono font-black italic block mt-0.5",
                              isUnlocked ? "text-emerald-400" : isNext ? "text-amber-500 animate-pulse" : "text-white/40"
                            )}>
                              ${gate.val.toFixed(2)}
                            </span>
                            
                            {/* Visual Status micro LED indicator */}
                            <div className="flex justify-center mt-1">
                              <motion.div 
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  isUnlocked 
                                    ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" 
                                    : isNext 
                                      ? "bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" 
                                      : "bg-white/10"
                                )}
                                animate={isNext ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>

              {/* Two Column Vault Layout: Premium Crypto vs Direct Game Elements */}
              <div className="space-y-4">
                {/* Premium Crypto Vault (BTC/ETH/USDT count towards milestone) */}
                <div className="bg-[#0b0c0e] rounded-2xl p-4 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[7.5px] font-bold text-rose-400 uppercase tracking-widest block font-sans">Accumulating Core</span>
                      <h4 className="text-xs font-black uppercase font-mono text-white italic">Premium Crypto Vault</h4>
                    </div>
                    <span className="text-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Locked under $10 Gate</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-sans">
                    {Object.entries(spinWinnings).map(([coin, amount]) => {
                      const wonAmt = amount as number;
                      const rate = ASSETS[coin]?.rate || 0;
                      return (
                        <div key={coin} className="p-3 bg-[#0d0e12] border border-white/5 rounded-2xl text-center shadow-inner relative overflow-hidden group hover:border-white/10 transition-all duration-300">
                          <div className={cn("absolute inset-x-0 bottom-0 h-0.5 opacity-60 transition-all duration-300 group-hover:h-11", ASSETS[coin]?.color.replace("text-", "bg-"))} style={{ opacity: 0.2 }} />
                          
                          <span className={cn("block text-[8.1px] font-black uppercase tracking-wider font-sans", ASSETS[coin]?.color)}>{coin}</span>
                          <span className="text-xs font-mono font-black text-white truncate block mt-0.5">
                            {wonAmt.toFixed(coin === "BTC" ? 7 : (coin === "ETH" ? 5 : 4))}
                          </span>
                          <span className="text-[7.5px] text-white/35 font-mono italic block mt-0.5">
                            ~${(wonAmt * rate).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    
                  </div>
                </div>

                {/* Direct In-Game Currency Vault (Unrestricted Immediate Claims) */}
                <div className="bg-[#0f1115] rounded-2xl p-4 border border-white/10 relative overflow-hidden space-y-3">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full filter blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[7.5px] font-bold text-amber-500 uppercase tracking-widest block font-sans">Immediate Release Vault</span>
                      <h4 className="text-xs font-black uppercase font-mono text-white italic">In-Game Element Vault</h4>
                    </div>
                    <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Zero Limit Instant Claim</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-sans">
                    {Object.entries(spinGameWinnings).map(([coin, amount]) => {
                      const wonAmt = amount as number;
                      const rate = ASSETS[coin]?.rate || 0;
                      return (
                        <div key={coin} className="p-3 bg-[#13151b] border border-white/5 rounded-2xl text-center shadow-inner relative overflow-hidden group hover:border-[#ffffff]/10 transition-all duration-300">
                          <div className={cn("absolute inset-x-0 bottom-0 h-0.5 opacity-60 transition-all duration-300 group-hover:h-11", ASSETS[coin]?.color.replace("text-", "bg-"))} style={{ opacity: 0.15 }} />
                          
                          <span className={cn("block text-[8.1px] font-black uppercase tracking-wider font-sans", ASSETS[coin]?.color)}>{coin}</span>
                          <span className="text-xs font-mono font-black text-white truncate block mt-0.5">
                            {coin === "ZP" ? Math.round(wonAmt).toLocaleString() : wonAmt.toFixed(4)}
                          </span>
                          <span className="text-[7.5px] text-white/35 font-mono italic block mt-0.5">
                            ~${(wonAmt * rate).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleWithdrawGameWinnings}
                    disabled={Object.values(spinGameWinnings).every(val => val === 0)}
                    className={cn(
                      "w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-wider italic transition-all flex items-center justify-center gap-1.5 outline-none border cursor-pointer",
                      !Object.values(spinGameWinnings).every(val => val === 0)
                        ? "bg-amber-500 hover:bg-amber-600 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.01]"
                        : "bg-white/5 text-white/10 border-white/5 cursor-not-allowed"
                    )}
                  >
                    <ArrowUpRight size={12} className={!Object.values(spinGameWinnings).every(val => val === 0) ? "animate-pulse" : ""} />
                    Converge Game Elements to Inventory
                  </button>
                </div>
              </div>

              {/* Consolidated warning info block */}
              <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-2.5 text-[9px] text-white/40 leading-relaxed uppercase shadow-inner">
                <Info size={14} className="shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                <span className="font-sans leading-relaxed">
                  Decentralized Consensus Ledger limits direct secure withdrawals under the security lock threshold of $10.00 equivalent value. Accumulate or swap elements in the Vault to reach consensus faster!
                </span>
              </div>

              {/* View Separate Crypto Withdrawal Cards in Wallet redirect button */}
              <button
                onClick={() => { triggerHaptic("medium"); setActiveTab("wallet"); }}
                className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-wider italic bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 outline-none border border-white/5 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Wallet size={12} />
                View Separate Crypto Withdrawal Cards in Wallet
              </button>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED AD POPUPS (Simulated Unskippable Video/Banner Sync) */}
      <AnimatePresence>
        {showAdPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl px-5"
          >
            <div className="w-full max-w-sm glass rounded-[2.5rem] p-6 border border-rose-500/20 text-center relative pointer-events-auto bg-neutral-950 overflow-hidden space-y-5">
              
              {/* Advertising Indicator Tag */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[7px] font-mono font-black text-rose-500 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded uppercase tracking-widest leading-none">
                  SPONSOR SYNCLINK AD REACTION
                </span>
                <span className="text-[8px] font-mono font-bold text-white/40 flex items-center gap-1">
                  <Play size={8} className="animate-pulse text-rose-500" /> SYNCING CHANNELS
                </span>
              </div>

              {/* Highly interactive animated retro "video playback" area */}
              <div className="relative aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden flex flex-col items-center justify-center p-4">
                <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-red-500/5" />
                
                {/* Simulated playback visual: rotating lines, compiling text */}
                <div className="space-y-1.5 text-center relative z-10 w-full">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-rose-500 animate-spin flex items-center justify-center mx-auto text-rose-400">
                    <RefreshCw size={20} className="animate-pulse" />
                  </div>
                  <div className="text-[8px] font-mono font-black text-emerald-400 animate-pulse uppercase tracking-wider block">
                    Securing Sponsors consensus ledger...
                  </div>
                  <div className="px-3 py-1 rounded bg-[#101012] border border-white/5 font-mono text-[7px] text-emerald-400 truncate max-w-full">
                    G-Consensus ID: x0_{Math.random().toString(36).substr(2, 9)}
                  </div>
                </div>

                {/* Progress loading ticks overlay */}
                <div className="absolute bottom-2 inset-x-3 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all rounded-full"
                    style={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Dynamic Sponsor Content */}
              <div className="space-y-1 text-left bg-white/5 p-4 rounded-2xl border border-white/5">
                <h4 className="text-[11px] font-black uppercase text-amber-500 flex items-center gap-1.5 italic tracking-tight">
                  <Award size={12} />
                  {AD_SPONSORS[currentAdIndex].title}
                </h4>
                <p className="text-[9px] text-white/50 leading-relaxed font-semibold uppercase">
                  {AD_SPONSORS[currentAdIndex].desc}
                </p>
                <div className="text-[7px] font-mono text-white/30 pt-1.5 border-t border-white/5 text-right uppercase">
                  Sponsor node: {AD_SPONSORS[currentAdIndex].mockUrl}
                </div>
              </div>

              {/* Countdown counter and lock indication */}
              <div className="flex flex-col items-center space-y-3 pt-2">
                {!adClaimUnlocked ? (
                  <div className="text-[10px] font-mono font-black text-rose-400 animate-pulse flex items-center gap-1.5 uppercase">
                    <Lock size={12} />
                    Crypt-channel bypass unlocking in: {adCountdown}s
                  </div>
                ) : (
                  <div className="text-[10px] font-mono font-black text-emerald-400 animate-bounce flex items-center gap-1.5 uppercase">
                    <CheckCircle2 size={12} />
                    Verified sponsor. Accretions ready.
                  </div>
                )}

                <button
                  onClick={handleClaimReward}
                  disabled={!adClaimUnlocked}
                  className={cn(
                    "w-full py-4 rounded-xl font-black uppercase italic tracking-wider text-[10px] outline-none border",
                    adClaimUnlocked 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-black border-emerald-400 glow-blue cursor-pointer"
                      : "bg-[#18181b] text-white/20 border-white/5 cursor-not-allowed"
                  )}
                >
                  Authorize Accretions release
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL POPUPS FOR COMING SOON + REWARDS + SUCCESSES */}
      <AnimatePresence>
        {popupType && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-6"
            onClick={() => setPopupType(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass rounded-[2.5rem] p-7 border border-white/10 text-center relative pointer-events-auto overflow-hidden bg-black/90"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
              
              {popupType === "swap_success" ? (
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="space-y-1.5 h-auto">
                    <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.25em] block">
                      {swapSuccessDetails?.isSpinReward ? "CONGLOMERATE SPIN REWARD CAPTURED" : "ROUTING TRANSACTION COMPLETE"}
                    </span>
                    <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                      {swapSuccessDetails?.isSpinReward ? "Isolated Win Synced!" : "Consensus Secured!"}
                    </h3>
                    
                    <div className="p-4 bg-white/5 rounded-2xl mt-4 border border-white/5 space-y-1 font-mono text-xs">
                      <div className="flex justify-between items-center text-[10px] text-white/40">
                        <span>CONSUMED</span>
                        <span className="font-bold text-white">
                          {swapSuccessDetails?.from?.amount} {swapSuccessDetails?.from?.symbol}
                        </span>
                      </div>
                      <div className="h-px border-t border-dashed border-white/10 my-2" />
                      <div className="flex justify-between items-center text-[10px] text-white/40">
                        <span>ACQUIRED (SECURE DECRYPT)</span>
                        <span className="font-bold text-emerald-400">
                          +{swapSuccessDetails?.to?.amount} {swapSuccessDetails?.to?.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setPopupType(null)}
                    className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-[10px] shadow-lg shadow-emerald-500/15"
                  >
                    Authorize Node Release
                  </button>
                </div>
              ) : popupType === "withdraw_winnings_fail" ? (
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-lg">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="space-y-2">
                     <span className="text-[8px] font-bold text-rose-500 uppercase tracking-[0.25em] block">CONSENSUS EX-GATEWAY FAULT</span>
                     <h3 className="text-xl font-black uppercase tracking-tight text-white italic">Gateway Isolated</h3>
                     <p className="text-[10px] text-white/50 font-semibold leading-relaxed uppercase">
                       Accumulated value contains only ${totalWonUSDT.toFixed(4)} USDT equivalent. Merge authorization requires at least $10.00 USDT from Isolated spins to unlock the relay. Put standard elements into ticket node swaps.
                     </p>
                  </div>
                  
                  <button
                    onClick={() => setPopupType(null)}
                    className="w-full bg-rose-500 text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-[10px]"
                  >
                    Acknowledge Secures
                  </button>
                </div>
              ) : popupType === "withdraw_winnings_success" ? (
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg">
                     <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-2">
                     <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-[0.25em] block">CONSENSUS EX-GATEWAY PURGE</span>
                     <h3 className="text-xl font-black uppercase tracking-tight text-white italic">Accretions Synced!</h3>
                     <p className="text-[10px] text-white/50 font-semibold leading-relaxed uppercase">
                       All isolation spin-won cryptocurrencies have been successfully consolidated into your primary active wallet balance channels for consensus trading and updates.
                     </p>
                  </div>
                  
                  <button
                    onClick={() => setPopupType(null)}
                    className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-[10px]"
                  >
                    Close Gateway Channel
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto text-2xl shadow-lg">
                    <Lock size={24} />
                  </div>
                  <div className="space-y-2">
                     <span className="text-[8px] font-bold text-amber-500 uppercase tracking-[0.25em] block">PROTOCOL COMMENCING SOON</span>
                     <h3 className="text-xl font-black uppercase tracking-tight text-white italic">Crypto Node Isolation</h3>
                     <p className="text-[10px] text-white/50 font-medium leading-relaxed uppercase">
                       The {popupType} gateways are current locked for security isolation audits. Dynamic gas nodes are completing consensus trials.
                     </p>
                  </div>
                  
                  <button
                    onClick={() => setPopupType(null)}
                    className="w-full bg-amber-500 text-black py-4 rounded-xl font-black uppercase italic tracking-wider text-[10px]"
                  >
                    Acknowledge Secures
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Dropdown Asset custom selector (Matches exact screenshot design & colors) */}
      <AnimatePresence>
        {(showFromSelector || showToSelector) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-0 sm:p-5">
            <div className="absolute inset-0" onClick={() => { setShowFromSelector(false); setShowToSelector(false); }} />
            <motion.div
              initial={{ y: "100%", rotateX: 20, scale: 0.95 }}
              animate={{ y: 0, rotateX: 0, scale: 1 }}
              exit={{ y: "100%", rotateX: 15, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              style={{ transformOrigin: "bottom center", transformStyle: "preserve-3d" }}
              className="w-full sm:max-w-md bg-white text-black rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-8 space-y-4 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] z-20 relative overflow-hidden text-left"
            >
              <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-2 sm:hidden" />
              <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                <h3 className="text-sm font-black uppercase text-neutral-800 tracking-wider">
                  {showFromSelector ? "Select Source Asset" : "Select Target Asset"}
                </h3>
                <button 
                  onClick={() => { setShowFromSelector(false); setShowToSelector(false); }}
                  className="text-[10px] font-black uppercase text-neutral-400 hover:text-black py-1 px-3 bg-neutral-100 rounded-full"
                >
                  Close
                </button>
              </div>

              <div className="divide-y divide-neutral-100 max-h-[360px] overflow-y-auto pr-1">
                {Object.keys(ASSETS)
                  .filter(sym => {
                    if (showToSelector) {
                      return sym !== "USDT" && sym !== "BTC" && sym !== "ETH";
                    }
                    return true;
                  })
                  .map((sym) => {
                    const isSelected = showFromSelector ? sym === fromAsset : sym === toAsset;
                    return (
                      <button
                        key={sym}
                        onClick={() => {
                          triggerHaptic("medium");
                          if (showFromSelector) {
                            setFromAsset(sym);
                            if (sym === toAsset) {
                              setToAsset(sym === "TICKET" ? "CLUE" : "TICKET");
                            }
                            setFromAmount("");
                            setToAmount("0.00");
                            setShowFromSelector(false);
                          } else {
                            setToAsset(sym);
                            setFromAmount("");
                            setToAmount("0.00");
                            setShowToSelector(false);
                          }
                        }}
                        className="w-full py-4 text-left flex items-center justify-between hover:bg-neutral-50 px-3 rounded-2xl transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-neutral-100 text-neutral-800 font-mono text-xs font-black uppercase">
                            {sym}
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-bold text-neutral-800 block leading-tight">
                              {ASSETS[sym]?.name || sym}
                            </span>
                            <span className="text-[9px] font-mono font-medium text-neutral-400 uppercase">
                              Bal: {getDisplayVal(sym)} {sym}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[#1e40af] flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#1d4ed8]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-neutral-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Premium Separate Withdrawal Modal */}
      <AnimatePresence>
        {showPremiumWithdrawModal && premiumWithdrawAsset && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[180] flex items-center justify-center p-6 text-left">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -15 }}
              className="w-full max-w-sm bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border border-white/10 rounded-[2.5rem] p-6 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] relative overflow-hidden"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-sm font-black uppercase tracking-tight text-white italic">
                  Premium Crypto Withdrawal
                </h3>
                <button
                  disabled={isPremiumWithdrawProcessing}
                  onClick={() => setShowPremiumWithdrawModal(false)}
                  className="text-[9px] font-bold text-white/40 hover:text-white uppercase py-1 px-3 bg-white/5 rounded-full"
                >
                  Close
                </button>
              </div>

              {!premiumWithdrawSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                    <span className="text-[8px] font-black uppercase text-amber-500 tracking-wider">
                      RESERVED WITHDRAWAL QUANTITY
                    </span>
                    <div className="text-2xl font-mono font-black text-white italic truncate">
                      {premiumWithdrawAmount.toFixed(8)} {premiumWithdrawAsset}
                    </div>
                    <span className="text-[10px] font-mono text-white/40 font-bold block">
                      Value equivalent: ${premiumWithdrawUsd.toFixed(2)} USD
                    </span>
                  </div>

                  {/* Wallet address label */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-white/40 block px-1">
                      Target Wallet Destination Address
                    </label>
                    <input
                      type="text"
                      disabled={isPremiumWithdrawProcessing}
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder={`Enter external ${premiumWithdrawAsset} address`}
                      className="w-full bg-black/50 border border-white/10 hover:border-white/20 focus:border-amber-500 px-4 py-3 text-xs font-mono rounded-xl outline-none text-white italic"
                    />
                  </div>

                  {isPremiumWithdrawProcessing ? (
                    <div className="bg-black/60 p-4 border border-white/5 rounded-2xl text-center space-y-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 animate-pulse block">
                        Verifying Consensus Signature Channels
                      </span>
                      {/* Interactive Video simulator inside processing */}
                      <div className="aspect-video bg-neutral-950 rounded-xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden">
                        <Tv size={28} className="text-amber-500/20 mb-1 animate-bounce" />
                        <span className="text-[8px] font-mono text-white/30 tracking-widest">SPONSOR INTERACTIVE SYSTEM LINK</span>
                      </div>
                      <p className="text-[18px] font-mono font-black text-white">
                        {premiumWithdrawCountdown}s remaining
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!destinationAddress || destinationAddress.length < 10}
                      onClick={() => {
                        triggerHaptic("medium");
                        setIsPremiumWithdrawProcessing(true);
                        setPremiumWithdrawCountdown(6);
                      }}
                      className={cn(
                        "w-full py-4 font-black uppercase italic tracking-wider text-xs rounded-xl active:scale-95 transition-all text-center flex items-center justify-center gap-1 shadow-md cursor-pointer",
                        destinationAddress && destinationAddress.length >= 10
                          ? "bg-amber-500 text-black hover:bg-amber-600 glow-gold"
                          : "bg-white/5 border border-white/5 text-white/20 cursor-not-allowed"
                      )}
                    >
                      Authorize Outbound Consensus Disbursal
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-5 text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto text-2xl shadow-lg">
                    ✓
                  </div>
                  <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Consensus signature verified</span>
                    <h4 className="text-xl font-black uppercase italic text-white tracking-tight">Withdrawal Succeeded!</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed font-bold uppercase px-2">
                      Your separate withdrawal of {premiumWithdrawAmount.toFixed(8)} {premiumWithdrawAsset} has been processed successfully. Your transaction ID is sent into memory pools instantly.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic("success");
                      setShowPremiumWithdrawModal(false);
                      setPremiumWithdrawAsset(null);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black py-3 rounded-xl font-black uppercase italic tracking-wider text-[10px]"
                  >
                    Acknowledge & Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
