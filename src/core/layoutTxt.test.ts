import { describe, expect, it } from "vitest";
import { parseLayoutTxt, writeLayoutTxt } from "./layoutTxt";
import type { ShipLayout } from "./model";

const SAMPLE =
  [
    "X_OFFSET",
    "1",
    "Y_OFFSET",
    "2",
    "VERTICAL",
    "0",
    "HORIZONTAL",
    "-10",
    "ELLIPSE",
    "350",
    "220",
    "-30",
    "0",
    "ROOM",
    "0",
    "0",
    "0",
    "2",
    "1",
    "ROOM",
    "1",
    "2",
    "0",
    "2",
    "2",
    "DOOR",
    "2",
    "0",
    "0",
    "1",
    "1",
    "DOOR",
    "0",
    "0",
    "0",
    "-1",
    "0",
  ].join("\r\n") + "\r\n";

const SAMPLE_MODEL: ShipLayout = {
  xOffset: 1,
  yOffset: 2,
  horizontal: -10,
  vertical: 0,
  ellipse: { halfWidth: 350, halfHeight: 220, offsetX: -30, offsetY: 0 },
  rooms: [
    { id: 0, x: 0, y: 0, w: 2, h: 1 },
    { id: 1, x: 2, y: 0, w: 2, h: 2 },
  ],
  doors: [
    { x: 2, y: 0, roomA: 0, roomB: 1, vertical: true },
    { x: 0, y: 0, roomA: 0, roomB: -1, vertical: false },
  ],
};

