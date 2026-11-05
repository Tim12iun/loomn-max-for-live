// LOOMN – BPM Changer v0.2 (Max for Live, [jsui])
// Ändert das Song-Tempo weich: Tempo-Knopf (MIDI-mappbar) gleitet und rundet nach dem Loslassen auf ganze BPM,
// Rampe: in N Takten auf Ziel-BPM, Start immer auf der nächsten 1. Vier Beat-Striche zählen den Takt herunter.
// Einstellungen in bpmchanger_settings.json im eigenen Ordner (unabhängig von allen anderen Plugins).
//
// Zwei Instanzen derselben Datei:
//  - im Device (ohne Argument): macht alles (Live API, Rampe, Update) und zeichnet die linke Spalte.
//    Rechts liegen die echten Live-Regler (Tempo, Takte, Ziel, Start), damit sie MIDI-mappbar sind.
//  - im Schwebe-Fenster (Argument "win"): zeichnet alles inkl. Regler und schickt Bedienung an das Device.
autowatch = 0; // nicht automatisch neu laden (Updates überschreiben diese Datei)
var VERSION = "0.2.0";
var PLUGIN_ID = "bpmchanger";
var WIN = jsarguments.length > 1 && jsarguments[1] === "win";
try { if (!WIN && box && box.rect && box.rect[2] - box.rect[0] > 260) WIN = true; } catch (e) {} // Fenster ist breiter als die Device-Spalte
inlets = 1;
// Device: 0 Tempo-Knopf, 1 Start, 2 Neustart, 3 Takte, 4 Ziel, 5 Zustand ans Fenster, 6 Fenster öffnen
// Fenster: 0 Bedienung ans Device
outlets = 7;

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
function hex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255, 1]; }
var C = {
  bg: hex("#141414"), surface: hex("#1C1B1A"), raised: hex("#232221"), raised2: hex("#2A2928"),
  line: hex("#32312F"), text: hex("#F0EEE9"), muted: hex("#8F8C86"), dim: hex("#5E5B57"),
  orange: hex("#FF5A1F"), fill: hex("#EC6636")
};

// ---------- Zustand (Device) ----------
var song = null, tempoObs = null, playObs = null, sigObs = null;
var DIR = "";
var settings = { snap: true, snapDelay: 2 };
var tempo = 120, target = 120, cur = 120;
var gliding = false, glideK = 0.25, snapping = false, snapWait = false;
var bars = 16, rampTo = 128;
var ramp = { state: "off", start: 0, len: 0, from: 0, to: 0, bar: 0 };
var playing = false, beatNum = 4, beatIdx = -1;
var msg = "", updMsg = "", updating = false;
var view = "main"; // "main" | "set" (jede Instanz für sich)
var M = null;      // Anzeige-Zustand (Fenster: vom Device empfangen)

var glideTask = new Task(glideStep, this); glideTask.interval = 20;
var rampTask = new Task(rampStep, this); rampTask.interval = 25;
var snapTask = new Task(snapNow, this);
var mirrorTask = new Task(mirror, this);
var playTask = new Task(playChanged, this);

// ---------- Dateien / Einstellungen ----------
function deviceDir() {
  var fp = this.patcher ? this.patcher.filepath : "";
  if (!fp) return "";
  return fp.substring(0, fp.lastIndexOf("/") + 1);
}
function readText(path) {
  var f = new File(path, "read", "TEXT"); if (!f.isopen) return null;
  var s = "", line; while ((line = f.readline(32767)) !== null && line !== undefined) { s += line + "\n"; if (f.position >= f.eof) break; }
  f.close(); return s;
}
function writeText(path, s) {
  var f = new File(path, "write", "TEXT"); if (!f.isopen) return false;
  f.position = 0;
  for (var i = 0; i < s.length; i += 16000) f.writestring(s.substring(i, i + 16000));
  f.eof = f.position; f.close(); return true;
}
var SETTINGS_FILE = "bpmchanger_settings.json";
function loadSettings() {
  if (!DIR) return;
  var txt = readText(DIR + SETTINGS_FILE), s = null;
  if (txt) { try { s = JSON.parse(txt); } catch (e) { post("BPM Changer: " + SETTINGS_FILE + " ist kaputt, nehme Standard.\n"); } }
  if (s) {
    if (typeof s.snap === "boolean") settings.snap = s.snap;
    if (s.snapDelay === 1 || s.snapDelay === 2 || s.snapDelay === 4) settings.snapDelay = s.snapDelay;
  } else saveSettings();
}
function saveSettings() {
  if (!DIR) return;
  if (!writeText(DIR + SETTINGS_FILE, JSON.stringify(settings, null, 1))) say("Konnte Einstellungen nicht speichern.");
}

