# Nächster Schritt: freie Rätsel

Nach der 60er-Testversion vorgesehen, noch nicht Teil der Oberfläche.

- Schwierigkeit Leicht/Mittel/Schwer wählen; Rastergröße zunächst Automatisch, optional eine unterstützte Größe. Nicht jede Kombination muss angeboten werden (etwa Schwer auf 3×3).
- Vorhandene makeLevel- und Prüfmodule wiederverwenden: erst erzeugen, dann eindeutige Lösung und passende Schwierigkeit prüfen. Keine bloß zufälligen Drehungen eines festen Katalogrätsels.
- Erzeugung in einem Worker mit begrenzter Suchdauer und Abbrechen, damit die Oberfläche auf dem S22 bedienbar bleibt. Für jede angebotene Kombination Laufzeit und Trefferquote auf dem Gerät messen, bevor sie freigeschaltet wird.
- Seed und Generatorversion mit der Partie speichern, damit sie nach Neustart exakt fortgesetzt und bei Fehlern reproduziert werden kann.
- Freie Partie getrennt vom Kampagnenfortschritt speichern. Rückgängig, Sperren, Ton und Abschlussdialog gemeinsam verwenden.
- Wiederholungen anhand kürzlich gespielter Rätsel vermeiden. Falls in der Zeit kein passendes Rätsel gefunden wird, verständlich erneutes Erzeugen anbieten; kein ungeprüftes Brett ausgeben.
- Thinkheims Erzeugung, Speicherung und Auswahl vor der Umsetzung gezielt vergleichen. Zusätzliche Spielmodi anschließend nach Nutzerkonzept planen.
