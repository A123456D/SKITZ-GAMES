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

  it("startSession and doScramble assign faceStickers", () => {
    const a = startSession(3);
    expect(a.faceStickers).toHaveLength(6);
    expect(new Set(a.faceStickers).size).toBe(6);

    const b = doScramble(a);
    expect(b.faceStickers).toHaveLength(6);
    expect(new Set(b.faceStickers).size).toBe(6);
  });
});
