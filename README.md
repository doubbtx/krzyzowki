# krzyżówki dla gen z 🧩

15 krzyżówek z hasłami pisanymi pod Gen Z: slang, Młodzieżowe Słowo Roku, brainrot, TikTok, gaming, randki, muza, moda, żarcie, szkoła, AI, piłka i anime. Zero boomerskich haseł w stylu „rzeka w Afryce, 4 litery”.

| # | Krzyżówka | Hasła |
|---|-----------|-------|
| 1 | 💬 Gen Z 101 | 16 |
| 2 | 🏆 Młodzieżowe Słowo Roku (hall of fame) | 17 |
| 3 | 🗳️ MSR 2026: finałowa dwunastka | 15 |
| 4 | 🧠 Brainrot | 15 |
| 5 | 📱 Feed i sociale | 17 |
| 6 | 🎮 Gaming | 17 |
| 7 | 🚩 Red flagi i crushe | 15 |
| 8 | 🎧 Muza | 16 |
| 9 | 👟 Fit check | 15 |
| 10 | 🍜 Żarcie i drinki | 16 |
| 11 | 🎒 Szkoła i matura | 16 |
| 12 | 🤖 Tech i AI | 17 |
| 13 | 🎬 Main character | 13 |
| 14 | ⚽ Piłka dla Gen Z | 16 |
| 15 | 🍥 Anime i seriale | 16 |

## Jak grać

Otwórz `index.html` w przeglądarce (działa też offline, bez serwera) albo wrzuć repo na GitHub Pages.

- tapnij kratkę, żeby wybrać hasło, tapnij ją drugi raz, żeby zmienić kierunek,
- na telefonie jest własna klawiatura z polskimi znakami (ale „Z” zamiast „Ż” też jest zaliczane),
- na komputerze: strzałki, Tab/Enter = następne hasło, spacja = zmiana kierunku,
- **Sprawdź** zaznacza błędne litery, **Litera** / **Hasło** to podpowiedzi,
- postęp i czas zapisują się w przeglądarce.

## Jak dodać lub zmienić hasła

Wszystkie hasła siedzą w jednym pliku: [`hasla.txt`](hasla.txt).

```
== id | emoji | tytuł | podtytuł
HASŁO | podpowiedź
RED FLAG | Nie ma żadnych znajomych, a wszystkie jego byłe to „wariatki”.
```

Po zmianach wygeneruj siatki od nowa:

```bash
python3 tools/generate.py          # zapisuje puzzles.js
python3 tools/generate.py --show   # dodatkowo rysuje siatki w terminalu
python3 tools/generate.py --seed 5 # inne ziarno = inne ułożenie
```

Generator sam układa hasła w siatkę (max 15 kolumn, żeby dało się grać na telefonie) i wypisze, jeśli któreś hasło się nie zmieściło.

## Pliki

- `hasla.txt` – hasła i podpowiedzi (to edytujesz)
- `tools/generate.py` – generator siatek (Python 3, bez zależności)
- `puzzles.js` – wygenerowane krzyżówki
- `index.html`, `style.css`, `app.js` – strona
