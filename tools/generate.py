#!/usr/bin/env python3
"""
Generator krzyżówek.

Czyta hasla.txt, układa hasła w zwartą siatkę (losowe próby, wybiera najlepszą)
i zapisuje wynik do puzzles.js, z którego korzysta strona.

Użycie:
    python3 tools/generate.py            # wszystkie krzyżówki
    python3 tools/generate.py --seed 7   # inne ziarno losowania = inne układy
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "hasla.txt"
OUT = ROOT / "puzzles.js"

MAX_W = 15          # maks. szerokość siatki (telefon!)
MAX_H = 17          # maks. wysokość
SOFT_W = 13         # powyżej tej szerokości siatka dostaje karę
ATTEMPTS = 1500     # liczba prób na krzyżówkę


# ───────────────────────── parsowanie ─────────────────────────

def parse_source(text):
    puzzles = []
    cur = None
    section = ""
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1].strip()
            cur = None
            continue
        if line.startswith("=="):
            parts = [p.strip() for p in line[2:].split("|")]
            if len(parts) != 4:
                sys.exit(f"hasla.txt:{lineno}: nagłówek musi mieć 4 pola: id | emoji | tytuł | podtytuł")
            cur = {"id": parts[0], "emoji": parts[1], "title": parts[2], "subtitle": parts[3],
                   "section": section, "words": []}
            puzzles.append(cur)
            continue
        if cur is None:
            sys.exit(f"hasla.txt:{lineno}: hasło przed pierwszym nagłówkiem ==")
        if "|" not in line:
            sys.exit(f"hasla.txt:{lineno}: brak separatora | między hasłem a podpowiedzią")
        ans, clue = [p.strip() for p in line.split("|", 1)]
        grid_ans = "".join(ch for ch in ans.upper() if ch.isalpha())
        if len(grid_ans) < 3:
            sys.exit(f"hasla.txt:{lineno}: hasło {ans!r} jest za krótkie (min. 3 litery)")
        parts = re.split(r"([\s\-]+)", ans.strip())
        enum = ""
        for p in parts:
            if not p:
                continue
            if p.strip() == "":
                enum += ", "
            elif set(p) <= {"-", " "}:
                enum += "-"
            else:
                enum += str(sum(1 for ch in p if ch.isalpha()))
        cur["words"].append({"display": ans, "answer": grid_ans, "clue": clue, "enum": enum})
    return puzzles


# ───────────────────────── układanie ─────────────────────────

class Layout:
    def __init__(self):
        self.cells = {}          # (r, c) -> litera
        self.across = set()      # komórki zajęte przez hasła poziome
        self.down = set()        # komórki zajęte przez hasła pionowe
        self.placed = []         # (word_idx, r, c, dir)
        self.minr = self.maxr = self.minc = self.maxc = 0
        self.crossings = 0

    def copy(self):
        n = Layout()
        n.cells = dict(self.cells)
        n.across = set(self.across)
        n.down = set(self.down)
        n.placed = list(self.placed)
        n.minr, n.maxr, n.minc, n.maxc = self.minr, self.maxr, self.minc, self.maxc
        n.crossings = self.crossings
        return n

    def size(self):
        return self.maxr - self.minr + 1, self.maxc - self.minc + 1

    def check(self, word, r, c, d):
        """Zwraca liczbę skrzyżowań albo -1, jeśli hasła nie da się tu wstawić."""
        dr, dc = (0, 1) if d == "A" else (1, 0)
        n = len(word)
        if (r - dr, c - dc) in self.cells or (r + dr * n, c + dc * n) in self.cells:
            return -1
        same = self.across if d == "A" else self.down
        hits = 0
        for i, ch in enumerate(word):
            rr, cc = r + dr * i, c + dc * i
            cur = self.cells.get((rr, cc))
            if cur is not None:
                if cur != ch or (rr, cc) in same:
                    return -1
                hits += 1
            else:
                if d == "A":
                    if (rr - 1, cc) in self.cells or (rr + 1, cc) in self.cells:
                        return -1
                else:
                    if (rr, cc - 1) in self.cells or (rr, cc + 1) in self.cells:
                        return -1
        minr = min(self.minr, r)
        maxr = max(self.maxr, r + dr * (n - 1))
        minc = min(self.minc, c)
        maxc = max(self.maxc, c + dc * (n - 1))
        if maxr - minr + 1 > MAX_H or maxc - minc + 1 > MAX_W:
            return -1
        return hits

    def place(self, idx, word, r, c, d, hits):
        dr, dc = (0, 1) if d == "A" else (1, 0)
        same = self.across if d == "A" else self.down
        for i, ch in enumerate(word):
            rr, cc = r + dr * i, c + dc * i
            self.cells[(rr, cc)] = ch
            same.add((rr, cc))
        if not self.placed:
            self.minr, self.minc = r, c
            self.maxr, self.maxc = r + dr * (len(word) - 1), c + dc * (len(word) - 1)
        else:
            self.minr = min(self.minr, r)
            self.minc = min(self.minc, c)
            self.maxr = max(self.maxr, r + dr * (len(word) - 1))
            self.maxc = max(self.maxc, c + dc * (len(word) - 1))
        self.placed.append((idx, r, c, d))
        self.crossings += hits

    def candidates(self, word):
        """Wszystkie poprawne pozycje krzyżujące się z istniejącymi literami."""
        out = []
        seen = set()
        for (r, c), ch in self.cells.items():
            for i, wch in enumerate(word):
                if wch != ch:
                    continue
                for d in ("A", "D"):
                    sr, sc = (r, c - i) if d == "A" else (r - i, c)
                    key = (sr, sc, d)
                    if key in seen:
                        continue
                    seen.add(key)
                    hits = self.check(word, sr, sc, d)
                    if hits > 0:
                        out.append((sr, sc, d, hits))
        return out


def score_placement(lay, word, r, c, d, hits):
    dr, dc = (0, 1) if d == "A" else (1, 0)
    n = len(word)
    minr = min(lay.minr, r); maxr = max(lay.maxr, r + dr * (n - 1))
    minc = min(lay.minc, c); maxc = max(lay.maxc, c + dc * (n - 1))
    h, w = maxr - minr + 1, maxc - minc + 1
    s = hits * 30 - (h * w) * 0.6 - max(0, w - SOFT_W) * 25 - abs(h - w) * 1.5
    return s


def build(words, rng):
    order = list(range(len(words)))
    # dłuższe hasła na początek, ale z losowym szumem
    order.sort(key=lambda i: -(len(words[i]["answer"]) + rng.random() * 4))
    lay = Layout()
    first = order[0]
    d0 = rng.choice(["A", "A", "D"])
    lay.place(first, words[first]["answer"], 0, 0, d0, 0)
    pending = order[1:]
    progress = True
    while pending and progress:
        progress = False
        rest = []
        for idx in pending:
            w = words[idx]["answer"]
            cands = lay.candidates(w)
            if not cands:
                rest.append(idx)
                continue
            scored = sorted(
                ((score_placement(lay, w, r, c, d, h) + rng.random() * 6, r, c, d, h) for r, c, d, h in cands),
                reverse=True,
            )
            _, r, c, d, h = scored[0] if rng.random() < 0.75 else rng.choice(scored[: min(3, len(scored))])
            lay.place(idx, w, r, c, d, h)
            progress = True
        pending = rest
    return lay


def layout_score(lay, total):
    h, w = lay.size()
    filled = len(lay.cells)
    density = filled / (h * w)
    return (
        len(lay.placed) * 10000
        + lay.crossings * 40
        + density * 400
        - h * w
        - max(0, w - SOFT_W) * 80
        - max(0, h - 15) * 30
    )


def best_layout(words, seed, attempts=ATTEMPTS):
    rng = random.Random(seed)
    best, best_s = None, None
    for _ in range(attempts):
        lay = build(words, rng)
        s = layout_score(lay, len(words))
        if best is None or s > best_s:
            best, best_s = lay, s
    return best


# ───────────────────────── eksport ─────────────────────────

def export(puzzle, lay):
    words = puzzle["words"]
    h, w = lay.size()
    offr, offc = -lay.minr, -lay.minc
    entries = []
    for idx, r, c, d in lay.placed:
        entries.append({"idx": idx, "row": r + offr, "col": c + offc, "dir": d})
    # numeracja jak w klasycznej krzyżówce
    starts = {}
    for e in entries:
        starts.setdefault((e["row"], e["col"]), []).append(e)
    num = 0
    numbers = {}
    for rc in sorted(starts):
        num += 1
        numbers[rc] = num
    out_entries = []
    for e in sorted(entries, key=lambda e: (e["dir"], numbers[(e["row"], e["col"])])):
        wd = words[e["idx"]]
        out_entries.append({
            "num": numbers[(e["row"], e["col"])],
            "dir": e["dir"],
            "row": e["row"],
            "col": e["col"],
            "answer": wd["answer"],
            "display": wd["display"],
            "clue": wd["clue"],
            "enum": wd["enum"],
        })
    return {
        "id": puzzle["id"],
        "emoji": puzzle["emoji"],
        "title": puzzle["title"],
        "subtitle": puzzle["subtitle"],
        "section": puzzle["section"],
        "width": w,
        "height": h,
        "entries": out_entries,
    }


def render_ascii(p):
    grid = [["·"] * p["width"] for _ in range(p["height"])]
    for e in p["entries"]:
        dr, dc = (0, 1) if e["dir"] == "A" else (1, 0)
        for i, ch in enumerate(e["answer"]):
            grid[e["row"] + dr * i][e["col"] + dc * i] = ch
    return "\n".join(" ".join(row) for row in grid)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--attempts", type=int, default=ATTEMPTS)
    ap.add_argument("--show", action="store_true", help="wypisz siatki w terminalu")
    args = ap.parse_args()

    puzzles = parse_source(SRC.read_text(encoding="utf-8"))
    ids = [p["id"] for p in puzzles]
    if len(ids) != len(set(ids)):
        sys.exit("Powtórzone id krzyżówki w hasla.txt")

    result = []
    for i, p in enumerate(puzzles):
        # jeśli coś nie wejdzie, próbujemy jeszcze kilka razy z innym ziarnem
        for retry in range(6):
            lay = best_layout(p["words"], args.seed + i * 101 + retry * 7919, args.attempts)
            if len(lay.placed) == len(p["words"]):
                break
        data = export(p, lay)
        placed = {e["answer"] for e in data["entries"]}
        missing = [w["display"] for w in p["words"] if w["answer"] not in placed]
        status = f"{len(data['entries'])}/{len(p['words'])} haseł, {data['width']}×{data['height']}"
        if missing:
            status += f"  ⚠ nie weszło: {', '.join(missing)}"
        print(f"{p['emoji']} {p['title']:<32} {status}")
        if args.show:
            print(render_ascii(data) + "\n")
        result.append(data)

    js = "// Wygenerowane przez tools/generate.py z pliku hasla.txt – nie edytuj ręcznie.\n"
    js += "window.PUZZLES = " + json.dumps(result, ensure_ascii=False, indent=1) + ";\n"
    OUT.write_text(js, encoding="utf-8")
    print(f"\nZapisano {OUT.relative_to(ROOT)} ({len(result)} krzyżówek)")


if __name__ == "__main__":
    main()
