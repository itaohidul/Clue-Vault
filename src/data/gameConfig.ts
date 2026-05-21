export interface Riddle {
  id: string;
  parts: [string, string, string];
  answer: string;
}

export const RIDDLES: Riddle[] = [
  {
    id: "r1",
    parts: [
      "I am seen in the water but never get wet.",
      "I have a heart that doesn't beat.",
      "I am your twin but you cannot touch me."
    ],
    answer: "REFLECTION"
  },
  {
    id: "r2",
    parts: [
      "I have keys but no locks.",
      "I have space but no room.",
      "You can enter, but never go outside."
    ],
    answer: "KEYBOARD"
  },
  {
    id: "r3",
    parts: [
      "The more of me there is, the less you see.",
      "I flee when the light arrives.",
      "I am the blanket for the stars."
    ],
    answer: "DARKNESS"
  },
  {
    id: "r4",
    parts: [
      "I have cities, but no houses.",
      "I have mountains, but no trees.",
      "I have water, but no fish."
    ],
    answer: "MAP"
  },
  {
    id: "r5",
    parts: [
      "What can travel around the world",
      "while staying in",
      "a corner?"
    ],
    answer: "STAMP"
  }
];

export const VAULT_CONFIG = [
  { id: 1, type: "Alpha", group: "Easy", cost: 1, difficulty: 4, rewardTier: "Low" },
  { id: 2, type: "Beta", group: "Easy", cost: 3, difficulty: 4, rewardTier: "Low" },
  { id: 3, type: "Gamma", group: "Easy", cost: 5, difficulty: 4, rewardTier: "Low" },
  { id: 4, type: "Delta", group: "Medium", cost: 10, difficulty: 6, rewardTier: "Medium" },
  { id: 5, type: "Epsilon", group: "Medium", cost: 20, difficulty: 6, rewardTier: "Medium" },
  { id: 6, type: "Zeta", group: "Medium", cost: 50, difficulty: 6, rewardTier: "Medium" },
  { id: 7, type: "Eta", group: "Hard", cost: 100, difficulty: 8, rewardTier: "Hard" },
  { id: 8, type: "Theta", group: "Hard", cost: 150, difficulty: 8, rewardTier: "Hard" },
  { id: 9, type: "Iota", group: "Hard", cost: 300, difficulty: 8, rewardTier: "Hard" },
];