describe("parseLayoutTxt", () => {
  it("reads every keyword", () => {
    expect(parseLayoutTxt(SAMPLE)).toEqual(SAMPLE_MODEL);
  });

  it("accepts any whitespace and keyword order", () => {
    const text =
      "  ELLIPSE 350 220 -30 0 ROOM 0 0 0 2 1\tROOM 1 2 0 2 2\n\nDOOR 2 0 0 1 1 DOOR 0 0 0 -1 0 HORIZONTAL -10 VERTICAL 0 Y_OFFSET 2 X_OFFSET 1";
    expect(parseLayoutTxt(text)).toEqual(SAMPLE_MODEL);
  });

  it("leaves absent keywords absent", () => {
    const model = parseLayoutTxt("VERTICAL 5 ELLIPSE 1 2 3 4");
    expect(model).toEqual({
      vertical: 5,
      ellipse: { halfWidth: 1, halfHeight: 2, offsetX: 3, offsetY: 4 },
      rooms: [],
      doors: [],
    });
    expect("xOffset" in model).toBe(false);
    expect("horizontal" in model).toBe(false);
  });

  it("defaults a missing ELLIPSE to zeros", () => {
    expect(parseLayoutTxt("ROOM 0 0 0 1 1").ellipse).toEqual({
      halfWidth: 0,
      halfHeight: 0,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it("keeps inner door order and normalizes airlocks to room, -1", () => {
    const model = parseLayoutTxt("ELLIPSE 0 0 0 0 DOOR 1 1 5 3 1 DOOR 1 1 -1 4 0");
    expect(model.doors).toEqual([
      { x: 1, y: 1, roomA: 5, roomB: 3, vertical: true },
      { x: 1, y: 1, roomA: 4, roomB: -1, vertical: false },
    ]);
  });

  it("keeps unknown keywords with their values up to the next known keyword", () => {
    const model = parseLayoutTxt(
      "X_OFFSET 1 SPECIAL 3 abc -2 ROOM 0 0 0 1 1 BANANA DOOR 1 0 0 -1 1"
    );
    expect(model.xOffset).toBe(1);
    expect(model.rooms).toHaveLength(1);
    expect(model.doors).toHaveLength(1);
    // BANANA follows a kept entry, so it is merged into it (see the merge test below).
    expect(model.extraKeywords).toEqual([
      { keyword: "SPECIAL", values: ["3", "abc", "-2", "BANANA"] },
    ]);
    expect(parseLayoutTxt("BANANA ELLIPSE 1 2 3 4").extraKeywords).toEqual([
      { keyword: "BANANA", values: [] },
    ]);
  });

  it("keeps a known keyword with missing or bad values instead of throwing", () => {
    expect(parseLayoutTxt("ROOM 0 1 2").extraKeywords).toEqual([
      { keyword: "ROOM", values: ["0", "1", "2"] },
    ]);
    const bad = parseLayoutTxt("ROOM 0 1 2 x 1 VERTICAL 0");
    expect(bad.rooms).toEqual([]);
    expect(bad.vertical).toBe(0);
    expect(bad.extraKeywords).toEqual([{ keyword: "ROOM", values: ["0", "1", "2", "x", "1"] }]);
    // Leading numbers without a keyword are kept too.
    expect(parseLayoutTxt("7 8 ELLIPSE 1 2 3 4").extraKeywords).toEqual([
      { keyword: "7", values: ["8"] },
    ]);
  });

  it("merges an unknown keyword into the kept entry before it, so the result reads back the same", () => {
    const model = parseLayoutTxt("FOO 1 VERTICAL 0 BAR 2 ROOM 0 x DOOR 1");
    expect(model.extraKeywords).toEqual([
      { keyword: "FOO", values: ["1", "BAR", "2"] },
      { keyword: "ROOM", values: ["0", "x"] },
      { keyword: "DOOR", values: ["1"] },
    ]);
    expect(parseLayoutTxt(writeLayoutTxt(model))).toStrictEqual(model);
  });

  it("never throws", () => {
    for (const text of [
      "",
      "   ",
      "ROOM",
      "DOOR 1 2 3 4 five",
      "1 2 3",
      "X_OFFSET X_OFFSET 2",
      "ELLIPSE 1 2 3",
      "ROOM 0 0 0 1 1 9 FOO",
    ]) {
      const model = parseLayoutTxt(text);
      expect(parseLayoutTxt(writeLayoutTxt(model))).toStrictEqual(model);
    }
  });
});

describe("writeLayoutTxt", () => {
  it("writes one token per line in vanilla keyword order", () => {
    expect(writeLayoutTxt(SAMPLE_MODEL, { lineEnding: "\r\n" })).toBe(SAMPLE);
    const lines = writeLayoutTxt(SAMPLE_MODEL).split("\n");
    expect(lines.slice(0, 8)).toEqual([
      "X_OFFSET",
      "1",
      "Y_OFFSET",
      "2",
      "VERTICAL",
      "0",
      "HORIZONTAL",
      "-10",
    ]);
    expect(lines[lines.length - 1]).toBe("");
  });

  it("skips absent keywords", () => {
    const text = writeLayoutTxt({
      ellipse: { halfWidth: 1, halfHeight: 2, offsetX: 3, offsetY: 4 },
      rooms: [],
      doors: [],
    });
    expect(text).toBe("ELLIPSE\n1\n2\n3\n4\n");
  });

  it("always writes airlocks as room, -1", () => {
    const text = writeLayoutTxt({
      ...SAMPLE_MODEL,
      doors: [{ x: 0, y: 0, roomA: -1, roomB: 1, vertical: true }],
    });
    expect(text.endsWith("DOOR\n0\n0\n1\n-1\n1\n")).toBe(true);
  });

  it("round-trips", () => {
    expect(parseLayoutTxt(writeLayoutTxt(SAMPLE_MODEL))).toEqual(SAMPLE_MODEL);
  });
});

describe("writeLayoutTxt with unknown keywords", () => {
  it("writes them after the doors, one token per line", () => {
    const model = parseLayoutTxt("SPECIAL 3 abc ELLIPSE 1 2 3 4 DOOR 0 0 0 -1 1");
    expect(writeLayoutTxt(model)).toBe(
      "ELLIPSE\n1\n2\n3\n4\nDOOR\n0\n0\n0\n-1\n1\nSPECIAL\n3\nabc\n"
    );
  });
});
