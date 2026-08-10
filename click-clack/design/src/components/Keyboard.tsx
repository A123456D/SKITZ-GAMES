import { useMemo, useState } from "react";
import { Keycap } from "./Keycap";

const NUMS = "1234567890".split("");
const ROW1 = "QWERTYUIOP".split("");
const ROW2 = "ASDFGHJKL".split("");
const ROW3 = "ZXCVBNM".split("");

type KeyboardProps = {
  landscape?: boolean;
  compact?: boolean;
};

export function Keyboard({ landscape = false, compact = false }: KeyboardProps) {
  const [shift, setShift] = useState(false);
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const [win, setWin] = useState(false);

  const letters = useMemo(
    () => ({
      r1: ROW1,
      r2: ROW2,
      r3: ROW3,
    }),
    [],
  );

  const main = (
    <div className="kb-main">
      {!compact && (
        <div className="kb-row f-row">
          {["ESC", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map(
            (k) => (
              <Keycap
                key={k}
                label={k}
                variant="pill"
                size="sm"
              />
            ),
          )}
        </div>
      )}

      <div className="kb-row letters">
        {NUMS.map((k) => (
          <Keycap key={k} label={k} variant="round" size="lg" />
        ))}
      </div>

      <div className="kb-row letters">
        {letters.r1.map((k) => (
          <Keycap key={k} label={k} variant="round" size="lg" />
        ))}
      </div>

      <div className="kb-row letters">
        <Keycap label="TAB" variant="pill" size="sm" />
        {letters.r2.map((k) => (
          <Keycap key={k} label={k} variant="round" size="lg" />
        ))}
        <Keycap label="ENTER" variant="pill" size="sm" />
      </div>

      <div className="kb-row letters">
        <Keycap
          label="SHIFT"
          variant="pill"
          size="sm"
          latched={shift}
          onClick={() => setShift((v) => !v)}
        />
        {letters.r3.map((k) => (
          <Keycap key={k} label={k} variant="round" size="lg" />
        ))}
        <Keycap label="BKSP" variant="pill" size="sm" />
      </div>

      {!compact && (
        <div className="kb-row aux">
          {[",", ".", "/", "?", "-", "="].map((k) => (
            <Keycap key={k} label={k} variant="pill" size="sm" />
          ))}
        </div>
      )}

      <div className="kb-row mods">
        <Keycap label="CTRL" variant="pill" size="sm" latched={ctrl} onClick={() => setCtrl((v) => !v)} />
        <Keycap label="WIN" variant="pill" size="sm" latched={win} onClick={() => setWin((v) => !v)} />
        <Keycap label="ALT" variant="pill" size="sm" latched={alt} onClick={() => setAlt((v) => !v)} />
        <Keycap label="SPACE" variant="pill" size="sm" className="space" />
        <Keycap label="ENTER" variant="pill" size="sm" />
      </div>
    </div>
  );

  if (!landscape) {
    return (
      <div className="keyboard">
        {main}
        <div className="arrows">
          <Keycap label="↑" variant="pill" className="up" />
          <div className="row">
            <Keycap label="←" variant="pill" />
            <Keycap label="↓" variant="pill" />
            <Keycap label="→" variant="pill" />
          </div>
        </div>
        <div className="nav-keys">
          {["HOME", "END", "PG UP", "PG DN"].map((k) => (
            <Keycap key={k} label={k} variant="pill" size="sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="keyboard landscape">
      {main}
      <div className="kb-side">
        <Keycap label="DEL" variant="bar" size="sm" />
        <div className="arrows-side">
          <Keycap label="↑" variant="bar" />
          <div className="arrow-row">
            <Keycap label="←" variant="bar" />
            <Keycap label="↓" variant="bar" />
            <Keycap label="→" variant="bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
