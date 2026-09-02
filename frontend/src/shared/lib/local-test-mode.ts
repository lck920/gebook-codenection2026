import type { Trip, TripSummary } from "@/entities/trip";

const LOCAL_SESSION_KEY = "gebook.local_test_session";
const LOCAL_TRIPS_KEY = "gebook.local_test_trips";
export const LOCAL_AUTH_EVENT = "gebook:local-auth-change";

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  defaultCurrency?: string;
  twoFactorEnabled?: boolean;
}

export interface LocalSessionData {
  user: LocalUser;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

export function getLocalTestSession(): LocalSessionData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLocalTestSession(user: Partial<LocalUser> = {}): LocalSessionData {
  const sessionData: LocalSessionData = {
    user: {
      id: user.id || "local-tester-1",
      name: user.name || "Danial (Local Tester)",
      email: user.email || "danial@gebook.local",
      image: user.image || null,
      defaultCurrency: user.defaultCurrency || "MYR",
      twoFactorEnabled: false,
    },
    session: {
      id: "session-local-1",
      userId: user.id || "local-tester-1",
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    },
  };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionData));
  initSampleTripsIfEmpty();
  window.dispatchEvent(new Event(LOCAL_AUTH_EVENT));
  return sessionData;
}

export function clearLocalTestSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
  window.dispatchEvent(new Event(LOCAL_AUTH_EVENT));
}

const SAMPLE_TRIP: Trip = {
  id: "trip-1",
  title: "Japan · Autumn 2025",
  status: "planning",
  currency: "JPY",
  version: 1,
  startDate: "2025-10-12",
  coverUrl: null,
  intake: {
    destination: "Tokyo, Kyoto, Osaka",
    dayCount: 5,
    startDate: "2025-10-12",
    endDate: "2025-10-16",
    budgetAmount: 300000,
    budgetCurrency: "JPY",
    partySize: 4,
  },
  agentSeedPending: false,
  members: [
    {
      id: "m-1",
      name: "Danial (You)",
      shortName: "Danial",
      initials: "DY",
      avatarBg: "#cdf5fd",
      avatarFg: "#0a54cb",
      userId: "local-tester-1",
      role: "owner",
      canInvite: true,
      isCurrentUser: true,
    },
    {
      id: "m-2",
      name: "Aisyah",
      shortName: "Aisyah",
      initials: "AS",
      avatarBg: "#dde2ee",
      avatarFg: "#3c4760",
      userId: null,
      role: "editor",
      canInvite: true,
      isCurrentUser: false,
    },
    {
      id: "m-3",
      name: "Farhan",
      shortName: "Farhan",
      initials: "FH",
      avatarBg: "#d9efe6",
      avatarFg: "#1f6b4d",
      userId: null,
      role: "editor",
      canInvite: true,
      isCurrentUser: false,
    },
  ],
  permissions: {
    isMember: true,
    canEdit: true,
    canInvite: true,
  },
  days: [
    { number: 1, date: "2025-10-12", dateLabel: "", city: "Tokyo", color: "#116af8" },
    { number: 2, date: "2025-10-13", dateLabel: "", city: "Tokyo", color: "#20bced" },
    { number: 3, date: "2025-10-14", dateLabel: "", city: "Tokyo → Kyoto", color: "#020d33" },
    { number: 4, date: "2025-10-15", dateLabel: "", city: "Kyoto", color: "#10b981" },
    { number: 5, date: "2025-10-16", dateLabel: "", city: "Kyoto → Osaka", color: "#f59e0b" },
  ],
  stops: [
    {
      id: "s-1",
      day: 1,
      time: "10:00",
      duration: "1h 30m",
      name: "Narita Express to Shinjuku",
      area: "Narita Airport",
      category: "Transit",
      cost: 3200,
      costCurrency: "JPY",
      createdBy: "m-1",
      transit: true,
      note: "Board N'EX directly from Terminal 1. Reserved seating.",
      lat: 35.7657,
      lng: 140.3863,
      votes: ["m-1", "m-2", "m-3"],
      comments: [],
    },
    {
      id: "s-2",
      day: 1,
      time: "13:00",
      duration: "1h",
      name: "Ichiran Ramen Shinjuku",
      area: "Shinjuku",
      category: "Food",
      cost: 1500,
      costCurrency: "JPY",
      createdBy: "m-1",
      transit: false,
      note: "Famous tonkotsu ramen with solo dining booths.",
      lat: 35.6917,
      lng: 139.7029,
      votes: ["m-1", "m-2", "m-3"],
      comments: [],
    },
    {
      id: "s-3",
      day: 1,
      time: "15:00",
      duration: "2h",
      name: "Meiji Jingu Shrine & Harajuku",
      area: "Shibuya",
      category: "Sight",
      cost: 0,
      costCurrency: "JPY",
      createdBy: "m-1",
      transit: false,
      note: "Peaceful forest shrine and bustling Takeshita street.",
      lat: 35.6764,
      lng: 139.6993,
      votes: ["m-1", "m-2"],
      comments: [],
    },
    {
      id: "s-4",
      day: 2,
      time: "09:30",
      duration: "2h",
      name: "teamLab Planets TOKYO",
      area: "Toyosu",
      category: "Activity",
      cost: 3800,
      costCurrency: "JPY",
      createdBy: "m-2",
      transit: false,
      note: "Immersive barefoot digital art museum. Book slots in advance.",
      lat: 35.6496,
      lng: 139.7898,
      votes: ["m-1", "m-2", "m-3"],
      comments: [],
    },
    {
      id: "s-5",
      day: 4,
      time: "08:00",
      duration: "2h 30m",
      name: "Fushimi Inari-taisha Senbon Torii",
      area: "Kyoto",
      category: "Sight",
      cost: 0,
      costCurrency: "JPY",
      createdBy: "m-1",
      transit: false,
      note: "Iconic thousands of vermilion torii gates mountain trail.",
      lat: 34.9671,
      lng: 135.7727,
      votes: ["m-1", "m-2", "m-3"],
      comments: [],
    },
    {
      id: "s-6",
      day: 5,
      time: "18:00",
      duration: "3h",
      name: "Dotonbori Street Food Feast",
      area: "Namba, Osaka",
      category: "Food",
      cost: 4500,
      costCurrency: "JPY",
      createdBy: "m-3",
      transit: false,
      note: "Takoyaki, Okonomiyaki, Kushikatsu, and Glico Man sign photo.",
      lat: 34.6687,
      lng: 135.5013,
      votes: ["m-1", "m-2", "m-3"],
      comments: [],
    },
  ],
  expenses: [
    {
      id: "e-1",
      description: "Narita Express tickets for group",
      payer: "m-1",
      amount: 12800,
      currency: "JPY",
      category: "Transit",
      participants: ["m-1", "m-2", "m-3"],
      whenLabel: "Day 1",
    },
    {
      id: "e-2",
      description: "teamLab Planets entry passes",
      payer: "m-2",
      amount: 11400,
      currency: "JPY",
      category: "Activity",
      participants: ["m-1", "m-2", "m-3"],
      whenLabel: "Day 2",
    },
    {
      id: "e-3",
      description: "Dotonbori Dinner & Drinks",
      payer: "m-3",
      amount: 13500,
      currency: "JPY",
      category: "Food",
      participants: ["m-1", "m-2", "m-3"],
      whenLabel: "Day 5",
    },
  ],
  budget: {
    total: 37700,
    perPerson: 12567,
    balances: [
      {
        memberId: "m-1",
        paid: 12800,
        share: 11500,
        net: 1300,
      },
      {
        memberId: "m-2",
        paid: 11400,
        share: 11500,
        net: -100,
      },
      {
        memberId: "m-3",
        paid: 13500,
        share: 11500,
        net: 2000,
      },
    ],
    settlements: [
      {
        from: "m-2",
        to: "m-3",
        amount: 100,
      },
    ],
  },
};

