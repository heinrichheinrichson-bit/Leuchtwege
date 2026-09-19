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

## Sichtbarer Abschluss (1.8-test)

Alle Modi und Lösehilfen verwenden useVictory: 300 ms für die letzte Bewegung, dann Erfolgssound und ein einzelner Lichtimpuls mit Funken; nach weiteren 1500 ms öffnet sich die Erfolgsmeldung. Laden gelöster Partien startet keinen Ablauf. Navigation, Undo, Neustartdialog, Regeln und Hintergrundwechsel brechen ausstehende Abläufe ab. Reduzierte Bewegung deaktiviert Funken und Pulsanimationen. Der Zeitablauf und abgebrochene Callbacks werden separat getestet.

## Freie Schiebepartien und direkter Testschritt (1.9-test)

Beide Schiebemodi bieten jetzt freie 3×3-Rätsel mit Leicht, Mittel und Schwer. Der Generator zählt sämtliche gültigen Zielanordnungen auf, einschließlich vertauschter gleichartiger Kachel-IDs. Eine Mehrquellen-Breitensuche ermittelt die tatsächliche Mindestzahl an Schüben bis zu irgendeinem gültigen Netz. Nur Schieben: 4–7 / 10–14 / 17–21 Schübe. Schieben & Drehen: 2–3 / 4–5 / 6–8 notwendige Schübe bei frei wählbaren Orientierungen; zusätzlich ist Drehen erforderlich. Dies misst Schiebedistanz, nicht subjektive menschliche Denkzeit. Die Einstufung ist getrennt vom Drehpuzzle und wird anhand von Spieltests weiter kalibriert.

Jedes Ergebnis enthält eine erreichbare geprüfte Zielstellung für die bestehenden Lösehilfen. Der Generator läuft in einem eigenen Worker, begrenzt die Suche auf zwölf Sekunden und wird von der Oberfläche nach fünfzehn Sekunden beendet. Abbrechen, Verlassen und Fehler behalten die vorherige Partie. Identische jüngste Ausgangsnetze werden über die letzten 100 Fingerprints vermieden; symmetrische Varianten sind nicht ausgeschlossen. Es gibt zunächst keine freie Rastergrößenwahl.

leuchtwege-sliding-free-v1 speichert je eine freie Partie pro Schiebemodus inklusive vollständigem Rätsel, Sitzung, Verlauf und zuletzt gewählter Stufe. Das Ersetzen einer offenen Partie wird bestätigt. Die sechs Proberätsel, 60 Kampagnenrätsel und das freie Drehspiel behalten ihre bisherigen Speicherschlüssel. Jede generierte Rätsel-ID verwendet das vorhandene Drei-Tipps-Kontingent.

Der separate Entwicklerbutton „Test: Nächster Schritt“ liegt direkt bei den Spielaktionen und führt ohne Auswahlfenster genau eine Aktion aus. Wiederholtes Drücken zeigt den Lösungsweg Schritt für Schritt; auch beim letzten Testschritt erscheint kein Erfolgsdialog. Lichtimpuls und Sound bleiben erhalten. Komplett/Fast lösen bleiben im Testhilfe-Dialog. Spieler-Tipps und normale Abschlüsse behalten ihr bisheriges Verhalten. Veraltete Suchergebnisse werden verworfen, wenn zwischenzeitlich das Brett verändert wurde.

Automatisch geprüft: 72 neue Partien über beide Modi und alle Stufen, komplette und fast komplette Lösungen, einzelne und wiederholte Testschritte, Undo, Speicherwiederherstellung und unabhängige Vorwärtssuche zur Distanzkontrolle an sechs Stichproben. Die ausgelieferte Workerdatei wurde separat geprüft. Gemessene Erzeugung auf dem Entwicklungsrechner unter 300 ms in dieser Stichprobe; kein Smartphone-Leistungsversprechen. Die aktuelle APK muss weiterhin auf dem S22 getestet werden.

## Spielbare Einführung und vollständige Schiebekataloge (1.10-test)

