import { describe, expect, it, vi } from "vitest";
import { canManage, inScope, mockRepository } from "./mock-repository";
import { text } from "./text";
import {
  createSeed,
  inspectRows,
  resultOf,
  stateOf,
  validateChoice,
  shouldRefreshSnapshot,
} from "./model";
describe("election rules", () => {
  it("new admin elections remain in scope and cancellation rechecks state, role and reason", () => {
    let saved = "";
    vi.stubGlobal("localStorage", {
      getItem: () => saved || null,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    try {
      mockRepository.reset();
      const s = mockRepository.read();
      const value = { ...s.elections[5], id: "new-election" };
      mockRepository.saveElection(value, "election_admin");
      const own = mockRepository.read();
      expect(canManage("election_admin", value.id, own)).toBe(true);
      expect(inScope("election_admin", value.id, own)).toBe(true);
      expect(canManage("election_admin", "e1", own)).toBe(false);
      expect(() =>
        mockRepository.cancelUnit("u6", "election_admin", " "),
      ).toThrow(text.cancelReasonRequired);
      expect(() =>
        mockRepository.cancelUnit("u0", "election_admin", "ทดสอบ"),
      ).toThrow(text.cancelOpenDenied);
      expect(() =>
        mockRepository.cancelUnit("u4", "super_admin", "ทดสอบ"),
      ).toThrow(text.cancelClosedDenied);
      const count = s.units[0].ballotCount;
      mockRepository.cancelUnit("u0", "super_admin", "  ทดสอบ  ");
      const cancelled = mockRepository.read();
      expect(cancelled.units[0].cancelled).toBe(true);
      expect(cancelled.units[0].ballotCount).toBe(count);
      expect(cancelled.audit.at(-1)?.reason).toBe("ทดสอบ");
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("seed gives at most one unit per member in the same election", () => {
    const s = createSeed(),
      pairs = s.eligibility.map(
        (x) =>
          `${x.memberCode}:${s.units.find((u) => u.id === x.unitId)!.electionId}`,
      );
    expect(new Set(pairs).size).toBe(pairs.length);
    expect(
      s.elections.every((e) => Date.parse(e.close) > Date.parse(e.open)),
    ).toBe(true);
  });
  it("releases snapshots only after threshold, k new ballots and interval", () => {
    const s = createSeed(),
      u = s.units[0];
    expect(shouldRefreshSnapshot(u, 40, "2026-10-15T03:10:00Z")).toBe(false);
    expect(shouldRefreshSnapshot(u, 41, "2026-10-15T03:09:59Z")).toBe(false);
    expect(shouldRefreshSnapshot(u, 41, "2026-10-15T03:10:00Z")).toBe(true);
    expect(
      shouldRefreshSnapshot(
        { ...u, snapshotTotal: 0 },
        9,
        "2026-10-15T03:10:00Z",
      ),
    ).toBe(false);
  });
  it("computes all states and close boundary using the mock clock", () => {
    const s = createSeed(),
      u = s.units[0],
      e = s.elections[0];
    expect(stateOf(e, u, s.now)).toBe("open");
    expect(stateOf(e, u, e.close)).toBe("closed");
    expect(stateOf(e, u, "2026-10-14T01:00:00Z")).toBe("future");
    expect(stateOf({ ...e, published: false }, u, s.now)).toBe("draft");
    expect(stateOf(e, { ...u, cancelled: true }, s.now)).toBe("cancelled");
    expect(stateOf(s.elections[4], s.units[5], s.now)).toBe("announced");
  });
  it("validates exclusive abstention, count, duplicates and candidate unit", () => {
    const s = createSeed(),
      u = s.units[0],
      e = s.elections[0],
      id = u.candidates[0].id;
    expect(validateChoice(e, u, [id], false)).toBe(true);
    expect(validateChoice(e, u, [], true)).toBe(true);
    for (const ids of [[], [id, id], ["foreign"]])
      expect(validateChoice(e, u, ids, false)).toBe(false);
    expect(validateChoice(e, u, [id], true)).toBe(false);
    expect(validateChoice({ ...e, abstain: false }, u, [], true)).toBe(false);
    const multi = s.elections[1],
      two = s.units[2].candidates.slice(0, 2).map((c) => c.id);
    expect(validateChoice(multi, s.units[2], two, false)).toBe(true);
    expect(validateChoice(multi, s.units[2], two.slice(0, 1), false)).toBe(
      false,
    );
  });
  it("requires human decision for ties, empty votes, too few candidates and undefined rule", () => {
    const s = createSeed(),
      u = s.units[4],
      e = s.elections[3];
    expect(resultOf(e, u, 4).reason).toContain("เสมอ");
    expect(resultOf(e, u, 0).reason).toContain("ไม่มี");
    expect(resultOf({ ...e, seats: 4 }, u, 4).reason).toContain("น้อย");
    expect(resultOf({ ...e, winnerRule: "undefined" }, u, 4).reason).toContain(
      "กำหนด",
    );
    expect(resultOf(s.elections[0], s.units[0], 36).winners).toHaveLength(1);
  });
  it("keeps leading zeros, detects duplicates and never overwrites used entitlement", () => {
    const s = createSeed(),
      u = s.units[0];
    const raw = [
      { member_code: "000128", name: "New", affiliation: "Office" },
      { member_code: "000128", name: "New", affiliation: "Office" },
      { member_code: "000125", name: "Old", affiliation: "Office" },
      { member_code: 123, name: "Numeric", affiliation: "Office" },
    ];
    const rows = inspectRows(raw, s, u);
    expect(rows.map((r) => r.status)).toEqual([
      "pass",
      "error",
      "skip",
      "error",
    ]);
    expect(rows[0].code).toBe("000128");
    expect(s.eligibility.find((x) => x.memberCode === "000125")?.voted).toBe(
      true,
    );
  });
  it("detects membership in another unit and changed member contact", () => {
    const s = createSeed();
    expect(
      inspectRows(
        [{ member_code: "000123", name: "New", affiliation: "Office" }],
        s,
        s.units[1],
      )[0].status,
    ).toBe("error");
    expect(
      inspectRows(
        [
          {
            member_code: "000123",
            name: "New",
            affiliation: "Office",
            email: "different@example.com",
          },
        ],
        s,
        s.units[2],
      )[0].status,
    ).toBe("review");
  });
  it("seed ballot totals and participation agree for one-selection units", () => {
    const s = createSeed();
    for (const u of s.units)
      expect(
        Object.values(u.tally).reduce((a, b) => a + b, u.abstainCount),
      ).toBe(s.eligibility.filter((x) => x.unitId === u.id && x.voted).length);
  });
});
