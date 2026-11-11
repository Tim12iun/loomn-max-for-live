// LOOMN – chopn v0.1 (Max for Live Instrument, [jsui])
// Sampler zum Choppen mit der Maus: Sample reinziehen, in die Welle klicken = ab dort hören (jeder Klick startet neu).
// MIDI-Taste drücken = die Taste merkt sich den zuletzt geklickten Punkt. Danach spielen die Tasten die Punkte
// wie ein Instrument (MIDI aufnehmen, Clips abspielen).
// Der Ton entsteht im Patch (notein -> coll -> groove~), damit Noten ohne Umweg über dieses Script starten.
// Dieses Script zeichnet, verwaltet die Punkte und schreibt sie in den coll.
// Einstellungen in chopn_settings.json im eigenen Ordner. Sample und Punkte liegen im Live-Set (pattr "chopstate").
autowatch = 0; // nicht automatisch neu laden (Updates überschreiben diese Datei)
var VERSION = "0.1.0";
var PLUGIN_ID = "chopn";
inlets = 1;
// 0 buffer~ (replace / name)   1 Start in ms (Maus)   2 Neustart nach Update   3 coll (Taste -> ms)
// 4 pattr (Zustand im Set)     5 groove~ (set Name)   6 Halten an/aus          7 Mono-Datei (1 = links auf beide)
// 8 Stopp                      9 live.drop (set Pfad)
outlets = 10;

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

// ==== BEGIN loomn_update (gemeinsamer Update-Mechanismus für alle LOOMN-Max-for-Live-Plugins) ====
// Liest manifest.json aus dem GitHub-Repo und lädt neuere Dateien in den Ordner des Devices.
// ES5 (Max [js]). Benutzt XMLHttpRequest von Max (maxurl).
var LU = (function () {
  var RAW = "https://raw.githubusercontent.com/Tim12iun/loomn-max-for-live/";
  var API = "https://api.github.com/repos/Tim12iun/loomn-max-for-live/commits/main";
  // raw.githubusercontent.com hält "main" bis zu 5 Minuten im Zwischenspeicher. Darum erst den neuesten
  // Commit fragen und alles von genau diesem Stand laden. Klappt das nicht, wie früher über "main".
  var BASE = RAW + "main/";
  function cmp(a, b) { // "0.4.1" vs "0.4.0"
    var x = String(a).split("."), y = String(b).split(".");
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (Number(x[i]) || 0) - (Number(y[i]) || 0); if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }
  function posix(p) { return p.indexOf(":/") >= 0 ? p.substring(p.indexOf(":/") + 1) : p; }
  function enc(path) { return path.split("/").map(encodeURIComponent).join("/"); }
  function get(url, cb, fileOut) {
    var req = new XMLHttpRequest();
    req.open("GET", url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + new Date().getTime());
    if (fileOut) req._setRequestKey("filename_out", fileOut);
    req.onreadystatechange = function () {
      if (this.readyState === 4) cb(this.status === 200 || this.status === 0 ? null : ("HTTP " + this.status), this.responseText);
    };
    req.send();
  }
  // check(pluginId, localVersion, cb(err, info)) – info = {latest, newer, entry}
  function check(pluginId, localVersion, cb) {
    get(API, function (e0, meta) {
      var sha = null;
      if (!e0) { try { sha = JSON.parse(meta).sha; } catch (e) {} }
      BASE = RAW + (sha && /^[0-9a-f]{40}$/.test(sha) ? sha : "main") + "/";
      checkManifest(pluginId, localVersion, cb);
    });
  }
  function checkManifest(pluginId, localVersion, cb) {
    get(BASE + "manifest.json", function (err, txt) {
      if (err) return cb("Update-Server nicht erreichbar (" + err + ")");
      var m; try { m = JSON.parse(txt); } catch (e) { return cb("manifest.json kaputt"); }
      var entry = m.plugins && m.plugins[pluginId];
      if (!entry) return cb("Plugin " + pluginId + " nicht im Repo");
      cb(null, { latest: entry.version, newer: cmp(entry.version, localVersion) > 0, entry: entry });
    });
  }
  function utf8(str) {
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) { c = 0x10000 + ((c - 0xD800) << 10) + (str.charCodeAt(++i) - 0xDC00); }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]; }
  function ascii(s) { var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i)); return a; }
  // .amxd schreiben: "ampf" 4 <typ> "meta" 4 0 "ptch" <len> <json>\n\0
  function writeAmxd(path, json, type) {
    var body = utf8(json).concat([10, 0]);
    var head = ascii("ampf").concat(u32(4), ascii(type), ascii("meta"), u32(4), u32(0), ascii("ptch"), u32(body.length));
    var f = new File(path, "write", "BINR");
    if (!f.isopen) return false;
    f.position = 0;
    f.writebytes(head);
    for (var i = 0; i < body.length; i += 4096) f.writebytes(body.slice(i, i + 4096));
    f.eof = f.position; f.close();
    return true;
  }
  function exists(path) { var f = new File(path, "read"); var ok = f.isopen; if (ok) f.close(); return ok; }
  // Alte Dateien (entry.obsolete) kann Max nicht löschen: nur melden, welche noch im Ordner liegen
  function leftovers(entry, deviceDir) {
    var out = [], list = entry.obsolete || [];
    for (var i = 0; i < list.length; i++) if (exists(deviceDir + list[i])) out.push(list[i]);
    return out;
  }
  // install(entry, deviceDir, writeText, cb(err, count, left)) – Textdateien über responseText, Binärdateien (.amxd) direkt in Datei.
  // Jede Datei wird unter genau ihrem Namen überschrieben (kein "Datei (1)"). left = alte Dateien, die von Hand weg müssen.
  function install(entry, deviceDir, writeText, cb) {
    // .amxd stehen in entry.amxd (nicht in files), damit alte Updater sie nicht doppelt anlegen
    var files = entry.files.slice(0).concat(entry.amxd || []), done = 0;
    // Script zuletzt, damit nichts mitten im Update neu geladen wird
    files.sort(function (a, b) { return (/\.js$/.test(a) ? 1 : 0) - (/\.js$/.test(b) ? 1 : 0); });
    function next() {
      if (!files.length) return cb(null, done, leftovers(entry, deviceDir));
      var f = files.shift(), url = BASE + enc(entry.dir + "/" + f);
      if (/\.amxd$/.test(f)) {
        // .amxd = Binär-Header + Patcher-JSON. Max' Download legt sonst "Datei (1)" an, darum:
        // JSON als Text laden ("<name>.json" im Repo) und die .amxd selbst schreiben (überschreibt).
        get(BASE + enc(entry.dir + "/" + f + ".json"), function (err, txt) {
          if (err) return cb(f + ": " + err);
          if (!txt || !writeAmxd(deviceDir + f, txt, entry.amxdType || "aaaa")) return cb(f + ": konnte nicht schreiben");
          done++; next();
        });
      } else {
        get(url, function (err, txt) {
          if (err) return cb(f + ": " + err);
          if (!txt || !writeText(deviceDir + f, txt)) return cb(f + ": konnte nicht schreiben");
          done++; next();
        });
      }
    }
    next();
  }
  return { cmp: cmp, check: check, install: install, leftovers: leftovers };
})();
// ==== END loomn_update ====