„Spielend lernen“ öffnet drei eigene, kurze Übungsbretter. Die Einführung verwendet die normalen Spielaktionen und Schiebegesten. Nur die gerade erklärte Aktion verändert das Übungsbrett; andere Eingaben zeigen einen Hinweis. Das Drehbeispiel beginnt mit neun leuchtenden Kacheln und offenen Anschlüssen und erklärt damit den Unterschied zwischen Leuchten und Lösen. Die beiden Schiebeübungen erklären Leerfeld, Wischen, Zwei-Tipp-Schieben und im kombinierten Modus das erneute Antippen zum Drehen. Hinweise und Abschluss bleiben neben dem Brett, ohne Dialog. Überspringen, Neustart und Moduswechsel sind jederzeit möglich. Der Abschluss pro Modus wird separat unter leuchtwege-learn-v1 gespeichert; Spielstände und Tippbudgets werden nicht verändert.

Beide Schiebemodi enthalten jetzt je 60 feste 3×3-Rätsel, je 20 pro Schwierigkeit. Die ersten sechs Datensätze behalten ihre bisherigen IDs, Indizes, Bretter und Lösungswege; lediglich Einstufung und gemessene Mindestschübe wurden ergänzt. Insbesondere gehören die drei ursprünglichen kombinierten Rätsel mit 8, 10 und 7 Mindestschüben alle zur schweren Gruppe. extend-sliding-catalog.mjs ist ein einmaliger, gegen Überschreiben geschützter Ausbau. Alle 114 Ergänzungen stammen aus dem geprüften Generator und besitzen einen legalen Lösungsweg.

Die Darstellung gruppiert nach Schwierigkeit und sortiert innerhalb einer Gruppe nach Mindestschüben. Die Reihenfolge der gespeicherten Datensätze bleibt davon getrennt. „Nächstes Rätsel“ folgt der dargestellten Reihenfolge. Aufklappbare Gruppen zeigen den jeweiligen Abschlussstand. Die freien Partien bleiben verfügbar und separat gespeichert. Ein Klick auf ein festes Rätsel beendet eine eventuell noch laufende Erzeugung.

Geprüft: 120 unterschiedliche Schiebe-Ausgangsnetze und ihre legalen Lösungen, sechs unveränderte Originalrätsel per Prüfsumme, je 60 Rätsel pro Modus und 20 pro Stufe, Katalogreihenfolge, Tap/Wisch-Gleichheit, Undo und Wiederherstellung. Alle 180 festen Rätsel einschließlich der Drehkampagne wurden mit Komplett-, Fast- und Einzelschritt-Hilfe aus Ausgangs- und veränderten Stellungen geprüft. Die drei Einführungen sind durch die normalen Spielregeln lösbar. Bedienung und Darstellung der neuen Einführung auf dem S22 sind noch manuell zu prüfen.

## Spielzeit und persönlicher Verlauf (1.11-test)

Alle drei Modi und ihre freien Partien zeigen eine ausblendbare, aufwärtszählende Uhr direkt über dem Brett. Gemessen wird aktive Zeit mit performance.now, nicht die Differenz zweier Wanduhren. Die Zeit pausiert bei Navigation, Regeln, Neustartbestätigung, Tipp-/Test-/Werbedialogen, Hilfesuche, Fokusverlust, unsichtbarer Seite und nativem appStateChange. Ein Abschluss friert die Zeit ein. Die Anzeige kann ohne Beenden der Messung global ausgeblendet werden. Stand wird sekündlich sowie bei Pausen, Zügen und Navigation gespeichert; ein abruptes Beenden ohne Lifecycle-Ereignis kann den letzten nicht gespeicherten Sekundenbruchteil verlieren.

leuchtwege-history-v1 enthält aktive und abgeschlossene Versuche mit stabiler Rätsel-ID, Modus, Katalog/frei, Schwierigkeit, Rastergröße, Start/Abschluss, aktiver Dauer, Zugstand und Tipp-/Testnutzung. Neustart erzeugt einen neuen Versuch. Undo entfernt keine Hilfe-Markierung; Undo und erneutes Lösen nach einem Abschluss zählen nicht doppelt. Testabschlüsse werden separat von regulären Abschlüssen ausgewertet. Die bestehenden Spielstände und Tippbudgets behalten ihre Speicherschlüssel.

