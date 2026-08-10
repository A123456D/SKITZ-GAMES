import { useRef, useState } from "react";
import { Keycap } from "../components/Keycap";
import { Keyboard } from "../components/Keyboard";

export function PadScreen() {
  const wellRef = useRef<HTMLDivElement>(null);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const [held, setHeld] = useState({ l: false, m: false, r: false });
  const [sheetOpen, setSheetOpen] = useState(false);

  function onPointer(e: React.PointerEvent<HTMLDivElement>) {
    const el = wellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFinger({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div className={`pad-screen${sheetOpen ? " sheet-open" : ""}`}>
      <div className="pad-body">
        <div
          className="pad-well"
          ref={wellRef}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            onPointer(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 0) return;
            onPointer(e);
          }}
          onPointerUp={() => setFinger(null)}
          onPointerCancel={() => setFinger(null)}
        >
          {!finger && (
            <div className="mouse-glyph" aria-hidden>
              <svg viewBox="0 0 64 64">
                <rect x="20" y="8" width="24" height="40" rx="12" />
                <line x1="32" y1="12" x2="32" y2="28" />
              </svg>
            </div>
          )}
          {finger && <div className="finger" style={{ left: finger.x, top: finger.y }} />}
        </div>
        <div className="scroll-rail" title="Scroll" />
      </div>

      <div className="mouse-btns">
        <Keycap
          label="L"
          variant="bar"
          size="lg"
          latched={held.l}
          onPointerDown={() => setHeld((h) => ({ ...h, l: true }))}
          onPointerUp={() => setHeld((h) => ({ ...h, l: false }))}
          onPointerLeave={() => setHeld((h) => ({ ...h, l: false }))}
        />
        <Keycap
          label="M"
          variant="bar"
          size="lg"
          latched={held.m}
          onPointerDown={() => setHeld((h) => ({ ...h, m: true }))}
          onPointerUp={() => setHeld((h) => ({ ...h, m: false }))}
          onPointerLeave={() => setHeld((h) => ({ ...h, m: false }))}
        />
        <Keycap
          label="R"
          variant="bar"
          size="lg"
          latched={held.r}
          onPointerDown={() => setHeld((h) => ({ ...h, r: true }))}
          onPointerUp={() => setHeld((h) => ({ ...h, r: false }))}
          onPointerLeave={() => setHeld((h) => ({ ...h, r: false }))}
        />
      </div>

      <div className="sheet-handle">
        <button
          type="button"
          className={sheetOpen ? "open" : ""}
          onClick={() => setSheetOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24">
            {sheetOpen ? (
              <polyline points="6 9 12 15 18 9" />
            ) : (
              <polyline points="6 15 12 9 18 15" />
            )}
          </svg>
          {sheetOpen ? "Hide keys" : "Keys"}
        </button>
      </div>

      <div className={`kb-sheet${sheetOpen ? " open" : ""}`}>
        <div className="grab" />
        <Keyboard compact />
      </div>
    </div>
  );
}
