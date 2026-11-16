# krzyżówki dla gen z 🧩

30 krzyżówek z odmłodzonymi pytaniami: pół normalnych haseł, pół rzeczy, które zna każde Gen Z – bajki z Cartoon Network, gierki, memy, polski internet, szkoła, wesela, siłka, korpo. Ma być śmiesznie, nie trudno.

**Sezon 1:** 🔥 Rozgrzewka · 🏫 Szkolny korytarz · 📺 Dzieciństwo przed telewizorem · 🍲 Niedziela u babci · 🌐 Polski internet · 🎮 Gierki · 🎧 Muza · 🏖️ Wakacje · 💘 Randki i crushe · 🥳 Domówka · 📱 TikTok i reszta · 🧾 Dorosłość mode · 🍿 Filmy i seriale · ⚽ Sport i fame · 🎲 Nostalgia

**Sezon 2:** 💒 Wesele · 🎄 Święta · 🐾 Zwierzaki i memy · 🛒 Zakupy · 🚌 Na mieście · 💪 Siłka · 💄 Glow up · 📺 Polska telewizja · 🗣️ Słownik ziomka · 🗺️ Polska na mapie · 🍔 Fast food · 💼 Korpo i studia · ✏️ Piórnik i lekcje · ✈️ Wakacje za granicą · 🕹️ Gierki 2.0

## Jak grać

Otwórz `index.html` w przeglądarce (działa też offline, bez serwera) albo wrzuć repo na GitHub Pages.

- tapnij kratkę i pisz – na telefonie wyskakuje zwykła klawiatura systemowa, a podpowiedź wisi tuż nad nią,
- tapnij kratkę drugi raz albo w podpowiedź, żeby zmienić kierunek; strzałki ‹ › skaczą po hasłach,
- **💡 Litera** sama uzupełnia brakującą (albo błędną) literę w aktualnym haśle i przesuwa kursor dalej,
- **🔓 Hasło** odsłania całe słowo i przeskakuje do następnego niedokończonego,
- **autosprawdzanie**: dobre hasło od razu się zieleni i blokuje (a „Z” zamienia się w „Ż” itd.), złe mignie na czerwono,
- „Z” zamiast „Ż” też jest zaliczane,
- na komputerze: strzałki, Tab/Enter = następne hasło, spacja = zmiana kierunku,
- ⚙️ ustawienia: autosprawdzanie, przeskakiwanie wypełnionych kratek, klawiatura w apce zamiast systemowej, czyszczenie postępu,
- na stronie głównej: „Kontynuuj”, „Losuj krzyżówkę” i postęp każdej krzyżówki; po rozwiązaniu – konfetti, udostępnianie wyniku i przejście do następnej.

## Jak dodać lub zmienić hasła

Wszystkie hasła siedzą w jednym pliku: [`hasla.txt`](hasla.txt).

```
[Sezon 2]
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
