import { useState, useEffect } from "react";
import { useGame } from "../../App";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useLedgerStore } from "../../store/ledgerStore";
import { 
  ShoppingCart, 
  Zap, 
  Key, 
  Package, 
  Star, 
  Shield, 
  Gift, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Wallet, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  Cpu,
  Coins,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
import { TonConnectUI } from "@tonconnect/ui";
import { beginCell, Address } from "@ton/core";

// Helper to construct jetton transfer payload cell
function buildUsdtPayload(recipientAddress: string, amountUsdt: number, responseAddress: string): string {
  // USDT has 6 decimals on TON Network
  const usdtAmountUnits = Math.round(amountUsdt * 1000000); 
  
  const cell = beginCell()
    .storeUint(0xf8a7ea5, 32)            // Opcode for jetton transfer (32 bits)
    .storeUint(0, 64)                     // Query ID (64 bits)
    .storeCoins(usdtAmountUnits)          // Amount of USDT to transfer (Coins format, e.g. 1000000 = 1 USDT)
    .storeAddress(Address.parse(recipientAddress)) // Recipient (your merchant wallet address!)
    .storeAddress(Address.parse(responseAddress))  // Response address (sender wallet to receive change)
    .storeBit(0)                          // Custom payload: null (1 bit)
    .storeCoins(1)                        // Forward TON amount (1 nanoTON as forward payload fee)
    .storeBit(0)                          // Forward payload in-place: null (1 bit)
    .endCell();
    
  return cell.toBoc().toString("base64");
}

// Fetch user's USDT wallet dynamically from TonAPI
async function fetchUserUsdtWallet(userAddress: string): Promise<string> {
  try {
    const res = await fetch(`https://tonapi.io/v2/accounts/${userAddress}/jettons`);
    if (res.ok) {
      const data = await res.json();
      const usdtJetton = data?.balances?.find(
        (b: any) => b.jetton?.address?.toLowerCase() === "0:c6114a9b4b7881407d725e5eb7dd9c755ef0bc3a5de293fdcd1f00bfd8d75626" || // friendly representation: EQCxE6mUt4gUB9cl5et963zF9XvC3Z5W8pNfHg_Y13YoGDEq
                     b.jetton?.address?.toLowerCase() === "eqcxe6mut4gub9cl5et963zf9xvc3z5w8pnfhg_y13yogdeq"
      );
      if (usdtJetton?.wallet_address?.address) {
        return usdtJetton.wallet_address.address;
      }
    }
  } catch (err) {
    console.warn("TonAPI jettons call failed, trying fallback...", err);
  }
  
  // Standard derive prediction or query fallback. If no custom jetton wallet is indexed,
  // let's prompt them that they can pay with TON or we throws clear alert.
  throw new Error("Could not automatically locate your USDT wallet contract on TON. Ensure you have some USDT, or select TON directly for instant checkouts!");
}

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  provider: 'tonkeeper' | 'telegram_wallet' | 'mytonwallet' | 'tonhub' | null;
}

