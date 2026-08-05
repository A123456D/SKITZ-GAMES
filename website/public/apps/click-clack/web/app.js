(() => {
	"use strict";

	const $ = (sel, root = document) => root.querySelector(sel);
	const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

	const keyboardEl = $("#keyboard");
	const stageEl = $("#mouse-stage");
	const crosshairEl = $("#crosshair");
	const logEl = $("#event-log");
	const toastEl = $("#toast");
	const typeInput = $("#type-catcher-input");

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
	const wheelUp = $('[data-wheel="up"]');
	const wheelDown = $('[data-wheel="down"]');

	const modChips = {
		ctrl: $('[data-mod="ctrl"]'),
		alt: $('[data-mod="alt"]'),
		shift: $('[data-mod="shift"]'),
		meta: $('[data-mod="meta"]'),
	};

	const ROWS = [
		{
			cls: "kb-row kb-row--fn",
			keys: [
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
		},
		{
			cls: "kb-row",
			keys: [
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
		},
		{
			cls: "kb-row",
			keys: [
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
		},
		{
			cls: "kb-row",
			keys: [
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
		},
		{
			cls: "kb-row",
			keys: [
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
		},
		{
			cls: "kb-row",
			keys: [
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
		},
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

	const CODE_TO_KEY = {
		Space: " ",
		Backspace: "Backspace",
		Enter: "Enter",
		Tab: "Tab",
		Escape: "Escape",
		ArrowLeft: "ArrowLeft",
		ArrowUp: "ArrowUp",
		ArrowDown: "ArrowDown",
		ArrowRight: "ArrowRight",
		ShiftLeft: "Shift",
		ShiftRight: "Shift",
		ControlLeft: "Control",
		ControlRight: "Control",
		AltLeft: "Alt",
		AltRight: "Alt",
		MetaLeft: "Meta",
		MetaRight: "Meta",
		CapsLock: "CapsLock",
		Backquote: "`",
		Minus: "-",
		Equal: "=",
		BracketLeft: "[",
		BracketRight: "]",
		Backslash: "\\",
		Semicolon: ";",
		Quote: "'",
		Comma: ",",
		Period: ".",
		Slash: "/",
	};

	const keyMap = new Map();
	const held = new Set();
	const coarse =
		window.matchMedia("(hover: none), (pointer: coarse)").matches ||
		navigator.maxTouchPoints > 0;
	const state = {
		clicks: 0,
		keys: 0,
		scroll: 0,
		coords: { x: 0, y: 0 },
		clickTimes: [],
		pointerLocked: false,
		activePointers: new Set(),
		lastTrailAt: 0,
	};

	function buildKeyboard() {
		keyboardEl.replaceChildren();
		for (const row of ROWS) {
			const rowEl = document.createElement("div");
			rowEl.className = row.cls;
			for (const [code, label] of row.keys) {
				const key = document.createElement("button");
				key.type = "button";
				key.className = "key";
				key.dataset.key = code;
				key.textContent = label;
				key.setAttribute("aria-label", label);
				if (MOD_CODES.has(code)) key.classList.add("is-mod");
				if (SPECIAL_CODES.has(code)) key.classList.add("is-special");
				rowEl.appendChild(key);
				keyMap.set(code, key);
			}
			keyboardEl.appendChild(rowEl);
		}
	}

	function prettyFromCode(code, key) {
		if (key === " " || code === "Space") return "Space";
		if (key && key.length === 1) return key.toUpperCase();
		if (code.startsWith("Key") && code.length === 4) return code.slice(3);
		if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
		return key || code;
	}

	function setStat(el, value) {
		el.textContent = value;
	}

	function updateMods(e) {
		modChips.ctrl.classList.toggle("is-on", Boolean(e?.ctrlKey));
		modChips.alt.classList.toggle("is-on", Boolean(e?.altKey));
		modChips.shift.classList.toggle("is-on", Boolean(e?.shiftKey));
		modChips.meta.classList.toggle("is-on", Boolean(e?.metaKey));
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

	function registerKey(code, key, { synthetic = false } = {}) {
		if (!code) return;
		if (held.has(code) && !synthetic) return;
		held.add(code);
		flashKey(code, true);
		state.keys += 1;
		setStat(out.keys, String(state.keys));
		const pretty = prettyFromCode(code, key);
		setStat(out.lastKey, pretty);
		setStat(out.code, code);
		pushLog("key", `${pretty} · ${code}`);
	}

	function releaseKey(code) {
		held.delete(code);
		flashKey(code, false);
	}

	function resolveCode(code, key) {
		if (code) return code;
		if (!key) return "";
		if (key === " ") return "Space";
		if (key.length === 1 && /[a-zA-Z]/.test(key)) return `Key${key.toUpperCase()}`;
		if (key.length === 1 && /[0-9]/.test(key)) return `Digit${key}`;
		const map = {
			Backspace: "Backspace",
			Enter: "Enter",
			Tab: "Tab",
			Escape: "Escape",
			ArrowLeft: "ArrowLeft",
			ArrowUp: "ArrowUp",
			ArrowDown: "ArrowDown",
			ArrowRight: "ArrowRight",
			Shift: "ShiftLeft",
			Control: "ControlLeft",
			Alt: "AltLeft",
			Meta: "MetaLeft",
		};
		return map[key] || key;
	}

	function onKeyDown(e) {
		if (e.code === "Escape" && state.pointerLocked) {
			document.exitPointerLock?.();
		}
		updateMods(e);
		if (e.repeat) return;
		registerKey(resolveCode(e.code, e.key), e.key);
	}

	function onKeyUp(e) {
		updateMods(e);
		releaseKey(resolveCode(e.code, e.key));
	}

	function stagePoint(e) {
		const rect = stageEl.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		if (state.pointerLocked) {
			x = state.coords.x + (e.movementX || 0);
			y = state.coords.y + (e.movementY || 0);
			x = Math.max(0, Math.min(rect.width, x));
			y = Math.max(0, Math.min(rect.height, y));
		}
		return {
			x: Math.max(0, Math.min(rect.width, x)),
			y: Math.max(0, Math.min(rect.height, y)),
			rect,
		};
	}

	function moveCursor(x, y, { trail = true } = {}) {
		state.coords = { x, y };
		crosshairEl.style.left = `${x}px`;
		crosshairEl.style.top = `${y}px`;
		setStat(out.coords, `${Math.round(x)}, ${Math.round(y)}`);

		if (!trail) return;
		const now = performance.now();
		const gap = coarse ? 28 : 10;
		if (now - state.lastTrailAt < gap) return;
		state.lastTrailAt = now;

		const dot = document.createElement("span");
		dot.className = "trail-dot";
		dot.style.left = `${x}px`;
		dot.style.top = `${y}px`;
		stageEl.appendChild(dot);
		dot.addEventListener("animationend", () => dot.remove());
		while (stageEl.querySelectorAll(".trail-dot").length > (coarse ? 18 : 40)) {
			stageEl.querySelector(".trail-dot")?.remove();
		}
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

	function recordClick(button, x, y) {
		const btn = mouseBtns[button];
		btn?.classList.add("is-down");
		const colors = {
			0: "var(--skitz-red)",
			1: "var(--skitz-yellow)",
			2: "var(--skitz-blue)",
		};
		burst(x, y, colors[button] || "var(--skitz-red)");
		state.clicks += 1;
		state.clickTimes.push(performance.now());
		setStat(out.clicks, String(state.clicks));
		updateCps();
		const names = ["Left", "Middle", "Right"];
		pushLog("mouse", `${names[button] || "Btn"} @ ${Math.round(x)},${Math.round(y)}`);
	}

	function onPointerMove(e) {
		if (!state.pointerLocked && !state.activePointers.has(e.pointerId)) {
			if (e.target !== stageEl && !stageEl.contains(e.target)) return;
		}
		const { x, y } = stagePoint(e);
		moveCursor(x, y);
	}

	function onPointerDown(e) {
		if (e.target !== stageEl && !stageEl.contains(e.target)) return;
		if (e.pointerType !== "touch" && e.button > 2) return;
		e.preventDefault();
		stageEl.setPointerCapture?.(e.pointerId);
		state.activePointers.add(e.pointerId);
		const { x, y } = stagePoint(e);
		moveCursor(x, y, { trail: false });
		const button = e.pointerType === "touch" ? 0 : e.button;
		recordClick(button, x, y);
	}

	function onPointerUp(e) {
		state.activePointers.delete(e.pointerId);
		try {
			stageEl.releasePointerCapture?.(e.pointerId);
		} catch {
			/* already released */
		}
		const button = e.pointerType === "touch" ? 0 : e.button;
		mouseBtns[button]?.classList.remove("is-down");
	}

	function onWheel(e) {
		if (e.target !== stageEl && !stageEl.contains(e.target)) return;
		e.preventDefault();
		applyScroll(e.deltaY);
	}

	function applyScroll(deltaY) {
		state.scroll += deltaY;
		setStat(out.scroll, String(Math.round(state.scroll)));
		const dir = deltaY < 0 ? "up" : "down";
		const chip = dir === "up" ? wheelUp : wheelDown;
		wheelUp.classList.remove("is-on");
		wheelDown.classList.remove("is-on");
		chip?.classList.add("is-on");
		pushLog("mouse", `Scroll ${dir} (${Math.round(deltaY)})`);
		clearTimeout(applyScroll._t);
		applyScroll._t = setTimeout(() => {
			wheelUp.classList.remove("is-on");
			wheelDown.classList.remove("is-on");
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
		$$(".mouse-btn.is-down, .wheel-hit.is-on").forEach((el) =>
			el.classList.remove("is-down", "is-on"),
		);
		held.clear();
		if (typeInput) typeInput.value = "";
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
		const lockBtn = $("#btn-lock");
		lockBtn?.classList.toggle("is-active", state.pointerLocked);
		if (lockBtn) {
			lockBtn.textContent = state.pointerLocked ? "Unlock pointer" : "Lock pointer";
		}
		if (state.pointerLocked) showToast("Pointer locked — Esc to exit");
	}

	function blurCleanup() {
		held.forEach((code) => flashKey(code, false));
		held.clear();
		Object.values(modChips).forEach((el) => el.classList.remove("is-on"));
		Object.values(mouseBtns).forEach((el) => el?.classList.remove("is-down"));
		state.activePointers.clear();
	}

	function syntheticKeyFromCode(code) {
		if (CODE_TO_KEY[code]) return CODE_TO_KEY[code];
		if (code.startsWith("Key") && code.length === 4) return code.slice(3).toLowerCase();
		if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
		if (code.startsWith("F") && code.length <= 3) return code;
		return code;
	}

	function bindVirtualKeyboard() {
		keyboardEl.addEventListener("pointerdown", (e) => {
			const keyEl = e.target.closest(".key");
			if (!keyEl) return;
			e.preventDefault();
			const code = keyEl.dataset.key;
			registerKey(code, syntheticKeyFromCode(code), { synthetic: true });
			const up = (ev) => {
				if (ev.pointerId !== e.pointerId) return;
				releaseKey(code);
				window.removeEventListener("pointerup", up);
				window.removeEventListener("pointercancel", up);
			};
			window.addEventListener("pointerup", up);
			window.addEventListener("pointercancel", up);
		});
	}

	function bindMouseButtons() {
		Object.entries(mouseBtns).forEach(([button, el]) => {
			if (!el) return;
			el.addEventListener("pointerdown", (e) => {
				e.preventDefault();
				e.stopPropagation();
				const { x, y } = state.coords;
				recordClick(Number(button), x, y);
				const up = (ev) => {
					if (ev.pointerId !== e.pointerId) return;
					el.classList.remove("is-down");
					window.removeEventListener("pointerup", up);
					window.removeEventListener("pointercancel", up);
				};
				window.addEventListener("pointerup", up);
				window.addEventListener("pointercancel", up);
			});
		});

		wheelUp?.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			applyScroll(-120);
		});
		wheelDown?.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			applyScroll(120);
		});
	}

	function bindTypeCatcher() {
		if (!typeInput) return;
		typeInput.addEventListener("keydown", (e) => {
			// window listener already handles; keep input from inserting endlessly
			if (e.key === "Enter" || e.key.length === 1 || e.key === "Backspace") {
				// allow natural events; clear value soon so field stays usable
				queueMicrotask(() => {
					if (typeInput.value.length > 24) typeInput.value = "";
				});
			}
		});
	}

	buildKeyboard();
	bindVirtualKeyboard();
	bindMouseButtons();
	bindTypeCatcher();

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
	stageEl.addEventListener("pointerup", onPointerUp);
	stageEl.addEventListener("pointercancel", onPointerUp);
	stageEl.addEventListener("lostpointercapture", (e) => {
		state.activePointers.delete(e.pointerId);
	});
	window.addEventListener("pointerup", onPointerUp);
	stageEl.addEventListener("wheel", onWheel, { passive: false });
	stageEl.addEventListener("contextmenu", (e) => e.preventDefault());
	document.addEventListener("pointerlockchange", onLockChange);

	$("#btn-clear").addEventListener("click", clearAll);
	$("#btn-copy").addEventListener("click", copyLast);
	$("#btn-lock")?.addEventListener("click", toggleLock);

	setInterval(updateCps, 200);

	const place = () => {
		const rect = stageEl.getBoundingClientRect();
		moveCursor(rect.width / 2, rect.height / 2, { trail: false });
	};
	place();
	window.addEventListener("resize", place);
})();