// ---------- Farben (loomn) ----------
function hex(h, a) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255, a === undefined ? 1 : a]; }
var C = {
  bg: hex("#141414"), surface: hex("#1C1B1A"), raised: hex("#232221"), raised2: hex("#2A2928"),
  line: hex("#32312F"), text: hex("#F0EEE9"), muted: hex("#8F8C86"), dim: hex("#5E5B57"),
  orange: hex("#FF5A1F"), fill: hex("#EC6636"), red: hex("#E5484D"), mark: hex("#F0EEE9", 0.55)
};

// ---------- Zustand ----------
var DIR = "";
var settings = { hold: true, learn: true }; // Vorgaben für neue Devices
var ready = false, pendState = null, bootUntil = 0;
var bufName = "", buf = null, renamed = false;
var path = "", fileName = "", lenMs = 0, frames = 0, chans = 0, loading = false, loaded = false;
var slots = {};          // MIDI-Note -> Startpunkt in ms
var cursor = -1;         // zuletzt geklickter Punkt (ms)
var sel = -1;            // zuletzt gespielte/angeklickte Taste
var hover = -1;          // Maus über der Welle (x)
var view0 = 0, view1 = 0; // sichtbarer Ausschnitt (ms)
var peaks = null, peaksV0 = -1, peaksV1 = -1, gmax = 1, job = null;
var play = { on: false, start: 0, t0: 0 }, rate = 1;
var hold = true, learn = true;
var view = "main";       // "main" | "set"
var msg = "", updMsg = "", updating = false, confirmClear = false;
var lastSym = "";

var playTask = new Task(playStep, this); playTask.interval = 33;
var peakTask = new Task(peakStep, this);
var loadTask = new Task(loadTimeout, this);

