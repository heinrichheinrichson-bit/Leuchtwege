# Leuchtwege

Ein kleiner Browser-Prototyp für ein ruhiges Logikspiel. Kacheln drehen, alle Wege mit der Quelle verbinden und sämtliche offenen Anschlüsse schließen.

## Enthalten

- Zwölf reproduzierbar erzeugte Rätsel: 3×3, 4×4 und 5×5.
- Automatisch geprüfte, eindeutige Lösungen.
- Touch- und Tastaturbedienung, Lichtfluss, offene Anschlüsse, optionaler synthetischer Klickton.
- Lokaler Spielstand im Browser; Rätselwechsel startet die betreffende Anordnung neu.
- Deutsche Anleitung, responsive Oberfläche, reduzierte Bewegung.

## Entwicklung

Node.js ab 22.13 installieren. Dann:

```sh
npm ci
npm run dev
```

Rätsel neu erzeugen und Logik prüfen:

```sh
node generate-levels.mjs
npm run build
```

Die Ausgabe ist statisch. Das Spiel benötigt weder eine Datenbank noch einen Spielserver. Der gespeicherte Browser-Spielstand gehört jeweils zur aufgerufenen Adresse.

## Grenzen dieses Prototyps

Noch keine Android/iOS-App, keine Werbung und keine Käufe. Schwierigkeitsgrad und Spaß sind noch nicht mit Spielern validiert. Die automatische Prüfung belegt Lösbarkeit, Eindeutigkeit und grundlegende Netzwerkregeln, nicht die Qualität der Rätsel.

Eine opt-in WebMCP-Leseschnittstelle wird in unterstützten Browsern registriert. Ihre Laufzeitprüfung war in dieser Entwicklungsumgebung nicht verfügbar. Ein manueller Test auf echten Mobilgeräten steht aus.

Der unveränderte Abhängigkeitsstand des Sites-Starters enthält npm-Audit-Meldungen. Vor einer öffentlichen Weiterentwicklung sollten die Entwicklungsabhängigkeiten aktualisiert werden. Der Prototyp wird ausschließlich als statische Dateien ohne Server- oder Bildverarbeitung veröffentlicht.
