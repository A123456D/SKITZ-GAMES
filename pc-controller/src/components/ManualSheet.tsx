type Props = {
  onClose: () => void
}

export function ManualSheet({ onClose }: Props) {
  return (
    <section className="screen support-panel">
      <div className="connect-head">
        <div>
          <h1 className="headline">User manual</h1>
          <p className="sub">Everything you need to control a PC or TV.</p>
        </div>
        <button type="button" className="btn ghost connect-close" onClick={onClose}>
          Done
        </button>
      </div>

      <div className="manual-content">
        <ManualSection title="Connect a PC">
          On the phone, tap the status at the top, then Scan and Make phone discoverable. On
          Windows, open Bluetooth settings, add a device, and choose Pc Controller. Keep the app
          open while pairing.
        </ManualSection>
        <ManualSection title="Use the touchpad">
          Move one finger to move the pointer. Tap for left click, tap with two fingers for right
          click, and slide two fingers or use the side rail to scroll. Double-tap and hold to drag.
          Swipe up on the pad to open the keyboard.
        </ManualSection>
        <ManualSection title="Connect a TV">
          Put the phone and TV on the same Wi‑Fi. Tap the status, scan, then select the TV. Accept
          the permission popup shown by Samsung or LG. You can also enter the TV IP manually.
        </ManualSection>
        <ManualSection title="Samsung power">
          Enable Power On with Mobile in the TV network settings. Connect once while the TV is on
          so its MAC address is saved. The Power button can then wake it from standby.
        </ManualSection>
        <ManualSection title="Streaming buttons">
          Netflix, Prime Video, Disney+, and Apple TV launch the matching installed app when the TV
          exposes app launching. The app must already be installed and available in your region.
        </ManualSection>
        <ManualSection title="Automatic reconnect">
          The last successfully connected TV is remembered and reconnected when Pc Controller
          opens. A saved TV stays in the connection list even when it is temporarily offline.
        </ManualSection>
      </div>
    </section>
  )
}

function ManualSection({ title, children }: { title: string; children: string }) {
  return (
    <article className="manual-section">
      <h2>{title}</h2>
      <p>{children}</p>
    </article>
  )
}