// ---------- Start ----------
function bang() { if (!WIN) init.call(this); }
function init() {
  DIR = deviceDir.call(this);
  loadSettings();
  stopAll();
  song = new LiveAPI("live_set");
  tempo = cur = target = Number(song.get("tempo")) || 120;
  playing = Number(song.get("is_playing")) === 1;
  beatNum = Number(song.get("signature_numerator")) || 4;
  tempoObs = new LiveAPI(function (a) { if (a && a[0] === "tempo") mirrorTask.schedule(250); }, "live_set");
  tempoObs.property = "tempo";
  playObs = new LiveAPI(function (a) { if (a && a[0] === "is_playing") playTask.schedule(30); }, "live_set");
  playObs.property = "is_playing";
  sigObs = new LiveAPI(function (a) { if (a && a[0] === "signature_numerator") playTask.schedule(30); }, "live_set");
  sigObs.property = "signature_numerator";
  setDial(tempo);
  outlet(1, "set", 0);
  say("");
}
function stopAll() {
  glideTask.cancel(); rampTask.cancel(); snapTask.cancel();
  gliding = snapping = snapWait = false; ramp.state = "off";
}

// ---------- Hilfen ----------
function say(s) { msg = s; redraw(); }
function setTempo(v) {
  if (!song) return;
  v = Math.max(20, Math.min(999, v));
  if (Math.abs(v - tempo) < 0.0005) return;
  tempo = v;
  song.set("tempo", v);
}
function setDial(v) { outlet(0, "set", Math.max(60, Math.min(200, v))); }
function fmt1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, ""); }
function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }

function mirror() {
  if (!song) return;
  var t = Number(song.get("tempo"));
  if (gliding || ramp.state === "run") return;
  if (Math.abs(t - tempo) > 0.0005) { tempo = cur = target = t; setDial(t); }
  redraw();
}
function playChanged() {
  if (!song) return;
  playing = Number(song.get("is_playing")) === 1;
  beatNum = Number(song.get("signature_numerator")) || 4;
  if (!playing) {
    beatIdx = -1;
    if (ramp.state === "run") { endRamp(); say("Gestoppt. Rampe bei " + fmt1(tempo) + " BPM beendet."); return; }
  }
  redraw();
}

// ---------- Tempo-Knopf ----------
function dial(v) {
  if (WIN || !song) return;
  v = Number(v);
  if (ramp.state === "run") endRamp();
  target = v;
  startGlide(0.25);
  snapTask.cancel(); snapWait = false; snapping = false;
  if (settings.snap && Math.abs(v - Math.round(v)) > 0.0005) { snapWait = true; snapTask.schedule(settings.snapDelay * 1000); }
  say("");
}
function startGlide(k) {
  glideK = k;
  if (!gliding) { gliding = true; cur = tempo; glideTask.repeat(); }
}
function glideStep() {
  var d = target - cur;
  if (Math.abs(d) < 0.004) {
    cur = target; setTempo(cur);
    glideTask.cancel(); gliding = false;
    if (snapping) { snapping = false; setDial(target); }
    redraw(); return;
  }
  var step = d * glideK, max = 1.2; // höchstens 1.2 BPM pro 20 ms
  if (step > max) step = max; else if (step < -max) step = -max;
  cur += step; setTempo(cur);
  redraw();
}
function snapNow() {
  snapWait = false;
  if (ramp.state === "run") return;
  var r = Math.round(target);
  target = r; setDial(r);
  if (Math.abs(cur - r) > 0.004 || Math.abs(tempo - r) > 0.004) { snapping = true; startGlide(0.08); }
  redraw();
}

