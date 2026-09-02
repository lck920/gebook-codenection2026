import { describe, expect, it, vi } from "vitest";
import { TripService } from "../src/application";
import type { TripChangePublisher } from "../src/domain/realtime";
import { Trip, type TripRepository } from "../src/domain/trip";

function fixture() {
  const trip = Trip.create({ title: "Kyoto" }, { id: "user-1", name: "Ada" });
  const repo: TripRepository = {
    findSummaries: vi.fn(async () => []),
    findById: vi.fn(async () => trip),
    create: vi.fn(async () => {}),
    addMember: vi.fn(async () => {}),
    rename: vi.fn(async () => {}),
    clearAgentSeedPending: vi.fn(async () => {}),
    updateIntake: vi.fn(async () => {}),
    addDay: vi.fn(async () => {}),
    updateDay: vi.fn(async () => {}),
    reorderDays: vi.fn(async () => {}),
    deleteDay: vi.fn(async () => {}),
    save: vi.fn(async () => {}),
  };
  const publisher: TripChangePublisher = {
    publish: vi.fn(async () => {}),
  };
  return { trip, repo, publisher };
}

describe("TripService realtime publication", () => {
  it("publishes once after a successful committed write", async () => {
    const { trip, repo, publisher } = fixture();
    const service = new TripService(repo, null, null, publisher);

    await service.renameTrip(trip.toSnapshot().id, "Osaka", "user-1");

    expect(repo.rename).toHaveBeenCalledOnce();
    expect(publisher.publish).toHaveBeenCalledOnce();
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: trip.toSnapshot().id,
        actorId: "user-1",
        revision: trip.toSnapshot().version,
        scopes: ["trip"],
      }),
    );
  });

  it("does not publish when persistence fails", async () => {
    const { trip, repo, publisher } = fixture();
    vi.mocked(repo.save).mockRejectedValueOnce(new Error("database unavailable"));
    const service = new TripService(repo, null, null, publisher);

    await expect(
      service.insertStop(
        trip.toSnapshot().id,
        { day: 1, index: 0, name: "Cafe", time: "09:00" },
        "user-1",
      ),
    ).rejects.toThrow("database unavailable");
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("keeps a committed mutation successful when publication fails", async () => {
    const { trip, repo, publisher } = fixture();
    vi.mocked(publisher.publish).mockRejectedValueOnce(
      new Error("realtime unavailable"),
    );
    const service = new TripService(repo, null, null, publisher);

    const result = await service.addDay(trip.toSnapshot().id, "user-1");

    expect(result.days).toHaveLength(2);
    expect(repo.addDay).toHaveBeenCalledOnce();
    expect(publisher.publish).toHaveBeenCalledOnce();
  });

  it("maps compound mutations to precise invalidation scopes", async () => {
    const { trip, repo, publisher } = fixture();
    trip.addDay();
    const service = new TripService(repo, null, null, publisher);

    await service.deleteDay(trip.toSnapshot().id, 2, "user-1");

    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ scopes: ["days", "stops"] }),
    );
  });
});