„Deine Statistik“ auf der Startseite zeigt aktive Gesamtzeit, reguläre Abschlüsse, unterschiedliche Rätsel, selbstständige Lösungen, Lösungen mit Tipps, Testlösungen und die letzten zwanzig Abschlüsse. Der gespeicherte Verlauf wird dabei nicht auf zwanzig gekürzt. Modusfilter sind verfügbar. Neue Daten beginnen mit diesem Update; frühere Katalogabschlüsse werden nicht mit erfundenen Zeiten importiert. Bereits angefangene Partien sind als zeitlich unvollständig erfasst markiert und zählen ohne bekannte Vorgeschichte nicht als nachweislich selbstständig gelöst. Übungen schreiben keine Statistiken. Daten bleiben lokal, Browser und APK getrennt; Kalender, Streak, Missionen und Erfolge sind noch nicht enthalten.

Thinkheims hashi_foundation.dart (Timer und Lifecycle-Speicherung) sowie core/statistics/puzzle_attempt.dart und game_statistics.dart dienten als Referenz. Übernommen wurde das Prinzip einzelner Versuche als Grundlage der Auswertung; Flutter-Code wurde nicht kopiert oder verändert. Leuchtwege ergänzt explizite Test-Markierung und monotone Zeitmessung.

Geprüft: Zeitmessung über Pause/Fortsetzen, Wiederherstellung, Ausblendepräferenz, getrennte Versuche, dauerhafte Hilfe-Markierungen, doppelte Abschlüsse, Filter und unvollständige Altpartien. Alle 180 festen Rätsel weiterhin mit den drei Lösehilfen geprüft. Im lokalen Browser wurden Start der Uhr und Pause im geöffneten Testhilfefenster beobachtet. App-Wechsel, Sperrbildschirm und Wiederaufnahme auf dem S22 sind noch manuell zu prüfen.

## Tagesrätsel, Kalender und Serie (1.12-test)

Die Startseite öffnet drei Tagesrätsel: Drehen (4×4), Schieben und Schieben & Drehen (je 3×3). Die Stufen wechseln nach einem festen Tagesplan. Datum, Modus und v1-Seed bestimmen das Rätsel; Prüfsummen schützen die veröffentlichten Ausgangsstellungen vor unbemerkten Generatoränderungen. Die Erzeugung läuft abbrechbar im Worker mit 15 Sekunden Timeout. Das Archiv beginnt am 12.09.2026 und schaltet vergangene Tage bis einschließlich heute frei. Gespeichert wird pro Datum und Modus unter leuchtwege-daily-v1:Datum:Modus; bestehende Katalogstände bleiben erhalten.

Der Kalender zeigt gelöste Tagesrätsel und tatsächliche Spieltage getrennt. Ein regulärer Abschluss in einem beliebigen Modus, Katalog oder freien Spiel reicht für die Serie. Tipps sind erlaubt; Testhilfen und Versuche mit unbekannter Vorgeschichte zählen nicht. Nachholen füllt den zugehörigen Kalendertag, schreibt den Spieltag aber auf das lokale Abschlussdatum. Mehrfaches Lösen und erneutes Öffnen eines fertigen Bretts zählen nicht doppelt. Eine gestern fortgesetzte Serie bleibt bis zum Ende des heutigen Tages bestehen. Daten bleiben lokal und sind zwischen Browser und APK getrennt. Missionen und Erfolge folgen später.

Thinkheims daily_challenge.dart und streak_calendar.dart dienten als Referenz für Tages-IDs und Kalenderaufbau. Geprüft: 36 Tagesrätsel mit vollständiger Lösung, Fast-Lösung, Wiederherstellung und stabiler Erzeugung; Monats-/Jahreswechsel, Schaltjahre, Nachholen, Tipps, Testausschluss und doppelte Abschlüsse. Der ausgelieferte Tages-Worker wurde für alle drei Modi einschließlich Fehler und Abbruch geprüft. Die 180 Katalogrätsel bestehen weiterhin die Lösehilfe-Prüfungen. Darstellung und Bedienung dieses Updates auf dem S22 sind noch manuell zu prüfen.