// ---------- Dateien / Einstellungen ----------
function fileExists(p) { var f = new File(p, "read"); var ok = f.isopen; if (ok) f.close(); return ok; }
function deviceDir() {
  var fp = this.patcher ? String(this.patcher.filepath || "") : "";
  if (!fp) return "";
  var dir;
  if (/\.(amxd|maxpat)$/i.test(fp)) dir = fp.substring(0, fp.lastIndexOf("/") + 1);
  else dir = fp.replace(/\/?$/, "/");
  if (!/\/chopn\/$/.test(dir) && fileExists(dir + "chopn/chopn.js")) dir += "chopn/";
  post("chopn: Ordner " + dir + "\n");
  return dir;
}
function readText(p) {
  var f = new File(p, "read", "TEXT"); if (!f.isopen) return null;
  var s = "", line; while ((line = f.readline(32767)) !== null && line !== undefined) { s += line + "\n"; if (f.position >= f.eof) break; }
  f.close(); return s;
}
function writeText(p, s) {
  var f = new File(p, "write", "TEXT"); if (!f.isopen) return false;
  f.position = 0;
  for (var i = 0; i < s.length; i += 16000) f.writestring(s.substring(i, i + 16000));
  f.eof = f.position; f.close(); return true;
}
var SETTINGS_FILE = "chopn_settings.json";
function loadSettings() {
  if (!DIR) return;
  var txt = readText(DIR + SETTINGS_FILE), s = null;
  if (txt) { try { s = JSON.parse(txt); } catch (e) { post("chopn: " + SETTINGS_FILE + " ist kaputt, nehme Standard.\n"); } }
  if (s) {
    if (typeof s.hold === "boolean") settings.hold = s.hold;
    if (typeof s.learn === "boolean") settings.learn = s.learn;
  } else saveSettings();
}
function saveSettings() {
  if (!DIR) return;
  if (!writeText(DIR + SETTINGS_FILE, JSON.stringify(settings, null, 1))) say("Konnte Einstellungen nicht speichern.");
}

// ---------- Start ----------
// Reihenfolge im Patch: compile, bufname, Zustand (pattr), Regler, bang (init), live.drop
function bufname(n) { bufName = String(n); }
function bang() { init.call(this); }
function init() {
  DIR = deviceDir.call(this);
  loadSettings();
  hold = settings.hold; learn = settings.learn;
  if (!bufName) bufName = "---chopnbuf";
  ready = true;
  bootUntil = new Date().getTime() + 2000;
  outlet(8, "bang");
  if (pendState) { var o = pendState; pendState = null; applyState(o); }
  else { outlet(3, "clear"); outlet(6, hold ? 1 : 0); }
  say("");
}

