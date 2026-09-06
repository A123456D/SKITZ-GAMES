"""Gravity Drift QA harness - Playwright-driven test utilities."""
import json, time, sys, os
from playwright.sync_api import sync_playwright

OUT = "C:/Users/PC/AppData/Local/Temp/gd-qa"
os.makedirs(OUT, exist_ok=True)
URL = "http://localhost:8931/index.html"

STATE_JS = """(() => {
  const $ = id => document.getElementById(id);
  const panel = document.querySelector('.menu-card:not(.hidden)');
  const menu = $('menu');
  const overlay = $('overlay');
  return {
    menuHidden: menu ? menu.classList.contains('hidden') : null,
    panel: panel ? panel.dataset.panel : null,
    overlayVisible: overlay ? !overlay.classList.contains('hidden') : null,
    overSummary: $('over-summary') ? $('over-summary').textContent : null,
    newBest: $('over-best') ? !$('over-best').classList.contains('hidden') : null,
    score: $('score') ? $('score').textContent : null,
    level: $('level') ? $('level').textContent : null,
    lines: $('lines') ? $('lines').textContent : null,
    time: $('time') ? $('time').textContent : null,
    nameError: $('name-error') ? !$('name-error').classList.contains('hidden') : null,
    nameValue: $('pilot-name') ? $('pilot-name').value : null,
    scoreStatus: $('score-status') ? $('score-status').textContent : null,
    scoreList: $('score-list') ? [...$('score-list').children].map(li => li.textContent.trim().slice(0,80)) : null,
    gpuError: $('gpu-error') ? ($('gpu-error').textContent.trim() || $('gpu-error').classList.contains('hidden') ? $('gpu-error').textContent.trim() : 'VISIBLE:'+$('gpu-error').textContent.trim()) : null,
    wellCanvas: (() => { const c = $('well'); return c ? {w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight} : null; })(),
    helpVisible: !!document.querySelector('.help'),
  };
})()"""


class Game:
    def __init__(self, headed=False):
        self.pw = sync_playwright().start()
        args = ["--enable-unsafe-webgpu", "--use-angle=d3d11"]
        self.browser = self.pw.chromium.launch(headless=headed, args=args)
        self.ctx = self.browser.new_context(viewport={"width": 1280, "height": 800})
        self.page = self.ctx.new_page()
        self.console = []
        self.errors = []
        self.page.on("console", lambda m: self.console.append(f"[{m.type}] {m.text[:300]}"))
        self.page.on("pageerror", lambda e: self.errors.append(str(e)[:500]))
        self.page.on("requestfailed", lambda r: self.console.append(f"[REQFAIL] {r.url} {r.failure}"))
        self.page.on("response", lambda r: self.console.append(f"[HTTP{r.status}] {r.url}") if r.status >= 400 else None)

    def relaunch_until_gpu(self, tries=8):
        """Full browser relaunch until WebGPU device creation succeeds.
        dxil.dll Error 87 in Dawn is flaky on this box (~50% of launches)."""
        argsets = [
            ["--enable-unsafe-webgpu", "--use-angle=d3d11"],
            ["--enable-unsafe-webgpu", "--use-angle=d3d11", "--disable-gpu-sandbox"],
        ]
        for i in range(tries):
            try:
                self.browser.close()
            except Exception:
                pass
            args = argsets[i % len(argsets)]
            self.browser = self.pw.chromium.launch(headless=False, args=args)
            self.ctx = self.browser.new_context(viewport={"width": 1280, "height": 800})
            self.page = self.ctx.new_page()
            self._wire_listeners()
            self.page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            self.page.wait_for_timeout(2500)
            ok, last = self.gpu_ready()
            if ok:
                return True
            print(f"  relaunch {i+1}/{tries} ({' '.join(args[-1:])}) failed: {last[:70]}")
        return False

    def _wire_listeners(self):
        self.console.clear(); self.errors.clear()
        self.page.on("console", lambda m: self.console.append(f"[{m.type}] {m.text[:300]}"))
        self.page.on("pageerror", lambda e: self.errors.append(str(e)[:500]))
        self.page.on("requestfailed", lambda r: self.console.append(f"[REQFAIL] {r.url} {r.failure}"))
        self.page.on("response", lambda r: self.console.append(f"[HTTP{r.status}] {r.url}") if r.status >= 400 else None)

    def goto(self):
        self.page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        self.page.wait_for_timeout(2500)

    def gpu_ready(self):
        s = self.state()
        return s["gpuError"] == "", s["gpuError"]

    def reopen(self):
        """Fresh page (fresh WebGPU device attempt) in same browser."""
        try:
            self.page.close()
        except Exception:
            pass
        self.console.clear()
        self.errors.clear()
        self.page = self.ctx.new_page()
        self.page.on("console", lambda m: self.console.append(f"[{m.type}] {m.text[:300]}"))
        self.page.on("pageerror", lambda e: self.errors.append(str(e)[:500]))
        self.page.on("requestfailed", lambda r: self.console.append(f"[REQFAIL] {r.url} {r.failure}"))
        self.page.on("response", lambda r: self.console.append(f"[HTTP{r.status}] {r.url}") if r.status >= 400 else None)

    def goto_until_gpu(self, tries=5):
        """Reload with fresh pages until WebGPU device is created (flaky dxil on this box)."""
        last = "never tried"
        for i in range(tries):
            self.reopen()
            self.page.goto(URL, wait_until="domcontentloaded", timeout=30000)
            self.page.wait_for_timeout(2500)
            ok, last = self.gpu_ready()
            if ok:
                return True
            print(f"  gpu attempt {i+1}/{tries} failed: {last[:80]}")
        return False

    def state(self):
        return self.page.evaluate(STATE_JS)

    def press(self, key, n=1, delay=60):
        for _ in range(n):
            self.page.keyboard.press(key)
            self.page.wait_for_timeout(delay)

    def click(self, sel):
        self.page.click(sel, timeout=5000)

    def shot(self, name):
        path = f"{OUT}/{name}.png"
        self.page.screenshot(path=path)
        return path

    def dump(self, name):
        s = self.state()
        print(f"--- {name} ---")
        print(json.dumps(s, indent=1))
        return s

    def console_errors(self):
        errs = [c for c in self.console if "[error]" in c.lower() or "[warning]" in c.lower()
                or "REQFAIL" in c or "HTTP4" in c or "HTTP5" in c]
        print("CONSOLE(err/warn):", json.dumps(errs, indent=1) if errs else "none")
        print("PAGEERRORS:", json.dumps(self.errors, indent=1) if self.errors else "none")
        return errs

    def close(self):
        try:
            self.browser.close()
        finally:
            self.pw.stop()


def start_game(g, name="QA01"):
    """From fresh load: set username and start playing."""
    g.page.fill("#pilot-name", name)
    g.click("#play-btn")
    g.page.wait_for_timeout(600)


if __name__ == "__main__":
    g = Game()
    g.goto()
    g.dump("load")
    g.console_errors()
    g.close()
