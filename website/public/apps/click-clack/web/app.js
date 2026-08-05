(() => {
	"use strict";

	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

	const keyboardEl = $("#keyboard");
	const stageEl = $("#mouse-stage");
	const crosshairEl = $("#crosshair");
	const logEl = $("#event-log");
	const toastEl = $("#toast");

	const out = {
		lastKey: $("#stat-last-key"),
		code: $("#stat-code"),
		coords: $("#stat-coords"),
		clicks: $("#stat-clicks"),
		scroll: $("#stat-scroll"),
		keys: $("#stat-keys"),
		cps: $("#stat-cps"),
	};

	const mouseBtns = {
		0: $('[data-mouse="left"]'),
		1: $('[data-mouse="middle"]'),
		2: $('[data-mouse="right"]'),
	};
	const wheelBtn = $('[data-mouse="wheel"]');

	const modChips = {
		ctrl: $('[data-mod="ctrl"]'),
		alt: $('[data-mod="alt"]'),
		shift: $('[data-mod="shift"]'),
		meta: $('[data-mod="meta"]'),
	};

	const ROWS = [
		[
			["Escape", "Esc"],
			["F1", "F1"],
			["F2", "F2"],
			["F3", "F3"],
			["F4", "F4"],
			["F5", "F5"],
			["F6", "F6"],
			["F7", "F7"],
			["F8", "F8"],
			["F9", "F9"],
			["F10", "F10"],
			["F11", "F11"],
			["F12", "F12"],
		],
		[
			["Backquote", "`"],
			["Digit1", "1"],
			["Digit2", "2"],
			["Digit3", "3"],
			["Digit4", "4"],
			["Digit5", "5"],
			["Digit6", "6"],
			["Digit7", "7"],
			["Digit8", "8"],
			["Digit9", "9"],
			["Digit0", "0"],
			["Minus", "-"],
			["Equal", "="],
			["Backspace", "Bksp"],
		],
		[
			["Tab", "Tab"],
			["KeyQ", "Q"],
			["KeyW", "W"],
			["KeyE", "E"],
			["KeyR", "R"],
			["KeyT", "T"],
			["KeyY", "Y"],
			["KeyU", "U"],
			["KeyI", "I"],
			["KeyO", "O"],
			["KeyP", "P"],
			["BracketLeft", "["],
			["BracketRight", "]"],
			["Backslash", "\\"],
		],
		[
			["CapsLock", "Caps"],
			["KeyA", "A"],
			["KeyS", "S"],
			["KeyD", "D"],
			["KeyF", "F"],
			["KeyG", "G"],
			["KeyH", "H"],
			["KeyJ", "J"],
			["KeyK", "K"],
			["KeyL", "L"],
			["Semicolon", ";"],
			["Quote", "'"],
			["Enter", "Enter"],
		],
		[
			["ShiftLeft", "Shift"],
			["KeyZ", "Z"],
			["KeyX", "X"],
			["KeyC", "C"],
			["KeyV", "V"],
			["KeyB", "B"],
			["KeyN", "N"],
			["KeyM", "M"],
			["Comma", ","],
			["Period", "."],
			["Slash", "/"],
			["ShiftRight", "Shift"],
		],
		[
			["ControlLeft", "Ctrl"],
			["MetaLeft", "Win"],
			["AltLeft", "Alt"],
			["Space", "Space"],
			["AltRight", "Alt"],
			["MetaRight", "Meta"],
			["ControlRight", "Ctrl"],
			["ArrowLeft", "←"],
			["ArrowUp", "↑"],
			["ArrowDown", "↓"],
			["ArrowRight", "→"],
		],
	];

	const MOD_CODES = new Set([
		"ControlLeft",
		"ControlRight",
		"AltLeft",
		"AltRight",
		"ShiftLeft",
		"ShiftRight",
		"MetaLeft",
		"MetaRight",
		"CapsLock",
	]);

	const SPECIAL_CODES = new Set([
		"Escape",
		"Enter",
		"Backspace",
		"Tab",
		"Space",
		"ArrowLeft",
		"ArrowUp",
		"ArrowDown",
		"ArrowRight",
	]);

	const keyMap = new Map();
	const held = new Set();
	const state = {
		clicks: 0,
		keys: 0,
		scroll: 0,
		coords: { x: 0, y: 0 },
		clickTimes: [],
		pointerLocked: false,
	};

	function buildKeyboard() {
		keyboardEl.replaceChildren();
		for (const row of ROWS) {
			const rowEl = document.createElement("div");
			rowEl.className = "kb-row";
			for (const [code, label] of row) {
				const key = document.createElement("div");
				key.className = "key";
				key.dataset.key = code;
				key.textContent = label;
				if (MOD_CODES.has(code)) key.classList.add("is-mod");
				if (SPECIAL_CODES.has(code)) key.classList.add("is-special");
				rowEl.appendChild(key);
				keyMap.set(code, key);
			}
			keyboardEl.appendChild(rowEl);
		}
	}

	function prettyKey(e) {
		if (e.key === " ") return "Space";
		if (e.key.length === 1) return e.key.toUpperCase();
		return e.key;
	}

	function setStat(el, value) {
		el.textContent = value;
	}

	function updateMods(e) {
		modChips.ctrl.classList.toggle("is-on", e.ctrlKey);
		modChips.alt.classList.toggle("is-on", e.altKey);
		modChips.shift.classList.toggle("is-on", e.shiftKey);
		modChips.meta.classList.toggle("is-on", e.metaKey);
	}

	function pushLog(kind, text) {
		const line = document.createElement("div");
		line.className = `log-line log-line--${kind}`;
		const time = document.createElement("time");
		const now = new Date();
		time.textContent = now.toLocaleTimeString([], {
			hour12: false,
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
		const tag = document.createElement("span");
		tag.className = "tag";
		tag.textContent = kind === "key" ? "KEY" : "MOUSE";
		const msg = document.createElement("span");
		msg.textContent = text;
		line.append(time, tag, msg);
		logEl.prepend(line);
		while (logEl.children.length > 40) logEl.lastElementChild.remove();
	}

	function flashKey(code, down) {
		const el = keyMap.get(code);
		if (!el) return;
		el.classList.toggle("is-down", down);
		el.classList.toggle("is-held", down);
	}

	function showToast(message) {
		toastEl.textContent = message;
		toastEl.classList.add("is-on");
		clearTimeout(showToast._t);
		showToast._t = setTimeout(() => toastEl.classList.remove("is-on"), 1600);
	}

	function updateCps() {
		const now = performance.now();
		state.clickTimes = state.clickTimes.filter((t) => now - t < 1000);
		setStat(out.cps, `${state.clickTimes.length}/s`);
	}

	function onKeyDown(e) {
		if (e.code === "Escape" && state.pointerLocked) {
			document.exitPointerLock?.();
		}

		updateMods(e);
		if (e.repeat) return;

		held.add(e.code);
		flashKey(e.code, true);
		state.keys += 1;
		setStat(out.keys, String(state.keys));
		setStat(out.lastKey, prettyKey(e));
		setStat(out.code, e.code || e.key);
		pushLog("key", `${prettyKey(e)} · ${e.code}`);
	}

	function onKeyUp(e) {
		updateMods(e);
		held.delete(e.code);
		flashKey(e.code, false);
	}

	function stagePoint(e) {
		const rect = stageEl.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		if (state.pointerLocked) {
			x = state.coords.x + e.movementX;
			y = state.coords.y + e.movementY;
			x = Math.max(0, Math.min(rect.width, x));
			y = Math.max(0, Math.min(rect.height, y));
		}
		return { x, y, rect };
	}

	function moveCursor(x, y) {
		state.coords = { x, y };
		crosshairEl.style.left = `${x}px`;
		crosshairEl.style.top = `${y}px`;
		setStat(out.coords, `${Math.round(x)}, ${Math.round(y)}`);

		const dot = document.createElement("span");
		dot.className = "trail-dot";
		dot.style.left = `${x}px`;
		dot.style.top = `${y}px`;
		stageEl.appendChild(dot);
		dot.addEventListener("animationend", () => dot.remove());
	}

	function burst(x, y, color) {
		const el = document.createElement("span");
		el.className = "click-burst";
		el.style.left = `${x}px`;
		el.style.top = `${y}px`;
		el.style.setProperty("--burst-color", color);
		stageEl.appendChild(el);
		el.addEventListener("animationend", () => el.remove());
	}

	function onPointerMove(e) {
		if (!stageEl.contains(e.target) && e.target !== stageEl && !state.pointerLocked) return;
		if (!state.pointerLocked && e.target !== stageEl && !stageEl.contains(e.target)) return;
		const { x, y } = stagePoint(e);
		moveCursor(x, y);
	}

	function onPointerDown(e) {
		if (e.target !== stageEl && !stageEl.contains(e.target)) return;
		if (e.button > 2) return;
		e.preventDefault();
		const { x, y } = stagePoint(e);
		moveCursor(x, y);
		const btn = mouseBtns[e.button];
		btn?.classList.add("is-down");
		const colors = {
			0: "var(--skitz-red)",
			1: "var(--skitz-yellow)",
			2: "var(--skitz-blue)",
		};
		burst(x, y, colors[e.button] || "var(--skitz-red)");
		state.clicks += 1;
		state.clickTimes.push(performance.now());
		setStat(out.clicks, String(state.clicks));
		updateCps();
		const names = ["Left", "Middle", "Right"];
		pushLog("mouse", `${names[e.button] || "Btn"} down @ ${Math.round(x)},${Math.round(y)}`);
	}

	function onPointerUp(e) {
		mouseBtns[e.button]?.classList.remove("is-down");
		if (e.button <= 2) {
			const names = ["Left", "Middle", "Right"];
			pushLog("mouse", `${names[e.button] || "Btn"} up`);
		}
	}

	function onWheel(e) {
		if (e.target !== stageEl && !stageEl.contains(e.target)) return;
		e.preventDefault();
		state.scroll += e.deltaY;
		setStat(out.scroll, String(Math.round(state.scroll)));
		wheelBtn.classList.remove("is-up", "is-down-scroll");
		const dir = e.deltaY < 0 ? "up" : "down";
		wheelBtn.classList.add(dir === "up" ? "is-up" : "is-down-scroll");
		wheelBtn.textContent = dir === "up" ? "Wheel ↑" : "Wheel ↓";
		pushLog("mouse", `Scroll ${dir} (${Math.round(e.deltaY)})`);
		clearTimeout(onWheel._t);
		onWheel._t = setTimeout(() => {
			wheelBtn.classList.remove("is-up", "is-down-scroll");
			wheelBtn.textContent = "Wheel";
		}, 220);
	}

	function clearAll() {
		state.clicks = 0;
		state.keys = 0;
		state.scroll = 0;
		state.clickTimes = [];
		setStat(out.clicks, "0");
		setStat(out.keys, "0");
		setStat(out.scroll, "0");
		setStat(out.cps, "0/s");
		setStat(out.lastKey, "—");
		setStat(out.code, "—");
		logEl.replaceChildren();
		$$(".key.is-down, .key.is-held").forEach((el) => {
			el.classList.remove("is-down", "is-held");
		});
		$$(".mouse-btn.is-down").forEach((el) => el.classList.remove("is-down"));
		held.clear();
		showToast("Counters cleared");
	}

	async function copyLast() {
		const text = `${out.lastKey.textContent} (${out.code.textContent})`;
		try {
			await navigator.clipboard.writeText(text);
			showToast(`Copied ${text}`);
		} catch {
			showToast("Clipboard blocked");
		}
	}

	async function toggleLock() {
		if (state.pointerLocked) {
			document.exitPointerLock?.();
			return;
		}
		try {
			await stageEl.requestPointerLock();
		} catch {
			showToast("Pointer lock unavailable");
		}
	}

	function onLockChange() {
		state.pointerLocked = document.pointerLockElement === stageEl;
		stageEl.classList.toggle("is-locked", state.pointerLocked);
		$("#btn-lock").classList.toggle("is-active", state.pointerLocked);
		$("#btn-lock").textContent = state.pointerLocked ? "Unlock pointer" : "Lock pointer";
		if (state.pointerLocked) showToast("Pointer locked — Esc to exit");
	}

	function blurCleanup() {
		held.forEach((code) => flashKey(code, false));
		held.clear();
		Object.values(modChips).forEach((el) => el.classList.remove("is-on"));
		Object.values(mouseBtns).forEach((el) => el?.classList.remove("is-down"));
	}

	buildKeyboard();
	setStat(out.lastKey, "—");
	setStat(out.code, "—");
	setStat(out.coords, "0, 0");
	setStat(out.clicks, "0");
	setStat(out.keys, "0");
	setStat(out.scroll, "0");
	setStat(out.cps, "0/s");

	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	window.addEventListener("blur", blurCleanup);
	stageEl.addEventListener("pointermove", onPointerMove);
	stageEl.addEventListener("pointerdown", onPointerDown);
	window.addEventListener("pointerup", onPointerUp);
	stageEl.addEventListener("wheel", onWheel, { passive: false });
	stageEl.addEventListener("contextmenu", (e) => e.preventDefault());
	document.addEventListener("pointerlockchange", onLockChange);

	$("#btn-clear").addEventListener("click", clearAll);
	$("#btn-copy").addEventListener("click", copyLast);
	$("#btn-lock").addEventListener("click", toggleLock);

	setInterval(updateCps, 200);

	// Warm start position
	const rect = stageEl.getBoundingClientRect();
	moveCursor(rect.width / 2, rect.height / 2);
})();
