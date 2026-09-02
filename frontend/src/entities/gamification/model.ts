export interface TravellerStats {
  level: number;
  title: string;
  tripsTakenThisYear: number;
  tripsToNextLevel: number;
  streakDays: number;
  totalCountries: number;
  xp: number;
  nextLevelXp: number;
  badges: Array<{
    id: string;
    icon: string;
    name: string;
    description: string;
    unlocked: boolean;
  }>;
}

export const TRAVELLER_LEVEL_TITLES = [
  "Novice Explorer",
  "Pathfinder",
  "Traveller",
  "Voyager",
  "Globe Trotter",
] as const;

export function calculateTravellerStats(tripsCount: number): TravellerStats {
  // Determine level (1 to 5)
  let level = 1;
  let title: string = TRAVELLER_LEVEL_TITLES[0];
  let tripsToNext = 1;
  let xp = tripsCount * 350 + 120;
  let nextLevelXp = 500;

  if (tripsCount >= 8) {
    level = 5;
    title = TRAVELLER_LEVEL_TITLES[4];
    tripsToNext = 0;
    nextLevelXp = 3000;
  } else if (tripsCount >= 5) {
    level = 4;
    title = TRAVELLER_LEVEL_TITLES[3];
    tripsToNext = 8 - tripsCount;
    nextLevelXp = 2000;
  } else if (tripsCount >= 3) {
    level = 3;
    title = TRAVELLER_LEVEL_TITLES[2];
    tripsToNext = 5 - tripsCount;
    nextLevelXp = 1200;
  } else if (tripsCount >= 1) {
    level = 2;
    title = TRAVELLER_LEVEL_TITLES[1];
    tripsToNext = 3 - tripsCount;
    nextLevelXp = 750;
  } else {
    level = 1;
    title = TRAVELLER_LEVEL_TITLES[0];
    tripsToNext = 1;
    nextLevelXp = 350;
  }

  const badges = [
    {
      id: "first_escape",
      icon: "🧭",
      name: "First Escape",
      description: "Planned your first getaway with Gebook",
      unlocked: tripsCount >= 1,
    },
    {
      id: "group_captain",
      icon: "👥",
      name: "Group Captain",
      description: "Coordinated a group trip with friends",
      unlocked: tripsCount >= 2,
    },
    {
      id: "budget_master",
      icon: "💰",
      name: "Budget Master",
      description: "Split expenses and settled all shared costs",
      unlocked: tripsCount >= 2,
    },
    {
      id: "replan_ninja",
      icon: "⚡",
      name: "Re-Plan Ninja",
      description: "Adapted an itinerary on the fly during a trip",
      unlocked: tripsCount >= 3,
    },
    {
      id: "globe_trotter",
      icon: "🌍",
      name: "Globe Trotter",
      description: "Completed 5+ epic adventures",
      unlocked: tripsCount >= 5,
    },
  ];

  return {
    level,
    title,
    tripsTakenThisYear: tripsCount,
    tripsToNextLevel: tripsToNext,
    streakDays: Math.max(1, (tripsCount * 2) % 7 + 3),
    totalCountries: Math.max(1, tripsCount),
    xp,
    nextLevelXp,
    badges,
  };
}
