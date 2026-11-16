# krzyżówki dla gen z 🧩

15 krzyżówek z odmłodzonymi pytaniami: pół normalnych haseł, pół rzeczy, które zna każde Gen Z – bajki z Cartoon Network, gierki, memy, polski internet, szkoła, domówki. Ma być śmiesznie, nie trudno.

| # | Krzyżówka |
|---|-----------|
| 1 | 🔥 Rozgrzewka |
| 2 | 🏫 Szkolny korytarz |
| 3 | 📺 Dzieciństwo przed telewizorem |
| 4 | 🍲 Niedziela u babci |
| 5 | 🌐 Polski internet |
| 6 | 🎮 Gierki |
| 7 | 🎧 Muza |
| 8 | 🏖️ Wakacje |
| 9 | 💘 Randki i crushe |
| 10 | 🥳 Domówka |
| 11 | 📱 TikTok i reszta |
| 12 | 🧾 Dorosłość mode |
| 13 | 🍿 Filmy i seriale |
| 14 | ⚽ Sport i fame |
| 15 | 🎲 Nostalgia |

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
BUDZIK | Wróg publiczny numer jeden o 6:30.
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
