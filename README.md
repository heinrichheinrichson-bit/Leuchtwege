# Leuchtwege

Ein ruhiges Logikspiel als Browser-Prototyp und Android-Testprojekt. Kacheln drehen, alle Wege mit der Quelle verbinden und sämtliche offenen Anschlüsse schließen.

## Enthalten

- Freies Spiel: Schwierigkeit und Rastergröße wählen, geprüftes Rätsel im Worker erzeugen, abbrechen und getrennt von der Kampagne fortsetzen.
- Startseite mit Fortsetzen eines offenen Rätsels, separater Rätselkatalog und eigene Anleitung.
- Kompakter Spielbildschirm mit an die Bildschirmhöhe angepasstem Raster und drei direkt erreichbaren Aktionen.
- Neustart erst nach Bestätigung; Android-Zurück schließt Dialoge oder kehrt zur vorherigen Ansicht zurück.
- Abschlussdialog mit „Brett ansehen“, nächstem offenen Rätsel und Thinkheims selbst erzeugtem Erfolgssound (0,38 Lautstärke). Ton aus unterbindet auch diesen Sound; Laden einer gelösten Partie spielt ihn nicht erneut ab.

- 60 geprüfte Rätsel: je 20 leichte, mittlere und schwere. Die bisherigen 30 Anordnungen bleiben unverändert.
- Empfohlene Spielreihenfolge unabhängig von den stabilen Rätselnummern, drei kurze Einstiegshinweise und ein leichterer Abschnitt zur Auflockerung.
- Automatisch geprüfte, eindeutige Lösungen.
- Touch- und Tastaturbedienung, Lichtfluss, offene Anschlüsse, optionaler synthetischer Klickton.
- Animierte Drehungen, Rückgängig für Drehungen und Sperren, manuell sperrbare Kacheln.
- Getrennte Zwischenstände je Rätsel, gespeicherter Tonstatus und Übernahme des bisherigen Browser-Spielstands.
- Deutsche Anleitung, responsive Oberfläche, reduzierte Bewegung.

## Entwicklung

Node.js 22 LTS verwenden (unter Windows erfolgreich mit 22.16 getestet; Node 24 verursachte einen Fehler beim Beenden des Builds). Dann:

```sh
npm ci
npm run dev
```

Rätsel neu erzeugen und Logik prüfen:

```sh
npm test
npm run build
```

Die Ausgabe ist statisch. Das Spiel benötigt weder eine Datenbank noch einen Spielserver. Der gespeicherte Browser-Spielstand gehört jeweils zur aufgerufenen Adresse. Die Android-App hat einen eigenen Spielstand.

## Rätsel und Schwierigkeit

`npm run levels:review` bewertet den Katalog erneut und erzeugt `docs/level-review.md`. Aus einem vorhandenen 21er- oder 30er-Katalog ergänzt es reproduzierbar auf 60 Aufgaben; bei 60 Aufgaben wird nichts ersetzt. `expand-levels.mjs` leitet auf diesen Ablauf weiter. Der alte Bootstrap-Generator verweigert das Überschreiben eines veröffentlichten Katalogs.

Die Bewertung unterscheidet lokale Anschlussketten, notwendige Verbindungen des gesamten möglichen Netzes und Widerspruchsprüfungen einzelner Orientierungen. Mittlere Ableitungstiefe und benötigte Methode bestimmen die Einstufung; die Rastergröße erhält keinen eigenen Bonus. Rotationen des gesamten Rätsels ergeben dieselbe Bewertung. „Schwer“ bedeutet, dass unsere direkten Regeln nicht genügen; ein Mensch kann dennoch andere direkte Schlüsse erkennen. Die Schwellenwerte sind vorläufige Designentscheidungen, keine Messungen mit Spielern.

Gezielte Korrekturen stehen in `difficulty-overrides.json`, etwa `{"lw-017":{"tier":"Leicht","reason":"Nutzerfeedback nach Spieltest"}}`. Der Schlüssel ist die stabile Rätsel-ID. Die automatische Bewertung bleibt dokumentiert. Derzeit sind keine Korrekturen aufgrund nicht vorhandener Einzelbewertungen eingetragen.

Neue Aufgaben werden auf eindeutige Lösung und Ähnlichkeit geprüft. Gedrehte/gespiegelte Duplikate und über 90 % übereinstimmende Bauteiltypen an entsprechenden Positionen werden ausgeschlossen. Die ersten 30 Aufgaben sind durch feste Fingerabdrücke gegen versehentliche Veränderungen geschützt.