## Eigener Streak-Kalender (1.13-test)

Die Startseite trennt Tagesrätsel und Streak-Kalender. Letzterer zeigt tatsächliche Abschlusstage mit großem Haken, den heutigen Status und aktuelle/längste Serie. Frühere Monate mit gespeicherten Spieltagen sind aufrufbar. Der Tagesrätsel-Kalender zeigt ausschließlich den Abschlussstand seiner drei Rätsel. Die vorhandene Zählregel bleibt erhalten: Nachholen repariert keine frühere Lücke; Tipps zählen, Testhilfe nicht. Freeze ist noch nicht implementiert und wird nicht vorgetäuscht. Vorhandene gespeicherte Versuche werden weiterverwendet. TypeScript, Produktionsbuild und die bestehende Tages-/Streak-Prüfung erfolgreich; neue Darstellung auf S22 noch manuell zu prüfen.

## Erfahrungspunkte und Level (1.14-test)

Tagesrätsel geben einmalig 35/45/60 XP nach Stufe, plus 10 XP ohne Tipps. Thinkheims ExperiencePointsPolicy v2 ist die Referenz für diese Werte. Leuchtwege vergibt in diesem Baublock ausschließlich Tagesrätsel-XP. Die eigene Levelkurve beginnt bei 100 XP und steigt pro Level um 50 XP; sie ist auf die zunächst drei täglichen Aufgaben ausgelegt. Startseite: Gesamtpunkte, Level, Fortschritt und Regelübersicht. Tageskarten zeigen erreichbare/gesammelte Punkte, Erfolgsdialoge die Belohnung.

lib/experience.mjs rekonstruiert v1-Belohnungen aus dem gespeicherten Abschlussverlauf: nur der erste reguläre Abschluss je stabiler Tagesrätsel-ID zählt. Ein früherer Testabschluss verhindert keinen späteren regulären Gewinn. Wiederholungen oder spätere Lösungen ohne Tipps erhöhen die einmalige Belohnung nicht. Die v1-Wertetabelle muss bei späteren Erweiterungen für bestehende Belohnungen erhalten bleiben. Bereits gespeicherte reguläre Tagesabschlüsse werden berücksichtigt; unbekannte Altabschlüsse werden nicht erfunden. Testhilfe, unvollständige Vorgeschichte, Katalog und Randomizer geben in diesem Baublock keine XP. Streak und XP bleiben getrennt; Nachholen repariert keinen Spieltag. Alle Daten bleiben lokal im vorhandenen Verlauf, ohne zweiten konkurrierenden Punktezähler.

Geprüft: erste reguläre Vergabe nach Testhilfe, Tipps, Wiederholung, Reihenfolge, Speicherwiederherstellung, Nachholen, drei Modi und Levelgrenzen. Bestehende Statistik-Prüfung erfolgreich. Neue Darstellung und Abschlussanzeige auf S22 noch manuell zu prüfen. Missionen, Erfolge und Freeze sind weiterhin offen.

## Einheitliche App-Oberfläche (1.15-test)

Die Startseite priorisiert den Spieleinstieg und gruppiert Spielarten sowie Fortschritt. Kompakte Zweispaltenkarten ersetzen die lange Liste gleich großer Schaltflächen; unter 360 px wird daraus eine Spalte. XP bleiben sichtbar, Regeln sind aufklappbar. Alle Hauptbereiche teilen Seitenbreite, Ränder, Schriftgrößen und Schaltflächenmaße. Tagesrätsel stehen direkt im Vordergrund; das Datumsarchiv bleibt aufklappbar erreichbar. Drehkatalog und Schiebekatalog verwenden dieselben aufklappbaren Schwierigkeitsgruppen. Schiebemodi werden per direkter Auswahl gewechselt. Die Einführung öffnet den ausgewählten Schiebemodus.