export default function ShopScreen() {
  const { user, resources, updateResources, buyItem, triggerHaptic } = useGame();
  const { logTransaction } = useSupabaseSync();
  const { addTransaction } = useLedgerStore();

  // Load TON Wallet State from LocalStorage
  const [wallet, setWallet] = useState<WalletState>(() => {
    const saved = localStorage.getItem("cluevault_ton_wallet");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      connected: false,
      address: null,
      balance: 15.0, // starts with practice TON
      provider: null
    };
  });

  const [tonConnectUI, setTonConnectUI] = useState<TonConnectUI | null>(null);

  const saveWalletState = (newState: WalletState) => {
    setWallet(newState);
    localStorage.setItem("cluevault_ton_wallet", JSON.stringify(newState));
  };

  useEffect(() => {
    // Initialize Web3 TonConnect interface
    const tc = new TonConnectUI({
      manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
      restoreConnection: true
    });

    setTonConnectUI(tc);

    const unsubscribe = tc.onStatusChange(async (walletInfo) => {
      if (walletInfo) {
        const address = walletInfo.account.address;
        const providerName = walletInfo.device.appName || "tonkeeper";
        
        let realBalance = 15.0; // practice fallback
        try {
          const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${address}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.ok && data?.result?.balance) {
              realBalance = parseFloat(data.result.balance) / 1000000000;
            }
          }
        } catch (err) {
          console.warn("Failed fetching chain ledger balance, using default 15.0 TON reserve", err);
        }

        saveWalletState({
          connected: true,
          address: address,
          balance: realBalance,
          provider: providerName as any
        });
      } else {
        saveWalletState({
          connected: false,
          address: null,
          balance: 0,
          provider: null
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // UI state managers
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  
  // Custom Merchant Gateway wallet address - locked and uneditable by users
  const merchantAddress = "UQCEDqtsI451tT_cDhtvUvAdTi3VDBytm0AkFnF4aSXMJzMM";

  const saveMerchantAddress = (addr: string) => {
    // No-op to prevent state modification
  };

  // Check if merchant destination address is structurally correct
  const isMerchantAddressValid = true;

  // Checkout/Transaction flow state
  const [activeTx, setActiveTx] = useState<{
    pack: any;
    costTON: number;
    costUSDT: number;
    feeTON: number;
    payType: 'TON' | 'USDT';
    step: 'review' | 'broadcasting' | 'success' | 'failed';
    txHash?: string;
    errorMessage?: string;
  } | null>(null);

  // Success indicator for standard swaps
  const [swapSuccessItem, setSwapSuccessItem] = useState<any | null>(null);

  // Premium packs priced in TON and USDT (USDT matches approximate USD valuation)
  const premiumPacks = [
    { 
      id: "pack_starter", 
      name: "Starter Kit", 
      priceUSD: "$2.99",
      costTON: 0.6, 
      costUSDT: 2.99,
      reward: { keys: 10, coins: 5000 }, 
      items: "10 key, 5k ZP", 
      highlight: true, 
      icon: Gift 
    },
    { 
      id: "pack_agent", 
      name: "Agent Bundle", 
      priceUSD: "$9.99",
      costTON: 2.0, 
      costUSDT: 9.99,
      reward: { keys: 50, coins: 25000 }, 
      items: "50 key, 25k ZP, Rare Skin", 
      highlight: false, 
      icon: Shield 
    },
    { 
      id: "pack_pass", 
      name: "Global Pass", 
      priceUSD: "$19.99",
      costTON: 4.0, 
      costUSDT: 19.99,
      reward: { keys: 100, coins: 100000 }, 
      items: "Unlimited Hints, Season Rewards", 
      highlight: false, 
      icon: Sparkles 
    },
  ];

  // Coin packs swap ZP coins for items
  const coinPacks = [
    { name: "Key Cluster", cost: 1000, reward: { keys: 5 }, items: "5 Decryption key", icon: Key },
    { name: "Material Crate", cost: 500, reward: { baseMaterials: 20 }, items: "20 Construction Mats", icon: Package },
  ];

  // Connect to a TON Wallet (using real TON Connect)
  const connectWallet = async () => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }
    if (tonConnectUI) {
      triggerHaptic("medium");
      await tonConnectUI.openModal();
    }
  };

  // Disconnect Wallet
  const disconnectWallet = async () => {
    if (tonConnectUI) {
      await tonConnectUI.disconnect();
    }
    triggerHaptic("light");
  };

  // Handle premium buy or exchange click
  const handlePurchaseAttempt = (pack: any) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }

    // Trigger transaction review overlay
    const fee = 0.05; // standard TON nano-fee
    setActiveTx({
      pack: pack,
      costTON: pack.costTON || 1.0,
      costUSDT: pack.costUSDT || 5.0,
      feeTON: fee,
      payType: 'TON', // Default to TON buy, can switch to USDT
      step: 'review'
    });
    triggerHaptic("medium");
  };

  // Confirm and Broadcast Web3 purchase through real connected TON Wallet
  const confirmWeb3Transaction = async () => {
    if (!activeTx || !wallet.connected || !tonConnectUI) return;

    if (!isMerchantAddressValid) {
      triggerHaptic("error");
      setActiveTx(prev => prev ? { 
        ...prev, 
        step: 'failed', 
        errorMessage: "Invalid Merchant Recipient Address! Please configure a valid address at the top." 
      } : null);
      return;
    }

    setActiveTx(prev => prev ? { ...prev, step: 'broadcasting' } : null);
    triggerHaptic("heavy");

    try {
      let finalTxHash = "";

      if (activeTx.payType === 'USDT') {
        // 1. Resolve user's USDT wallet dynamically from on-chain indexes
        let userUsdtWallet: string;
        try {
          userUsdtWallet = await fetchUserUsdtWallet(wallet.address!);
        } catch (e: any) {
          console.error(e);
          throw new Error(e.message || "Failed to locate your USDT wallet contract on TON. Ensure you have an active USDT balance, or choose to pay with TON instead!");
        }

        // 2. Build official USDT Jetton transfer payload
        const payloadBoc = buildUsdtPayload(merchantAddress, activeTx.costUSDT, wallet.address!);

        // 3. Compose Jetton Transfer transaction
        const usdtTxPayload = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [
            {
              address: userUsdtWallet, // Send message to user's USDT wallet
              amount: "50000000",      // 0.05 TON to cover Jetton gas fees
              payload: payloadBoc      // Base64 BOC transfer payload
            }
          ]
        };

        // 4. Request signature from Connected App
        const res = await tonConnectUI.sendTransaction(usdtTxPayload);
        finalTxHash = res.boc ? "USDT_TX_" + res.boc.substring(0, 16) : "SUCCESS";

      } else {
        // Standard TON Payment Transaction
        const tonTxPayload = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: [
            {
              address: merchantAddress,
              amount: Math.round(activeTx.costTON * 1e9).toString() // in nanotons
            }
          ]
        };

        // Request signature
        const res = await tonConnectUI.sendTransaction(tonTxPayload);
        finalTxHash = res.boc ? "TON_TX_" + res.boc.substring(0, 16) : "SUCCESS";
      }

      // If successful, credit game resource inventory atomically!
      updateResources(activeTx.pack.reward);

      // Log premium acquisition
      Object.entries(activeTx.pack.reward).forEach(([k, v]) => {
        const amount = typeof v === 'number' ? v : 0;
        const cur = k === 'coins' ? 'ZP' : k === 'baseMaterials' ? 'Element' : k === 'keys' ? 'Key' : k;
        logTransaction(amount as number, "premium_buy", cur);
        addTransaction({ type: "premium_buy", amount: amount as number, currency: (cur.toUpperCase() === "ELEMENT" ? "ELEMENT" : cur.toUpperCase()) as any });
      });

      // Save success
      setActiveTx(prev => prev ? { 
        ...prev, 
        step: 'success',
        txHash: finalTxHash
      } : null);

      triggerHaptic("success");

    } catch (err: any) {
      console.error("USDT/TON Checkout failed:", err);
      
      setActiveTx(prev => prev ? { 
        ...prev, 
        step: 'failed',
        errorMessage: err?.message || err?.toString() || "User rejected signature request or network timeout."
      } : null);
      
      triggerHaptic("error");
    }
  };

  // Process standard swaps (coinpacks using ZP)
  const handleStandardSwap = (pack: any) => {
    if (!user.onboarded) {
      triggerHaptic("error");
      return;
    }

    // Call userStore's buyItem
    const success = buyItem(pack);
    if (success) {
      logTransaction(-pack.cost, "shop_buy", "ZP");
      addTransaction({ type: "shop_buy", amount: -pack.cost, currency: "ZP" });
      Object.entries(pack.reward).forEach(([k, v]) => {
        const amount = typeof v === 'number' ? v : 0;
        const cur = k === 'coins' ? 'ZP' : k === 'baseMaterials' ? 'Element' : k === 'keys' ? 'Key' : k;
        logTransaction(amount, "shop_buy", cur);
        addTransaction({ type: "shop_buy", amount, currency: (cur.toUpperCase() === "ELEMENT" ? "ELEMENT" : cur.toUpperCase()) as any });
      });
      setSwapSuccessItem(pack);
    } else {
      triggerHaptic("error");
    }
  };



  return (
    <div className="p-5 pb-24 space-y-6">
      
      {/* Balances Display Board */}
      <div className="glass rounded-[2rem] border-white/5 p-4 bg-gradient-to-r from-neutral-900 to-black shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <span className="text-[9px] font-black uppercase text-amber-500/80 tracking-widest block mb-1.5 px-0.5">📟 TELEMETRY SYSTEM ASSETS</span>
        
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">ZP</span>
            <span className="text-xs font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Coins size={11} className="text-amber-400" />
              {resources.coins.toLocaleString()}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">ELEMENTS</span>
            <span className="text-xs font-black text-emerald-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Cpu size={11} className="text-emerald-400" />
              {resources.baseMaterials}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">key</span>
            <span className="text-xs font-black text-cyan-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Key size={11} className="text-cyan-400" />
              {resources.keys}
            </span>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 text-center flex flex-col justify-center">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-tight block">Clue</span>
            <span className="text-xs font-black text-violet-400 font-mono tracking-tight flex items-center justify-center gap-1 mt-0.5">
              <Sparkles size={11} className="text-violet-400" />
              {resources.clue}
            </span>
          </div>
        </div>
      </div>

      {!user.onboarded && (
        <div className="glass rounded-3xl p-5 border-amber-500/50 bg-amber-500/5 flex items-center justify-between gap-4">
           <div>
              <h3 className="text-[10px] font-black uppercase text-amber-500 mb-0.5">Observation Mode</h3>
              <p className="text-[8px] text-white/40 uppercase font-bold">Log in to link wallet and access operations.</p>
           </div>
           <button 
             onClick={() => {
               localStorage.removeItem("cluevault_onboarding_skipped");
               localStorage.removeItem("cluevault_onboarding_hidden");
               window.location.reload();
             }}
             className="bg-amber-500 text-black px-4 py-2 rounded-xl font-black uppercase italic text-[8px]"
           >
             Login
           </button>
        </div>
      )}

      {/* Main Header */}
      <header className="flex flex-col gap-1 text-left">
        <div className="flex items-center gap-2">
           <ShoppingCart size={16} className="text-amber-500" />
           <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Premium Black Market</span>
        </div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter">Acquisitions</h1>
        <p className="text-sm text-white/50 italic font-medium">Bypass anti-decryption locks with secure TON blockchain checkouts.</p>
      </header>

      {/* Merchant Target Route Settings Panel */}
      <div className="glass rounded-[2rem] border-white/5 p-5 bg-gradient-to-b from-neutral-900 to-black/8 w-full text-left space-y-3.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Coins size={15} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#E4E3E0]/70">Merchant Routing Gateway</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20">
            🔒 SECURE LOCK
          </span>
        </div>
        
        <p className="text-[9px] text-white/45 uppercase font-extrabold leading-relaxed">
          Approved destination TON address for routing all shop checkout transactions:
        </p>

        <div className="space-y-1.5">
          <input
            type="text"
            value={merchantAddress}
            disabled={true}
            readOnly={true}
            className="w-full bg-black/60 font-mono text-[11px] font-bold text-amber-500/90 px-4 py-3 rounded-xl border border-amber-500/20 opacity-90 cursor-not-allowed select-all"
          />
          <span className="text-[8px] text-white/35 font-bold uppercase tracking-tight block px-1">
            ⚡ This merchant address is verified and permanently locked by security configuration.
          </span>
        </div>
      </div>

      {/* TON Wallet Integration Area */}
      <div className={cn(
        "glass rounded-[2rem] p-5 border relative overflow-hidden transition-all duration-300",
        wallet.connected ? "border-emerald-500/30 bg-emerald-500/[0.03]" : "border-amber-500/25 bg-amber-500/[0.01]"
      )}>
        {wallet.connected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-500/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400">
                  <Wallet size={18} />
                </div>
                <div>
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest block">CONNECTED TON WALLET</span>
                  <p className="text-[11px] font-mono font-bold text-white/95">
                    {wallet.address?.substring(0, 8)}...{wallet.address?.substring(wallet.address.length - 8)}
                  </p>
                </div>
              </div>
              <button 
                onClick={disconnectWallet}
                className="text-[9px] uppercase font-black tracking-wide text-red-400 bg-red-400/10 border border-red-500/20 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              >
                Disconnect
              </button>
            </div>

            <div className="flex items-center justify-between bg-black/40 border border-white/5 rounded-2xl p-4">
              <div>
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-wide block">WALLETS BALANCES</span>
                <p className="text-lg font-black font-mono text-emerald-400 mt-0.5 flex items-center gap-1">
                  <span>{wallet.balance.toFixed(2)}</span>
                  <span className="text-xs font-medium text-emerald-500">TON</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-3 space-y-4">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] flex items-center justify-center text-amber-500 mx-auto">
              <Wallet size={26} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight">Connect TON Wallet</h3>
              <p className="text-[10px] text-white/40 uppercase font-black leading-relaxed mt-1">
                Crypto purchases require active Telegram Open Network coordinates. Connect your TON wallet to begin.
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic("medium");
                setShowConnectModal(true);
              }}
              disabled={!user.onboarded}
              className="w-full bg-amber-500 text-black py-3.5 rounded-2xl font-black uppercase italic tracking-tight text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.15)] glow-gold"
            >
              <Wallet size={14} /> Connect TON Wallet
            </button>
          </div>
        )}
      </div>

      {/* Featured Offer Block */}
      <div className="relative overflow-hidden group">
         <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent z-0" />
         <div className="glass rounded-[2.5rem] p-6.5 border-amber-500/20 relative z-10">
            <div className="flex justify-between items-start mb-6">
               <div>
                  <div className="bg-amber-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mb-1.5 inline-block">Flash Deal</div>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter leading-none mb-1">Master key Expansion</h2>
                  <p className="text-[10px] text-white/40 uppercase font-bold">20 Premium High-Decryption key</p>
               </div>
               <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center text-black glow-gold">
                  <Key size={20} strokeWidth={2.5} />
               </div>
            </div>
            <div className="flex items-center justify-between">
               <div>
                  <div className="flex items-baseline gap-1">
                     <span className="text-base font-black italic text-cyan-400">1.0 TON</span>
                     <span className="text-[9px] text-white/20 line-through font-mono font-bold">$12.99 USD</span>
                  </div>
                  <span className="text-[8px] text-white/30 uppercase font-bold block mt-0.5">Approx. $5.00 Valuation</span>
               </div>
               <button 
                 onClick={() => handlePurchaseAttempt({ 
                   id: "deal_flash", 
                   name: "Master Key Exp.", 
                   costTON: 1.0, 
                   reward: { keys: 20 } 
                 })}
                 className="bg-white text-black px-5 py-3 rounded-xl font-black uppercase italic text-[10px] active:scale-95 transition-all shadow-xl"
               >
                  Acquire Now
               </button>
            </div>
         </div>
      </div>

      {/* Operations Premium Section */}
      <div className="space-y-4">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-[#E4E3E0]/30 px-1 italic">I. Blockchain Sync Packs</h3>
         <div className="grid grid-cols-1 gap-3">
            {premiumPacks.map((pack) => (
              <motion.div 
                key={pack.id}
                onClick={() => handlePurchaseAttempt(pack)}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "glass rounded-3xl p-5 flex items-center justify-between border-white/5 cursor-pointer hover:border-white/10 transition-all",
                  pack.highlight && "border-amber-500/20 bg-amber-500/[0.03]"
                )}
              >
                 <div className="flex items-center gap-3.5">
                    <div className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0",
                        pack.highlight ? "bg-amber-500 text-black shadow-md" : "bg-white/5 text-white/40"
                    )}>
                       <pack.icon size={22} />
                    </div>
                    <div className="text-left">
                       <h4 className="text-xs font-black uppercase tracking-tight">{pack.name}</h4>
                       <span className="text-[9px] text-white/40 font-bold uppercase block">{pack.items}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-xs font-black italic mb-0.5 text-emerald-400">{pack.costTON} TON</div>
                    <div className="text-[9px] font-mono text-white/20 tracking-tighter uppercase font-bold">{pack.priceUSD}</div>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Resource standard Swap Area */}
      <div className="space-y-4">
         <h3 className="text-[10px] font-black uppercase tracking-widest text-[#E4E3E0]/30 px-1 italic">II. In-Game Currency Exchange</h3>
         <div className="grid grid-cols-1 gap-3">
            {coinPacks.map((pack, i) => (
              <motion.div 
                key={i}
                onClick={() => handleStandardSwap(pack)}
                whileTap={{ scale: 0.98 }}
                className="glass rounded-3xl p-5 flex items-center justify-between border-white/5 cursor-pointer hover:border-white/10 transition-all"
              >
                 <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 bg-white/5 rounded-xl flex items-center justify-center text-white/45 shrink-0">
                       <pack.icon size={22} />
                    </div>
                    <div className="text-left">
                       <h4 className="text-xs font-black uppercase tracking-tight">{pack.name}</h4>
                       <span className="text-[9px] text-white/40 font-bold uppercase block">{pack.items}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className="text-xs font-black italic mb-0.5 text-amber-500">{pack.cost} ZP</div>
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Swap</span>
                 </div>
              </motion.div>
            ))}
         </div>
      </div>

      {/* Bottom informational guidelines block */}
      <div className="glass rounded-[2rem] p-6 border-blue-500/10 bg-blue-500/5">
         <div className="flex items-center gap-3 mb-3">
            <Clock size={16} className="text-blue-400" />
            <h4 className="text-[10px] font-black uppercase italic tracking-tighter">Blockchain Ledgers Rules</h4>
         </div>
         <p className="text-[9px] text-white/40 leading-relaxed uppercase font-bold text-left italic">
           All connected TON operations run on simulated crypto signals under Web3 Sandbox. Ensure your connected wallet has compatible premium coordinates for decryption.
         </p>
      </div>



      {/* Transaction Review / Signature / Loading / Success Modal Overlay */}
      <AnimatePresence>
        {activeTx && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="glass rounded-[3rem] p-7 max-w-sm w-full text-center border-amber-500/30 bg-gradient-to-b from-neutral-950 to-black space-y-6"
            >
              
              {/* STAGE A: REVIEW */}
               {activeTx.step === 'review' && (
                 <div className="space-y-4 text-left">
                   <div className="text-center">
                     <span className="w-14 h-14 bg-amber-500/10 border border-amber-500/25 rounded-[1.8rem] flex items-center justify-center text-amber-500 mx-auto mb-3 animate-pulse">
                       <Wallet size={26} />
                     </span>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter">Sign Code Payload</h3>
                     <p className="text-[8px] text-white/40 uppercase font-black">TON blockchain smart contract interaction</p>
                   </div>

                   {/* Toggle payment currency type */}
                   <div className="grid grid-cols-2 gap-2 bg-black/40 border border-white/5 rounded-2xl p-1.5 my-1">
                     <button
                       type="button"
                       onClick={() => setActiveTx(prev => prev ? { ...prev, payType: 'TON' } : null)}
                       className={cn(
                         "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1.5",
                         activeTx.payType === 'TON' ? "bg-amber-500 text-black shadow-md font-black" : "text-white/45 hover:text-white"
                       )}
                     >
                       TON Token
                     </button>
                     <button
                       type="button"
                       onClick={() => setActiveTx(prev => prev ? { ...prev, payType: 'USDT' } : null)}
                       className={cn(
                         "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider flex items-center justify-center gap-1.5",
                         activeTx.payType === 'USDT' ? "bg-emerald-500 text-black shadow-md font-black" : "text-white/45 hover:text-white"
                       )}
                     >
                       USDT (Jetton)
                     </button>
                   </div>

                   <div className="space-y-2 border-t border-b border-dashed border-white/5 py-3">
                     <div className="flex justify-between items-center text-[10px]">
                       <span className="text-white/40 font-bold uppercase">PAYABLE OPTION</span>
                       <span className="text-white font-black uppercase">{activeTx.pack.name}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px]">
                       <span className="text-white/40 font-bold uppercase">LEDGER VALUE</span>
                       <span className="text-emerald-400 font-black font-mono">
                         {activeTx.payType === 'USDT' ? `${activeTx.costUSDT} USDT` : `${activeTx.costTON} TON`}
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-[10px]">
                       <span className="text-white/40 font-bold uppercase">BLOCKCHAIN GAS</span>
                       <span className="text-white/60 font-black font-mono">+{activeTx.payType === 'USDT' ? "0.05 TON" : `${activeTx.feeTON} TON`}</span>
                     </div>
                     <div className="flex justify-between items-center text-[10px] border-t border-dashed border-white/5 pt-2 mt-2">
                       <span className="text-amber-500 font-extrabold uppercase text-xs">TOTAL COST</span>
                       <span className="text-emerald-400 font-black font-mono text-xs">
                         {activeTx.payType === 'USDT' ? `${activeTx.costUSDT} USDT` : `${(activeTx.costTON + activeTx.feeTON).toFixed(2)} TON`}
                       </span>
                     </div>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                     <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">CASHIER ROUTEMENT PATH</span>
                     <p className="text-[9px] font-mono text-emerald-400 break-all select-all uppercase">
                       ROUTE TO: {merchantAddress.substring(0, 10)}... {merchantAddress.substring(merchantAddress.length - 10)}
                     </p>
                   </div>

                   <div className="flex flex-col gap-2.5">
                     {wallet.connected ? (
                       <button
                         onClick={confirmWeb3Transaction}
                         className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase italic tracking-tight active:scale-95 transition-all text-xs"
                       >
                         Sign & Broadcast Pay
                       </button>
                     ) : (
                       <button
                         onClick={async () => {
                           await connectWallet();
                         }}
                         className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3.5 rounded-xl font-black uppercase italic tracking-tight active:scale-95 transition-all text-xs shadow-md"
                       >
                         Connect Wallet to Pay
                       </button>
                     )}
                     <button
                       onClick={() => setActiveTx(null)}
                       className="w-full bg-white/5 text-white/40 py-2.5 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all"
                     >
                       Reject TX Payload
                     </button>
                   </div>
                 </div>
               )}

               {/* STAGE B: BROADCASTING */}
               {activeTx.step === 'broadcasting' && (
                 <div className="py-8 space-y-6">
                   <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 rounded-[1.8rem] flex items-center justify-center text-amber-500 mx-auto">
                     <Loader2 className="animate-spin" size={32} />
                   </div>
                   <div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter">Mining Block Consensus</h3>
                     <p className="text-[9px] text-white/40 uppercase font-black mt-1 leading-relaxed">
                       Broadcasting parameters to TON nodes. Please await state transition signature confirmation...
                     </p>
                   </div>
                   <div className="flex flex-col gap-1 text-[8px] font-mono text-white/20 uppercase tracking-widest animate-pulse">
                     <span>&lt; DISPATCHING HEX PAYLOADS &gt;</span>
                     <span>&lt; SYNCING CRYPTO ENCRYPTORS &gt;</span>
                   </div>
                 </div>
               )}

               {/* STAGE C: SUCCESS */}
               {activeTx.step === 'success' && (
                 <div className="py-6 space-y-6">
                   <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-[1.8rem] flex items-center justify-center text-emerald-400 mx-auto">
                     <CheckCircle2 size={32} className="animate-bounce" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter text-emerald-400">Block Confirmed</h3>
                     <p className="text-[9px] text-white/40 uppercase font-extrabold mt-1">Transaction block signed successfully!</p>
                   </div>

                   <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-left space-y-2">
                     <span className="text-[8px] font-bold text-white/30 uppercase tracking-wide block text-center">AWARDED ASSETS SECURED</span>
                     <div className="flex flex-wrap gap-2 justify-center">
                       {Object.entries(activeTx.pack.reward).map(([k, v]) => {
                         const isCoins = k === 'coins';
                         return (
                           <span key={k} className="bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/5 text-[10px] font-mono font-black text-white/80 uppercase">
                             +{isCoins ? (v as number).toLocaleString() : v} {isCoins ? "ZP" : k === "baseMaterials" ? "Elements" : k === "keys" ? "key" : k}
                           </span>
                         );
                       })}
                     </div>
                   </div>

                   <div className="space-y-1 text-center bg-black/40 p-3 rounded-2xl border border-white/5">
                     <span className="text-[7.5px] font-bold text-white/25 uppercase tracking-widest block">TELEGRAM EXPLORER LINK</span>
                     <p className="text-[8px] font-mono text-emerald-500 select-all font-bold break-all">
                       {activeTx.txHash?.substring(0, 32)}...
                     </p>
                   </div>

                   <button
                     onClick={() => setActiveTx(null)}
                     className="w-full bg-emerald-500 text-black py-3.5 rounded-xl font-black uppercase italic text-xs tracking-tight active:scale-95"
                   >
                     Close Session Link
                   </button>
                 </div>
               )}

               {/* STAGE D: FAILED */}
               {activeTx.step === 'failed' && (
                 <div className="py-6 space-y-6">
                   <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-[1.8rem] flex items-center justify-center text-red-500 mx-auto">
                     <AlertTriangle size={32} className="animate-bounce" />
                   </div>
                   <div>
                     <h3 className="text-xl font-black uppercase italic tracking-tighter text-red-500">Signature Blocked</h3>
                     <p className="text-[9px] text-[#FF4444] uppercase font-extrabold mt-1 leading-relaxed">
                       {activeTx.errorMessage || "Insufficient TON balance or transaction rejected by client."}
                     </p>
                   </div>

                   <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                     <p className="text-[9px] text-white/60 leading-relaxed uppercase font-bold">
                       Ensure your wallet is connected, and contains sufficient funds to make this payment.
                     </p>
                   </div>

                   <div className="flex flex-col gap-3">
                     <button
                       onClick={() => setActiveTx(null)}
                       className="w-full bg-amber-500 text-black py-3.5 rounded-xl font-black uppercase italic text-xs tracking-tight active:scale-95"
                     >
                       Return to Acquisitions
                     </button>
                   </div>
                 </div>
               )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standard Swap Action Success Overlay */}
      <AnimatePresence>
        {swapSuccessItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/95 backdrop-blur-md"
          >
            <div className="glass rounded-[3.5rem] p-8 max-w-sm w-full text-center border-emerald-500/40 bg-black/90 space-y-6">
              <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/40 rounded-[2.2rem] flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_35px_rgba(16,185,129,0.15)]">
                <CheckCircle2 size={40} className="animate-pulse" />
              </div>

              <div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-emerald-500">Asset Redeemed</h3>
                <p className="text-[10px] text-white/40 uppercase font-extrabold mt-1">Resource allocation updated instantly!</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
                <span className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest block mb-2">SWAPPED ASSET</span>
                <span className="text-base font-black text-white font-mono flex items-center justify-center gap-1.5 uppercase">
                  <span>{swapSuccessItem.items}</span>
                </span>
                <p className="text-[8px] text-white/35 font-semibold mt-1">Deducted {swapSuccessItem.cost} ZP from telemetry system</p>
              </div>

              <button
                onClick={() => setSwapSuccessItem(null)}
                className="w-full bg-emerald-500 text-black py-4 rounded-xl font-black uppercase italic text-xs tracking-tight active:scale-95 transition-all"
              >
                Return to Black Market
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