// ---------- Rampe ----------
function setBars(v) { bars = Math.max(1, Math.min(64, Math.round(Number(v)) || 1)); redraw(); }
function setRampTo(v) { rampTo = Math.max(60, Math.min(200, Math.round(Number(v)) || rampTo)); redraw(); }
function start(v) {
  if (WIN || !song) return;
  if (Number(v)) {
    if (Math.abs(rampTo - tempo) < 0.004) { outlet(1, "set", 0); say("Schon auf " + fmt1(rampTo) + " BPM."); return; }
    snapTask.cancel(); snapWait = false;
    ramp.state = "armed";
    say("");
  } else {
    if (ramp.state === "run") { endRamp(); say("Rampe abgebrochen bei " + fmt1(tempo) + " BPM."); }
    else if (ramp.state === "armed") { ramp.state = "off"; say("Rampe abgebrochen."); }
  }
}
// Metro (4n, im Takt von Live) -> ein Schlag
function tick() {
  if (WIN || !song) return;
  var t = Number(song.get("current_song_time"));
  beatNum = Number(song.get("signature_numerator")) || 4;
  var b = Math.round(t);
  beatIdx = ((b % beatNum) + beatNum) % beatNum;
  playing = true;
  if (ramp.state === "armed" && beatIdx === 0) beginRamp(b);
  else if (ramp.state === "run") ramp.bar = Math.min(bars, Math.floor((b - ramp.start) / beatNum) + 1);
  redraw();
}
function beginRamp(b) {
  glideTask.cancel(); gliding = false; snapping = false;
  ramp.state = "run"; ramp.start = b; ramp.len = bars * beatNum;
  ramp.from = Number(song.get("tempo")) || tempo; tempo = ramp.from; ramp.to = rampTo; ramp.bar = 1;
  say("");
  rampTask.repeat();
}
function rampStep() {
  if (!song || ramp.state !== "run") { rampTask.cancel(); return; }
  var t = Number(song.get("current_song_time"));
  if (t < ramp.start - 0.5) { endRamp(); say("Position gesprungen. Rampe beendet."); return; }
  var p = (t - ramp.start) / ramp.len;
  if (p >= 1) { setTempo(ramp.to); endRamp(); say("Ziel erreicht: " + fmt1(ramp.to) + " BPM."); return; }
  if (p < 0) p = 0;
  setTempo(ramp.from + (ramp.to - ramp.from) * p);
  redraw();
}
function endRamp() {
  rampTask.cancel();
  ramp.state = "off";
  cur = target = tempo;
  setDial(tempo);
  outlet(1, "set", 0);
  redraw();
}

