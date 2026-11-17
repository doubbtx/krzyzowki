(() => {
  "use strict";

  const PUZZLES = window.PUZZLES || [];
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const STORE = "krzyzowki.v1.";
  const SETTINGS_KEY = "krzyzowki.settings";
  const LAST_KEY = "krzyzowki.last";
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const vv = window.visualViewport || null;
  document.documentElement.classList.toggle("touch", isTouch);

  // ───────── zapis ─────────
  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* tryb prywatny itp. */ }
  }
  function removeKey(key) {
    try { localStorage.removeItem(key); } catch { /* nic */ }
  }
  const load = (id) => readJSON(STORE + id);
  const save = (id, data) => writeJSON(STORE + id, data);
  const clearSave = (id) => removeKey(STORE + id);

  // systemKb: na telefonie domyślnie jest klawiatura w apce; systemową można włączyć w ustawieniach
  const DEFAULT_SETTINGS = { autoCheck: true, skipFilled: true, systemKb: false };
  let settings = { ...DEFAULT_SETTINGS, ...(readJSON(SETTINGS_KEY) || {}) };
  delete settings.builtinKb; // stara opcja z czasów, gdy domyślna była klawiatura systemowa
  const saveSettings = () => writeJSON(SETTINGS_KEY, settings);
  const useBuiltinKb = () => isTouch && !settings.systemKb;

  // ───────── pomocnicze ─────────
  const up = (ch) => (ch || "").toLocaleUpperCase("pl-PL");
  const base = (ch) => up(ch).replace(/Ł/g, "L").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const same = (a, b) => !!a && base(a) === base(b);
  const isLetter = (ch) => /^\p{L}$/u.test(ch);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DIR_NAME = { A: "poziomo", D: "pionowo" };
  const plural = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);

  function cellsOf(e) {
    const out = [];
    for (let i = 0; i < e.answer.length; i++) out.push(e.dir === "A" ? [e.row, e.col + i] : [e.row + i, e.col]);
    return out;
  }

  let toastTimer;
  function toast(msg, ms = 2200) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  }

  function confetti() {
    const box = document.createElement("div");
    box.className = "confetti";
    const emojis = ["🎉", "💅", "🔥", "✨", "🐐", "💯", "🥳"];
    for (let i = 0; i < 36; i++) {
      const s = document.createElement("span");
      s.textContent = emojis[i % emojis.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDelay = Math.random() * 0.8 + "s";
      s.style.animationDuration = 2.2 + Math.random() * 1.6 + "s";
      s.style.fontSize = 18 + Math.random() * 18 + "px";
      box.appendChild(s);
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 4800);
  }

  // ───────── status krzyżówek ─────────
  function totalCells(p) {
    return new Set(p.entries.flatMap((e) => cellsOf(e).map(([r, c]) => r + "," + c))).size;
  }
  function progressOf(p) {
    const s = load(p.id);
    if (!s) return { label: "nowa", cls: "", started: false, solved: false };
    if (s.solved) return { label: "✓ slay", cls: "done", started: true, solved: true };
    const filled = Object.values(s.fill || {}).filter(Boolean).length;
    if (!filled) return { label: "nowa", cls: "", started: false, solved: false };
    return { label: Math.round((filled / totalCells(p)) * 100) + "%", cls: "wip", started: true, solved: false };
  }
  function nextUnsolved(afterId) {
    const i = PUZZLES.findIndex((p) => p.id === afterId);
    for (let s = 1; s <= PUZZLES.length; s++) {
      const p = PUZZLES[(i + s) % PUZZLES.length];
      if (!progressOf(p).solved) return p;
    }
    return null;
  }
  const go = (p) => { location.hash = "#/k/" + encodeURIComponent(p.id); };

  // ───────── ustawienia ─────────
  function openSettings(onChange) {
    const opts = [
      ["autoCheck", "Autosprawdzanie", "Dobrze wpisane hasło od razu się zieleni i blokuje, a złe mignie na czerwono."],
      ["skipFilled", "Przeskakuj wypełnione kratki", "Kursor sam leci do następnej pustej kratki."],
    ];
    if (isTouch) opts.push(["systemKb", "Klawiatura systemowa", "Zamiast klawiatury w apce używa zwykłej klawiatury telefonu."]);
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `
      <div class="sheet" role="dialog" aria-label="Ustawienia">
        <div class="sheet-head"><b>Ustawienia</b><button class="x" aria-label="Zamknij">✕</button></div>
        ${opts.map(([k, t, d]) => `
          <label class="opt">
            <span><b>${t}</b><small>${d}</small></span>
            <input type="checkbox" data-k="${k}" ${settings[k] ? "checked" : ""}>
            <i class="sw"></i>
          </label>`).join("")}
        <button class="wipe">Wyczyść cały postęp</button>
      </div>`;
    document.body.appendChild(ov);
    let changed = false;
    const close = () => { ov.remove(); if (changed) onChange(); };
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    ov.querySelector(".x").addEventListener("click", close);
    ov.querySelectorAll("input[data-k]").forEach((inp) => inp.addEventListener("change", () => {
      settings[inp.dataset.k] = inp.checked;
      saveSettings();
      changed = true;
    }));
    const wipe = ov.querySelector(".wipe");
    wipe.addEventListener("click", () => {
      if (!wipe.classList.contains("armed")) {
        wipe.classList.add("armed");
        wipe.textContent = "Na pewno? Tapnij jeszcze raz";
        setTimeout(() => { wipe.classList.remove("armed"); wipe.textContent = "Wyczyść cały postęp"; }, 3000);
        return;
      }
      PUZZLES.forEach((p) => clearSave(p.id));
      removeKey(LAST_KEY);
      changed = true;
      toast("Postęp wyczyszczony ✨");
      close();
    });
  }

  // ───────── routing ─────────
  let game = null;
  function route() {
    if (game) { game.destroy(); game = null; }
    const m = location.hash.match(/^#\/k\/(.+)$/);
    const p = m && PUZZLES.find((x) => x.id === decodeURIComponent(m[1]));
    if (p) game = new Game(p);
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ───────── strona główna ─────────
  function renderHome() {
    document.body.style.paddingBottom = "";
    const solved = PUZZLES.filter((p) => progressOf(p).solved).length;
    const lastId = readJSON(LAST_KEY);
    const last = PUZZLES.find((p) => p.id === lastId);
    const lastPr = last && progressOf(last);
    const showContinue = last && lastPr.started && !lastPr.solved;

    const sections = [];
    for (const [i, p] of PUZZLES.entries()) {
      const name = p.section || "";
      let sec = sections.find((s) => s.name === name);
      if (!sec) sections.push((sec = { name, items: [] }));
      sec.items.push([i, p]);
    }

    app.innerHTML = `
      <header class="hero">
        <div class="hero-top">
          <h1>krzyżówki<br>dla gen <span class="z">z</span></h1>
          <button class="gear" aria-label="Ustawienia">⚙️</button>
        </div>
        <p>${PUZZLES.length} krzyżówek z odmłodzonymi pytaniami: pół normalnych haseł, pół bajek z Cartoon Network, gierek, memów i polskiego internetu. Ma być śmiesznie, nie trudno.</p>
        <div class="stats">rozwiązane: <b>${solved}/${PUZZLES.length}</b></div>
        <div class="quick">
          ${showContinue ? `<button class="btn primary cont">▶ Kontynuuj: ${last.emoji} ${esc(last.title)} <span>${lastPr.label}</span></button>` : ""}
          <button class="btn rnd">🎲 Losuj krzyżówkę</button>
        </div>
      </header>
      ${sections.map((sec) => `
        <section>
          ${sec.name ? `<h2 class="sec">${esc(sec.name)} <small>${sec.items.filter(([, p]) => progressOf(p).solved).length}/${sec.items.length}</small></h2>` : ""}
          <div class="list">
            ${sec.items.map(([i, p]) => {
              const pr = progressOf(p);
              return `
              <button class="card" data-id="${esc(p.id)}">
                <div class="emoji">${p.emoji}</div>
                <div class="meta">
                  <div class="num">#${i + 1} · ${p.entries.length} haseł</div>
                  <div class="title">${esc(p.title)}</div>
                  <div class="sub">${esc(p.subtitle)}</div>
                </div>
                <span class="badge ${pr.cls}">${pr.label}</span>
              </button>`;
            }).join("")}
          </div>
        </section>`).join("")}
      <p class="howto">
        <b>Jak grać:</b> tapnij kratkę i pisz. Tapnij ją drugi raz, żeby zmienić kierunek.
        <b>Litera</b> sama uzupełnia brakującą literę w haśle, <b>Hasło</b> odsłania całe słowo.
        „Z” zamiast „Ż” też przejdzie. Postęp zapisuje się sam.
      </p>`;

    app.querySelectorAll(".card").forEach((b) =>
      b.addEventListener("click", () => go(PUZZLES.find((p) => p.id === b.dataset.id)))
    );
    app.querySelector(".gear").addEventListener("click", () => openSettings(renderHome));
    const cont = app.querySelector(".cont");
    if (cont) cont.addEventListener("click", () => go(last));
    app.querySelector(".rnd").addEventListener("click", () => {
      const pool = PUZZLES.filter((p) => !progressOf(p).solved);
      const list = pool.length ? pool : PUZZLES;
      go(list[Math.floor(Math.random() * list.length)]);
    });
  }

  // ───────── gra ─────────
  class Game {
    constructor(p) {
      this.p = p;
      this.W = p.width;
      this.H = p.height;
      this.entries = p.entries.map((e, i) => ({ ...e, i, cells: cellsOf(e) }));
      this.grid = Array.from({ length: this.H }, () => Array(this.W).fill(null));
      for (const e of this.entries) {
        e.cells.forEach(([r, c], k) => {
          const cell = this.grid[r][c] || (this.grid[r][c] = { r, c, ans: e.answer[k], A: null, D: null, num: null });
          cell[e.dir] = e;
        });
        this.grid[e.row][e.col].num = e.num;
      }
      this.cellList = this.grid.flat().filter(Boolean);
      this.order = [...this.entries.filter((e) => e.dir === "A"), ...this.entries.filter((e) => e.dir === "D")];

      const saved = load(p.id) || {};
      this.fill = saved.fill || {};
      this.revealed = new Set(saved.revealed || []);
      this.solved = !!saved.solved;
      this.seconds = saved.seconds || 0;
      this.wrong = new Set();
      this.flash = new Set();
      this.pop = new Set();
      this.active = false; // czy użytkownik już dotknął siatki (wtedy trzymamy fokus/klawiaturę)
      this.recompute();
      this.prevFull = new Set(this.entries.filter((e) => this.isFull(e)).map((e) => e.i));

      const first = this.order.find((e) => !this.isCorrect(e)) || this.order[0];
      const start = first.cells.find(([r, c]) => !this.fill[this.key(r, c)]) || first.cells[0];
      this.sel = { r: start[0], c: start[1], dir: first.dir };

      writeJSON(LAST_KEY, p.id);
      this.render();
      this.bind();
      this.paint();
      this.startTimer();
    }

    key(r, c) { return r + "," + c; }
    cell(r, c) { return r >= 0 && c >= 0 && r < this.H && c < this.W ? this.grid[r][c] : null; }
    entry() {
      const cell = this.grid[this.sel.r][this.sel.c];
      return cell[this.sel.dir] || cell[this.sel.dir === "A" ? "D" : "A"];
    }
    isFull(e) { return e.cells.every(([r, c]) => this.fill[this.key(r, c)]); }
    isCorrect(e) { return e.cells.every(([r, c]) => same(this.fill[this.key(r, c)], this.grid[r][c].ans)); }
    isLocked(k) { return this.locked.has(k); }
    cellOk(r, c) { return same(this.fill[this.key(r, c)], this.grid[r][c].ans); }

    recompute() {
      this.locked = new Set(this.revealed);
      this.done = new Set();
      for (const e of this.entries) {
        if (this.isCorrect(e)) {
          this.done.add(e.i);
          if (settings.autoCheck) e.cells.forEach(([r, c]) => this.locked.add(this.key(r, c)));
        }
      }
    }

    persist() {
      save(this.p.id, { fill: this.fill, revealed: [...this.revealed], solved: this.solved, seconds: this.seconds });
    }

    // ───────── DOM ─────────
    render() {
      const p = this.p;
      app.innerHTML = `
        <div class="topbar">
          <button class="back" aria-label="Wróć">←</button>
          <div class="t">
            <div class="title">${p.emoji} ${esc(p.title)}</div>
            <div class="sub">${esc(p.subtitle)}</div>
          </div>
          <div class="timer">0:00</div>
          <button class="gear small" aria-label="Ustawienia">⚙️</button>
        </div>
        <div class="progress"><div class="bar"><i></i></div><span></span></div>
        <div class="cluebar">
          <button class="nav prev" aria-label="Poprzednie hasło">‹</button>
          <div class="box"><div class="label"></div><div class="text"></div></div>
          <button class="nav next" aria-label="Następne hasło">›</button>
        </div>
        <div class="board"><div class="grid" style="--w:${this.W}"></div></div>
        <div class="winbox"></div>
        <div class="actions">
          <button data-act="letter">💡 Litera</button>
          <button data-act="word">🔓 Hasło</button>
          <button data-act="check">✔ Sprawdź</button>
          <button data-act="reset" class="danger">↺ Reset</button>
        </div>
        <div class="clues">
          <div><h3>Poziomo</h3><ol class="list-A"></ol></div>
          <div><h3>Pionowo</h3><ol class="list-D"></ol></div>
        </div>`;

      const gridEl = app.querySelector(".grid");
      const builtin = useBuiltinKb();
      const inputMode = builtin ? "none" : "text";
      this.cellEls = [];
      this.inputs = [];
      for (let r = 0; r < this.H; r++) {
        this.cellEls[r] = [];
        this.inputs[r] = [];
        for (let c = 0; c < this.W; c++) {
          const d = document.createElement("div");
          const cell = this.grid[r][c];
          d.className = "cell" + (cell ? "" : " block");
          if (cell) {
            d.dataset.r = r;
            d.dataset.c = c;
            if (cell.num) d.innerHTML = `<span class="n">${cell.num}</span>`;
            const inp = document.createElement("input");
            inp.className = "ci";
            inp.type = "text";
            inp.dataset.r = r;
            inp.dataset.c = c;
            inp.setAttribute("inputmode", inputMode);
            inp.setAttribute("autocomplete", "off");
            inp.setAttribute("autocorrect", "off");
            inp.setAttribute("autocapitalize", "characters");
            inp.setAttribute("spellcheck", "false");
            inp.setAttribute("enterkeyhint", "next");
            inp.setAttribute("aria-label", `wiersz ${r + 1}, kolumna ${c + 1}`);
            if (builtin) { inp.readOnly = true; inp.tabIndex = -1; } // klawiatura w apce: telefon nie pokazuje swojej
            d.appendChild(inp);
            this.inputs[r][c] = inp;
          }
          gridEl.appendChild(d);
          this.cellEls[r][c] = d;
        }
      }

      for (const dir of ["A", "D"]) {
        app.querySelector(".list-" + dir).innerHTML = this.entries.filter((e) => e.dir === dir).map((e) => `
          <li><button class="clue" data-i="${e.i}">
            <span class="cn">${e.num}</span>
            <span class="ct">${esc(e.clue)} <span class="ce">(${e.enum})</span></span>
          </button></li>`).join("");
      }
      this.clueEls = [...app.querySelectorAll(".clue")];
      this.timerEl = app.querySelector(".timer");
      this.gridEl = gridEl;
      this.cluebar = app.querySelector(".cluebar");

      // telefon: pasek z podpowiedzią (i ewentualnie klawiatura) przyklejony nad klawiaturą systemową
      if (isTouch) {
        const dock = document.createElement("div");
        dock.className = "dock";
        dock.appendChild(this.cluebar);
        if (builtin) {
          const rows = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), [..."ZXCVBNM", "⌫"], "ĄĆĘŁŃÓŚŹŻ".split("")];
          const kb = document.createElement("div");
          kb.className = "kb";
          kb.innerHTML = rows.map((row, ri) => `<div class="row">${row.map((k) =>
            `<button data-k="${k}" class="${ri === 3 ? "pl" : ""}${k === "⌫" ? " wide" : ""}">${k}</button>`).join("")}</div>`).join("");
          dock.appendChild(kb);
          this.kb = kb;
        }
        document.body.appendChild(dock);
        this.dock = dock;
      }
      this.resize();
    }

    resize() {
      const avail = app.clientWidth - 24; // #app ma padding 12px z każdej strony
      const size = Math.max(18, Math.min(42, Math.floor((avail - (this.W - 1) * 2) / this.W)));
      document.documentElement.style.setProperty("--cell", size + "px");
      this.positionDock();
    }

    positionDock() {
      if (!this.dock) return;
      const h = this.dock.offsetHeight;
      const top = vv ? vv.offsetTop + vv.height - h : window.innerHeight - h;
      this.dock.style.transform = `translateY(${Math.max(0, Math.round(top))}px)`;
      document.body.style.paddingBottom = h + 16 + "px";
    }

    bind() {
      const keep = (el) => el.addEventListener("mousedown", (e) => e.preventDefault()); // nie zabieraj fokusu kratce
      this.onKey = (e) => this.handleKey(e);
      this.onResize = () => this.resize();
      this.onVV = () => { this.positionDock(); };
      this.onVis = () => { if (document.hidden) this.persist(); };
      document.addEventListener("keydown", this.onKey);
      window.addEventListener("resize", this.onResize);
      document.addEventListener("visibilitychange", this.onVis);
      if (vv) { vv.addEventListener("resize", this.onVV); vv.addEventListener("scroll", this.onVV); }

      app.querySelector(".back").addEventListener("click", () => { location.hash = "#/"; });
      app.querySelector(".gear").addEventListener("click", () => openSettings(route));
      for (const b of this.cluebar.querySelectorAll(".nav")) keep(b);
      this.cluebar.querySelector(".prev").addEventListener("click", () => { this.active = true; this.jump(-1); });
      this.cluebar.querySelector(".next").addEventListener("click", () => { this.active = true; this.jump(1); });
      this.cluebar.querySelector(".box").addEventListener("click", () => this.toggleDir());
      keep(this.cluebar.querySelector(".box"));

      // tapnięcie w kratkę: sami ustawiamy zaznaczenie i fokus
      keep(this.gridEl);
      this.gridEl.addEventListener("click", (e) => {
        const d = e.target.closest(".cell");
        if (!d || d.classList.contains("block")) return;
        const r = +d.dataset.r, c = +d.dataset.c;
        const cell = this.grid[r][c];
        if (r === this.sel.r && c === this.sel.c && this.active) {
          const other = this.sel.dir === "A" ? "D" : "A";
          if (cell[other]) this.sel.dir = other;
        } else {
          this.sel = { r, c, dir: cell[this.sel.dir] ? this.sel.dir : (cell.A ? "A" : "D") };
        }
        this.active = true;
        this.paint();
      });

      // fokus przeniesiony z zewnątrz (np. strzałki nad klawiaturą iOS)
      this.gridEl.addEventListener("focusin", (e) => {
        const inp = e.target;
        if (!inp.classList.contains("ci")) return;
        const r = +inp.dataset.r, c = +inp.dataset.c;
        if (r === this.sel.r && c === this.sel.c) return;
        const cell = this.grid[r][c];
        this.sel = { r, c, dir: cell[this.sel.dir] ? this.sel.dir : (cell.A ? "A" : "D") };
        this.active = true;
        this.paint();
      });

      // wpisywanie z klawiatury systemowej
      this.gridEl.addEventListener("beforeinput", (e) => this.onBeforeInput(e));
      this.gridEl.addEventListener("input", (e) => this.onInput(e));

      this.clueEls.forEach((b) => b.addEventListener("click", () => {
        this.active = true;
        this.selectEntry(this.entries[+b.dataset.i]);
      }));

      const actions = app.querySelector(".actions");
      actions.querySelectorAll("button").forEach(keep);
      actions.addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) this.action(b.dataset.act, b);
      });

      if (this.kb) {
        this.kb.addEventListener("pointerdown", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          e.preventDefault();
          this.active = true;
          if (b.dataset.k === "⌫") this.backspace();
          else this.type(b.dataset.k);
        });
      }
    }

    destroy() {
      clearInterval(this.timer);
      clearTimeout(this.popT);
      clearTimeout(this.flashT);
      this.persist();
      document.removeEventListener("keydown", this.onKey);
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVis);
      if (vv) { vv.removeEventListener("resize", this.onVV); vv.removeEventListener("scroll", this.onVV); }
      if (this.dock) this.dock.remove();
      document.body.style.paddingBottom = "";
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }

    startTimer() {
      this.timerEl.textContent = fmtTime(this.seconds);
      if (this.solved) return;
      this.timer = setInterval(() => {
        if (document.hidden || this.solved) return;
        this.seconds++;
        this.timerEl.textContent = fmtTime(this.seconds);
        if (this.seconds % 10 === 0) this.persist();
      }, 1000);
    }

    // ───────── malowanie ─────────
    paint(opts = {}) {
      const ent = this.entry();
      this.sel.dir = ent.dir;
      const inWord = new Set(ent.cells.map(([r, c]) => this.key(r, c)));
      for (const cell of this.cellList) {
        const { r, c } = cell;
        const k = this.key(r, c);
        const d = this.cellEls[r][c];
        const inp = this.inputs[r][c];
        const want = this.fill[k] || "";
        if (inp.value !== want) inp.value = want;
        d.classList.toggle("word", inWord.has(k));
        d.classList.toggle("sel", r === this.sel.r && c === this.sel.c);
        d.classList.toggle("wrong", this.wrong.has(k));
        d.classList.toggle("revealed", this.revealed.has(k));
        d.classList.toggle("ok", settings.autoCheck && this.locked.has(k) && !this.revealed.has(k));
        d.classList.toggle("flash", this.flash.has(k));
        d.classList.toggle("pop", this.pop.has(k));
      }
      this.cluebar.querySelector(".label").textContent = `${ent.num} ${DIR_NAME[ent.dir]}${this.done.has(ent.i) && settings.autoCheck ? " · ✓" : ""}`;
      this.cluebar.querySelector(".text").innerHTML = `${esc(ent.clue)} <span class="enum">(${ent.enum})</span>`;
      for (const b of this.clueEls) {
        const e = this.entries[+b.dataset.i];
        b.classList.toggle("active", e === ent);
        b.classList.toggle("filled", settings.autoCheck ? this.done.has(e.i) : this.isFull(e));
        b.classList.toggle("ok", settings.autoCheck && this.done.has(e.i));
      }

      const count = settings.autoCheck ? this.done.size : this.entries.filter((e) => this.isFull(e)).length;
      app.querySelector(".progress i").style.width = (count / this.entries.length) * 100 + "%";
      app.querySelector(".progress span").textContent = `${count}/${this.entries.length} ${settings.autoCheck ? "haseł" : "wpisanych"}`;

      this.gridEl.classList.toggle("solved", this.solved);
      this.renderWin();
      this.positionDock();
      if (opts.quiet) return; // odświeżenie po animacji – bez ruszania fokusu i przewijania
      if (this.active && !this.solved && !useBuiltinKb()) this.focusSel();
      this.ensureVisible();
    }

    renderWin() {
      const win = app.querySelector(".winbox");
      if (!this.solved) { win.innerHTML = ""; win.dataset.done = ""; return; }
      if (win.dataset.done) return;
      win.dataset.done = "1";
      const hints = this.revealed.size;
      const next = nextUnsolved(this.p.id);
      win.innerHTML = `
        <div class="win">SLAY 💅 krzyżówka rozwiązana
          <small>czas: ${fmtTime(this.seconds)} · ${hints ? `podpowiedzi: ${hints}` : "bez podpowiedzi, GOAT 🐐"}</small>
          <div class="win-actions">
            <button class="btn share">📤 Udostępnij</button>
            ${next ? `<button class="btn next-p">Następna: ${next.emoji} ${esc(next.title)} →</button>` : `<button class="btn home">Wszystkie rozwiązane 🏆</button>`}
          </div>
        </div>`;
      win.querySelector(".share").addEventListener("click", () => this.share());
      const np = win.querySelector(".next-p");
      if (np) np.addEventListener("click", () => go(next));
      const hm = win.querySelector(".home");
      if (hm) hm.addEventListener("click", () => { location.hash = "#/"; });
    }

    focusSel() {
      const inp = this.inputs[this.sel.r][this.sel.c];
      if (document.activeElement !== inp) {
        try { inp.focus({ preventScroll: true }); } catch { inp.focus(); }
      }
      try { inp.setSelectionRange(0, inp.value.length); } catch { /* nic */ }
    }

    // zaznaczona kratka nie może się chować pod paskiem z podpowiedzią ani pod klawiaturą
    ensureVisible() {
      if (!this.active) return;
      const rect = this.cellEls[this.sel.r][this.sel.c].getBoundingClientRect();
      const vTop = vv ? vv.offsetTop : 0;
      const vBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const top = this.dock ? vTop + 8 : Math.max(vTop, this.cluebar.getBoundingClientRect().bottom) + 6;
      const bottom = this.dock ? this.dock.getBoundingClientRect().top - 8 : vBottom - 8;
      if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom, behavior: "smooth" });
      else if (rect.top < top) window.scrollBy({ top: rect.top - top, behavior: "smooth" });
    }

    // ───────── sterowanie ─────────
    selectEntry(e, preferEmpty = true) {
      let target = e.cells[0];
      if (preferEmpty) {
        const free = e.cells.find(([r, c]) => !this.fill[this.key(r, c)] && !this.isLocked(this.key(r, c)));
        if (free) target = free;
      }
      this.sel = { r: target[0], c: target[1], dir: e.dir };
      this.paint();
    }

    toggleDir() {
      const cell = this.grid[this.sel.r][this.sel.c];
      const other = this.sel.dir === "A" ? "D" : "A";
      this.active = true;
      if (cell[other]) { this.sel.dir = other; this.paint(); }
    }

    jump(step) {
      const cur = this.entry();
      let i = this.order.indexOf(cur);
      for (let s = 0; s < this.order.length; s++) {
        i = (i + step + this.order.length) % this.order.length;
        if (!settings.autoCheck || !this.done.has(this.order[i].i)) break;
      }
      this.selectEntry(this.order[i]);
    }

    nextIncomplete() {
      const cur = this.entry();
      const start = this.order.indexOf(cur);
      for (let s = 1; s <= this.order.length; s++) {
        const e = this.order[(start + s) % this.order.length];
        if (e.cells.some(([r, c]) => !this.fill[this.key(r, c)])) return e;
      }
      return null;
    }

    // dokąd ma przeskoczyć kursor po wpisaniu litery
    advance(ent, idx, wasFull) {
      const free = ([r, c]) => !this.isLocked(this.key(r, c)) && (!settings.skipFilled || !this.fill[this.key(r, c)]);
      const editable = ([r, c]) => !this.isLocked(this.key(r, c));
      let target = ent.cells.slice(idx + 1).find(free);
      if (!target && settings.skipFilled && !wasFull) target = ent.cells.slice(0, idx).find(free);
      if (!target && wasFull) target = ent.cells.slice(idx + 1).find(editable);
      if (target) { this.sel = { r: target[0], c: target[1], dir: ent.dir }; return; }
      if (wasFull) return;
      const nx = this.nextIncomplete();
      if (nx) {
        const t = nx.cells.find(([r, c]) => !this.fill[this.key(r, c)]) || nx.cells[0];
        this.sel = { r: t[0], c: t[1], dir: nx.dir };
      }
    }

    type(letter) {
      if (this.solved || !isLetter(letter)) return;
      const ent = this.entry();
      const idx = ent.cells.findIndex(([r, c]) => r === this.sel.r && c === this.sel.c);
      const wasFull = this.isFull(ent);
      const k = this.key(this.sel.r, this.sel.c);
      if (!this.isLocked(k)) {
        this.fill[k] = up(letter);
        this.wrong.delete(k);
      }
      this.recompute();
      this.advance(ent, idx, wasFull);
      this.afterChange();
    }

    backspace() {
      if (this.solved) return;
      const k = this.key(this.sel.r, this.sel.c);
      if (this.fill[k] && !this.isLocked(k)) {
        delete this.fill[k];
        this.wrong.delete(k);
      } else {
        const ent = this.entry();
        const idx = ent.cells.findIndex(([r, c]) => r === this.sel.r && c === this.sel.c);
        for (let j = idx - 1; j >= 0; j--) {
          const [r, c] = ent.cells[j];
          const pk = this.key(r, c);
          if (this.isLocked(pk)) continue;
          this.sel = { r, c, dir: ent.dir };
          delete this.fill[pk];
          this.wrong.delete(pk);
          break;
        }
      }
      this.afterChange();
    }

    move(dr, dc) {
      let r = this.sel.r, c = this.sel.c;
      const dir = dc !== 0 ? "A" : "D";
      if (this.sel.dir !== dir && this.grid[r][c][dir]) { this.sel.dir = dir; this.paint(); return; }
      do { r += dr; c += dc; } while (r >= 0 && c >= 0 && r < this.H && c < this.W && !this.grid[r][c]);
      if (this.cell(r, c)) {
        const cell = this.grid[r][c];
        this.sel = { r, c, dir: cell[dir] ? dir : (cell.A ? "A" : "D") };
        this.paint();
      }
    }

    handleKey(e) {
      const ae = document.activeElement;
      if (ae && ae !== document.body && !ae.classList.contains("ci")) return;
      if (document.querySelector(".overlay")) return;
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return; // Ctrl+Alt = AltGr (polskie znaki na Windowsie)
      const k = e.key;
      const nav = () => { e.preventDefault(); this.active = true; };
      if (k === "Backspace" || k === "Delete") { nav(); this.backspace(); return; }
      if (k === "ArrowLeft") { nav(); this.move(0, -1); return; }
      if (k === "ArrowRight") { nav(); this.move(0, 1); return; }
      if (k === "ArrowUp") { nav(); this.move(-1, 0); return; }
      if (k === "ArrowDown") { nav(); this.move(1, 0); return; }
      if (k === "Tab" || k === "Enter") { nav(); this.jump(e.shiftKey ? -1 : 1); return; }
      if (k === " ") { nav(); this.toggleDir(); return; }
      if (k && k.length === 1 && isLetter(k)) { nav(); this.type(k); }
      // na Androidzie klawisz przychodzi jako „Unidentified” – wtedy łapie go onBeforeInput/onInput
    }

    onBeforeInput(e) {
      const inp = e.target;
      if (!inp.classList || !inp.classList.contains("ci") || !e.cancelable) return;
      if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
        e.preventDefault();
        this.active = true;
        this.backspace();
      } else if (e.inputType === "insertText" && e.data) {
        e.preventDefault();
        const letters = [...e.data].filter(isLetter);
        if (letters.length) { this.active = true; this.type(letters[letters.length - 1]); }
        else inp.value = this.fill[this.key(+inp.dataset.r, +inp.dataset.c)] || "";
      }
    }

    // awaryjnie: klawiatury z podpowiedziami (np. Gboard) wpisują tekst bez beforeinput
    onInput(e) {
      const inp = e.target;
      if (!inp.classList.contains("ci")) return;
      const r = +inp.dataset.r, c = +inp.dataset.c;
      const k = this.key(r, c);
      const letters = [...inp.value].filter(isLetter);
      const isCur = r === this.sel.r && c === this.sel.c;
      if (!letters.length) {
        if (isCur && this.fill[k] && !this.isLocked(k)) {
          delete this.fill[k];
          this.wrong.delete(k);
          this.afterChange();
        } else inp.value = this.fill[k] || "";
        return;
      }
      const ch = letters[letters.length - 1];
      if (isCur) { this.active = true; this.type(ch); return; }
      // spóźnione zatwierdzenie tekstu w kratce, z której kursor już poszedł dalej
      if (!this.isLocked(k)) this.fill[k] = up(ch);
      inp.value = this.fill[k] || "";
      this.persist();
    }

    // ───────── podpowiedzi i przyciski ─────────
    badCells(e) { return e.cells.filter(([r, c]) => !this.cellOk(r, c)); }

    revealCell(r, c) {
      const k = this.key(r, c);
      this.fill[k] = this.grid[r][c].ans;
      this.revealed.add(k);
      this.wrong.delete(k);
    }

    hintLetter() {
      let ent = this.entry();
      const idx = ent.cells.findIndex(([r, c]) => r === this.sel.r && c === this.sel.c);
      const bad = ([r, c]) => !this.cellOk(r, c);
      let target = bad([this.sel.r, this.sel.c]) ? [this.sel.r, this.sel.c]
        : ent.cells.slice(idx + 1).find(bad) || ent.cells.slice(0, idx).find(bad);
      if (!target) {
        // to hasło jest już dobrze – bierzemy następne niedokończone
        const start = this.order.indexOf(ent);
        for (let s = 1; s <= this.order.length && !target; s++) {
          const e = this.order[(start + s) % this.order.length];
          const b = e.cells.find(bad);
          if (b) { ent = e; target = b; }
        }
      }
      if (!target) return;
      this.revealCell(target[0], target[1]);
      this.recompute();
      const tIdx = ent.cells.findIndex(([r, c]) => r === target[0] && c === target[1]);
      this.sel = { r: target[0], c: target[1], dir: ent.dir };
      this.advance(ent, tIdx, false);
      this.afterChange();
    }

    hintWord() {
      const ent = this.entry();
      const bad = this.badCells(ent);
      if (!bad.length) { this.jump(1); return; }
      bad.forEach(([r, c]) => this.revealCell(r, c));
      this.recompute();
      const nx = this.nextIncomplete();
      if (nx) this.selectEntry(nx);
      this.afterChange();
    }

    action(act, btn) {
      if (act === "reset") {
        if (!btn.classList.contains("armed")) {
          btn.classList.add("armed");
          btn.textContent = "Na pewno?";
          setTimeout(() => { btn.classList.remove("armed"); btn.textContent = "↺ Reset"; }, 2500);
          return;
        }
        clearSave(this.p.id);
        this.fill = {}; this.revealed = new Set(); this.wrong = new Set();
        this.solved = false; this.seconds = 0;
        this.recompute();
        this.prevFull = new Set();
        clearInterval(this.timer); this.startTimer();
        btn.classList.remove("armed"); btn.textContent = "↺ Reset";
        this.selectEntry(this.order[0], false);
        toast("Czysta karta ✨");
        return;
      }
      if (this.solved) { toast("Już rozwiązana – flex zaliczony 😎"); return; }
      this.active = true;
      if (act === "letter") { this.hintLetter(); return; }
      if (act === "word") { this.hintWord(); return; }
      if (act === "check") {
        this.wrong = new Set();
        let filled = 0;
        for (const cell of this.cellList) {
          const k = this.key(cell.r, cell.c);
          if (!this.fill[k]) continue;
          filled++;
          if (!same(this.fill[k], cell.ans)) this.wrong.add(k);
        }
        this.paint();
        const n = this.wrong.size;
        if (n) toast(`${n} ${plural(n, "litera nie pykła", "litery nie pykły", "liter nie pykło")} 👀`);
        else if (!filled) toast("Najpierw coś wpisz, bestie 😅");
        else toast(filled === this.cellList.length ? "Wszystko gra 🔥" : "Na razie zero błędów 🔥");
      }
    }

    afterChange() {
      this.recompute();
      // zaliczone hasło: litery same poprawiają się na właściwe polskie znaki (np. Z → Ż)
      if (settings.autoCheck) {
        for (const e of this.entries) {
          if (this.done.has(e.i)) e.cells.forEach(([r, c]) => { this.fill[this.key(r, c)] = this.grid[r][c].ans; });
        }
      }
      // świeżo zapełnione hasła: dobre – pyk na zielono, złe – mignięcie na czerwono
      const full = new Set(this.entries.filter((e) => this.isFull(e)).map((e) => e.i));
      if (settings.autoCheck) {
        const fresh = this.entries.filter((e) => full.has(e.i) && !this.prevFull.has(e.i));
        const okCells = fresh.filter((e) => this.done.has(e.i)).flatMap((e) => e.cells);
        const badCells = fresh.filter((e) => !this.done.has(e.i)).flatMap((e) => e.cells);
        if (okCells.length) {
          this.pop = new Set(okCells.map(([r, c]) => this.key(r, c)));
          clearTimeout(this.popT);
          this.popT = setTimeout(() => { this.pop = new Set(); this.paint({ quiet: true }); }, 500);
        }
        if (badCells.length) {
          this.flash = new Set(badCells.map(([r, c]) => this.key(r, c)));
          clearTimeout(this.flashT);
          this.flashT = setTimeout(() => { this.flash = new Set(); this.paint({ quiet: true }); }, 650);
        }
      }
      this.prevFull = full;

      const done = this.cellList.every((cell) => this.cellOk(cell.r, cell.c));
      if (done && !this.solved) {
        this.solved = true;
        this.cellList.forEach((cell) => { this.fill[this.key(cell.r, cell.c)] = cell.ans; });
        clearInterval(this.timer);
        this.wrong = new Set();
        this.active = false;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        confetti();
        toast("SLAY 💅");
        this.persist();
        this.paint();
        setTimeout(() => app.querySelector(".winbox").scrollIntoView({ behavior: "smooth", block: "center" }), 250);
        return;
      }
      if (!done && this.cellList.every((cell) => this.fill[this.key(cell.r, cell.c)])) {
        toast("Wszystko wpisane, ale coś nie gra 👀 – kliknij Sprawdź");
      }
      this.persist();
      this.paint();
    }

    share() {
      const hints = this.revealed.size;
      const text = `Rozwiązałem/am krzyżówkę „${this.p.title}” ${this.p.emoji} w ${fmtTime(this.seconds)}` +
        (hints ? ` (podpowiedzi: ${hints})` : " bez żadnej podpowiedzi 🐐") + ". Dasz radę szybciej? 💅";
      const url = location.href.split("#")[0];
      if (navigator.share) {
        navigator.share({ text, url }).catch(() => {});
        return;
      }
      const all = `${text} ${url}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(all).then(() => toast("Skopiowane – wklejaj gdzie chcesz 📋"), () => toast(all, 5000));
      } else toast(all, 5000);
    }
  }

  route();
})();
