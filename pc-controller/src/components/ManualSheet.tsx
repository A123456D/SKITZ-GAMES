import type { ReactNode } from 'react'

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
        <ManualSection title="Connect a TV (automatic)">
          <p>
            Phone and TV must be on the same Wi‑Fi (not mobile data or guest Wi‑Fi). Tap the status
            bar → <strong>Scan BT + Wi‑Fi TVs</strong> → under Smart TVs tap your TV →{' '}
            <strong>Connect</strong>.
          </p>
          <p>
            Samsung and LG show an <strong>Allow</strong> popup on the TV — accept it on the
            television, not the phone. Stay on the TV Home screen if no popup appears.
          </p>
        </ManualSection>
        <ManualSection title="Enter TV IP manually">
          <p>Use this when scan finds nothing or the wrong TV appears.</p>
          <ol>
            <li>Tap the status bar to open Connect.</li>
            <li>
              Scroll to <strong>Manual TV IP (same Wi‑Fi)</strong>.
            </li>
            <li>
              Choose your TV type: Roku, Samsung, LG, Bravia, or Android/Google TV.
            </li>
            <li>
              Type the IP (example <strong>192.168.1.50</strong>) — numbers only, no http:// or
              port.
            </li>
            <li>
              Tap <strong>Go</strong>. Accept Allow on Samsung/LG if prompted.
            </li>
            <li>Open the TV tab to use the remote.</li>
          </ol>
        </ManualSection>
        <ManualSection title="Find your TV IP">
          <p>You need an address like 192.168.0.25 or 192.168.1.50.</p>
          <p>
            <strong>Samsung:</strong> Settings → General → Network → Network Status (or About this
            TV).
          </p>
          <p>
            <strong>LG:</strong> Settings → Network → Wi‑Fi Connection → your network → Advanced
            Wi‑Fi Settings.
          </p>
          <p>
            <strong>Roku:</strong> Settings → Network → About.
          </p>
          <p>
            <strong>Sony Bravia:</strong> Settings → Network &amp; Internet → your network →
            Status.
          </p>
          <p>
            <strong>Android / Google TV:</strong> Settings → Network &amp; Internet → Wi‑Fi → your
            network → IP address.
          </p>
          <p>
            <strong>Router:</strong> Log into your router admin page and check connected devices
            for the TV name.
          </p>
        </ManualSection>
        <ManualSection title="TV connect tips">
          <ul>
            <li>Pick the matching brand in the manual dropdown — Samsung is not Roku.</li>
            <li>Router reboots can change the IP; look it up again if connect fails.</li>
            <li>If scan lists your TV, use that instead of typing the IP.</li>
          </ul>
        </ManualSection>
        <ManualSection title="Samsung power">
          Enable Power On with Mobile in the TV network settings. Connect once while the TV is on
          so its MAC address is saved. The Power button can then wake it from standby.
        </ManualSection>
        <ManualSection title="Automatic reconnect">
          The last successfully connected TV is remembered and reconnected when Pc Controller
          opens. A saved TV stays in the connection list even when it is temporarily offline.
        </ManualSection>
        <a
          className="privacy-link"
          href="https://skitz-games.pages.dev/apps/pc-controller/privacy/"
          target="_blank"
          rel="noreferrer"
        >
          Privacy policy
        </a>
      </div>
    </section>
  )
}

function ManualSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="manual-section">
      <h2>{title}</h2>
      <div className="manual-body">{children}</div>
    </article>
  )
}
