import { create } from 'zustand';
import axios from 'axios';
import { RIDDLES } from '../data/gameConfig';

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
    exp: number;
    maxExp: number;
    clearanceCount: number;
    streak: number;
    completedToday: boolean;
    avatar: string;
    onboarded: boolean;
    referralCode?: string;
    referCount?: number;
    referralCommission?: number;
    claimedCommission?: number;
    lastDailyClaim: number;
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
  purchases: Array<{ id: string; name: string; timestamp: number; cost: number; currency: string }>;
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
  riddleState: {
    activeRiddleId: string | null;
    unlockedParts: number; // 0, 1, 2, 3
  };
  
  // Actions
  setLoadedState: (state: any) => void;
  updateResources: (diff: Partial<GameState['resources']>) => void;
  consumeEnergy: (amount: number) => boolean;
  completeMission: (reward: { coins?: number; keys?: number; fragments?: number; baseMaterials?: number; xp?: boolean; xpAmount?: number; clue?: number; activityScore?: number; isDaily?: boolean }) => void;
  finalizeOnboarding: (data: { name: string; crew: any; baseStyle: string } | null) => void;
  buyItem: (item: { cost: number; reward: Partial<GameState['resources']> }) => boolean;
  syncWithBackend: (initData: string) => Promise<void>;
  triggerHaptic: (style?: 'light' | 'medium' | 'heavy' | 'success' | 'error') => void;
  claimReferralCommission: () => void;
  addMockReferral: () => void;
  upgradeBaseRoom: (roomId: string, coinCost: number, matCost: number) => boolean;
  setBaseStyle: (styleName: string) => void;
  updateCrewBadge: (badgeDiff: any) => void;
  joinCrew: (crewName: string) => void;
  leaveCrew: () => void;
  claimDailyReward: () => boolean;
  updateRiddleProgression: () => { riddleId: string; part: number; isComplete: boolean };
}

