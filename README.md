# krzyżówki dla gen z 🧩

15 normalnych krzyżówek – historia, geografia, nauka, lektury, kino, sport – z mniej oczywistymi pytaniami. Do tego trochę Gen Z i rzeczy, które po prostu warto wiedzieć (PIT, RRSO, phishing, RKO…).

| # | Krzyżówka | Trudność |
|---|-----------|----------|
| 1 | 🔥 Na rozgrzewkę | ★☆☆ |
| 2 | 🚌 Do autobusu | ★☆☆ |
| 3 | 🛋️ Leniwa niedziela | ★☆☆ |
| 4 | ☕ Przerwa na kawę | ★☆☆ |
| 5 | 🎒 Po lekcjach | ★☆☆ |
| 6 | 🌍 Dookoła świata | ★★☆ |
| 7 | 🧪 Biologia, fizyka i reszta | ★★☆ |
| 8 | 🏰 Lekcja historii | ★★☆ |
| 9 | 📚 Lektury bez ściemy | ★★☆ |
| 10 | ⚽ Sportowa | ★★☆ |
| 11 | 🧾 Dorosłość na start | ★★☆ |
| 12 | 🎬 Kino i seriale | ★★☆ |
| 13 | 💻 Tech i internet | ★★☆ |
| 14 | 🎵 Muzyka | ★★☆ |
| 15 | 🧠 Dla mózgowców | ★★★ |

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
KOPERNIK | Nie tylko astronom – sformułował też prawo o gorszym pieniądzu.
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
