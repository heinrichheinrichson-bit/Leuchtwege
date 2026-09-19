# Erfolgssound

success.wav wurde aus Thinkheim übernommen. Die Datei wurde dort durch
tool/generate_sound_assets.dart vollständig synthetisch erzeugt.
Lautstärke in Leuchtwege: 0,38 wie in Thinkheim.

connect.wav ist eine unveränderte Kopie von Thinkheims hashi_connect.wav.
Laut Thinkheims assets/sounds/SOURCES.md handelt es sich um einen gekürzten,
gefilterten und in Lautstärke/Fades bearbeiteten Pixabay-Sound:

- Dokumentierte Suche: https://pixabay.com/sound-effects/search/electric%20dizzle/
- Dokumentierte Lizenz: Pixabay Content License
- Download: 2026-08-13
- Original-Einzelseite in Thinkheim nicht dokumentiert.
- Verwendung als eingebetteter Interaktionssound; Lautstärke 0,34 wie in Thinkheim.

disconnect.wav basiert auf Thinkheims hashi_remove.wav.
Der Ton wurde dort mit tool/generate_sound_assets.dart (_crackle, descending: true)
synthetisch erzeugt. In Leuchtwege am 19.09.2026 zusätzlich geglättet
(Dreipunktfilter 1:2:1), auf 72 % skaliert und mit 4 ms Ein-/8 ms Ausblendung
versehen. Wiedergabelautstärke 0,20. Das reduziert scharfe Spitzen des
ursprünglichen Knistertons. Alle Klänge werden bei schnellen Wechseln weich
ein-/ausgeblendet; die Quelldatei vor der Bearbeitung bleibt in der Git-Historie.