## Android-Testversion

Capacitor bündelt die statischen Spieldateien in der APK, ohne externe Startadresse. Erforderlich zum Bauen: Android SDK 36, JDK 21 und Node 22.

```sh
npm run android:sync
cd android
./gradlew assembleDebug
```

Unter Windows `gradlew.bat assembleDebug` verwenden. Ausgabe: `android/app/build/outputs/apk/debug/app-debug.apk`. JAVA_HOME muss auf JDK 21 zeigen, ANDROID_HOME auf das Android SDK. Die Testversion verwendet eine Debug-Signatur. Ein späterer Store-Release benötigt eine eigene Release-Signatur und ein App Bundle.

## Grenzen dieses Prototyps

Noch keine iOS-App, keine Werbung und keine Käufe. Die neue Schwierigkeitseinstufung ist noch nicht mit Spielern validiert. Automatische Tests prüfen eindeutige Lösungen, Netzwerkregeln, Rückgängig, Sperren, Reset, Migration und getrennte Spielstände.

Eine opt-in WebMCP-Leseschnittstelle wird in unterstützten Browsern registriert. Ihre Laufzeitprüfung war in dieser Entwicklungsumgebung nicht verfügbar. Ein manueller Test auf echten Mobilgeräten steht aus.

Die erste APK wurde vom Nutzer auf dem Samsung S22 erfolgreich auf Bedienung, Drehungen, Ton, Sperren und Sichtbarkeit getestet. Der Nutzer hat anschließend alle 30 Rätsel problemlos durchgespielt und Spaß daran gemeldet. Auch alle 60 Kampagnenrätsel wurden vom Nutzer problemlos durchgespielt. Version 1.4-test (versionCode 5) ergänzt freie Rätsel; deren S22-Laufzeit und Bedienung sind noch manuell zu prüfen. Paketname und Debug-Signatur bleiben für ein Update mit erhaltenen Spielständen gleich. Browser und APK speichern getrennt.

Der Abhängigkeitsstand des Sites-Starters enthält npm-Audit-Meldungen. Vor einem öffentlichen Release sollten die Abhängigkeiten aktualisiert werden. Das Spiel wird als statische Dateien ohne Server- oder Bildverarbeitung ausgeliefert.

## Freie Rätsel

`lib/random-game.mjs` erzeugt aus einem Seed neue Netze, prüft eindeutige Lösung und die gewünschte Denkstufe und schließt die Kampagne sowie bis zu 100 zuletzt erzeugte freie Netze aus (auch gedreht/gespiegelt). Die Sucharbeit liegt in `lib/random.worker.ts`; nach spätestens acht Sekunden beendet die Oberfläche den Worker. Abbrechen, Navigation und neue Aufträge verwerfen alte Ergebnisse. Die offene Partie wird erst bei erfolgreicher Erzeugung ersetzt.

Speicherung unter `leuchtwege-free-v1` enthält das tatsächliche Brett, Seed, Generatorversion, Drehungen, Sperren, Undo-Verlauf, Auswahl und jüngste Netzschlüssel. Die Kampagne bleibt unter ihrem bestehenden Schlüssel. Die Schwierigkeitsauswahl ist eine heuristische Schätzung, keine garantierte subjektive Einstufung. Automatisch wählt eine unterstützte Größe; Leicht bietet 3–5, Mittel/Schwer 4–6.

`node test-random.mjs --report` prüft 144 neue Rätsel und schreibt Rechnerlaufzeiten nach `docs/randomizer-benchmark.json`. Diese sind keine Smartphone-Messwerte. Thinkheims Hitori- und Binär-Generatoren dienten als Referenz für Seed, Prüfung und begrenzte Versuche; es wurde kein Thinkheim-Code verändert.

## Elektrisches Klangfeedback (1.5-test)

Beim Drehen spielt zusätzlich aufleuchtendes Netz Thinkheims Hashi-Verbindungston (0,34). Erlöschen Kacheln, spielt der synthetische Hashi-Entladeton (0,27). Bei gleichzeitigem Zugewinn und Verlust hat die Entladung Vorrang; beim Gewinn ausschließlich der Erfolgssound. Ohne Änderung der beleuchteten Kacheln bleibt der kurze Klick. Laden, Sperren und Neustart lösen keine elektrischen Effekte aus. Ton aus und Wechsel in den Hintergrund stoppen die WAV-Wiedergabe. Herkunft siehe public/sounds/SOURCES.md.

