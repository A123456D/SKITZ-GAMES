import { Keyboard } from "../components/Keyboard";

/** Keys tab is landscape-only — full width typing deck. */
export function KeysScreen() {
  return (
    <div className="screen keys-screen">
      <Keyboard landscape />
    </div>
  );
}
