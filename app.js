(() => {
  "use strict";

  const PUZZLES = window.PUZZLES || [];
  const app = document.getElementById("app");
  const toastEl = document.getElementById("toast");
  const STORE = "krzyzowki.v1.";
  const isTouch = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;

  // ───────── zapis postępu ─────────
  function load(id) {
    try { return JSON.parse(localStorage.getItem(STORE + id)) || null; } catch { return null; }
  }
  function save(id, data) {
    try { localStorage.setItem(STORE + id, JSON.stringify(data)); } catch { /* tryb prywatny itp. */ }
  }
  function clearSave(id) {
    try { localStorage.removeItem(STORE + id); } catch { /* nic */ }
  }

  // ───────── pomocnicze ─────────
  const base = (ch) => (ch || "").toLocaleUpperCase("pl-PL")
    .replace(/Ł/g, "L").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const same = (a, b) => !!a && base(a) === base(b);
  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DIR_NAME = { A: "poziomo", D: "pionowo" };

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
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
  function progressOf(p) {
    const s = load(p.id);
    if (!s) return { label: "nowa", cls: "" };
    if (s.solved) return { label: "✓ slay", cls: "done" };
    const total = new Set(p.entries.flatMap((e) => cellsOf(e).map(([r, c]) => r + "," + c))).size;
    const filled = Object.values(s.fill || {}).filter(Boolean).length;
    if (!filled) return { label: "nowa", cls: "" };
    return { label: Math.round((filled / total) * 100) + "%", cls: "wip" };
  }

  function renderHome() {
    document.body.style.setProperty("--kb-h", "0px");
    const solved = PUZZLES.filter((p) => (load(p.id) || {}).solved).length;
    app.innerHTML = `
      <header class="hero">
        <h1>krzyżówki<br>dla gen <span class="z">z</span></h1>
        <p>${PUZZLES.length} normalnych krzyżówek – historia, geografia, nauka, kino, sport – tylko pytania nie są podane na tacy. Do tego trochę internetu i rzeczy, które po prostu warto wiedzieć.</p>
        <div class="stats">rozwiązane: <b>${solved}/${PUZZLES.length}</b></div>
      </header>
      <section class="list">
        ${PUZZLES.map((p, i) => {
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
      </section>
      <p class="howto">
        <b>Jak grać:</b> tapnij kratkę, żeby wybrać hasło, tapnij ją drugi raz, żeby zmienić kierunek.
        Polskie znaki są na klawiaturze, ale „Z” zamiast „Ż” też przejdzie. Postęp zapisuje się sam.
      </p>`;
    app.querySelectorAll(".card").forEach((b) =>
      b.addEventListener("click", () => { location.hash = "#/k/" + encodeURIComponent(b.dataset.id); })
    );
  }

  function cellsOf(e) {
    const out = [];
    for (let i = 0; i < e.answer.length; i++) {
      out.push(e.dir === "A" ? [e.row, e.col + i] : [e.row + i, e.col]);
    }
    return out;
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
      this.order = [...this.entries.filter((e) => e.dir === "A"), ...this.entries.filter((e) => e.dir === "D")];

      const saved = load(p.id) || {};
      this.fill = saved.fill || {};
      this.revealed = new Set(saved.revealed || []);
      this.solved = !!saved.solved;
      this.seconds = saved.seconds || 0;
      this.wrong = new Set();

      const first = this.order[0];
      this.sel = { r: first.row, c: first.col, dir: first.dir };

      this.render();
      this.bind();
      this.paint();
      this.startTimer();
    }

    key(r, c) { return r + "," + c; }
    cell(r, c) { return r >= 0 && c >= 0 && r < this.H && c < this.W ? this.grid[r][c] : null; }
    entry() {
      const cell = this.cell(this.sel.r, this.sel.c);
      return cell[this.sel.dir] || cell[this.sel.dir === "A" ? "D" : "A"];
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
        </div>
        <div class="cluebar">
          <button class="nav prev" aria-label="Poprzednie hasło">‹</button>
          <div class="box"><div class="label"></div><div class="text"></div></div>
          <button class="nav next" aria-label="Następne hasło">›</button>
        </div>
        <div class="board"><div class="grid" style="--w:${this.W}"></div></div>
        <div class="winbox"></div>
        <div class="actions">
          <button data-act="check">Sprawdź</button>
          <button data-act="letter">Litera</button>
          <button data-act="word">Hasło</button>
          <button data-act="reset" class="danger">Reset</button>
        </div>
        <div class="clues">
          <div><h3>Poziomo</h3><ol class="list-A"></ol></div>
          <div><h3>Pionowo</h3><ol class="list-D"></ol></div>
        </div>`;

      const gridEl = app.querySelector(".grid");
      this.cellEls = [];
      for (let r = 0; r < this.H; r++) {
        this.cellEls[r] = [];
        for (let c = 0; c < this.W; c++) {
          const d = document.createElement("div");
          const cell = this.grid[r][c];
          d.className = "cell" + (cell ? "" : " block");
          if (cell) {
            d.dataset.r = r;
            d.dataset.c = c;
            if (cell.num) d.innerHTML = `<span class="n">${cell.num}</span>`;
            d.appendChild(document.createElement("span")).className = "l";
          }
          gridEl.appendChild(d);
          this.cellEls[r][c] = d;
        }
      }

      for (const dir of ["A", "D"]) {
        const ol = app.querySelector(".list-" + dir);
        ol.innerHTML = this.entries.filter((e) => e.dir === dir).map((e) => `
          <li><button class="clue" data-i="${e.i}">
            <span class="cn">${e.num}</span>
            <span class="ct">${esc(e.clue)} <span class="ce">(${e.enum})</span></span>
          </button></li>`).join("");
      }
      this.clueEls = [...app.querySelectorAll(".clue")];
      this.timerEl = app.querySelector(".timer");
      this.gridEl = gridEl;

      // klawiatura ekranowa
      if (isTouch) {
        const rows = [
          "QWERTYUIOP".split(""),
          "ASDFGHJKL".split(""),
          [..."ZXCVBNM", "⌫"],
          "ĄĆĘŁŃÓŚŹŻ".split(""),
        ];
        const kb = document.createElement("div");
        kb.className = "kb on";
        kb.innerHTML = rows.map((row, ri) => `<div class="row">${row.map((k) =>
          `<button data-k="${k}" class="${ri === 3 ? "pl" : ""}${k === "⌫" ? " wide" : ""}">${k}</button>`).join("")}</div>`).join("");
        document.body.appendChild(kb);
        this.kb = kb;
        requestAnimationFrame(() => document.body.style.setProperty("--kb-h", kb.offsetHeight + "px"));
      }
      this.resize();
    }

    resize() {
      const avail = app.clientWidth - 24; // #app ma padding 12px z każdej strony
      const size = Math.max(18, Math.min(42, Math.floor((avail - (this.W - 1) * 2) / this.W)));
      document.documentElement.style.setProperty("--cell", size + "px");
    }

    bind() {
      this.onKey = (e) => this.handleKey(e);
      this.onResize = () => this.resize();
      this.onVis = () => { if (document.hidden) this.persist(); };
      document.addEventListener("keydown", this.onKey);
      window.addEventListener("resize", this.onResize);
      document.addEventListener("visibilitychange", this.onVis);

      app.querySelector(".back").addEventListener("click", () => { location.hash = "#/"; });
      app.querySelector(".prev").addEventListener("click", () => this.jump(-1));
      app.querySelector(".next").addEventListener("click", () => this.jump(1));

      this.gridEl.addEventListener("click", (e) => {
        const d = e.target.closest(".cell");
        if (!d || d.classList.contains("block")) return;
        const r = +d.dataset.r, c = +d.dataset.c;
        const cell = this.grid[r][c];
        if (r === this.sel.r && c === this.sel.c) {
          const other = this.sel.dir === "A" ? "D" : "A";
          if (cell[other]) this.sel.dir = other;
        } else {
          this.sel = { r, c, dir: cell[this.sel.dir] ? this.sel.dir : (cell.A ? "A" : "D") };
        }
        this.paint();
      });

      this.clueEls.forEach((b) => b.addEventListener("click", () => {
        this.selectEntry(this.entries[+b.dataset.i]);
      }));

      app.querySelector(".actions").addEventListener("click", (e) => {
        const b = e.target.closest("button");
        if (b) this.action(b.dataset.act, b);
      });

      if (this.kb) {
        this.kb.addEventListener("pointerdown", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          e.preventDefault();
          if (b.dataset.k === "⌫") this.backspace();
          else this.type(b.dataset.k);
        });
      }
    }

    destroy() {
      clearInterval(this.timer);
      this.persist();
      document.removeEventListener("keydown", this.onKey);
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVis);
      if (this.kb) this.kb.remove();
      document.body.style.setProperty("--kb-h", "0px");
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
    paint() {
      const ent = this.entry();
      this.sel.dir = ent.dir;
      const inWord = new Set(ent.cells.map(([r, c]) => this.key(r, c)));
      for (let r = 0; r < this.H; r++) {
        for (let c = 0; c < this.W; c++) {
          const cell = this.grid[r][c];
          if (!cell) continue;
          const k = this.key(r, c);
          const d = this.cellEls[r][c];
          d.querySelector(".l").textContent = this.fill[k] || "";
          d.classList.toggle("word", inWord.has(k));
          d.classList.toggle("sel", r === this.sel.r && c === this.sel.c);
          d.classList.toggle("wrong", this.wrong.has(k));
          d.classList.toggle("revealed", this.revealed.has(k));
        }
      }
      app.querySelector(".cluebar .label").textContent = `${ent.num} ${DIR_NAME[ent.dir]}`;
      app.querySelector(".cluebar .text").innerHTML = `${esc(ent.clue)} <span class="enum">(${ent.enum})</span>`;
      for (const b of this.clueEls) {
        const e = this.entries[+b.dataset.i];
        b.classList.toggle("active", e === ent);
        b.classList.toggle("filled", e.cells.every(([r, c]) => this.fill[this.key(r, c)]));
      }
      this.gridEl.classList.toggle("solved", this.solved);
      this.ensureVisible();
      const win = app.querySelector(".winbox");
      win.innerHTML = this.solved
        ? `<div class="win">SLAY 💅 krzyżówka rozwiązana<small>czas: ${fmtTime(this.seconds)}${this.revealed.size ? ` · podpowiedzi: ${this.revealed.size}` : " · bez podpowiedzi, GOAT 🐐"}</small></div>`
        : "";
    }

    // zaznaczona kratka nie może chować się pod paskiem z podpowiedzią ani pod klawiaturą
    ensureVisible() {
      const el = this.cellEls[this.sel.r][this.sel.c];
      const rect = el.getBoundingClientRect();
      const top = app.querySelector(".cluebar").getBoundingClientRect().bottom + 6;
      const bottom = window.innerHeight - (this.kb ? this.kb.offsetHeight : 0) - 8;
      if (rect.bottom > bottom) window.scrollBy({ top: rect.bottom - bottom, behavior: "smooth" });
      else if (rect.top < top) window.scrollBy({ top: rect.top - top, behavior: "smooth" });
    }

    // ───────── sterowanie ─────────
    selectEntry(e, preferEmpty = true) {
      let target = e.cells[0];
      if (preferEmpty) {
        const empty = e.cells.find(([r, c]) => !this.fill[this.key(r, c)]);
        if (empty) target = empty;
      }
      this.sel = { r: target[0], c: target[1], dir: e.dir };
      this.paint();
    }

    jump(step) {
      const cur = this.entry();
      let i = this.order.indexOf(cur);
      i = (i + step + this.order.length) % this.order.length;
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

    type(letter) {
      if (this.solved) return;
      const ch = letter.toLocaleUpperCase("pl-PL");
      const k = this.key(this.sel.r, this.sel.c);
      const wasFull = this.entry().cells.every(([r, c]) => this.fill[this.key(r, c)]);
      if (!this.revealed.has(k)) {
        this.fill[k] = ch;
        this.wrong.delete(k);
      }
      const ent = this.entry();
      const idx = ent.cells.findIndex(([r, c]) => r === this.sel.r && c === this.sel.c);
      const isEmpty = ([r, c]) => !this.fill[this.key(r, c)];
      // najpierw następna pusta kratka za kursorem, potem pusta od początku hasła
      const target = ent.cells.slice(idx + 1).find(isEmpty) || ent.cells.slice(0, idx).find(isEmpty);
      if (target) {
        this.sel = { r: target[0], c: target[1], dir: ent.dir };
      } else if (wasFull && idx + 1 < ent.cells.length) {
        // poprawianie gotowego hasła – idziemy po kolei
        const [r, c] = ent.cells[idx + 1];
        this.sel = { r, c, dir: ent.dir };
      } else if (!wasFull) {
        // hasło właśnie się zapełniło – skok do następnego niedokończonego
        const nx = this.nextIncomplete();
        if (nx) { this.selectEntry(nx); }
      }
      this.afterChange();
    }

    backspace() {
      if (this.solved) return;
      const k = this.key(this.sel.r, this.sel.c);
      if (this.fill[k] && !this.revealed.has(k)) {
        delete this.fill[k];
        this.wrong.delete(k);
      } else {
        const ent = this.entry();
        const idx = ent.cells.findIndex(([r, c]) => r === this.sel.r && c === this.sel.c);
        if (idx > 0) {
          const [r, c] = ent.cells[idx - 1];
          this.sel = { r, c, dir: ent.dir };
          const pk = this.key(r, c);
          if (!this.revealed.has(pk)) { delete this.fill[pk]; this.wrong.delete(pk); }
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
      if (e.metaKey || (e.ctrlKey && !e.altKey)) return; // Ctrl+Alt = AltGr (polskie znaki na Windowsie)
      const k = e.key;
      if (k === "Backspace" || k === "Delete") { e.preventDefault(); this.backspace(); return; }
      if (k === "ArrowLeft") { e.preventDefault(); this.move(0, -1); return; }
      if (k === "ArrowRight") { e.preventDefault(); this.move(0, 1); return; }
      if (k === "ArrowUp") { e.preventDefault(); this.move(-1, 0); return; }
      if (k === "ArrowDown") { e.preventDefault(); this.move(1, 0); return; }
      if (k === "Tab" || k === "Enter") { e.preventDefault(); this.jump(e.shiftKey ? -1 : 1); return; }
      if (k === " ") {
        e.preventDefault();
        const cell = this.grid[this.sel.r][this.sel.c];
        const other = this.sel.dir === "A" ? "D" : "A";
        if (cell[other]) { this.sel.dir = other; this.paint(); }
        return;
      }
      if (k.length === 1 && /\p{L}/u.test(k)) { e.preventDefault(); this.type(k); }
    }

    action(act, btn) {
      if (act === "reset") {
        if (!btn.classList.contains("armed")) {
          btn.classList.add("armed");
          btn.textContent = "Na pewno?";
          setTimeout(() => { btn.classList.remove("armed"); btn.textContent = "Reset"; }, 2500);
          return;
        }
        clearSave(this.p.id);
        this.fill = {}; this.revealed = new Set(); this.wrong = new Set();
        this.solved = false; this.seconds = 0;
        clearInterval(this.timer); this.startTimer();
        btn.classList.remove("armed"); btn.textContent = "Reset";
        this.selectEntry(this.order[0], false);
        toast("Czysta karta ✨");
        return;
      }
      if (this.solved) { toast("Już rozwiązana – flex zaliczony 😎"); return; }
      if (act === "check") {
        this.wrong = new Set();
        let filled = 0, total = 0;
        for (const row of this.grid) for (const cell of row) {
          if (!cell) continue;
          total++;
          const k = this.key(cell.r, cell.c);
          if (!this.fill[k]) continue;
          filled++;
          if (!same(this.fill[k], cell.ans)) this.wrong.add(k);
        }
        this.paint();
        if (this.wrong.size) toast(`${this.wrong.size} ${this.wrong.size === 1 ? "litera nie pykła" : this.wrong.size < 5 ? "litery nie pykły" : "liter nie pykło"} 👀`);
        else if (filled === 0) toast("Najpierw coś wpisz, bestie 😅");
        else toast(filled === total ? "Wszystko gra 🔥" : "Na razie zero błędów 🔥");
        return;
      }
      if (act === "letter") {
        const cell = this.grid[this.sel.r][this.sel.c];
        const k = this.key(cell.r, cell.c);
        this.fill[k] = cell.ans; this.revealed.add(k); this.wrong.delete(k);
        this.afterChange();
        return;
      }
      if (act === "word") {
        for (const [r, c] of this.entry().cells) {
          const k = this.key(r, c);
          if (!same(this.fill[k], this.grid[r][c].ans)) { this.fill[k] = this.grid[r][c].ans; this.revealed.add(k); }
          this.wrong.delete(k);
        }
        this.afterChange();
      }
    }

    afterChange() {
      let done = true;
      for (const row of this.grid) for (const cell of row) {
        if (cell && !same(this.fill[this.key(cell.r, cell.c)], cell.ans)) { done = false; break; }
      }
      if (done && !this.solved) {
        this.solved = true;
        clearInterval(this.timer);
        this.wrong = new Set();
        toast("SLAY 💅");
      } else if (!done) {
        const all = this.grid.every((row) => row.every((cell) => !cell || this.fill[this.key(cell.r, cell.c)]));
        if (all) toast("Wszystko wpisane, ale coś nie gra 👀 – kliknij Sprawdź");
      }
      this.persist();
      this.paint();
    }
  }

  route();
})();
