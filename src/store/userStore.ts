import { create } from 'zustand';
import axios from 'axios';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface GameState {
  user: {
    id?: number;
    name: string;
    level: number;
    streak: number;
    completedToday: boolean;
    avatar: string;
    onboarded: boolean;
    referralCode?: string;
    referCount?: number;
    referralCommission?: number;
    claimedCommission?: number;
  };
  resources: {
    coins: number;
    keys: number;
    fragments: number;
    baseMaterials: number;
    energy: number;
    maxEnergy: number;
    clue: number;
    stakedClue: number;
    stakingTier: string;
    activityScore: number;
  };
  crew: {
    name: string;
    badge: { icon: string; color: string; shape: string };
    rank: number;
    points: number;
    hallTheme?: string;
  } | null;
  base: {
    style: string;
    rooms: Array<{ id: string; name: string; level: number; type: string }>;
    level: number;
  };
  unlockedTabs: string[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setLoadedState: (state: any) => void;
  updateResources: (diff: Partial<GameState['resources']>) => void;
  consumeEnergy: (amount: number) => boolean;
  completeMission: (reward: { coins?: number; keys?: number; fragments?: number; baseMaterials?: number; xp?: boolean; clue?: number; activityScore?: number; isDaily?: boolean }) => void;
  finalizeOnboarding: (data: { name: string; crew: any; baseStyle: string } | null) => void;
  buyItem: (item: { cost: number; reward: Partial<GameState['resources']> }) => boolean;
  syncWithBackend: (initData: string) => Promise<void>;
  triggerHaptic: (style?: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  claimReferralCommission: () => void;
  addMockReferral: () => void;
}

const getInitialState = () => {
  const defaults = {
    user: {
      name: "",
      level: 1,
      streak: 1,
      completedToday: false,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
      onboarded: false,
      referralCode: "CV-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      referCount: 0,
      referralCommission: 0,
      claimedCommission: 0,
    },
    resources: {
      coins: 100,
      keys: 1,
      fragments: 0,
      baseMaterials: 0,
      energy: 100,
      maxEnergy: 100,
      clue: 250,
      stakedClue: 0,
      stakingTier: "none",
      activityScore: 420,
    },
    crew: null,
    base: {
      style: "Cyber Lab",
      rooms: [
        { id: "command", name: "Command Room", level: 1, type: "primary" }
      ],
      level: 1,
    },
    unlockedTabs: ["daily"],
  };

  const saved = localStorage.getItem('cluevault_game_state_zustand');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        ...defaults,
        ...parsed,
        resources: {
          ...defaults.resources,
          ...(parsed.resources || {}),
        },
        user: {
          ...defaults.user,
          ...(parsed.user || {}),
        }
      };
    } catch (e) {
      console.error("Local storage parse error", e);
    }
  }
  return defaults;
};

