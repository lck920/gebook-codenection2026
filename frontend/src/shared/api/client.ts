import { config } from "@/shared/config";
import {
  getLocalTestSession,
  getLocalTrips,
  getLocalTripSummaries,
  saveLocalTrips,
} from "@/shared/lib/local-test-mode";
import type { Trip } from "@/entities/trip";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public current?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface SuccessEnvelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error: { code: string; message: string; current?: unknown };
}

function handleLocalMockApi<T>(path: string, init?: RequestInit): T | null {
  const isTestSession = Boolean(getLocalTestSession());
  if (!isTestSession) return null;

  const method = init?.method?.toUpperCase() ?? "GET";

  // /api/trips list
  if (path === "/api/trips" && method === "GET") {
    return getLocalTripSummaries() as unknown as T;
  }

  // /api/trips/:id detail
  const tripMatch = /^\/api\/trips\/([^/]+)$/.exec(path);
  if (tripMatch && method === "GET") {
    const id = tripMatch[1];
    const trips = getLocalTrips();
    const found = trips.find((t) => t.id === id) ?? trips[0];
    return found as unknown as T;
  }

  // /api/trips create
  if (path === "/api/trips" && method === "POST") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const trips = getLocalTrips();
    const newTrip: Trip = {
      id: `trip-${Date.now()}`,
      title: body.title || "My New Trip",
      status: "planning",
      currency: body.currency || "MYR",
      version: 1,
      startDate: body.startDate || "2025-11-01",
      coverUrl: null,
      intake: null,
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
      ],
      permissions: { isMember: true, canEdit: true, canInvite: true },
      days: [{ number: 1, date: "2025-11-01", dateLabel: "", city: body.destination || "Kuala Lumpur", color: "#116af8" }],
      stops: [],
      expenses: [],
      contributions: [],
      budgetItems: [],
      budget: { total: body.budgetAmount || 5000, perPerson: body.budgetAmount || 5000, balances: [], settlements: [] },
    };
    trips.unshift(newTrip);
    saveLocalTrips(trips);
    return newTrip as unknown as T;
  }

  // /api/trips/:id/budget-contributions
  const poolMatch = /^\/api\/trips\/([^/]+)\/budget-contributions$/.exec(path);
  if (poolMatch && method === "PUT") {
    const body = init?.body
      ? (JSON.parse(init.body as string) as {
          memberId: string;
          amount: number;
          currency?: string;
        })
      : null;
    const trips = getLocalTrips();
    const trip = trips.find((t) => t.id === poolMatch[1]) ?? trips[0];
    if (!trip || !body) return null;

    const rest = (trip.contributions ?? []).filter(
      (c) => c.memberId !== body.memberId,
    );
    // Mirrors the server: a zero contribution drops the row entirely.
    trip.contributions =
      body.amount > 0
        ? [
            ...rest,
            {
              memberId: body.memberId,
              amount: Math.round(body.amount),
              currency: body.currency || trip.currency,
            },
          ]
        : rest;
    saveLocalTrips(trips);
    return trip as unknown as T;
  }

  // /api/trips/:id/budget-items
  const itemsMatch = /^\/api\/trips\/([^/]+)\/budget-items$/.exec(path);
  if (itemsMatch && method === "POST") {
    const body = init?.body ? JSON.parse(init.body as string) : null;
    const trips = getLocalTrips();
    const trip = trips.find((t) => t.id === itemsMatch[1]) ?? trips[0];
    if (!trip || !body) return null;
    trip.budgetItems = [
      ...(trip.budgetItems ?? []),
      {
        id: `bi-${Date.now()}`,
        label: body.label,
        category: body.category ?? "Plan",
        amount: Math.round(body.amount),
        currency: body.currency || trip.currency,
        createdBy: trip.members.find((m) => m.isCurrentUser)?.id ?? "",
      },
    ];
    saveLocalTrips(trips);
    return trip as unknown as T;
  }

  const itemMatch = /^\/api\/trips\/([^/]+)\/budget-items\/([^/]+)$/.exec(path);
  if (itemMatch && (method === "PATCH" || method === "DELETE")) {
    const trips = getLocalTrips();
    const trip = trips.find((t) => t.id === itemMatch[1]) ?? trips[0];
    if (!trip) return null;
    const itemId = itemMatch[2];

    if (method === "DELETE") {
      trip.budgetItems = (trip.budgetItems ?? []).filter((i) => i.id !== itemId);
    } else {
      const body = init?.body ? JSON.parse(init.body as string) : null;
      if (!body) return null;
      trip.budgetItems = (trip.budgetItems ?? []).map((i) =>
        i.id === itemId
          ? {
              ...i,
              label: body.label,
              amount: Math.round(body.amount),
              category: body.category ?? i.category,
            }
          : i,
      );
    }
    saveLocalTrips(trips);
    return trip as unknown as T;
  }

  // /api/preferences
  if (path === "/api/preferences" && method === "GET") {
    return { defaultCurrency: "MYR", agentPanelOpen: false } as unknown as T;
  }

  return null;
}

/** Typed fetch against the API with seamless local-test fallback. */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  // If in local test session, check local mock handlers first
  if (getLocalTestSession()) {
    const mock = handleLocalMockApi<T>(path, init);
    if (mock !== null) return mock;
  }

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    const body: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const err = (body as ErrorEnvelope | null)?.error;
      throw new ApiError(
        err?.code ?? "unknown",
        err?.message ?? res.statusText,
        res.status,
        err?.current,
      );
    }

    return (body as SuccessEnvelope<T>).data;
  } catch (err) {
    // If request failed and we can fall back to local test mock, do so gracefully
    const mock = handleLocalMockApi<T>(path, init);
    if (mock !== null) return mock;
    throw err;
  }
}
