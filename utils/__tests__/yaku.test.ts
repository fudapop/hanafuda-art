import { it, describe, expect } from "vitest";
import { type CardName } from "../cards";
import { YAKU, type YakuName, checkAll, getCompleted } from "../yaku";

describe("YAKU", () => {
  const kasu: Set<CardName> = new Set([
    "matsu-no-kasu-1",
    "matsu-no-kasu-2",
    "ume-no-kasu-1",
    "ume-no-kasu-2",
    "sakura-no-kasu-1",
    "sakura-no-kasu-2",
    "ayame-no-kasu-1",
    "ayame-no-kasu-2",
    "hagi-no-kasu-1",
    "hagi-no-kasu-2",
  ]);

  it("checks for completion by number of cards", () => {
    const gokou = new Set(YAKU["gokou"].cards);
    expect(YAKU.gokou.check(gokou)).toBe(YAKU.gokou.points); // 15
    expect(YAKU.kasu.check(kasu)).toBe(YAKU.kasu.points); // 1
  });

  it("correctly calculates extra points", () => {
    const collectedExtra: Set<CardName> = new Set([
      ...kasu,
      "botan-no-kasu-1",
      "botan-no-kasu-2",
    ]);
    expect(YAKU.kasu.check(collectedExtra)).toBe(YAKU.kasu.points + 2);
  });

  it("returns no points if incomplete", () => {
    const incomplete: Set<CardName> = new Set([...kasu].slice(1));
    expect(YAKU.kasu.check(incomplete)).toBe(0);
  });

  it("correctly upgrades 3/4/5 brights", () => {
    const brights: Set<CardName> = new Set([
      "matsu-ni-tsuru",
      "sakura-ni-maku",
      "susuki-ni-tsuki",
    ]);
    expect(YAKU.sankou.check(brights)).toBe(YAKU.sankou.points); // 6

    brights.add("yanagi-ni-ono-no-toufuu");
    expect(YAKU.sankou.check(brights)).toBe(0);
    expect(YAKU.shikou.check(brights)).toBe(0);
    expect(YAKU["ame-shikou"].check(brights)).toBe(7);
    expect(YAKU.gokou.check(brights)).toBe(0);

    brights.add("kiri-ni-ho-oh");
    expect(YAKU.gokou.check(brights)).toBe(YAKU.gokou.points);
  });
});

describe("checkAll", () => {
  const collection: Set<CardName> = new Set([
    // kasu + 1 = 2 points
    "matsu-no-kasu-1",
    "matsu-no-kasu-2",
    "ume-no-kasu-1",
    "ume-no-kasu-2",
    "sakura-no-kasu-1",
    "sakura-no-kasu-2",
    "ayame-no-kasu-1",
    "ayame-no-kasu-2",
    "hagi-no-kasu-1",
    "hagi-no-kasu-2",
    "botan-no-kasu-1",
    // sankou = 6 points
    "matsu-ni-tsuru",
    "sakura-ni-maku",
    "susuki-ni-tsuki",
    // ino-shika-chou = 5 points
    "hagi-ni-inoshishi",
    "momiji-ni-shika",
    "botan-ni-chou",
    // ao-tan = 5 points
    "botan-no-tan",
    "kiku-no-tan",
    "momiji-no-tan",
  ]);
  const result = checkAll(collection);

  it("returns the correct yaku names", () => {
    expect(result).toHaveProperty("completed");
    expect(result.completed).toHaveLength(4);
    expect(result.completed).toContain("kasu");
    expect(result.completed).toContain("sankou");
    expect(result.completed).toContain("ino-shika-chou");
    expect(result.completed).toContain("ao-tan");
  });

  it("correctly calculates total points", () => {
    expect(result).toHaveProperty("score", 18);

    collection.delete("botan-no-kasu-1");
    collection.delete("momiji-no-tan");
    expect(checkAll(collection).score).toBe(12);
  });

  it("returns info for completed yaku", () => {
    const collected: Set<CardName> = new Set([
      "matsu-no-kasu-1",
      "matsu-no-kasu-2",
      "ume-no-kasu-1",
      "ume-no-kasu-2",
      "sakura-no-kasu-1",
      "sakura-no-kasu-2",
      "ayame-no-kasu-1",
      "ayame-no-kasu-2",
      "hagi-no-kasu-1",
      "hagi-no-kasu-2",
      "botan-no-kasu-1",
    ]);
    const completed: YakuName[] = ["kasu"];
    const report = getCompleted(collected, completed);
    expect(report).toHaveLength(1);
    expect(report[0]).toHaveProperty("name", "kasu");
    expect(report[0]).toHaveProperty("points", 2);
    expect(report[0]).toHaveProperty("cards", [...collected]);

    [
      "matsu-ni-tsuru",
      "sakura-ni-maku",
      "susuki-ni-tsuki",
    ].forEach(card => collected.add(card as CardName))
    completed.push("sankou");
    const newReport = getCompleted(collected, completed);
    expect(newReport).toHaveLength(2);
    expect(newReport[1].cards).toEqual([
      "matsu-ni-tsuru",
      "sakura-ni-maku",
      "susuki-ni-tsuki",
    ]);
  })
});
