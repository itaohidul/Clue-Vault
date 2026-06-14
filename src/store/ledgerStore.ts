import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CurrencyType = "CLUE" | "ZP" | "ELEMENT" | "KEY" | "USDT" | "BTC" | "ETH" | "TICKET";

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: CurrencyType;
  timestamp: number;
  status: "confirmed" | "pending";
}

interface LedgerState {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, "id" | "timestamp" | "status">) => void;
  clearHistory: () => void;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (tx) => set((state) => ({
        transactions: [
          {
            ...tx,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: "confirmed" as const,
          },
          ...state.transactions,
        ].slice(0, 100), // Keep last 100 transactions
      })),
      clearHistory: () => set({ transactions: [] }),
    }),
    {
      name: "cluevault_ledger_storage",
    }
  )
);