## Schiebepuzzles (1.6-test)

Zwei Prototyp-Modi mit je drei festen 3×3-Rätseln: Nur Schieben und Schieben & Drehen. Acht Kacheln plus ein Leerfeld; Quelle an einer stabilen Kachel-ID, die beim Verschieben mitwandert. Jedes Netz mit allen acht verbundenen Kacheln ohne offene Anschlüsse gewinnt. Eine eindeutige Zielanordnung wird nicht verlangt.

Wischen entlang einer Achse zum benachbarten Leerfeld oder Kachel antippen und dann Leerfeld antippen führt zum gleichen Zug. Erneutes Antippen der ausgewählten Kachel dreht nur im kombinierten Modus. Pointer Capture, Richtungsschwelle, Abbruchbehandlung und Unterdrückung des anschließenden Klicks trennen Wischen von Tippen. Das Hashi-GestureDetector-Verhalten in Thinkheims hashi_foundation.dart (Start/Target, getrennte Tap/Pan-Callbacks, Abbruch) diente als Vorlage; Flutter-Code wurde nicht kopiert.

Die sechs Rätsel werden aus gültigen Netzen mit Leerfeld durch legale Schübe und gegebenenfalls Drehungen erzeugt. Der gespeicherte Rückweg ist getestet; kombinierte Rätsel sind in ihrer Ausgangsposition nicht allein durch Drehen lösbar. generate-sliding.mjs verweigert ein Überschreiben des veröffentlichten Katalogs. Keine Schwierigkeitsversprechen oder freier Generator für die neuen Modi.

Eigener Speicher leuchtwege-sliding-v1 mit sechs getrennten Partien und Undo-Verläufen. Kampagne und freies Drehspiel bleiben unverändert. Die neuen Modi verwenden die bestehenden elektrischen WAVs und den Erfolgssound; Lichtänderungen werden anhand der Kachel-Identität verglichen. Smartphone-Gesten und Spielgefühl müssen noch auf dem S22 geprüft werden.

## Lösehilfen und Tipps (1.7-test)

Die Glühbirne ist eine Spielerfunktion: drei kostenlose Tipps pro Rätsel, danach ein weiterer Tipp pro bestätigtem Reward. Verbrauch wird separat pro stabiler Rätsel-ID gespeichert (leuchtwege-hints-v1:ID); Neustart und Undo füllen das Kontingent nicht auf. Für jede neue zufällig erzeugte Partie gilt ein eigenes Kontingent.

Die Testhilfe (Komplett lösen, Fast lösen, Nächsten Schritt lösen) verbraucht keine Tipps. Ein Testaufruf kann als Ganzes rückgängig gemacht werden. Die Aktionen verwenden legale Züge aus dem aktuellen Zustand. Drehpuzzles werden zur geprüften Orientierung geführt; nötige Sperren werden dabei aufgehoben. 3×3-Schiebepuzzles verwenden bidirektionale Suche zur gespeicherten Zielstellung, bei Bedarf gefolgt von Drehungen. Bereits vorher erreichte gültige Alternativnetze werden akzeptiert. Fast lösen lässt eine einzelne legale Aktion offen. Diese Wege sind nicht zwingend global kürzeste Lösungen.

Die Suche läuft in einem abbrechbaren Worker. Testaktionen können den bestehenden Abschlussdialog und Kampagnenabschluss auslösen, damit diese getestet werden können. Es gibt noch keine Ranglisten, in denen dies als eigene Leistung gewertet würde.

Testhilfe und Werbesimulation sind nur mit der Build-Umgebungsvariable LEUCHTWEGE_TEST_BUILD=1 verfügbar. Normale Builds lassen diese Zugänge weg. Für unsere private Browser-Testseite und Debug-APK wird das Flag ausdrücklich gesetzt. Beispiel PowerShell: $env:LEUCHTWEGE_TEST_BUILD='1', anschließend npm run build und Capacitor-Sync. Vor einem Store-Build die Variable entfernen.

Wie Thinkheims rewarded_hint_dialog.dart nutzt diese Testversion eine deutlich beschriftete Werbesimulation; es ist noch kein echter Werbeanbieter eingebunden. Simulation abschließen vergibt einen Tipp, Abbrechen keinen. Ein Receipt kann nur einmal belohnt werden. In normalen Builds wird ohne Anbieter kein Reward vergeben. Echte Werbung erfordert später die Anbindung und bestätigte Reward-Callbacks.
