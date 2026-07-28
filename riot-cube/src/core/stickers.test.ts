import { describe, expect, it } from "vitest";
import { mulberry32 } from "./rubik";
import {
  FACE_STICKERS,
  TILE_KINDS,
  pickFaceStickers,
  stickerForColor,
} from "./stickers";
import { doScramble, startSession } from "./session";

describe("stickers", () => {
  it("defaults stickerForColor to FACE_STICKERS", () => {
    for (let i = 0; i < 6; i++) {
      expect(stickerForColor(i)).toBe(FACE_STICKERS[i]);
    }
  });

  it("pickFaceStickers returns 6 distinct kinds", () => {
    const map = pickFaceStickers(mulberry32(0xdeadbeef));
    expect(map).toHaveLength(6);
    expect(new Set(map).size).toBe(6);
    for (const kind of map) {
      expect(TILE_KINDS).toContain(kind);
    }
  });

  it("stickerForColor uses provided map", () => {
    const map = pickFaceStickers(mulberry32(42));
    expect(stickerForColor(0, map)).toBe(map[0]);
    expect(stickerForColor(5, map)).toBe(map[5]);
  });

  it("doScramble keeps the same face stickers", () => {
    const a = startSession(3);
    const stickers = [...a.faceStickers];
    const b = doScramble(a);
    expect(b.faceStickers).toEqual(stickers);
  });

  it("startSession reuses keepStickers when valid for pool", () => {
    const a = startSession(3);
    const b = startSession(3, a.faceStickers, a.faceStickers);
    expect(b.faceStickers).toEqual(a.faceStickers);
  });
});