const getInitialState = () => {
  const defaults = {
    user: {
      name: "",
      level: 1,
      exp: 0,
      maxExp: 100,
      clearanceCount: 0,
      streak: 1,
      completedToday: false,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=agent",
      onboarded: false,
      referralCode: "CV-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      referCount: 0,
      referralCommission: 0,
      claimedCommission: 0,
      lastDailyClaim: 0,
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
    purchases: [],
    crew: null,
    base: {
      style: "Cyber Lab",
      rooms: [
        { id: "command", name: "Command Room", level: 1, type: "primary" }
      ],
      level: 1,
    },
    unlockedTabs: ["daily"],
    riddleState: {
      activeRiddleId: null,
      unlockedParts: 0
    }
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
      riddleState: get().riddleState,
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
    // Earn and convert optimization structure 2:1 - plus some bonus clue tokens as requested (clue+)
    const clueReward = (reward.clue || 0) + randomClueBonus + 15;

    const nextResources = {
      ...resources,
      coins: resources.coins + (reward.coins || 0) + 300, // extra ZP on clearance
      keys: resources.keys + (reward.keys || 0),
      fragments: resources.fragments + (reward.fragments || 0),
      baseMaterials: resources.baseMaterials + (reward.baseMaterials || 0),
      clue: resources.clue + clueReward,
      activityScore: resources.activityScore + (reward.activityScore || 0) + 50,
    };

    // Calculate EXP award
    const baseNewXp = 40 + (user.level * 5);
    const xpAwarded = reward.xpAmount || (reward.xp ? baseNewXp : 0);

    let newExp = (user.exp || 0) + xpAwarded;
    let newLevel = user.level || 1;
    let newMaxExp = user.maxExp || 100;

    // Support multiple level-ups in a single transaction if they gain a massive amount of EXP (e.g. from high tier Vaults)
    while (newExp >= newMaxExp) {
      newExp -= newMaxExp;
      newLevel += 1;
      newMaxExp = newLevel * 100;
    }

    const nextUser = {
      ...user,
      clearanceCount: (user.clearanceCount || 0) + 1,
      // Only lock the decryption game today if isDaily is explicitly passed
      completedToday: reward.isDaily ? true : user.completedToday,
      level: newLevel,
      exp: newExp,
      maxExp: newMaxExp,
    };

    const nextTabs = Array.from(new Set([...unlockedTabs, 'bonus', 'crew', 'referral']));

    set({ resources: nextResources, user: nextUser, unlockedTabs: nextTabs });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: nextUser,
      resources: nextResources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: nextTabs,
      riddleState: get().riddleState,
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
        riddleState: get().riddleState,
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
      riddleState: get().riddleState,
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
      // Increase timeout to 15s for mobile carrier data links
      const response = await axios.post('/api/auth/telegram', { initData }, { timeout: 15000 });
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
          riddleState: currentLocal.riddleState,
        };

        set(nextState);
        localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(nextState));
        console.log("[Auth] Session handshake verified.");
      }
    } catch (e: any) {
      console.warn("[Auth] Handshake signal latency detected. Falling back to encrypted local cache.", e.message);
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
      riddleState: get().riddleState,
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
      riddleState: get().riddleState,
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

  upgradeBaseRoom: (roomId, coinCost, matCost) => {
    const { resources, base } = get();
    if (resources.coins >= coinCost && resources.baseMaterials >= matCost) {
      const updatedRooms = base.rooms.map((r) => {
        if (r.id === roomId) {
          return { ...r, level: r.level + 1 };
        }
        return r;
      });
      const exists = base.rooms.some((r) => r.id === roomId);
      if (!exists) {
        const nameMap: any = {
          command: "Command Room",
          clue_lab: "Clue Lab",
          vault_room: "Vault Room",
          storage: "Storage Room"
        };
        updatedRooms.push({ id: roomId, name: nameMap[roomId] || "Utility Room", level: 1, type: "secondary" });
      }

      const nextBase = {
        ...base,
        rooms: updatedRooms,
        level: base.level + 1
      };
      
      const nextResources = {
        ...resources,
        coins: resources.coins - coinCost,
        baseMaterials: resources.baseMaterials - matCost
      };

      set({ base: nextBase, resources: nextResources });
      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: get().user,
        resources: nextResources,
        crew: get().crew,
        base: nextBase,
        unlockedTabs: get().unlockedTabs,
        riddleState: get().riddleState,
      }));
      get().triggerHaptic('success');
      return true;
    }
    get().triggerHaptic('error');
    return false;
  },

  setBaseStyle: (styleName) => {
    const nextBase = { ...get().base, style: styleName };
    set({ base: nextBase });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: get().user,
      resources: get().resources,
      crew: get().crew,
      base: nextBase,
      unlockedTabs: get().unlockedTabs,
      riddleState: get().riddleState,
    }));
    get().triggerHaptic('success');
  },

  updateCrewBadge: (badgeDiff) => {
    const currentCrew = get().crew;
    if (currentCrew) {
      const nextCrew = {
        ...currentCrew,
        badge: { ...currentCrew.badge, ...badgeDiff }
      };
      set({ crew: nextCrew });
      localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
        user: get().user,
        resources: get().resources,
        crew: nextCrew,
        base: get().base,
        unlockedTabs: get().unlockedTabs,
        riddleState: get().riddleState,
      }));
      get().triggerHaptic('success');
    }
  },

  joinCrew: (crewName) => {
    const defaultBadge = { icon: "Shield", color: "#f59e0b", shape: "Circle" };
    const newCrew = {
      name: crewName,
      badge: defaultBadge,
      rank: Math.floor(Math.random() * 50) + 11,
      points: 100
    };
    set({ crew: newCrew });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: get().user,
      resources: get().resources,
      crew: newCrew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
      riddleState: get().riddleState,
    }));
    get().triggerHaptic('success');
  },

  leaveCrew: () => {
    set({ crew: null });
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: get().user,
      resources: get().resources,
      crew: null,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
      riddleState: get().riddleState,
    }));
    get().triggerHaptic('light');
  },

  claimDailyReward: () => {
    const { user, resources } = get();
    const now = Date.now();
    const lastClaim = user.lastDailyClaim || 0;
    
    const lastDate = new Date(lastClaim).toDateString();
    const nowDate = new Date(now).toDateString();
    
    if (lastClaim !== 0 && lastDate === nowDate) {
      get().triggerHaptic('error');
      return false;
    }
    
    // Streak logic: check if last claim was yesterday
    const oneDay = 24 * 60 * 60 * 1000;
    const yesterday = new Date(now - oneDay).toDateString();
    const wasYesterday = lastDate === yesterday;

    let nextStreak = wasYesterday ? (user.streak || 0) + 1 : 1;
    if (nextStreak > 30) nextStreak = 1;

    // Define rewards
    const coinsReward = 250 + (nextStreak * 50);
    const matsReward = nextStreak % 5 === 0 ? 20 * (nextStreak / 5) : 0;
    const keysReward = nextStreak % 7 === 0 ? 1 : 0;
    const scoreReward = 50 + (nextStreak * 10);

    const nextUser = {
      ...user,
      streak: nextStreak,
      lastDailyClaim: now
    };

    const nextResources = {
      ...resources,
      coins: resources.coins + coinsReward,
      baseMaterials: resources.baseMaterials + matsReward,
      keys: resources.keys + keysReward,
      activityScore: resources.activityScore + scoreReward
    };

    set({ user: nextUser, resources: nextResources });
    
    // Save state
    const stateToSave = {
      user: nextUser,
      resources: nextResources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
      riddleState: get().riddleState,
    };
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify(stateToSave));
    
    get().triggerHaptic('success');
    return true;
  },

  updateRiddleProgression: () => {
    const { riddleState } = get();
    let { activeRiddleId, unlockedParts } = riddleState;
    
    // If no active riddle, pick a random one
    if (!activeRiddleId) {
      const randomIdx = Math.floor(Math.random() * RIDDLES.length);
      activeRiddleId = RIDDLES[randomIdx].id;
      unlockedParts = 0;
    }

    const nextParts = unlockedParts + 1;
    const isComplete = nextParts >= 3;
    
    const nextRiddleState = {
      activeRiddleId: isComplete ? null : activeRiddleId,
      unlockedParts: isComplete ? 0 : nextParts
    };

    set({ riddleState: nextRiddleState });
    
    // Persist
    localStorage.setItem('cluevault_game_state_zustand', JSON.stringify({
      user: get().user,
      resources: get().resources,
      crew: get().crew,
      base: get().base,
      unlockedTabs: get().unlockedTabs,
      riddleState: nextRiddleState,
    }));

    return { 
      riddleId: activeRiddleId, 
      part: nextParts, 
      isComplete 
    };
  },
}));
