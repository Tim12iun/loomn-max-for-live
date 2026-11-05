// LOOMN – BPM Changer v0.1 (Max for Live, [jsui])
// Ändert das Song-Tempo weich: Tempo-Knopf (MIDI-mappbar) gleitet und rundet nach dem Loslassen auf ganze BPM,
// Rampe: in N Takten auf Ziel-BPM, Start immer auf dem nächsten Takt. Kuchen zeigt die Schläge im Takt.
// Einstellungen in bpmchanger_settings.json im eigenen Ordner (unabhängig von allen anderen Plugins).
autowatch = 0; // nicht automatisch neu laden (Updates überschreiben diese Datei)
var VERSION = "0.1.0";
var PLUGIN_ID = "bpmchanger";
inlets = 1;
outlets = 3; // 0 -> Tempo-Knopf (set), 1 -> Start-Taste (set), 2 -> Neustart nach Update (deferlow -> compile + init)

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
  orange: hex("#FF5A1F"), fill: hex("#EC6636")
};
var W = 300, H = 169;

// ---------- Zustand ----------
var song = null, tempoObs = null, playObs = null, sigObs = null;
var DIR = "";
var settings = { snap: true, snapDelay: 2 };
var tempo = 120;          // aktuelles Song-Tempo (zuletzt bekannt)
var target = 120;         // Ziel des Gleitens (Knopf)
var cur = 120;            // Tempo während des Gleitens
var gliding = false, glideK = 0.25, snapping = false, snapWait = false;
var bars = 16, rampTo = 128;
var ramp = { state: "off", start: 0, len: 0, from: 0, to: 0, bar: 0 };
var playing = false, beatNum = 4, beatIdx = -1;
var view = "main";        // "main" | "set"
var status = "";
var updating = false;

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
function bang() { init.call(this); }
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
function say(s) { status = s; redraw(); }
function redraw() { mgraphics.redraw(); }
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

// Tempo hat sich geändert (Observer, gebündelt). Von außen geändert -> Knopf nachführen.
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
    if (ramp.state === "armed") { say("Wartet auf Play …"); return; }
  }
  redraw();
}

