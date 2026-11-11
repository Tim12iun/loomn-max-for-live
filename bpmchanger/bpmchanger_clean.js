// BPM Changer Aufräumer (Node for Max). Max selbst kann keine Dateien löschen.
// Entfernt BPM-Changer-Dateien, die versehentlich eine Ebene zu hoch (in LOOMN-MAX4LIVE/) gelandet sind.
// Neuere Dateien und fehlende Einstellungen werden in den Ordner bpmchanger/ verschoben, der Rest gelöscht.
"use strict";
const fs = require("fs");
const path = require("path");

let maxApi = null;
try { maxApi = require("max-api"); } catch (e) { /* Test ohne Max */ }
const send = (...a) => (maxApi ? maxApi.outlet(...a) : console.log(...a));

const STRAY = ["BPM Changer.amxd", "BPM Changer.amxd.json", "bpmchanger.js", "bpmchanger_clean.js", "LIESMICH BPM Changer.txt"];
const SETTINGS = "bpmchanger_settings.json";

// Max-Pfad "Macintosh HD:/Users/..." -> "/Users/..."
function posix(p) { p = String(p); const i = p.indexOf(":/"); return i >= 0 ? p.substring(i + 1) : p; }

// Neuere Datei gewinnt: liegt oben eine neuere Version als im Ordner bpmchanger/, wird sie hineinverschoben
// (überschreibt), sonst gelöscht. So steht danach genau ein aktueller Satz Dateien in bpmchanger/.
function clean(parentDir) {
  const parent = posix(parentDir), sub = path.join(parent, "bpmchanger");
  if (!fs.existsSync(sub) || !fs.statSync(sub).isDirectory()) return 0;
  let n = 0;
  for (const f of STRAY.concat([SETTINGS])) {
    const p = path.join(parent, f), q = path.join(sub, f);
    try {
      if (!fs.existsSync(p)) continue;
      const newer = !fs.existsSync(q) || (f !== SETTINGS && fs.statSync(p).mtimeMs > fs.statSync(q).mtimeMs);
      if (newer) fs.renameSync(p, q); else fs.unlinkSync(p);
      n++;
    } catch (e) { send("cleanerr", f); }
  }
  return n;
}

if (maxApi) maxApi.addHandler("clean", (dir) => send("cleaned", clean(dir)));
module.exports = { clean };