// ---------- Zustand im Live-Set ----------
function encState(o) {
  return "c1" + encodeURIComponent(JSON.stringify(o)).replace(/[!'()*~]/g, function (c) { return "%" + c.charCodeAt(0).toString(16).toUpperCase(); });
}
function saveState() {
  if (!ready) return;
  var sym = encState({ v: 1, path: path, slots: slots, hold: hold });
  if (sym === lastSym) return;
  lastSym = sym;
  outlet(4, sym);
}
function state(s) {
  s = String(s);
  if (s === lastSym || s.substring(0, 2) !== "c1") return;
  var o = null;
  try { o = JSON.parse(decodeURIComponent(s.substring(2))); } catch (e) { return; }
  if (!o || typeof o !== "object") return;
  lastSym = s;
  if (!ready) { pendState = o; return; }
  applyState(o);
}
function applyState(o) {
  if (typeof o.hold === "boolean") hold = o.hold;
  outlet(6, hold ? 1 : 0);
  slots = {};
  if (o.slots) for (var k in o.slots) { var p = Number(k), ms = Number(o.slots[k]); if (p >= 0 && p <= 127 && ms >= 0) slots[p] = ms; }
  sel = -1;
  writeColl();
  var np = o.path ? String(o.path) : "";
  if (np && np !== path) loadFile(np, true);
  else redraw();
}
function writeColl() {
  outlet(3, "clear");
  for (var k in slots) outlet(3, [Number(k), slots[k]]);
}

// ---------- Sample laden ----------
function joinArgs(a) { var s = []; for (var i = 0; i < a.length; i++) s.push(String(a[i])); return s.join(" "); }
function drop() { gotDrop(joinArgs(arrayfromargs(arguments)), false); }   // Feld rechts
function drop2() { gotDrop(joinArgs(arrayfromargs(arguments)), true); }   // direkt auf die Welle
function gotDrop(p, fromWave) {
  if (!ready || !p || p === "bang") return;
  if (p === path && (loaded || loading)) return;
  if (path && new Date().getTime() < bootUntil) return; // beim Laden des Sets gilt der gespeicherte Zustand
  if (fromWave) outlet(9, "set", p);
  loadFile(p, false);
}
function loadFile(p, keepSlots) {
  path = p;
  fileName = p.substring(p.lastIndexOf("/") + 1);
  if (!keepSlots) { slots = {}; outlet(3, "clear"); }
  sel = -1; cursor = -1; loaded = false; loading = true; peaks = null; job = null;
  play.on = false; playTask.cancel();
  outlet(8, "bang");
  say("");
  outlet(0, "replace", p);
  loadTask.cancel(); loadTask.schedule(10000);
}
function loadTimeout() {
  if (!loading) return;
  loading = false;
  say("Datei lässt sich nicht laden.");
}
function readBuffer() {
  buf = new Buffer(bufName);
  frames = Number(buf.framecount()) || 0;
  chans = Number(buf.channelcount()) || 0;
  lenMs = Number(buf.length()) || 0;
  return frames > 0 && lenMs > 0;
}
// buffer~ meldet: Datei fertig gelesen
function bufDone() {
  if (!loading) return;
  loadTask.cancel();
  var ok = false;
  try { ok = readBuffer(); } catch (e) { ok = false; }
  if (!ok && !renamed) {
    // Name aus dem Patch passt nicht: dem buffer~ selbst einen eindeutigen Namen geben
    renamed = true;
    bufName = "chopn" + new Date().getTime().toString(36) + Math.floor(Math.random() * 100000);
    outlet(0, "name", bufName);
    try { ok = readBuffer(); } catch (e2) { ok = false; }
  }
  loading = false;
  if (!ok) { loaded = false; say("Datei ist leer oder nicht lesbar."); return; }
  loaded = true;
  outlet(5, "set", bufName);
  outlet(7, chans < 2 ? 1 : 0);
  for (var k in slots) if (slots[k] >= lenMs) { delete slots[k]; outlet(3, "remove", Number(k)); }
  view0 = 0; view1 = lenMs; gmax = 0;
  startPeaks();
  saveState();
  say("");
}
function anything() {
  var a = arrayfromargs(arguments);
  if (messagename === "bufdone") bufDone();
  else if (messagename === "released") { play.on = false; playTask.cancel(); redraw(); }
  else if (messagename === "stopbtn") stop();
}

// ---------- Welle berechnen (in Häppchen) ----------
var X0 = 14, X1 = 444, WW = X1 - X0;
function startPeaks() {
  if (!loaded) return;
  job = { i: 0, v0: view0, v1: view1, out: new Array(WW * 2), first: gmax === 0, max: 0 };
  peakTask.cancel(); peakTask.schedule(0);
}
function peakStep() {
  if (!job || !loaded) return;
  var t = new Date().getTime(), j = job, fpm = frames / lenMs, span = (j.v1 - j.v0) / WW;
  try {
    while (j.i < WW && new Date().getTime() - t < 10) {
      var f0 = Math.floor((j.v0 + j.i * span) * fpm), f1 = Math.floor((j.v0 + (j.i + 1) * span) * fpm);
      if (f0 < 0) f0 = 0; if (f1 > frames) f1 = frames;
      var n = f1 - f0, lo = 0, hi = 0, first = true, blocks = 1, len = n;
      if (n > 256) { blocks = 4; len = 64; }
      if (n < 1) { len = 1; if (f0 >= frames) f0 = frames - 1; }
      for (var b = 0; b < blocks; b++) {
        var at = blocks === 1 ? f0 : f0 + Math.floor(b * (n - len) / (blocks - 1));
        var arr = buf.peek(1, at, len);
        if (typeof arr === "number") arr = [arr];
        for (var q = 0; q < arr.length; q++) {
          var v = arr[q];
          if (first) { lo = hi = v; first = false; } else if (v < lo) lo = v; else if (v > hi) hi = v;
        }
      }
      j.out[j.i * 2] = lo; j.out[j.i * 2 + 1] = hi;
      if (-lo > j.max) j.max = -lo; if (hi > j.max) j.max = hi;
      j.i++;
    }
  } catch (e) { post("chopn: Welle konnte nicht gelesen werden (" + e + ")\n"); job = null; return; }
  if (j.i < WW) { peakTask.schedule(1); return; }
  peaks = j.out; peaksV0 = j.v0; peaksV1 = j.v1;
  if (j.first) gmax = Math.max(0.05, j.max);
  job = null;
  redraw();
}

// ---------- Spielen ----------
function now() { return new Date().getTime(); }
function playPos() { return play.start + (now() - play.t0) * rate; }
// viaPatch: der Ton wurde schon im Patch gestartet (Note -> coll), hier nur die Anzeige
function trig(ms, viaPatch) {
  if (!loaded) return;
  if (!viaPatch) outlet(1, ms);
  play.on = true; play.start = ms; play.t0 = now();
  playTask.cancel(); playTask.repeat();
  redraw();
}
function playStep() {
  if (!play.on || playPos() >= lenMs) { play.on = false; playTask.cancel(); }
  mgraphics.redraw();
}
function stop() { outlet(8, "bang"); play.on = false; playTask.cancel(); redraw(); }
function tune(v) {
  var r = Math.pow(2, Number(v) / 12);
  if (play.on) { play.start = playPos(); play.t0 = now(); }
  rate = r;
}
var NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function noteName(p) { return NAMES[p % 12] + (Math.floor(p / 12) - 2); }
function slotCount() { var n = 0; for (var k in slots) n++; return n; }
// Note-On aus dem Patch (belegte Tasten hat der Patch schon gestartet)
function note(p) {
  p = Number(p);
  if (!ready || !loaded) return;
  confirmClear = false;
  if (slots[p] !== undefined) { sel = p; trig(slots[p], true); return; }
  if (!learn) return;
  if (cursor < 0) { say("Erst in die Welle klicken, dann Taste drücken."); return; }
  slots[p] = cursor;
  outlet(3, [p, cursor]);
  outlet(3, p);            // gleich abspielen (über den coll, damit Loslassen wie bei jeder Note stoppt)
  sel = p;
  trig(cursor, true);
  saveState();
  say(noteName(p) + " gemerkt. Nächsten Punkt klicken.");
}

// ---------- Hilfen ----------
function say(s) { msg = s; redraw(); }
function redraw() { mgraphics.redraw(); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function msToX(ms) { return X0 + (ms - view0) / (view1 - view0) * WW; }
function xToMs(x) { return Math.round(clamp(view0 + (x - X0) / WW * (view1 - view0), 0, Math.max(0, lenMs - 1)) * 100) / 100; }
function fmtTime(ms) {
  var s = ms / 1000, m = Math.floor(s / 60); s -= m * 60;
  var t = (Math.round(s * 10) / 10).toFixed(1);
  return m + ":" + (s < 9.95 ? "0" : "") + t;
}
function setView(a, b) {
  var span = b - a;
  if (span >= lenMs) { a = 0; b = lenMs; }
  else { if (a < 0) { a = 0; b = span; } if (b > lenMs) { b = lenMs; a = lenMs - span; } }
  if (Math.abs(a - view0) < 0.001 && Math.abs(b - view1) < 0.001) return;
  view0 = a; view1 = b;
  startPeaks(); redraw();
}
function zoom(f) {
  if (!loaded) return;
  var span = view1 - view0, ns = clamp(span * f, Math.min(lenMs, 40), lenMs);
  var c = (cursor >= view0 && cursor <= view1) ? cursor : (view0 + view1) / 2;
  var rel = (c - view0) / span;
  setView(c - ns * rel, c - ns * rel + ns);
}
function status() {
  if (msg) return msg;
  if (loading) return "Lädt …";
  if (!loaded) return "Sample rechts ins Feld ziehen.";
  if (cursor < 0) return slotCount() ? "Tasten spielen. Klick in die Welle = neuer Punkt." : "In die Welle klicken zum Hören.";
  if (learn) return "Freie Taste drücken = Punkt merken.";
  return "Lernen ist aus. Tasten spielen nur.";
}

// ---------- Zeichnen ----------
function rgba(c) { mgraphics.set_source_rgba(c[0], c[1], c[2], c[3]); }
function font(size, bold) {
  try { mgraphics.select_font_face(bold ? "Helvetica Neue Bold" : "Helvetica Neue Medium"); } catch (e) {}
  mgraphics.set_font_size(size);
}
function text(s, x, y, c, size, bold) { font(size, bold); rgba(c); mgraphics.move_to(x, y); mgraphics.show_text(String(s)); mgraphics.new_path(); }
function textW(s, size, bold) { font(size, bold); return mgraphics.text_measure(String(s))[0]; }
function textC(s, x, w, y, c, size, bold) { text(s, x + (w - textW(s, size, bold)) / 2, y, c, size, bold); }
function rrect(x, y, w, h, r, c) { rgba(c); mgraphics.rectangle_rounded(x, y, w, h, r, r); mgraphics.fill(); }
function rstroke(x, y, w, h, r, c) { rgba(c); mgraphics.set_line_width(1); mgraphics.rectangle_rounded(x + 0.5, y + 0.5, w - 1, h - 1, r, r); mgraphics.stroke(); }
function vline(x, y0, y1, c, w) { rgba(c); mgraphics.set_line_width(w || 1); x = Math.round(x) + 0.5; mgraphics.move_to(x, y0); mgraphics.line_to(x, y1); mgraphics.stroke(); }
function fit(s, w, size, bold) { s = String(s); if (textW(s, size, bold) <= w) return s; while (s.length > 1 && textW(s + "…", size, bold) > w) s = s.substring(0, s.length - 1); return s + "…"; }

// Bereiche (458 x 169). Rechts daneben liegen im Patch: Sample-Feld, Pegel, Ton, Stopp.
var W = 458, H = 169;
var GEAR = { x: 428, y: 4, w: 22, h: 20 };
var PAN = { x: 8, y: 30, w: 442, h: 108 };
var FLAG_Y = 33, FLAG_H = 13, WY0 = 50, WY1 = 128, OV = { x: X0, y: 131, w: WW, h: 4 };
var BY = 143, BH = 22;
var B_LEARN = { x: 8, y: BY, w: 68, h: BH }, B_DEL = { x: 80, y: BY, w: 62, h: BH }, B_CLR = { x: 146, y: BY, w: 58, h: BH };
var B_ZOUT = { x: 212, y: BY, w: 22, h: BH }, B_ZIN = { x: 236, y: BY, w: 22, h: BH };
var PILL = { x: 96, y: 56, w: 34, h: 16 }, UPD = { x: 0, y: 114, w: 20, h: 16 };
var flags = []; // gezeichnete Fähnchen (für die Maus)

function paint() {
  rgba(C.bg); mgraphics.rectangle(0, 0, W, H); mgraphics.fill();
  text("chopn", 10, 19, C.text, 14, true);
  var lw = textW("chopn", 14, true);
  rgba(C.orange); mgraphics.ellipse(10 + lw + 1.5, 6, 4, 4); mgraphics.fill();
  text(fit(status(), GEAR.x - 12 - (lw + 30), 11, false), lw + 30, 19, C.muted, 11, false);
  drawGear();
  rrect(PAN.x, PAN.y, PAN.w, PAN.h, 10, C.surface);
  if (view === "set") paintSettings(); else paintWave();
  paintButtons();
}
function paintWave() {
  flags = [];
  var mid = (WY0 + WY1) / 2, half = (WY1 - WY0) / 2;
  if (!loaded) {
    rgba(C.line); mgraphics.set_line_width(1); mgraphics.move_to(X0, mid + 0.5); mgraphics.line_to(X1, mid + 0.5); mgraphics.stroke();
    textC(loading ? "Lädt …" : "Sample rechts ins Feld ziehen", PAN.x, PAN.w, mid - 10, C.muted, 12, false);
    return;
  }
  // Welle
  if (peaks && peaksV0 === view0 && peaksV1 === view1) {
    var g = half / gmax;
    rgba(C.muted); mgraphics.set_line_width(1);
    for (var i = 0; i < WW; i++) {
      var lo = clamp(peaks[i * 2] * g, -half, half), hi = clamp(peaks[i * 2 + 1] * g, -half, half);
      if (hi - lo < 1) { hi += 0.5; lo -= 0.5; }
      mgraphics.move_to(X0 + i + 0.5, mid - hi); mgraphics.line_to(X0 + i + 0.5, mid - lo);
    }
    mgraphics.stroke();
  } else {
    rgba(C.line); mgraphics.set_line_width(1); mgraphics.move_to(X0, mid + 0.5); mgraphics.line_to(X1, mid + 0.5); mgraphics.stroke();
  }
  // Maus
  if (hover >= X0 && hover <= X1) vline(hover, WY0, WY1, C.dim);
  // Punkte mit Fähnchen (links nach rechts, die gewählte zuletzt = obenauf)
  var list = [];
  for (var k in slots) if (Number(k) !== sel) list.push(Number(k));
  list.sort(function (a, b) { return slots[a] - slots[b]; });
  if (sel >= 0 && slots[sel] !== undefined) list.push(sel);
  for (var n = 0; n < list.length; n++) {
    var p = list[n], ms = slots[p];
    if (ms < view0 || ms > view1) continue;
    var x = Math.round(msToX(ms)), on = p === sel, nm = noteName(p), fw = Math.ceil(textW(nm, 9.5, true)) + 8;
    var fx = x + fw > X1 + 4 ? x - fw + 1 : x;
    vline(x, FLAG_Y, WY1, on ? C.text : C.mark);
    rrect(fx, FLAG_Y, fw, FLAG_H, 4, C.raised2);
    if (on) rstroke(fx, FLAG_Y, fw, FLAG_H, 4, C.orange);
    text(nm, fx + 4, FLAG_Y + 10, on ? C.text : C.muted, 9.5, true);
    flags.push({ p: p, x: fx, y: FLAG_Y, w: fw, h: FLAG_H });
  }
  // zuletzt geklickter Punkt
  if (cursor >= view0 && cursor <= view1) {
    var cx = Math.round(msToX(cursor));
    vline(cx, WY0 - 3, WY1, C.orange);
    rgba(C.orange); mgraphics.move_to(cx - 3.5, WY0 - 4); mgraphics.line_to(cx + 4.5, WY0 - 4); mgraphics.line_to(cx + 0.5, WY0 + 1); mgraphics.close_path(); mgraphics.fill();
  }
  // Abspielposition
  if (play.on) { var pp = playPos(); if (pp >= view0 && pp <= view1 && pp < lenMs) vline(msToX(pp), WY0, WY1, C.text); }
  // Übersicht: sichtbarer Ausschnitt
  rrect(OV.x, OV.y, OV.w, OV.h, 2, C.line);
  var zoomed = view1 - view0 < lenMs - 0.001;
  if (zoomed) rrect(OV.x + view0 / lenMs * OV.w, OV.y, Math.max(6, (view1 - view0) / lenMs * OV.w), OV.h, 2, C.muted);
  if (cursor >= 0) { rgba(C.orange); mgraphics.rectangle(OV.x + cursor / lenMs * (OV.w - 1), OV.y, 1, OV.h); mgraphics.fill(); }
}
function btn(b, label, enabled, opt) {
  rrect(b.x, b.y, b.w, b.h, 7, C.raised2);
  if (opt && opt.border) rstroke(b.x, b.y, b.w, b.h, 7, opt.border);
  var c = opt && opt.color ? opt.color : (enabled ? C.text : C.dim);
  if (opt && opt.dot) {
    rgba(opt.dot); mgraphics.ellipse(b.x + 9, b.y + b.h / 2 - 3, 6, 6); mgraphics.fill();
    text(label, b.x + 20, b.y + 15, c, 11, false);
  } else textC(label, b.x, b.w, b.y + 15, c, 11, false);
}
function paintButtons() {
  var n = slotCount();
  btn(B_LEARN, "Lernen", true, { dot: learn ? C.orange : C.dim, color: learn ? C.text : C.muted });
  btn(B_DEL, "Löschen", sel >= 0 && slots[sel] !== undefined);
  if (confirmClear) btn(B_CLR, "Sicher?", true, { border: C.red, color: C.red });
  else btn(B_CLR, "Leeren", n > 0);
  btn(B_ZOUT, "−", loaded && view1 - view0 < lenMs - 0.001);
  btn(B_ZIN, "+", loaded && view1 - view0 > 40.001);
  var info = "";
  if (loaded) info = fmtTime(lenMs) + "  ·  " + fileName;
  else if (fileName && loading) info = fileName;
  var ix = B_ZIN.x + B_ZIN.w + 10;
  text(fit(info, W - 8 - ix, 10.5, false), ix, BY + 15, C.muted, 10.5, false);
}
function drawGear() {
  var cx = GEAR.x + 11, cy = GEAR.y + 10, on = view === "set";
  if (on) rstroke(GEAR.x, GEAR.y, GEAR.w, GEAR.h, 6, C.orange);
  rgba(on ? C.text : C.muted);
  mgraphics.set_line_width(2);
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4;
    mgraphics.move_to(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
    mgraphics.line_to(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
  }
  mgraphics.stroke();
  mgraphics.set_line_width(1.6);
  mgraphics.ellipse(cx - 4.2, cy - 4.2, 8.4, 8.4); mgraphics.stroke();
}
function paintSettings() {
  text("EINSTELLUNGEN", 20, 46, C.muted, 8.5, true);
  text("Halten", 20, PILL.y + 12, C.text, 12, false);
  rrect(PILL.x, PILL.y, PILL.w, PILL.h, 8, C.raised2);
  rgba(hold ? C.dim : C.text); mgraphics.ellipse(PILL.x + 4, PILL.y + 4, 8, 8); mgraphics.fill();
  rgba(hold ? C.orange : C.dim); mgraphics.ellipse(PILL.x + PILL.w - 12, PILL.y + 4, 8, 8); mgraphics.fill();
  text(hold ? "an: Ton stoppt, wenn du die Taste loslässt" : "aus: Ton läuft weiter bis zur nächsten Taste", PILL.x + PILL.w + 10, PILL.y + 12, C.muted, 11, false);
  text("Tasten am Mac: in Live Taste M drücken, dann spielen A S D F … die Punkte.", 20, 94, C.muted, 11, false);
  // Version + Download-Pfeil, daneben Ergebnis
  var vt = "v" + VERSION;
  text(vt, 20, UPD.y + 12, C.muted, 11, false);
  var ax = 20 + textW(vt, 11, false) + 8, ay = UPD.y;
  UPD.x = ax;
  rrect(ax, ay, UPD.w, UPD.h, 5, C.raised2);
  rgba(updating ? C.orange : C.text); mgraphics.set_line_width(1.6);
  mgraphics.move_to(ax + 10, ay + 3); mgraphics.line_to(ax + 10, ay + 10);
  mgraphics.move_to(ax + 6.5, ay + 7); mgraphics.line_to(ax + 10, ay + 10.5); mgraphics.line_to(ax + 13.5, ay + 7);
  mgraphics.move_to(ax + 5.5, ay + 13); mgraphics.line_to(ax + 14.5, ay + 13);
  mgraphics.stroke();
  text(fit(updMsg || "Update", PAN.x + PAN.w - ax - 40, 11, false), ax + 26, UPD.y + 12, C.muted, 11, false);
}

// ---------- Maus ----------
function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
var drag = null;
function onclick(x, y, but, cmdk, shift) {
  drag = null;
  var wasConfirm = confirmClear; confirmClear = false;
  if (wasConfirm) msg = "";
  if (inside(GEAR, x, y)) { view = view === "set" ? "main" : "set"; redraw(); return; }
  if (inside(B_LEARN, x, y)) { learn = !learn; settings.learn = learn; saveSettings(); say(""); return; }
  if (inside(B_DEL, x, y)) {
    if (sel >= 0 && slots[sel] !== undefined) {
      var nm = noteName(sel);
      delete slots[sel]; outlet(3, "remove", sel); sel = -1; saveState();
      say(nm + " gelöscht.");
    } else redraw();
    return;
  }
  if (inside(B_CLR, x, y)) {
    if (!slotCount()) { redraw(); return; }
    if (!wasConfirm) { confirmClear = true; say("Alle Punkte löschen? Nochmal klicken."); return; }
    slots = {}; sel = -1; outlet(3, "clear"); saveState();
    say("Alle Punkte gelöscht.");
    return;
  }
  if (inside(B_ZOUT, x, y)) { zoom(2); redraw(); return; }
  if (inside(B_ZIN, x, y)) { zoom(0.5); redraw(); return; }
  if (view === "set") {
    if (inside({ x: 16, y: PILL.y - 4, w: PILL.w + 90, h: PILL.h + 8 }, x, y)) {
      hold = !hold; settings.hold = hold; saveSettings(); outlet(6, hold ? 1 : 0); saveState(); redraw(); return;
    }
    if (inside({ x: UPD.x - 4, y: UPD.y - 3, w: 90, h: UPD.h + 6 }, x, y)) update();
    else redraw();
    return;
  }
  if (!loaded) { redraw(); return; }
  // Fähnchen: anklicken = spielen und wählen, ziehen = verschieben
  for (var i = flags.length - 1; i >= 0; i--) {
    var f = flags[i];
    if (inside(f, x, y)) {
      sel = f.p;
      drag = { k: "mark", p: f.p, x0: x, off: msToX(slots[f.p]) - x, moved: false };
      outlet(3, f.p); // über den coll starten (genau der Ton der Taste)
      trig(slots[f.p], true);
      msg = ""; return;
    }
  }
  // Übersicht: Ausschnitt verschieben
  if (y >= OV.y - 3 && y <= PAN.y + PAN.h && x >= X0 - 4 && x <= X1 + 4) {
    if (view1 - view0 < lenMs - 0.001) { drag = { k: "ov" }; scrollTo(x); }
    return;
  }
  // Welle: Punkt setzen und ab dort spielen
  if (inside({ x: X0 - 4, y: PAN.y, w: WW + 8, h: OV.y - 4 - PAN.y }, x, y)) {
    cursor = xToMs(clamp(x, X0, X1));
    sel = -1; msg = "";
    trig(cursor, false);
    return;
  }
  redraw();
}
onclick.local = 1;
function scrollTo(x) {
  var span = view1 - view0, c = clamp((x - OV.x) / OV.w, 0, 1) * lenMs;
  setView(c - span / 2, c + span / 2);
}
function ondrag(x, y, but) {
  if (!drag) return;
  if (!but) {
    if (drag.k === "mark" && drag.moved) saveState();
    drag = null; return;
  }
  if (drag.k === "ov") { scrollTo(x); return; }
  if (drag.k === "mark") {
    if (!drag.moved && Math.abs(x - drag.x0) < 3) return;
    drag.moved = true;
    var ms = xToMs(clamp(x + drag.off, X0, X1));
    if (ms === slots[drag.p]) return;
    slots[drag.p] = ms;
    outlet(3, [drag.p, ms]);
    redraw();
  }
}
ondrag.local = 1;
function onidle(x, y) {
  var h = (view === "main" && loaded && y >= WY0 - 4 && y <= WY1 && x >= X0 && x <= X1) ? Math.round(x) : -1;
  if (h !== hover) { hover = h; mgraphics.redraw(); }
}
onidle.local = 1;
function onidleout() { if (hover !== -1) { hover = -1; mgraphics.redraw(); } }
onidleout.local = 1;
function onresize() { mgraphics.redraw(); }
onresize.local = 1;

// ---------- Update über GitHub ----------
function update() {
  if (updating) return;
  updating = true; updMsg = "Suche …"; redraw();
  LU.check(PLUGIN_ID, VERSION, function (err, info) {
    if (err) { updating = false; updMsg = err; redraw(); return; }
    if (!info.newer) { updating = false; updMsg = "Aktuell"; redraw(); return; }
    updMsg = "Lade v" + info.latest + " …"; redraw();
    LU.install(info.entry, DIR, writeText, function (e2, count, left) {
      updating = false;
      if (e2) { updMsg = "Fehler: " + e2; redraw(); return; }
      updMsg = (left && left.length) ? "Alte Dateien löschen: " + left.join(", ") : "v" + info.latest + " geladen";
      say("v" + info.latest + " geladen. Startet neu …");
      var rt = new Task(function () { outlet(2, "bang"); }); rt.schedule(400);
    });
  });
}
