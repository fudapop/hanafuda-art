# Dziennik zmian

## [2.4.0] - 2025-08-20

### Internacjonalizacja i treść
- **Wsparcie dla języka polskiego**: Dodano język polski (pl) jako nową opcję językową.
- **Zlokalizowane strony treści**: Wdrożono tłumaczenia dla statycznych stron treści.
- **Tłumaczenia metadanych stron**: Dodano wsparcie i18n dla metadanych stron.
- **Tłumaczenia stopek**: Dodano brakujące tłumaczenia dla stopek stron.
- **Struktura treści**: Zaktualizowano strukturę katalogu treści, aby lepiej wspierać tłumaczenia.

### Interfejs użytkownika i doświadczenie
- **Przejścia między stronami**: Usunięto globalne przejścia między stronami i płynne przewijanie, aby zapewnić bardziej natywne odczucia.

## [2.3.3] - 2025-08-16

### Ulepszenia systemu audio

- **Udoskonalenie systemu audio**: Wprowadzono oddzielne sterowanie głośnością i wyłączaniem dla muzyki w tle (BGM) i efektów dźwiękowych (SFX).
- **Optymalizacja zasobów**: Funkcję wyciszania zastąpiono opcją „wyłącz”, aby zapobiec odtwarzaniu ścieżek audio w tle, gdy są wyłączone.
- **Ulepszone wznawianie dźwięku**: Naprawiono problem, w którym muzyka w tle nie wznawiała się po ponownym włączeniu ze stanu wyłączonego.

## [2.3.2] - 2025-07-27

### Nowe funkcje
- **Nowy projekt kart**: Dodano projekt kart „Shou Suisaiga” autorstwa użytkownika Discorda Vulume.

## [2.3.1] - 2025-07-23

### Naprawione błędy
- **Tłumaczenia**: Dodano brakujące tłumaczenia dla typów kart.
- **Interfejs użytkownika**: Poprawiono odstępy w komunikacie modalnym wyników.
- **Interfejs użytkownika**: Zaktualizowano przyciski ekranu startowego, aby zminimalizować ich stłoczenie.
- **Ranking**: Naprawiono przewijanie tabeli na urządzeniach mobilnych.

## [2.3.0] - 2025-07-22

### Nowe funkcje
- **Rankingi graczy**: Dodano nową stronę do wyświetlania rankingów graczy.

### Naprawione błędy
- **Atrybucje**: Poprawiono literówkę w nazwisku współtwórcy na stronie atrybucji.

## [2.2.0] - 2025-07-20

### Nowe funkcje
- **Internacjonalizacja**: Pełne wsparcie lokalizacji w języku angielskim i japońskim z płynnym przełączaniem języków.
- **Ulepszenie Tsuki-fuda**: Karty są teraz wyświetlane w artystycznym układzie zamierzonym przez oryginalnego projektanta.
- **System tłumaczeń**: Kompleksowe pokrycie tłumaczeń dla opcji przeglądania, opisów yaku i komponentów kolekcji.

### Ulepszenia interfejsu użytkownika i doświadczenia
- **Responsywność mobilna**: Ulepszone doświadczenie mobilne dzięki poprawionemu pozycjonowaniu modali, skalowaniu paska stanu i obsłudze przepełnienia ręki.
- **Dopracowanie interfejsu**: Zaktualizowano ikony pełnoekranowe, dopracowano układy modali i poprawiono prezentację komponentów kolekcji.

### Naprawione błędy
- **System awatarów**: Naprawiono problemy z wyborem awatarów i losowym przypisywaniem.
- **Sterowanie grą**: Rozwiązano problemy z widocznością przycisków w stanach końcowych gry.
- **Poprawki układu**: Skorygowano różne problemy z pozycjonowaniem i przepełnieniem na różnych rozmiarach ekranu.

### Wydajność i techniczne
- **Optymalizacja obrazów**: Kontynuacja konwersji do WebP w celu poprawy wydajności ładowania.
- **Jakość kodu**: Zrefaktoryzowano zarządzanie stanem awatarów i zaktualizowano zależności.

## [2.1.1] - 2025-07-19

### Ulepszenia
- **Wydajność**: Zoptymalizowano obrazy kart i tła, konwertując je na WebP i przenosząc zasoby do statycznego zasobnika w celu szybszego ładowania.
- **Responsywny interfejs użytkownika**: Pasek stanu skaluje się teraz bardziej efektywnie na różnych rozmiarach ekranu.
- **Zarządzanie awatarami**: Zrefaktoryzowano zarządzanie stanem awatarów dla lepszej spójności.

### Naprawione błędy
- **Wybór awatara**: Przywrócono pełen zakres opcji awatarów.

### Różne
- **Narzędzia**: Dodano skrypt narzędziowy do przesyłania zasobów.

## [2.1.0] - 2025-07-17

### Ulepszenia interfejsu użytkownika i układu
- **Uproszczony układ**: Główny układ gry został usprawniony, aby zapewnić czystszą i bardziej intuicyjną prezentację.
- **Ulepszone paski przewijania**: Style pasków przewijania zostały zaktualizowane dla lepszej spójności i bardziej nowoczesnego wyglądu.
- **Dostosowane wypełnienie**: Wypełnienie zostało precyzyjnie dostrojone w różnych komponentach, aby poprawić równowagę wizualną.
- **Szerszy modal kolekcji**: Modal do przeglądania kolekcji kart jest teraz szerszy, co ułatwia przeglądanie kart.
- **Kredyty artystów**: Dodano dedykowany komponent do prawidłowego przypisywania artystów projektów kart.

### Ulepszenia rozgrywki
- **Dostęp do listy Yaku**: Gracze mogą teraz otworzyć listę Yaku podczas decyzji o wywołaniu „koi-koi”, aby przejrzeć potencjalne układy.

### Naprawione błędy
- **Przycisk „Pokaż planszę”**: Naprawiono problem, w którym przycisk „Pokaż planszę” w grze nie działał poprawnie.

## [2.0.0] - 2025-07-10

### Ogłoszenia i społeczność
- **System ogłoszeń „Co nowego”** ze śledzeniem wyświetleń/polubień
- **Funkcjonalność polubienia/usunięcia polubienia** dla ogłoszeń z wykorzystaniem pamięci lokalnej

### Doświadczenie audio
- **Adaptacyjna muzyka w tle**, która reaguje na stan rozgrywki
- **Przejścia audio z cross-fade** między muzyką menu a muzyką z rozgrywki

### Projekt wizualny i personalizacja
- **Projekt kart Otwarte Karty** – przyjazny dla początkujących i piękny
- **Lepsza organizacja projektów** ze strukturą Nowe → Odblokowane → Zablokowane
- **Regulowane rozmiary kart** dopasowane do różnych ekranów i preferencji
- **Ulepszony projekt wizualny** z poprawionym tłem i spójnością interfejsu użytkownika
- **Hierarchia wizualna** w projektach kart dla łatwiejszego rozpoznawania

### Ulepszenia rozgrywki
- **Przeglądanie kolekcji** z przyciskiem lupy i obsługą podwójnego kliknięcia
- **Komponent DeckShowcase** z funkcją automatycznego odkrywania
- **Widoczność i prominentność kart** podczas rozgrywki
- **Doświadczenie przeglądania kolekcji** z rozszerzonymi opcjami wyświetlania

### Interfejs i dostępność
- **Układy menu i modali** dla lepszej użyteczności i dostępności
- **Dostępność** na wszystkich typach urządzeń

---