export const useUserStore = create<GameState>((set, get) => ({
  ...getInitialState(),
  isLoading: false,
  error: null,

  setLoadedState: (loadedState) => {
    set({ ...loadedState });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(loadedState));
  },

  updateResources: (diff) => {
    const current = get().resources;
    const nextResources = { ...current };
    
    Object.entries(diff).forEach(([key, value]) => {
      const k = key as keyof GameState['resources'];
      if (typeof value === "number") {
        (nextResources[k] as number) = ((nextResources[k] as number) || 0) + value;
      } else {
        (nextResources[k] as any) = value;
      }
    });

    set({ resources: nextResources });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: get().user,
      resources: nextResources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
    }));
    get().triggerHaptic('light');
  },

  consumeEnergy: (amount) => {
    const energy = get().resources.energy;
    if (energy >= amount) {
      get().updateResources({ energy: -amount });
      return true;
    }
    get().triggerHaptic('error');
    return false;
  },

  completeMission: (reward) => {
    const { user, resources, unlockedTabs } = get();
    
    // Reward some random Clue tokens (1 to 20) on every mission completed!
    const randomClueBonus = Math.floor(Math.random() * 20) + 1;
    const clueReward = (reward.clue || 0) + randomClueBonus;

    const nextResources = {
      ...resources,
      coins: resources.coins + (reward.coins || 0),
      keys: resources.keys + (reward.keys || 0),
      fragments: resources.fragments + (reward.fragments || 0),
      baseMaterials: resources.baseMaterials + (reward.baseMaterials || 0),
      clue: resources.clue + clueReward,
      activityScore: resources.activityScore + (reward.activityScore || 0),
    };

    const nextUser = {
      ...user,
      // Only lock the decryption game today if isDaily is explicitly passed
      completedToday: reward.isDaily ? true : user.completedToday,
      level: user.level + (reward.xp ? 0.15 : 0), // boosted slightly to encourage faster level progress
    };

    const nextTabs = Array.from(new Set([...unlockedTabs, 'bonus', 'crew', 'referral']));

    set({ resources: nextResources, user: nextUser, unlockedTabs: nextTabs });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: nextUser,
      resources: nextResources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: nextTabs,
    }));
    get().triggerHaptic('success');
  },

  finalizeOnboarding: (data) => {
    if (!data) {
      const nextUser = { ...get().user, onboarded: false };
      set({ user: nextUser });
      localStorage.setItem('cluevault_onboarding_skipped', 'true');
      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: nextUser,
        resources: get().resources,
        crew: get().crew,
        base: get().base,
        unlockedTabs: get().unlockedTabs,
      }));
      return;
    }

    const nextUser = {
      ...get().user,
      name: data.name,
      onboarded: true,
    };
    const nextCrew = data.crew;
    const nextBase = {
      ...get().base,
      style: data.baseStyle,
    };

    set({ user: nextUser, crew: nextCrew, base: nextBase });
    localStorage.setItem('cluevault_onboarding_hidden', 'true');
    localStorage.removeItem('cluevault_onboarding_skipped');
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: nextUser,
      resources: get().resources,
      crew: nextCrew,
      base: nextBase,
      unlockedTabs: get().unlockedTabs,
    }));
    get().triggerHaptic('success');
  },

  buyItem: (item) => {
    const coins = get().resources.coins;
    if (coins >= item.cost) {
      const diff: any = { coins: -item.cost };
      Object.entries(item.reward).forEach(([k, v]) => {
        diff[k] = v;
      });
      get().updateResources(diff);
      get().triggerHaptic('success');
      return true;
    }
    get().triggerHaptic('error');
    return false;
  },

  syncWithBackend: async (initData: string) => {
    set({ isLoading: true });
    try {
      const response = await axios.post('/api/auth/telegram', { initData }, { timeout: 4000 });
      // If server returned structured data
      if (response.data && response.data.user) {
        const serverUser = response.data.user;
        const currentLocal = get();
        
        const mergedUser = {
          ...currentLocal.user,
          name: serverUser.username || serverUser.first_name || currentLocal.user.name || "Agent",
          avatar: serverUser.photo_url || currentLocal.user.avatar,
          id: serverUser.id,
        };

        // If backend returns validated game resources, update them safely
        const nextState = {
          user: mergedUser,
          resources: response.data.resources || currentLocal.resources,
          crew: response.data.crew || currentLocal.crew,
          base: response.data.base || currentLocal.base,
          unlockedTabs: currentLocal.unlockedTabs,
        };

        set(nextState);
        localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(nextState));
      }
    } catch (e: any) {
      console.warn("Skipping backend sync, using local state fallback", e.message);
    } finally {
      set({ isLoading: false });
    }
  },

  claimReferralCommission: () => {
    const { user, resources } = get();
    const comm = user.referralCommission || 0;
    if (comm <= 0) {
      get().triggerHaptic('error');
      return;
    }
    
    const nextUser = {
      ...user,
      claimedCommission: (user.claimedCommission || 0) + comm,
      referralCommission: 0,
    };
    
    const nextResources = {
      ...resources,
      coins: Math.round(resources.coins + comm),
    };
    
    set({ user: nextUser, resources: nextResources });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: nextUser,
      resources: nextResources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
    }));
    get().triggerHaptic('success');
  },

  addMockReferral: () => {
    const { user } = get();
    const nextUser = {
      ...user,
      referCount: (user.referCount || 0) + 1,
    };
    
    set({ user: nextUser });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: nextUser,
      resources: get().resources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
    }));
    get().triggerHaptic('success');
  },

  triggerHaptic: (style = 'light') => {
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    if (tg?.HapticFeedback) {
      if (style === 'success') {
        tg.HapticFeedback.notificationOccurred('success');
      } else if (style === 'error') {
        tg.HapticFeedback.notificationOccurred('error');
      } else {
        tg.HapticFeedback.impactOccurred(style);
      }
    } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(style === 'success' ? [10, 30, 10] : 10);
    }
  },
}));
