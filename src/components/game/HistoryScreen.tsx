import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, History, Coins, Zap, Key, RefreshCw, Layers, TrendingUp, DollarSign, CloudCheck, HardDrive } from "lucide-react";
import { useLedgerStore, CurrencyType } from "../../store/ledgerStore";
import { useSupabaseSync } from "../SupabaseSyncProvider";
import { useEffect } from "react";
import { format } from "date-fns";
import { cn } from "../../lib/utils";

export default function HistoryScreen() {
  const { transactions: localTx, clearHistory } = useLedgerStore();
  const { transactions: cloudTx, loadTransactions, isSyncing } = useSupabaseSync();

  useEffect(() => {
    loadTransactions();
  }, []);

  const getIcon = (type: string, currency?: string) => {
    switch (type.toLowerCase()) {
      case "welcome_package": return <Zap size={14} className="text-amber-400" />;
      case "task_completion": return <Coins size={14} className="text-blue-400" />;
      case "referral_bonus": return <ArrowUpRight size={14} className="text-emerald-400" />;
      case "swap": return <RefreshCw size={14} className="text-purple-400" />;
      case "spin_reward": return <Layers size={14} className="text-rose-400" />;
      case "vault_reward": return <Key size={14} className="text-amber-500" />;
      default: 
        if (currency === "ZP") return <TrendingUp size={14} className="text-emerald-400" />;
        if (currency === "KEY") return <Key size={14} className="text-violet-400" />;
        if (currency === "CLUE") return <Coins size={14} className="text-amber-500" />;
        if (currency === "USDT") return <DollarSign size={14} className="text-teal-400" />;
        return <History size={14} className="text-white/40" />;
    }
  };

  const getLabel = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const getCurrencyStyle = (currency: CurrencyType) => {
    switch (currency) {
      case "ZP": return "text-emerald-400 font-extrabold";
      case "CLUE": return "text-amber-400 font-extrabold";
      case "KEY": return "text-violet-400 font-extrabold";
      case "ELEMENT": return "text-blue-400 font-extrabold";
      case "USDT": return "text-teal-400 font-extrabold";
      case "BTC": return "text-orange-500 font-extrabold";
      case "ETH": return "text-blue-500 font-extrabold";
      case "TICKET": return "text-rose-400 font-extrabold";
      default: return "text-white";
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const isCrypto = ["BTC", "ETH", "USDT"].includes(currency.toUpperCase());
    if (isCrypto) {
      return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
    }
    return amount.toLocaleString();
  };

  // Convert cloud transactions to unified type
  const unifiedCloudTx = cloudTx.map(tx => ({
    id: `cloud-${tx.id}`,
    type: tx.type,
    amount: tx.amount,
    currency: (tx.currency?.toUpperCase() === "ELEMENT" ? "ELEMENT" : tx.currency?.toUpperCase() || "ZP") as CurrencyType,
    timestamp: tx.created_at ? new Date(tx.created_at).getTime() : Date.now(),
    status: "confirmed" as const,
    isCloud: true
  }));

  const unifiedLocalTx = localTx.map(tx => ({
    ...tx,
    isCloud: false
  }));

  // Deduplicate: if a local transaction matches a cloud transaction (same currency, amount, type, and within 45s)
  // we count only the cloud transaction to avoid double listing.
  const mergedTx: Array<{
    id: string;
    type: string;
    amount: number;
    currency: CurrencyType;
    timestamp: number;
    status: "confirmed" | "pending";
    isCloud: boolean;
  }> = [...unifiedCloudTx];

  unifiedLocalTx.forEach(lt => {
    const hasDuplicate = unifiedCloudTx.some(ct => 
      ct.type.toLowerCase() === lt.type.toLowerCase() &&
      ct.currency === lt.currency &&
      Math.abs(ct.amount) === Math.abs(lt.amount) &&
      Math.abs(ct.timestamp - lt.timestamp) < 45000 // 45 seconds tolerance
    );
    if (!hasDuplicate) {
      mergedTx.push(lt);
    }
  });

  // Sort chronologically descending
  const sortedTx = mergedTx.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="flex-1 bg-black p-6 space-y-6 overflow-y-auto max-h-screen pb-32">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-500">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Ledger Logs</h2>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">Comprehensive Activity Ledger</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSyncing && <RefreshCw size={12} className="text-amber-500 animate-spin" />}
        </div>
      </header>

      <div className="space-y-3">
        {sortedTx.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-dashed border-white/10 flex items-center justify-center mx-auto text-white/20">
              <History size={32} />
            </div>
            <p className="text-xs text-white/30 uppercase font-black italic">No activity detected in system loops</p>
          </div>
        ) : (
          sortedTx.map((tx, idx) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              key={tx.id}
              className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:border-white/10 transition-colors">
                  {getIcon(tx.type, tx.currency)}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase italic text-white/90 group-hover:text-white transition-colors">
                    {getLabel(tx.type)}
                  </div>
                  <div className="text-[9px] text-white/30 font-mono mt-0.5 flex items-center gap-1.5">
                    <span>{format(tx.timestamp, "MMM dd, HH:mm:ss")}</span>
                    <span className="text-white/10">•</span>
                    <span className="flex items-center gap-0.5 text-white/40">
                      {tx.isCloud ? (
                        <>
                          <span className="text-[8px] tracking-wider text-emerald-500/80 font-bold uppercase">Cloud</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[8px] tracking-wider text-amber-500/80 font-bold uppercase">Local</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-xs font-mono font-black italic",
                  tx.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {tx.amount >= 0 ? "+" : ""}{formatAmount(tx.amount, tx.currency)} 
                  <span className={cn("ml-1", getCurrencyStyle(tx.currency))}>{tx.currency}</span>
                </div>
                <div className="text-[8px] text-white/20 uppercase font-black tracking-tighter italic">Status: Confirmed</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