Zusatztexte wurden gekürzt oder unter Statistik-/Streak-Hinweisen gesammelt, Regeln präzisiert und Dialoge kompakter gesetzt. Spielzeit, Rückgängig, Sperren, Neustart, Tipps und der direkte Testschritt bleiben verfügbar. Navigation und interne Spielwechsel beginnen oben statt an einer alten Scrollposition. Spielstände, Rätsel-IDs, XP und Streak-Zählung bleiben unverändert.

Im lokalen Browser durchgesehen: Startseite, Drehkatalog aufklappen, Drehspiel und Regeln, beide Schiebekataloge und Moduswechsel, Einführung, Tagesrätsel, Streak, Statistik und freie Auswahl. Smartphoneansichten bei 390×844 und schmale Ansichten bei 320×740 geprüft; kein horizontaler Überlauf in den geprüften schmalen Seiten. TypeScript, bestehende Schieberegel- und XP-Prüfungen erfolgreich. Kein vollständiger Geräte- oder Barrierefreiheitstest; Darstellung auf dem S22 ist noch zu prüfen.

## XP für alle regulären Rätsel (1.16-test)

Korrektur der bisherigen Einschränkung auf Tagesrätsel: Katalog, Zufallsrätsel und Tagesrätsel geben in allen drei Modi XP. Thinkheims Basiswerte sind 20/25/35; Mittel gibt +10, Schwer +25 und ohne Tipps +10. Ein neuer regulärer Wiederholungsversuch bei Katalog/Zufall gibt 5 XP, Tagesrätsel bleiben einmalig. Doppelte Abschlussereignisse ohne Neustart erzeugen keinen neuen Versuch. Testabschlüsse und unbekannte Vorgeschichten bleiben ausgeschlossen. Der vorhandene gespeicherte Verlauf wird vollständig berücksichtigt; ältere reine Kataloghaken ohne Versuchsdaten werden nicht als nachweislich reguläre Abschlüsse importiert. Bestehende Tages-XP und die Levelkurve bleiben erhalten.

Alle Spiel-Abschlussdialoge verwenden dieselbe XP-Anzeige, die den konkreten Versuch zuordnet. Geprüft: 18 Kombinationen aus Katalog/Zufall, drei Modi und drei Stufen, Tippbonus, Wiederholungen, Doppelauslösung, Testausschluss, Wiederherstellung sowie bisherige Tagesregeln und Levelgrenzen.

## Einstellungen und Sicherung (1.19-test)

Zahnrad auf der Startseite öffnet Töne, Animationen und Spieluhr. Die vorhandene Ton- und Uhrspeicherung bleibt maßgeblich; Spielzeit wird bei ausgeblendeter Uhr weiter erfasst. Animationen werden separat gespeichert und für alle Modi einschließlich Erfolgsglühen abgeschaltet, die Betrachtungspause bleibt erhalten.

Versionierte Textsicherungen enthalten Katalogstände, freie Rätsel beider Systeme, Tagesrätsel, Tipps, Einführungen, Spielhistorie und Einstellungen. XP und Streak bleiben aus der ursprünglichen Historie abgeleitet. Fremde oder ungültige Daten werden vor jeder Änderung abgewiesen. Import ersetzt den Stand nach einer Vorschau und Bestätigung; eine lokale Kopie ermöglicht Rückgängigmachen. Ein Schreibjournal setzt unterbrochene Importe beim Neustart zurück. Sicherungen sind lokal und müssen extern aufbewahrt werden; keine Cloud-Synchronisierung. Clipboard-Fallback zeigt markierbaren Text an.

Geprüft: TypeScript, Build, bestehende Erfolgstimeline; Backup-Roundtrip, alle Tagesmodi, freie Drehpuzzles, beschädigte Daten, Speicherfehler, Undo, unterbrochene Schreibvorgänge und Erhalt von XP/Streak. Browser: Export, Vorschau, Abbruch, Import, Undo und Animationseinstellung; Layout bei 390 und 320 Pixeln. Android-APK gebaut, S22-Test durch Nutzer noch ausstehend. Sprachen, Farbschemata, Haptik, Erinnerungen und Cloud bleiben offen.


## Adaptive Spielansichten (1.27-test)

