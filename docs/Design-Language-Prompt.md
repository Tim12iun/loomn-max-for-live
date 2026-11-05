# Prompt: Design-Language für die loomn-Tools (editn, archivn & Co.)

> **So benutzt du diesen Prompt:** Alles unterhalb der Linie komplett kopieren und an den Anfang der Aufgabe stellen (für einen Designer, Entwickler oder eine KI). Dazu die Screenshots aus „Referenzbilder“ mitschicken.
>
> Stand: 04.11.2026

---

## Deine Rolle

Du gestaltest Oberflächen für eine Familie kleiner, eigenständiger **Mac-Tools für Video-Creator**: **editn** (Video-Editor mit Effekten und Beat-Schnitt), **archivn** (Archiv/Medienverwaltung) und weitere **loomn-Tools**. Alle Tools sollen sich anfühlen wie *ein* Produkt: ruhig, dunkel, präzise, professionell. Wer CapCut, Premiere oder Final Cut kennt, soll sich sofort zurechtfinden, ohne Anleitung.

Lies diese Regeln vollständig, bevor du etwas entwirfst. Wo eine Regel und dein Geschmack sich widersprechen, gewinnt die Regel.

## 1. Haltung in einem Satz

**Schlank, dunkel, eindeutig: Das Bild steht im Mittelpunkt, die Oberfläche tritt zurück, und Orange zeigt immer genau das, was gerade aktiv ist oder als Nächstes getan werden soll.**

## 2. Name und Marke

- Tool-Namen werden **immer klein** geschrieben und enden auf **n**: `editn`, `archivn`, `loomn`. Nie „Editn“ oder „EDITN“, auch nicht am Satzanfang oder in Titeln.
- Das Logo ist der Name in einer klaren, geometrischen Grotesk (fett, weiß), mit einem **orangen Punkt oben rechts am n**, etwa auf Höhe der Oberlänge, freistehend (nicht berührend). Der Punkt ist das einzige Markenzeichen; keine weiteren Symbole, Verläufe oder Schatten.
- App-Symbol: macOS-Squircle, fast schwarzer Grund (`#0A0A0C`), Schriftzug weiß und mittig, Punkt in Orange `#FF5A1F`.
- Ein neues Tool bekommt dasselbe Schema: neuer Name, gleiches Logo-Prinzip. Keine eigenen Farben pro Tool.

## 3. Farben

Dunkles Theme ist Standard. Wenige, warme Grautöne (leicht ins Braun, nie bläulich) und **ein einziger Akzent**.

| Rolle | Wert | Verwendung |
|---|---|---|
| Hintergrund | `#141414` | Fenstergrund, Startbildschirm |
| Fläche | `#1C1B1A` | Panels (Medien, Eigenschaften, Zeitleiste) |
| Fläche erhöht | `#232221` / `#2A2928` | Knöpfe, Listeneinträge, Eingabefelder, Hover |
| Linie | `#32312F` | Trennlinien, Rahmen (1 px, sparsam) |
| Text | `#F0EEE9` | Haupttext, Werte |
| Text gedämpft | ca. `#8F8C86` | Beschriftungen, Hinweise, Abschnittstitel |
| **Akzent Orange** | `#FF5A1F` (Flächen auch `#EC6636`) | aktive Zustände, Hauptaktion, Auswahl |
| Warnung/Fehler | gedecktes Rot | nur für Fehlendes/Fehler (z. B. „Medien fehlen“) |

**Regeln für Orange**
- Orange bedeutet **„aktiv“ oder „Hauptaktion“**, sonst nichts. Beispiele: Exportieren-Knopf, „+ Neues Projekt“, Auto-FX, gewählter Eintrag in der Seitenleiste (oranger Balken links), aktiver Umschalter, Abspielkopf-Bereich, Zoom-Regler-Füllung.
- Pro Ansicht gibt es **höchstens eine orange Hauptaktion** als gefüllten Knopf. Alles andere aktiv Markierte nutzt orangen Rand, Punkt oder Balken.
- Kein Blau als Akzent (das war ein alter Stand). Keine zweite Akzentfarbe.
- Effekt- und Spurfarben (z. B. Grün für Kacheln, Violett für Datamosh) sind **Kennfarben** für Inhalte, keine Bedienfarben. Sie erscheinen nur als kleiner Punkt am Knopf und als Clip-Farbe auf der Zeitleiste, gedämpft, nie neonhell.

## 4. Schrift

- Oberfläche: eine **schmale (condensed) Grotesk** im Stil von *Barlow Condensed* oder *Bebas/DIN Condensed*-artig, kostenlos und mitgeliefert (keine Online-Schriften). Alternative, wenn nativ: SF Pro (System).
- Großer Titel auf dem Startbildschirm: sehr fett, groß, VERSALIEN, leicht gesperrt.
- **Abschnittstitel** („MEDIEN“, „TON“, „BEAT AUS DEM VIDEO“, „BILD“): klein, VERSALIEN, gesperrt (ca. +8 %), gedämpfte Farbe.
- Knöpfe und Beschriftungen: normale Schreibung, mittlere Stärke. Die Hauptaktion darf in VERSALIEN stehen („EXPORTIEREN“, „+ NEUES PROJEKT“).
- **Zahlen** (Zeitcode, BPM, Dauer): Ziffern mit fester Breite (tabular), damit nichts springt, wenn sich Werte ändern. Zeitcode-Format `0:00.0 / 0:08.0`.
- Höchstens 3 Schriftgrößen pro Ansicht plus Titel.

