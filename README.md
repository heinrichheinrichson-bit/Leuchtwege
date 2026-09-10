# Leuchtwege

Ein ruhiges Logikspiel als Browser-Prototyp und Android-Testprojekt. Kacheln drehen, alle Wege mit der Quelle verbinden und sämtliche offenen Anschlüsse schließen.

## Enthalten

- 21 reproduzierbar erzeugte Rätsel: die bisherigen zwölf plus je drei leichte, mittlere und schwere Proberätsel.
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

`node generate-levels.mjs` erstellt die ursprünglichen zwölf Rätsel. Danach ergänzt `node expand-levels.mjs` neun neue. Bestehende Rätselnummern und Anordnungen bleiben erhalten.

Die vorläufige Einstufung berücksichtigt eindeutige Startpositionen, die Anzahl synchroner Ausschlussrunden und nach dieser Prüfung verbleibende Möglichkeiten. „Schwer“ bedeutet, dass lokale Anschlussprüfung allein nicht ausreicht; globale Netzwerküberlegungen können dennoch einen direkten Lösungsweg liefern. Die Einstufung ist keine gemessene menschliche Schwierigkeit.

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

Der Abhängigkeitsstand des Sites-Starters enthält npm-Audit-Meldungen. Vor einem öffentlichen Release sollten die Abhängigkeiten aktualisiert werden. Das Spiel wird als statische Dateien ohne Server- oder Bildverarbeitung ausgeliefert.
