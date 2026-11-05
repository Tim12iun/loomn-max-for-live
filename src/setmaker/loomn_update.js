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
  // install(entry, deviceDir, writeText, cb(err, count)) – Textdateien über responseText, Binärdateien (.amxd) direkt in Datei
  function install(entry, deviceDir, writeText, cb) {
    var files = entry.files.slice(0), done = 0;
    // Script zuletzt, damit nichts mitten im Update neu geladen wird
    files.sort(function (a, b) { return (/\.js$/.test(a) ? 1 : 0) - (/\.js$/.test(b) ? 1 : 0); });
    function next() {
      if (!files.length) return cb(null, done);
      var f = files.shift(), url = BASE + enc(entry.dir + "/" + f);
      if (/\.amxd$/.test(f)) {
        get(url, function (err) { if (err) return cb(f + ": " + err); done++; next(); }, posix(deviceDir) + f);
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
  return { BASE: BASE, cmp: cmp, check: check, install: install };
})();
// ==== END loomn_update ====
