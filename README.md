# Leuchtwege

Ein ruhiges Logikspiel als Browser-Prototyp und Android-Testprojekt. Kacheln drehen, alle Wege mit der Quelle verbinden und sämtliche offenen Anschlüsse schließen.

## Enthalten

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

Die erste APK wurde vom Nutzer auf dem Samsung S22 erfolgreich auf Bedienung, Drehungen, Ton, Sperren und Sichtbarkeit getestet. Der Nutzer hat anschließend alle 30 Rätsel problemlos durchgespielt und Spaß daran gemeldet. Die Erweiterung auf 60 Rätsel in Version 1.3-test (versionCode 4) benötigt einen erneuten Spieltest. Paketname und Debug-Signatur bleiben für ein Update mit erhaltenen Spielständen gleich. Browser und APK speichern getrennt.

Der Abhängigkeitsstand des Sites-Starters enthält npm-Audit-Meldungen. Vor einem öffentlichen Release sollten die Abhängigkeiten aktualisiert werden. Das Spiel wird als statische Dateien ohne Server- oder Bildverarbeitung ausgeliefert.