export function initSampleTripsIfEmpty(): void {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem(LOCAL_TRIPS_KEY);
  if (!existing) {
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify([SAMPLE_TRIP]));
  }
}

export function getLocalTrips(): Trip[] {
  if (typeof window === "undefined") return [SAMPLE_TRIP];
  initSampleTripsIfEmpty();
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [SAMPLE_TRIP];
  } catch {
    return [SAMPLE_TRIP];
  }
}

export function saveLocalTrips(trips: Trip[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(trips));
}

export function getLocalTripSummaries(): TripSummary[] {
  const trips = getLocalTrips();
  return trips.map((t) => ({
    id: t.id,
    title: t.title,
    startLabel: t.startDate ? "Oct 12" : "",
    endLabel: t.startDate ? "Oct 16" : "",
    status: t.status,
    currency: t.currency,
    coverColor: "#116af8",
    coverUrl: t.coverUrl,
    memberCount: t.members.length,
    stopCount: t.stops.length,
    createdAt: new Date().toISOString(),
    creatorName: t.members[0]?.name ?? "You",
    members: t.members.map((m) => ({
      id: m.id,
      name: m.name,
      initials: m.initials,
      avatarBg: m.avatarBg,
      avatarFg: m.avatarFg,
      image: m.image ?? null,
      isCurrentUser: m.isCurrentUser,
    })),
    location: t.stops[0] ? { lat: t.stops[0].lat ?? 35.6764, lng: t.stops[0].lng ?? 139.6993 } : null,
  }));
}