// ---------- Update über GitHub ----------
function update() {
  if (WIN || updating) return;
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

// ---------- Bedienung aus dem Schwebe-Fenster (über r ---bpmcmd) ----------
// Die Live-Regler werden mit "set" nachgeführt, damit Device und Fenster gleich aussehen.
function anything() { handle(messagename, arrayfromargs(arguments)); }
function handle(n, a) {
  if (WIN) { if (n === "state") { try { M = JSON.parse(decodeURIComponent(a[0])); } catch (e) {} mgraphics.redraw(); } return; }
  if (n === "bars") setBars(a[0]);
  else if (n === "target") setRampTo(a[0]);
  else if (n === "wdial") { var v = Math.max(60, Math.min(200, Number(a[0]))); setDial(v); dial(v); }
  else if (n === "wbars") { setBars(a[0]); outlet(3, "set", bars); }
  else if (n === "wtarget") { setRampTo(a[0]); outlet(4, "set", rampTo); }
  else if (n === "wstart") { var on = ramp.state === "off"; outlet(1, "set", on ? 1 : 0); start(on ? 1 : 0); }
  else if (n === "wsnap") toggleSnap();
  else if (n === "wdelay") setDelay(Number(a[0]));
  else if (n === "wupdate") update();
  else if (n === "wopen") sendState(true);
}
function toggleSnap() {
  settings.snap = !settings.snap; saveSettings();
  if (!settings.snap) { snapTask.cancel(); snapWait = false; }
  redraw();
}
function setDelay(d) { if (d === 1 || d === 2 || d === 4) { settings.snapDelay = d; saveSettings(); redraw(); } }
function openwin() { outlet(6, "open"); sendState(true); }

// ---------- Anzeige-Zustand ----------
function model() {
  if (WIN) return M || { tempo: 120, status: "Warte auf Device …", rline: "", rinfo: "", hot: false, run: false, prog: 0,
    beatNum: 4, beatIdx: -1, snap: true, delay: 2, upd: "", updating: false, bars: 16, to: 128, dial: 120, on: false };
  var status = msg;
  if (!status) {
    if (snapping) status = "Rundet auf " + fmt1(target) + " BPM";
    else if (snapWait) status = "Gleitet auf " + fmt1(target) + ". Loslassen = runden.";
    else if (gliding) status = "Gleitet auf " + fmt1(target) + " BPM";
    else status = "Tempo drehen oder Rampe starten.";
  }
  var rinfo;
  if (ramp.state === "armed") rinfo = (!playing || beatIdx < 0) ? "Wartet auf Play …" : "Startet in " + plural(beatNum - beatIdx, "Schlag", "Schlägen");
  else if (ramp.state === "run") rinfo = "Takt " + ramp.bar + " von " + bars;
  else rinfo = "Start beginnt auf der nächsten 1";
  var prog = 0;
  if (ramp.state === "run") prog = ramp.to === ramp.from ? 1 : Math.max(0, Math.min(1, (tempo - ramp.from) / (ramp.to - ramp.from)));
  return { tempo: tempo, status: status, rline: plural(bars, "Takt", "Takte") + " → " + fmt1(ramp.state === "run" ? ramp.to : rampTo) + " BPM",
    rinfo: rinfo, hot: ramp.state !== "off", run: ramp.state === "run", prog: prog, beatNum: beatNum, beatIdx: beatIdx,
    snap: settings.snap, delay: settings.snapDelay, upd: updMsg, updating: updating, bars: bars, to: rampTo,
    dial: gliding || snapWait ? target : tempo, on: ramp.state !== "off" };
}
var lastState = "";
function sendState(force) {
  var s = encodeURIComponent(JSON.stringify(model()));
  if (!force && s === lastState) return;
  lastState = s;
  outlet(5, "state", s);
}
function redraw() { mgraphics.redraw(); if (!WIN) sendState(false); }

// ---------- Zeichnen ----------
function rgba(c) { mgraphics.set_source_rgba(c[0], c[1], c[2], c[3]); }
function font(size, bold) {
  try { mgraphics.select_font_face(bold ? "Helvetica Neue Bold" : "Helvetica Neue Medium"); } catch (e) {}
  mgraphics.set_font_size(size);
}
function text(s, x, y, c, size, bold) { font(size, bold); rgba(c); mgraphics.move_to(x, y); mgraphics.show_text(String(s)); }
function textW(s, size, bold) { font(size, bold); return mgraphics.text_measure(String(s))[0]; }
function textC(s, x, w, y, c, size, bold) { text(s, x + (w - textW(s, size, bold)) / 2, y, c, size, bold); }
function rrect(x, y, w, h, r, c) { rgba(c); mgraphics.rectangle_rounded(x, y, w, h, r, r); mgraphics.fill(); }
function rstroke(x, y, w, h, r, c) { rgba(c); mgraphics.set_line_width(1); mgraphics.rectangle_rounded(x + 0.5, y + 0.5, w - 1, h - 1, r, r); mgraphics.stroke(); }
function fit(s, w, size, bold) { s = String(s); if (textW(s, size, bold) <= w) return s; while (s.length > 1 && textW(s + "…", size, bold) > w) s = s.substring(0, s.length - 1); return s + "…"; }

// Bereiche (in 300 x 169, Fenster wird skaliert)
var LW = 212; // linke Spalte (Device: rechts davon liegen die Live-Regler)
var GEAR = { x: 186, y: 4, w: 22, h: 20 }, POP = { x: 160, y: 4, w: 22, h: 20 };
var PILL = { x: 112, y: 30, w: 34, h: 16 }, SEG = { x: 112, y: 52, w: 92, h: 18 }, UPD = { x: 0, y: 72, w: 20, h: 16 };
var R_DIAL = { x: 220, y: 4, w: 72, h: 72 }, R_BARS = { x: 218, y: 82, w: 76, h: 20 },
    R_ZIEL = { x: 218, y: 106, w: 76, h: 20 }, R_START = { x: 218, y: 132, w: 76, h: 30 };

function scale() { var r = box.rect; var w = r[2] - r[0]; return WIN ? Math.max(0.5, w / 300) : 1; }

function paint() {
  var m = model(), S = scale();
  var r = box.rect;
  rgba(C.bg); mgraphics.rectangle(0, 0, r[2] - r[0], r[3] - r[1]); mgraphics.fill();
  mgraphics.save();
  mgraphics.scale(S, S);
  // Logo
  text("BPM Changer", 10, 19, C.text, 13, true);
  var lw = textW("BPM Changer", 13, true);
  rgba(C.orange); mgraphics.ellipse(10 + lw + 1.5, 6.5, 4, 4); mgraphics.fill();
  if (!WIN) drawPop();
  drawGear();
  if (view === "set") paintSettings(m); else paintMain(m);
  paintRamp(m);
  if (WIN) paintControls(m);
  mgraphics.restore();
}
function paintMain(m) {
  var t = m.tempo, whole = Math.floor(t + 0.00001), frac = Math.round((t - whole) * 100);
  if (frac >= 100) { whole += 1; frac = 0; }
  var a = String(whole), b = "." + (frac < 10 ? "0" : "") + frac;
  text(a, 9, 70, C.text, 44, true);
  var aw = textW(a, 44, true);
  text(b, 9 + aw + 1, 70, frac ? C.text : C.dim, 20, true);
  text("BPM", 9 + aw + textW(b, 20, true) + 6, 70, C.muted, 11, true);
  text(fit(m.status, LW - 18, 11, false), 10, 90, C.muted, 11, false);
}
function paintRamp(m) {
  rrect(8, 100, LW - 14, 62, 10, C.surface);
  text("RAMPE", 18, 115, C.muted, 8.5, true);
  var rl = fit(m.rline, 120, 11, true);
  text(rl, LW - 16 - textW(rl, 11, true), 115, m.hot ? C.text : C.muted, 11, true);
  // Beat-Striche (wie am CDJ): verbleibende Schläge im Takt leuchten, grau = nichts geplant, orange = Start gedrückt
  var n = Math.max(1, Math.min(16, m.beatNum)), x0 = 18, x1 = LW - 16, gap = 5, w = (x1 - x0 - gap * (n - 1)) / n;
  for (var i = 0; i < n; i++) {
    var lit = m.beatIdx >= 0 && i >= m.beatIdx;
    rrect(x0 + i * (w + gap), 122, w, 10, 3, lit ? (m.hot ? C.fill : C.dim) : C.raised2);
  }
  // Fortschritt der Rampe
  rrect(x0, 137, x1 - x0, 3, 1.5, C.line);
  if (m.run && m.prog > 0.002) rrect(x0, 137, (x1 - x0) * m.prog, 3, 1.5, C.orange);
  text(fit(m.rinfo, x1 - x0, 11, false), 18, 155, m.hot ? C.text : C.muted, 11, false);
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
function drawPop() { // Fenster ausklappen: Quadrat mit Pfeil nach oben rechts
  var x = POP.x + 5, y = POP.y + 4;
  rgba(C.muted); mgraphics.set_line_width(1.5);
  mgraphics.move_to(x + 6, y); mgraphics.line_to(x, y); mgraphics.line_to(x, y + 12); mgraphics.line_to(x + 12, y + 12); mgraphics.line_to(x + 12, y + 6);
  mgraphics.move_to(x + 5, y + 7); mgraphics.line_to(x + 12, y);
  mgraphics.move_to(x + 7.5, y); mgraphics.line_to(x + 12, y); mgraphics.line_to(x + 12, y + 4.5);
  mgraphics.stroke();
}
function paintSettings(m) {
  text("Ganze BPM", 10, 42, C.text, 12, false);
  rrect(PILL.x, PILL.y, PILL.w, PILL.h, 8, C.raised2);
  rgba(m.snap ? C.dim : C.text); mgraphics.ellipse(PILL.x + 4, PILL.y + 4, 8, 8); mgraphics.fill();
  rgba(m.snap ? C.orange : C.dim); mgraphics.ellipse(PILL.x + PILL.w - 12, PILL.y + 4, 8, 8); mgraphics.fill();
  text(m.snap ? "an" : "aus", PILL.x + PILL.w + 6, 42, C.muted, 11, false);
  text("Nach Loslassen", 10, 65, m.snap ? C.text : C.dim, 12, false);
  rrect(SEG.x, SEG.y, SEG.w, SEG.h, 6, C.raised);
  var opts = [1, 2, 4], sw = SEG.w / 3;
  for (var i = 0; i < 3; i++) {
    var on = m.delay === opts[i];
    if (on) rstroke(SEG.x + i * sw + 1, SEG.y + 1, sw - 2, SEG.h - 2, 5, m.snap ? C.orange : C.dim);
    textC(opts[i] + " s", SEG.x + i * sw, sw, SEG.y + 13, on && m.snap ? C.text : C.muted, 11, false);
  }
  // Version + Download-Pfeil, daneben Ergebnis
  var vt = "v" + VERSION;
  text(vt, 10, 86, C.muted, 11, false);
  var ax = 10 + textW(vt, 11, false) + 8, ay = 74;
  UPD.x = ax; UPD.y = ay;
  rrect(ax, ay, UPD.w, UPD.h, 5, C.raised2);
  rgba(m.updating ? C.orange : C.text); mgraphics.set_line_width(1.6);
  mgraphics.move_to(ax + 10, ay + 3); mgraphics.line_to(ax + 10, ay + 10);
  mgraphics.move_to(ax + 6.5, ay + 7); mgraphics.line_to(ax + 10, ay + 10.5); mgraphics.line_to(ax + 13.5, ay + 7);
  mgraphics.move_to(ax + 5.5, ay + 13); mgraphics.line_to(ax + 14.5, ay + 13);
  mgraphics.stroke();
  text(fit(m.upd || "Update", LW - ax - 30, 11, false), ax + 26, 86, C.muted, 11, false);
}
// Nur im Fenster: Regler selbst zeichnen
function paintControls(m) {
  var d = R_DIAL, cx = d.x + d.w / 2, cy = d.y + 36, rad = 22;
  var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, p = Math.max(0, Math.min(1, (m.dial - 60) / 140));
  textC("Tempo", d.x, d.w, d.y + 10, C.muted, 10, true);
  mgraphics.set_line_width(4);
  rgba(C.line); mgraphics.arc(cx, cy, rad, a0, a1); mgraphics.stroke();
  if (p > 0.002) { rgba(C.orange); mgraphics.arc(cx, cy, rad, a0, a0 + (a1 - a0) * p); mgraphics.stroke(); }
  var an = a0 + (a1 - a0) * p;
  rgba(C.text); mgraphics.set_line_width(2);
  mgraphics.move_to(cx + Math.cos(an) * 8, cy + Math.sin(an) * 8); mgraphics.line_to(cx + Math.cos(an) * (rad - 2), cy + Math.sin(an) * (rad - 2)); mgraphics.stroke();
  textC(fmt1(m.dial), d.x, d.w, d.y + 70, C.text, 11, true);
  field(R_BARS, plural(m.bars, "Takt", "Takte"));
  field(R_ZIEL, m.to + " BPM");
  var s = R_START;
  if (m.on) { rrect(s.x, s.y, s.w, s.h, 7, C.raised2); rstroke(s.x, s.y, s.w, s.h, 7, C.orange); textC("Stopp", s.x, s.w, s.y + 20, C.orange, 13, true); }
  else { rrect(s.x, s.y, s.w, s.h, 7, C.fill); textC("Start", s.x, s.w, s.y + 20, C.text, 13, true); }
}
function field(b, s) {
  rrect(b.x, b.y, b.w, b.h, 6, C.raised2);
  textC(s, b.x, b.w, b.y + 14, C.text, 12, true);
}

// ---------- Maus ----------
function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
function cmd() { var a = arrayfromargs(arguments); if (WIN) outlet.apply(this, [0].concat(a)); else handle(a[0], a.slice(1)); }
var drag = null;
function onclick(x, y, but, cmdk, shift) {
  var S = scale(); x /= S; y /= S;
  var m = model();
  drag = null;
  if (inside(GEAR, x, y)) { view = view === "set" ? "main" : "set"; mgraphics.redraw(); return; }
  if (!WIN && inside(POP, x, y)) { openwin(); return; }
  if (WIN) {
    if (inside(R_DIAL, x, y)) { drag = { k: "wdial", y: y, v: m.dial, step: shift ? 0.02 : 0.2 }; return; }
    if (inside(R_BARS, x, y)) { drag = { k: "wbars", y: y, v: m.bars, step: 0.15 }; return; }
    if (inside(R_ZIEL, x, y)) { drag = { k: "wtarget", y: y, v: m.to, step: 0.25 }; return; }
    if (inside(R_START, x, y)) { cmd("wstart"); return; }
  }
  if (view !== "set") return;
  if (inside({ x: PILL.x - 4, y: PILL.y - 3, w: PILL.w + 30, h: PILL.h + 6 }, x, y)) { cmd("wsnap"); return; }
  if (m.snap && inside(SEG, x, y)) { cmd("wdelay", [1, 2, 4][Math.min(2, Math.floor((x - SEG.x) / (SEG.w / 3)))]); return; }
  if (inside({ x: UPD.x, y: UPD.y, w: 80, h: UPD.h }, x, y)) cmd("wupdate");
}
onclick.local = 1;
function ondrag(x, y, but) {
  if (!drag || !but) { drag = null; return; }
  var S = scale(); y /= S;
  var v = drag.v + (drag.y - y) * drag.step;
  if (drag.k !== "wdial") v = Math.round(v);
  if (v === drag.last) return;
  drag.last = v;
  cmd(drag.k, v);
}
ondrag.local = 1;
function onresize() { mgraphics.redraw(); }
onresize.local = 1;