## 5. Form, Abstände, Ebenen

- Raster aus 4 px; übliche Abstände 8 / 12 / 16 / 24 px.
- Ecken: Knöpfe und Felder 6–8 px, Panels und Listenkarten 10–12 px, Vorschau 12 px.
- Panels sind flache Flächen ohne Schatten und ohne sichtbare Rahmen; sie heben sich nur durch die etwas hellere Fläche vom Grund ab.
- Schatten nur bei schwebenden Elementen (Aufklappmenüs, Dialoge).
- Icons: dünne Linien-Icons (ca. 1,5 px Strich), einheitlich aus einer Familie, gedämpfte Farbe, beim Hover Textfarbe. Jedes Icon ohne Text bekommt einen Tooltip.

## 6. Aufbau der Fenster (vertraut für CapCut/Premiere)

**Editor (editn):**
```
┌ ‹ PROJEKTE      Projektname  [Speichern ▾]        ↶ ↷ | ⌨  [Vorlagen] [EXPORTIEREN] ┐
├ Medien / Vorlagen / Ton │        Vorschau (Bild im Zentrum)       │ Eigenschaften   ┤
│ (links, einklappbar)    │  0:00.0 / 0:08.0    ⏮ ▶ ⏭    Einpassen │ (rechts, kontext-│
│                         │                                         │  abhängig)       │
├ Effekt-Leiste: [● Zeitsäulen] [● Kacheln] [● Datamosh] …                            ┤
├ Werkzeuge: ✂ ⧉ 🗑 | …      Hinweiszeile           [+ AUTO-FX]   − ●──── +          ┤
├ Zeitleiste: Spurköpfe links (👁 + Name), oben Overlay/FX, darunter Video, unten Ton ┤
└ Statuszeile mit kurzem Hinweis                                                     ┘
```
- Oben links Rücksprung zur Übersicht, Mitte Projektname + Speichern, rechts Rückgängig/Wiederholen, dann Nebenaktionen, ganz rechts die orange Hauptaktion.
- Rechtes Panel zeigt immer die Eigenschaften dessen, was ausgewählt ist (Clip, sonst Projekt).
- Zeitleiste: Spuren von oben (Effekte/Overlays) nach unten (Video 1, Ton) wie in Premiere. Clips als farbige Balken mit Name, Video 1 mit Filmstreifen-Vorschau, Ton als Wellenform. Beat-Marken als feine Linien.

**Startbildschirm (alle Tools gleich):**
- Links: großer Name, Unterzeile (ein Satz, was das Tool tut), orange Hauptaktion („+ NEUES PROJEKT“), Hinweis „Oder … hierher ziehen“, Suche, Seitennavigation (Projekte / Vorlagen mit Zähler, aktiver Eintrag mit orangem Balken), ganz unten klein „VERSION x · BUILD n“.
- Rechts: Liste als Karten, gruppiert nach Zeit („HEUTE“, …). Karte: Name groß, darunter Quelldatei gedämpft; rechts Anzahl und Datum in kleinen Versalien, dann Papierkorb und Pfeil.
- Leerer Zustand: ein ruhiger Satz („Noch keine“), keine Illustrationen.

## 7. Die festen Bedienregeln (nicht verhandelbar)

1. **Nichts springt.** Knöpfe, Anzeigen und Beschriftungen ändern beim Zustandswechsel (aktiv/inaktiv, Play/Pause, Laden/fertig, langer/kurzer Wert) **weder Größe noch Position**. Breiten fest einplanen, Platz für den längsten Zustand reservieren, Zahlen mit fester Ziffernbreite. Ausgegraut statt ausgeblendet.
2. **Jede Funktion klar erkennbar.** Ein Knopf sagt in einem Wort, was er tut, oder hat ein eindeutiges Icon mit Tooltip. Keine versteckten Gesten als einziger Weg. Hinweiszeilen erklären den nächsten Schritt („Effekt auf eine Spur ziehen · Clip antippen zum Einstellen“).
3. **Schlank.** Nur zeigen, was jetzt gebraucht wird. Lieber eine Funktion weglassen als die Oberfläche überladen. Keine Deko, keine Verläufe, keine Emojis in der Oberfläche.
4. **Einstellungen so simpel wie möglich.**
   - Zwei Zustände → **Umschalter mit zwei Punkten** (Pille mit zwei Kreisen, der aktive gefüllt/orange), nie eine Textliste oder ein Aufklappmenü.
   - Wenige Optionen (2–4) → **Segment-Schalter** nebeneinander (z. B. Format: Original | 9:16 | 1:1 | 16:9), aktives Segment hervorgehoben.
   - Zahlen → Regler oder kleine Schritt-Knöpfe (−0.1 / +0.1 / ½× / 2×), Wert immer sichtbar.
   - Aufklappmenü nur bei vielen Optionen (z. B. Schriften).
   - Sinnvolle Standardwerte, sodass man nichts einstellen *muss*.
