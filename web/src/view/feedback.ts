/**
 * Feedback sheet — DOM overlay with textarea + Send.
 * Delivers via FormSubmit to arnyboyshow@gmail.com (first send confirms the inbox).
 */

const TO = "arnyboyshow@gmail.com";
const ENDPOINT = `https://formsubmit.co/ajax/${TO}`;

let root: HTMLDivElement | null = null;
let gameName = "SKITZ";
let onCloseCb: (() => void) | null = null;

export function isFeedbackOpen(): boolean {
  return Boolean(root?.parentElement && root.style.display !== "none");
}

export function closeFeedback(): void {
  if (!root) return;
  root.style.display = "none";
  const ta = root.querySelector("textarea");
  if (ta) ta.value = "";
  const status = root.querySelector<HTMLElement>("[data-fb-status]");
  if (status) status.textContent = "";
  const cb = onCloseCb;
  onCloseCb = null;
  cb?.();
}

export function openFeedback(
  game: string,
  opts?: { onClose?: () => void },
): void {
  gameName = game;
  onCloseCb = opts?.onClose ?? null;
  ensureDom();
  if (!root) return;
  root.style.display = "flex";
  const status = root.querySelector<HTMLElement>("[data-fb-status]");
  if (status) {
    status.textContent = "";
    status.style.color = "#888";
  }
  const sendBtn = root.querySelector<HTMLButtonElement>("[data-fb-send]");
  if (sendBtn) {
    sendBtn.disabled = false;
    sendBtn.textContent = "SEND";
  }
  const ta = root.querySelector("textarea");
  ta?.focus();
}

function ensureDom(): void {
  if (root) return;
  root = document.createElement("div");
  root.setAttribute("data-skitz-feedback", "1");
  root.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:99999",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "background:rgba(0,0,0,0.72)",
    "font-family:system-ui,Segoe UI,sans-serif",
    "box-sizing:border-box",
  ].join(";");

  const sheet = document.createElement("div");
  sheet.style.cssText = [
    "width:min(440px,100%)",
    "background:#f7f2e6",
    "color:#1a1510",
    "border:3px solid #1a1510",
    "border-radius:12px",
    "padding:20px 18px 16px",
    "box-shadow:0 18px 40px rgba(0,0,0,0.45)",
    "display:flex",
    "flex-direction:column",
    "gap:12px",
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "FEEDBACK";
  title.style.cssText =
    "font-weight:800;font-size:22px;letter-spacing:0.04em;text-align:center";

  const hint = document.createElement("div");
  hint.textContent = "Tell us what you liked, what broke, or what you want next.";
  hint.style.cssText = "font-size:14px;opacity:0.75;text-align:center;line-height:1.35";

  const ta = document.createElement("textarea");
  ta.rows = 6;
  ta.placeholder = "Type your message…";
  ta.setAttribute("aria-label", "Feedback message");
  ta.style.cssText = [
    "width:100%",
    "resize:vertical",
    "min-height:120px",
    "padding:12px",
    "border:2px solid #1a1510",
    "border-radius:8px",
    "font:inherit",
    "font-size:16px",
    "box-sizing:border-box",
    "background:#fff",
    "color:#1a1510",
  ].join(";");

  const status = document.createElement("div");
  status.dataset.fbStatus = "1";
  status.style.cssText =
    "min-height:1.2em;font-size:13px;text-align:center;color:#888";

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:10px";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "CANCEL";
  cancel.style.cssText = btnStyle(false);
  cancel.addEventListener("click", () => closeFeedback());

  const send = document.createElement("button");
  send.type = "button";
  send.dataset.fbSend = "1";
  send.textContent = "SEND";
  send.style.cssText = btnStyle(true);
  send.addEventListener("click", () => void onSend(ta, status, send));

  row.append(cancel, send);
  sheet.append(title, hint, ta, status, row);
  root.append(sheet);
  root.addEventListener("click", (e) => {
    if (e.target === root) closeFeedback();
  });
  document.body.append(root);
}

function btnStyle(primary: boolean): string {
  return [
    "flex:1",
    "padding:12px 10px",
    "border:2px solid #1a1510",
    "border-radius:8px",
    "font-weight:800",
    "font-size:15px",
    "letter-spacing:0.04em",
    "cursor:pointer",
    primary ? "background:#ff4d6d;color:#fff" : "background:#fff;color:#1a1510",
  ].join(";");
}

async function onSend(
  ta: HTMLTextAreaElement,
  status: HTMLElement,
  sendBtn: HTMLButtonElement,
): Promise<void> {
  const message = ta.value.trim();
  if (!message) {
    status.style.color = "#b00020";
    status.textContent = "Write a message first.";
    ta.focus();
    return;
  }
  sendBtn.disabled = true;
  sendBtn.textContent = "SENDING…";
  status.style.color = "#888";
  status.textContent = "Sending…";

  const err = await postFeedback(gameName, message);
  if (err) {
    status.style.color = "#b00020";
    status.textContent = err;
    sendBtn.disabled = false;
    sendBtn.textContent = "SEND";
    return;
  }
  status.style.color = "#1a7a3c";
  status.textContent = "Sent — thanks!";
  sendBtn.textContent = "SENT";
  window.setTimeout(() => closeFeedback(), 900);
}

async function postFeedback(
  game: string,
  message: string,
): Promise<string | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        game,
        message,
        _subject: `SKITZ feedback — ${game}`,
        _template: "table",
        _captcha: "false",
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      return body.slice(0, 140) || `Could not send (${res.status})`;
    }
    return null;
  } catch {
    return "Network error — try again.";
  }
}