// ---------- Tempo-Knopf ----------
function dial(v) {
  if (!song) return;
  v = Number(v);
  if (ramp.state === "run") { endRamp(); }
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
// Knopf losgelassen (ein paar Sekunden keine Bewegung): auf ganze BPM gleiten
function snapNow() {
  snapWait = false;
  if (ramp.state === "run") return;
  var r = Math.round(target);
  target = r; setDial(r);
  if (Math.abs(cur - r) > 0.004 || Math.abs(tempo - r) > 0.004) { snapping = true; startGlide(0.08); }
  redraw();
}

// ---------- Rampe ----------
function bars_(v) { bars = Math.max(1, Math.round(Number(v)) || 1); redraw(); }
function target_(v) { rampTo = Number(v) || rampTo; redraw(); }
// Max-Nachrichten "bars" / "target" (eigene Namen, damit nichts mit Variablen kollidiert)
function anything() {
  var a = arrayfromargs(arguments);
  if (messagename === "bars") bars_(a[0]);
  else if (messagename === "target") target_(a[0]);
}
function start(v) {
  if (!song) return;
  if (Number(v)) {
    if (Math.abs(rampTo - tempo) < 0.004) { outlet(1, "set", 0); say("Schon auf " + fmt1(rampTo) + " BPM."); return; }
    snapTask.cancel(); snapWait = false;
    ramp.state = "armed";
    say(playing ? "" : "Wartet auf Play …");
  } else {
    if (ramp.state === "run") { endRamp(); say("Rampe abgebrochen bei " + fmt1(tempo) + " BPM."); }
    else if (ramp.state === "armed") { ramp.state = "off"; say("Abgebrochen."); }
  }
}
// Metro (4n, im Takt von Live) -> ein Schlag
function tick() {
  if (!song) return;
  var t = Number(song.get("current_song_time"));
  beatNum = Number(song.get("signature_numerator")) || 4;
  var b = Math.round(t);
  beatIdx = ((b % beatNum) + beatNum) % beatNum;
  playing = true;
  if (ramp.state === "armed" && status === "Wartet auf Play …") status = "";
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
  if (p >= 1) {
    setTempo(ramp.to); endRamp(); say("Ziel erreicht: " + fmt1(ramp.to) + " BPM."); return;
  }
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
  if (updating) return;
  updating = true;
  say("Suche Update …");
  LU.check(PLUGIN_ID, VERSION, function (err, info) {
    if (err) { updating = false; say(err); return; }
    if (!info.newer) { updating = false; say("Aktuell: v" + VERSION + " ist die neueste."); return; }
    say("Lade v" + info.latest + " …");
    LU.install(info.entry, DIR, writeText, function (e2, count, left) {
      updating = false;
      if (e2) { say("Update fehlgeschlagen: " + e2); return; }
      var msg = "v" + info.latest + " geladen. Startet neu …";
      if (left && left.length) msg = "v" + info.latest + " geladen. Alte Dateien im Finder löschen: " + left.join(", ");
      say(msg);
      var rt = new Task(function () { outlet(2, "bang"); }); rt.schedule(400);
    });
  });
}

// ---------- Zeichnen ----------
function rgba(c) { mgraphics.set_source_rgba(c[0], c[1], c[2], c[3]); }
function font(size, bold) {
  try { mgraphics.select_font_face(bold ? "Helvetica Neue Bold" : "Helvetica Neue Medium"); } catch (e) {}
  mgraphics.set_font_size(size);
}
function text(s, x, y, c, size, bold) { font(size, bold); rgba(c); mgraphics.move_to(x, y); mgraphics.show_text(String(s)); }
function textW(s, size, bold) { font(size, bold); return mgraphics.text_measure(String(s))[0]; }
function rrect(x, y, w, h, r, c) { rgba(c); mgraphics.rectangle_rounded(x, y, w, h, r, r); mgraphics.fill(); }
// Text auf Breite kürzen
function fit(s, w, size) { s = String(s); if (textW(s, size) <= w) return s; while (s.length > 1 && textW(s + "…", size) > w) s = s.substring(0, s.length - 1); return s + "…"; }

var GEAR = { x: 274, y: 4, w: 22, h: 20 };
var PILL = { x: 120, y: 30, w: 34, h: 16 };
var SEG = { x: 120, y: 52, w: 96, h: 18 };
var UPD = { x: 10, y: 72, w: 92, h: 18 };

function paint() {
  rgba(C.bg); mgraphics.rectangle(0, 0, W, H); mgraphics.fill();
  // Logo
  text("BPM Changer", 10, 19, C.text, 13, true);
  var lw = textW("BPM Changer", 13, true);
  rgba(C.orange); mgraphics.ellipse(10 + lw + 1.5, 6.5, 4, 4); mgraphics.fill();
  drawGear();
  if (view === "set") paintSettings(); else paintMain();
  // Statuszeile
  text(fit(statusText(), 212, 11), 10, 96, C.muted, 11, false);
  // Rampen-Feld
  rrect(8, 104, 284, 58, 10, C.surface);
  text("TAKTE", 17, 117, C.muted, 8.5, true);
  text("ZIEL BPM", 77, 117, C.muted, 8.5, true);
  drawPie(172, 133);
}
function paintMain() {
  var whole = Math.floor(tempo + 0.00001), frac = Math.round((tempo - whole) * 100);
  if (frac >= 100) { whole += 1; frac = 0; }
  var a = String(whole), b = "." + (frac < 10 ? "0" : "") + frac;
  text(a, 9, 72, C.text, 44, true);
  var aw = textW(a, 44, true);
  text(b, 9 + aw + 1, 72, frac ? C.text : C.dim, 20, true);
  var bw = textW(b, 20, true);
  text("BPM", 9 + aw + bw + 6, 72, C.muted, 11, true);
}
function statusText() {
  if (status) return status;
  if (ramp.state === "armed") {
    if (!playing || beatIdx < 0) return "Wartet auf Play …";
    var left = beatNum - beatIdx;
    return "Rampe startet in " + plural(left, "Schlag", "Schlägen");
  }
  if (ramp.state === "run") return "Rampe Takt " + ramp.bar + " von " + bars + "  →  " + fmt1(ramp.to) + " BPM";
  if (snapping) return "Rundet auf " + fmt1(target) + " BPM";
  if (snapWait) return "Gleitet auf " + fmt1(target) + ". Loslassen = runden.";
  if (gliding) return "Gleitet auf " + fmt1(target) + " BPM";
  return "Knopf drehen oder Rampe starten.";
}
function drawGear() {
  var cx = GEAR.x + 11, cy = GEAR.y + 10, on = view === "set";
  if (on) { rgba(C.orange); mgraphics.set_line_width(1); mgraphics.rectangle_rounded(GEAR.x + 0.5, GEAR.y + 0.5, GEAR.w - 1, GEAR.h - 1, 6, 6); mgraphics.stroke(); }
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
  text("Runden", 10, 42, C.text, 12, false);
  // Zwei-Punkt-Schalter
  rrect(PILL.x, PILL.y, PILL.w, PILL.h, 8, C.raised2);
  rgba(settings.snap ? C.dim : C.text); mgraphics.ellipse(PILL.x + 4, PILL.y + 4, 8, 8); mgraphics.fill();
  rgba(settings.snap ? C.orange : C.dim); mgraphics.ellipse(PILL.x + PILL.w - 12, PILL.y + 4, 8, 8); mgraphics.fill();
  text(settings.snap ? "an" : "aus", PILL.x + PILL.w + 6, 42, C.muted, 11, false);
  // Segment: nach 1 / 2 / 4 s
  text("Runden nach", 10, 65, settings.snap ? C.text : C.dim, 12, false);
  rrect(SEG.x, SEG.y, SEG.w, SEG.h, 6, C.raised);
  var opts = [1, 2, 4], sw = SEG.w / 3;
  for (var i = 0; i < 3; i++) {
    var on = settings.snapDelay === opts[i];
    if (on) { rgba(settings.snap ? C.orange : C.dim); mgraphics.set_line_width(1); mgraphics.rectangle_rounded(SEG.x + i * sw + 1.5, SEG.y + 1.5, sw - 3, SEG.h - 3, 5, 5); mgraphics.stroke(); }
    var lab = opts[i] + " s", w = textW(lab, 11, false);
    text(lab, SEG.x + i * sw + (sw - w) / 2, SEG.y + 13, on && settings.snap ? C.text : C.muted, 11, false);
  }
  // Version + Download-Pfeil
  text("v" + VERSION, 10, 85, C.muted, 11, false);
  var ax = 10 + textW("v" + VERSION, 11, false) + 10, ay = 74;
  rrect(ax - 4, ay - 1, 20, 16, 5, C.raised2);
  rgba(updating ? C.orange : C.text); mgraphics.set_line_width(1.6);
  mgraphics.move_to(ax + 6, ay + 2); mgraphics.line_to(ax + 6, ay + 10);
  mgraphics.move_to(ax + 2.5, ay + 7); mgraphics.line_to(ax + 6, ay + 10.5); mgraphics.line_to(ax + 9.5, ay + 7);
  mgraphics.move_to(ax + 1.5, ay + 13); mgraphics.line_to(ax + 10.5, ay + 13);
  mgraphics.stroke();
  UPD.x = ax - 4; UPD.w = 20; UPD.y = ay - 1; UPD.h = 16;
  text("Update", ax + 22, 85, C.muted, 11, false);
}
function drawPie(cx, cy) {
  var r = 17, n = Math.max(1, Math.min(16, beatNum)), hot = ramp.state !== "off";
  var on = hot ? C.fill : C.dim;
  for (var i = 0; i < n; i++) {
    var a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
    var lit = beatIdx >= 0 && i >= beatIdx; // läuft ab: verbleibende Schläge im Takt
    rgba(lit ? on : C.raised2);
    mgraphics.move_to(cx, cy); mgraphics.arc(cx, cy, r, a0, a1); mgraphics.close_path(); mgraphics.fill();
  }
  // Fugen zwischen den Stücken
  rgba(C.surface); mgraphics.set_line_width(2);
  for (var j = 0; j < n; j++) {
    var a = -Math.PI / 2 + j * 2 * Math.PI / n;
    mgraphics.move_to(cx, cy); mgraphics.line_to(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1));
  }
  mgraphics.stroke();
  // Ring: Fortschritt der Rampe
  mgraphics.set_line_width(2);
  rgba(C.line); mgraphics.ellipse(cx - 21, cy - 21, 42, 42); mgraphics.stroke();
  if (ramp.state === "run" && ramp.len > 0) {
    var p = Math.max(0, Math.min(1, (ramp.to === ramp.from) ? 1 : (tempo - ramp.from) / (ramp.to - ramp.from)));
    if (p > 0.001) { rgba(C.orange); mgraphics.arc(cx, cy, 21, -Math.PI / 2, -Math.PI / 2 + p * 2 * Math.PI); mgraphics.stroke(); }
  }
}

function inside(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }
function onclick(x, y) {
  if (inside(GEAR, x, y)) { view = view === "set" ? "main" : "set"; if (!updating) status = ""; redraw(); return; }
  if (view !== "set") return;
  if (inside({ x: PILL.x - 4, y: PILL.y - 3, w: PILL.w + 30, h: PILL.h + 6 }, x, y)) {
    settings.snap = !settings.snap; saveSettings();
    if (!settings.snap) { snapTask.cancel(); snapWait = false; }
    redraw(); return;
  }
  if (settings.snap && inside(SEG, x, y)) {
    settings.snapDelay = [1, 2, 4][Math.min(2, Math.floor((x - SEG.x) / (SEG.w / 3)))];
    saveSettings(); redraw(); return;
  }
  if (inside({ x: UPD.x, y: UPD.y, w: UPD.w + 50, h: UPD.h }, x, y)) update();
}
onclick.local = 1;