5. **Funktioniert auf 2/3 der Mac-Bildschirmbreite** (z. B. ca. 1000–1200 pt bei einem 14″/16″ MacBook) ohne abgeschnittene Knöpfe, ohne horizontales Scrollen, ohne überlappenden Text. Seitenpanels dürfen schmaler werden oder einklappen, Effekt-Leiste darf umbrechen; die Vorschau behält Vorrang.
6. **Unumkehrbares immer bestätigen.** Löschen, Überschreiben, Ersetzen bekommen einen kurzen Dialog: Frage in einem Satz, links „Abbrechen“, rechts die Aktion klar benannt („Löschen“), gefährliche Aktion in Rot statt Orange. Alles Umkehrbare passiert sofort ohne Nachfrage (dafür gibt es Rückgängig ⌘Z).
7. **Mac-Gewohnheiten.** Tastenkürzel wie gewohnt (⌘S, ⇧⌘S, ⌘O, ⌘Z, Leertaste = Abspielen) und in Menüs rechts gedämpft angezeigt. Drag & Drop aus dem Finder überall, wo es Sinn ergibt.
8. **Vorschau ehrlich.** Die Vorschau darf an Qualität verlieren, aber nie etwas zeigen, was der Export nicht zeigt. Ladezustände zeigen einen dezenten Fortschritt, nie ein Flackern.

## 8. Zustände von Bedienelementen

| Zustand | Aussehen |
|---|---|
| Normal | Fläche erhöht, Text hell |
| Hover | Fläche eine Stufe heller |
| Gedrückt | Fläche eine Stufe dunkler |
| Aktiv/gewählt | Orange (Füllung bei Hauptaktion, sonst oranger Rand/Punkt/Balken) |
| Deaktiviert | gleiche Größe, ca. 35 % Deckkraft |
| Fehlt/Fehler | gedecktes Rot mit „!“ und klarer Beschriftung („Medien fehlen“) |
| Ziehen-Ziel | gestrichelter Rand, Hinweistext in der Fläche |

Fokusrahmen für Tastaturbedienung: 2 px Orange, außen.

## 9. Sprache in der Oberfläche

- Deutsch, kurz, Alltagssprache. Verben für Aktionen („Speichern“, „Exportieren“, „Song hinzufügen“), Substantive für Bereiche („Medien“, „Ton“, „Bild“).
- Keine Fachwörter, wo es ein einfaches Wort gibt. Englische Begriffe nur, wo sie unter Creatorn üblich sind (BPM, FX, Loop).
- Hinweise sagen, was man als Nächstes tun kann, nicht, was schiefgelaufen ist.

## 10. Was wir nicht wollen

- Bunte, verspielte Oberflächen, Glas-/Blur-Effekte, Verläufe, Neon.
- Mehr als eine Akzentfarbe, Blau als Akzent.
- Knöpfe, die beim Umschalten breiter werden oder verrutschen.
- Textlisten oder Dropdowns für Ja/Nein-Einstellungen.
- Funktionen, die nur über Rechtsklick oder Doppelklick erreichbar sind.
- Großgeschriebene Tool-Namen, Logos ohne den orangen Punkt.
- Platzhalter- oder Demo-Inhalte in fertigen Entwürfen.

## 11. Abgabe und Prüfliste

Liefere jeden Entwurf mit:
- Ansicht in voller Breite **und** in 2/3 Bildschirmbreite.
- Allen Zuständen der neuen Elemente (normal, Hover, aktiv, deaktiviert, leer, Fehler).
- Kurzer Begründung, wo Orange eingesetzt ist und warum.

Vor der Abgabe selbst prüfen:
- [ ] Höchstens eine gefüllte orange Hauptaktion pro Ansicht?
- [ ] Ändert irgendein Element bei Zustandswechsel Größe oder Position?
- [ ] Ist jede Funktion ohne Erklärung erkennbar?
- [ ] Sind Zwei-Zustands-Einstellungen Umschalter mit zwei Punkten?
- [ ] Funktioniert alles auf 2/3 Breite?
- [ ] Wird alles Unumkehrbare bestätigt?
- [ ] Tool-Name klein, mit orangem Punkt am n?
- [ ] Würde sich ein CapCut- oder Premiere-Nutzer sofort zurechtfinden?

## Referenzbilder (mitschicken)

- `editn-symbol.png` – App-Symbol und Logo
- `start.png` – Startbildschirm mit Projektliste
- `beatmosh-editor-loomn.png` – Editor im aktuellen Stil (Orange)
- `beatmosh-2-3-breite.png` – Editor auf 2/3 Bildschirmbreite
- `beatmosh-obere-leiste.png` – obere Leiste mit Speichern-Menü (Achtung: dort noch alter blauer Akzent, gilt nicht mehr)
