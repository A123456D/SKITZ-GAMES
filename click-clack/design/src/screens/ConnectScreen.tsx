const actions = [
  { title: "Allow Bluetooth", sub: "Required before pairing", primary: true },
  { title: "Make phone discoverable", sub: "Keep this screen open" },
  { title: "Restart HID", sub: "Recover a stuck session" },
];

const steps = [
  "Stay in Skitz Controller",
  "Tap Make phone discoverable",
  "PC → Bluetooth → Add → Skitz Controller",
  "Accept the pair prompt on the phone",
  "Tap Connect under Known devices",
];

export function ConnectScreen() {
  return (
    <div className="screen screen-scroll">
      <div>
        <p className="eyebrow">Remote</p>
        <h2 className="hero-title">Skitz Controller</h2>
        <p className="hero-sub">Your phone is the mouse and keyboard.</p>
        <div className="live-pill">
          <span className="dot" />
          LIVE ON PC
        </div>
      </div>

      <div className="panel">
        <h3>Connected</h3>
        <p className="mono">DESKTOP-SKITZ</p>
        <p style={{ marginTop: 8 }}>HID active — pad and keys are live.</p>
      </div>

      <div>
        <p className="eyebrow">Setup</p>
        <div className="stack">
          {actions.map((a) => (
            <button key={a.title} type="button" className={`action${a.primary ? " primary" : ""}`}>
              <strong>{a.title}</strong>
              <span>{a.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow">Pair on PC</p>
        <div className="panel">
          <div className="steps">
            {steps.map((text, i) => (
              <div className="step" key={text}>
                <b>{i + 1}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="eyebrow">Known devices</p>
        <div className="stack">
          <button type="button" className="action">
            <strong>Linked · DESKTOP-SKITZ</strong>
            <span>HID active</span>
          </button>
        </div>
      </div>
    </div>
  );
}
