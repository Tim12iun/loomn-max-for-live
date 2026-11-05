// ==== BEGIN loomn_update (gemeinsamer Update-Mechanismus für alle LOOMN-Max-for-Live-Plugins) ====
// Liest manifest.json aus dem GitHub-Repo und lädt neuere Dateien in den Ordner des Devices.
// ES5 (Max [js]). Benutzt XMLHttpRequest von Max (maxurl).
var LU = (function () {
  var BASE = "https://raw.githubusercontent.com/Tim12iun/loomn-max-for-live/main/";
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
  return { BASE: BASE, cmp: cmp, check: check, install: install, leftovers: leftovers };
})();
// ==== END loomn_update ====