Dreh-, Tages- und Schiebespiele teilen eine Spielansicht, die die tatsächlich verbleibende Höhe für das Brett misst. Übersetzungen, mehrzeilige Texte, Uhr, Hilfemeldungen und Testbuttons fließen in die Berechnung ein. ResizeObserver und VisualViewport berücksichtigen Größenänderungen; die Mindestgröße orientiert sich an 44-Pixel-Kacheln. Bei sehr kleinen Flächen bleibt vertikales Scrollen möglich, statt Elemente abzuschneiden. Sichere Bildschirmränder werden berücksichtigt.

Rückgängig, Sperren bzw. Regeln, Neustart und Glühbirne stehen gemeinsam in einer Bedienzeile. Im Dreh-Tagesrätsel stehen die Regeln neben der Überschrift. Testschritt und Testmenü bleiben im Testbuild als eigene zweite Reihe erhalten und fehlen im normalen Build. Keine Änderungen an Rätsel-IDs, Spielregeln oder gespeicherten Fortschritten.

Browserprüfung ohne Testhilfen: 6×6-Drehspiel bei 360×640, 360×740, 393×780, 412×820 und 480×800 ohne Scrollbedarf; beide Schiebemodi und Tages-Drehspiel ebenfalls geprüft, einschließlich englischem Schieben & Drehen bei 360×640. Verschieben per zwei Klicks, Rückgängig, Sperrmodus, Tippdialog und Tagesregeln geprüft. 320×568 und Querformat 640×360 behalten bei Platzmangel einen vertikalen Scroll-Fallback ohne horizontalen Überlauf. Dies sind Browser-Viewportprüfungen, keine vollständigen physischen Android-Gerätetests. Testbuild kann wegen der zusätzlichen Testbuttons weiterhin höher sein.

Zusätzlich korrigiert: Eine noch unberührte Drehpartie behält ihre Ausgangssitzung bei Uhr- und Hilfeaktualisierungen. Dadurch wird ein laufender erster Testschritt nicht mehr irrtümlich als überholt abgewiesen; echte Brettänderungen bleiben geschützt.


## Ruhigere Sounds, Sprache und Startseiten-Streak (1.28-test)

Alle Modi verwenden einen gemeinsamen Web-Audio-Kontext mit zwischengespeicherten Samples. Schnelle Drehungen ersetzen Klänge über kurze Ein-/Ausblendungen statt abruptem Stoppen und Zurücksetzen. Sehr kurze Eingabebursts starten keine zusätzlichen Klänge. Auch der kurze Dreh-Ton verwendet denselben Kontext. Stummschalten und Verlassen der App verwerfen noch wartende Wiedergaben. Der synthetische Entladeton wurde geglättet, mit Fades versehen und leiser eingestellt; die frühere Datei enthielt einzelne übersteuerte Spitzen. Die übrigen Thinkheim-Klänge bleiben erhalten. Die tatsächliche Klangqualität muss auf dem S22 nachgehört werden.

Die vorhandene Kalender-Kachel auf der Startseite zeigt die aktuelle Streak-Länge und „Heute offen“ bzw. „Heute geschafft“ mit Häkchen. Sie öffnet weiterhin den Streak-Kalender. Die Anzeige nutzt dessen unveränderte Regeln einschließlich Streak-Schutz und aktualisiert sich bei Rückkehr, Datenänderungen und Tageswechsel. Kein rückwirkendes Schließen alter Tage.

Die Sprachauswahl zeigt Systemsprache, Deutsch und Englisch. Systemsprache ist weiterhin der Standard ohne gespeicherte Auswahl; bewusste Sprachentscheidungen bleiben erhalten. Ergänzte englische Tages- und Streak-Beschriftungen.

Geprüft: Audio-Unterbrechungen mit Lautstärkerampen, begrenzte schnelle Auslösung, Wiederverwendung des Kontextes und der Samples, Stummschalten während des Ladens und Aufräumen; Sprachvorgaben/-wechsel; bestehende Tages-/Freeze-Regeln. Browser: reguläres Drehpuzzle ohne Testhilfe abgeschlossen, XP/Erfolg und Startseitenstatus kontrolliert. Physische Audioausgabe noch auf Android zu prüfen.
