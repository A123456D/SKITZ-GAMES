import { useState, type ReactNode } from "react";
import { ConnectScreen } from "./screens/ConnectScreen";
import { PadScreen } from "./screens/PadScreen";
import { KeysScreen } from "./screens/KeysScreen";
import "./index.css";
import "./screens.css";
import "./keys.css";
import "./pad.css";

type Tab = "connect" | "pad" | "keys";

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="8" cy="12" r="3" />
      <circle cx="16" cy="12" r="3" />
      <path d="M10.5 12h3" />
    </svg>
  );
}

function PadIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <rect x="3.5" y="3.5" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="3.5" width="4.5" height="4.5" rx="1" />
      <rect x="16" y="3.5" width="4.5" height="4.5" rx="1" />
      <rect x="3.5" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="16" y="9.75" width="4.5" height="4.5" rx="1" />
      <rect x="3.5" y="16" width="4.5" height="4.5" rx="1" />
      <rect x="9.75" y="16" width="4.5" height="4.5" rx="1" />
      <rect x="16" y="16" width="4.5" height="4.5" rx="1" />
    </svg>
  );
}

function KeysIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M3 17V9.5A4.5 4.5 0 0 1 7.5 5h9A4.5 4.5 0 0 1 21 9.5V17" />
      <path d="M7 11h10" />
      <path d="M9 14.5h6" />
    </svg>
  );
}

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "connect", label: "Connect", icon: <LinkIcon /> },
  { id: "pad", label: "Pad", icon: <PadIcon /> },
  { id: "keys", label: "Keys", icon: <KeysIcon /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("keys");
  const keysLandscape = tab === "keys";

  return (
    <div className={`app${keysLandscape ? " force-landscape keys-only-landscape" : ""}`}>
      <header className="header">
        <h1>Skitz Controller</h1>
      </header>

      <main className="main">
        {tab === "connect" && <ConnectScreen />}
        {tab === "pad" && <PadScreen />}
        {tab === "keys" && <KeysScreen />}
      </main>

      <nav className="nav">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`nav-item${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
