// SET MAKER LIVE – Song-Prep v0.2 (Max for Live, [js])
// Farben -> Spalten. "Rendern" nimmt pro Spalte einen Full-Stem unten im Projekt auf (Echtzeit).
// "Paket" schreibt Full-Stems, graue Schnitte und Serum-MIDI als JSON neben das Live-Set.
autowatch = 0; // nicht automatisch neu laden (Updates überschreiben diese Datei)
var VERSION = "0.7.5";
var PLUGIN_ID = "setmaker-prep";
inlets = 1;
outlets = 1; // -> jweb (über s ---toweb)

var LANES = [
  { id: "bass",  short: "BASS" },  { id: "kick", short: "KICK" },
  { id: "top",   short: "TOPS" },  { id: "vox",  short: "VOCALS" },
  { id: "melo",  short: "MELODY" },{ id: "serum", short: "SERUM", midi: true },
  { id: "inst1", short: "INST10" },{ id: "inst2", short: "INST11" },
  { id: "vocal", short: "VOCALCHAIN" }, { id: "riser", short: "RISER" },
  { id: "free1", short: "SPUR14" }
];

// Gemeinsame Erkennung + Einstellungen (aus setmaker_shared.js, per Build eingefügt)
// ==== BEGIN setmaker_shared (gemeinsam für SetMaker Sort + SetMaker Prep) ====
// Rollen-Erkennung aus Spur-, Clip-, Sample- und Instrument-Namen. ES5 (Max [js]).
// Einstellungen: setmaker_settings.json im Device-Ordner (Format v1, siehe defaults()).
var SM = (function () {
  function isArr(v) { return !!v && typeof v === "object" && typeof v.length === "number"; }
  var LANES = [
    { id: "bass", label: "Bass" }, { id: "kick", label: "Kick" }, { id: "top", label: "Tops" },
    { id: "vox", label: "Vocals" }, { id: "melo", label: "Melody" }, { id: "serum", label: "Serum" },
    { id: "inst1", label: "Inst 10" }, { id: "inst2", label: "Inst 11" }, { id: "vocal", label: "Vocal Chain" },
    { id: "riser", label: "Riser" }, { id: "free1", label: "Spur 14" }
  ];
  // Live 12 Farbpalette (color_index 0..69 -> RGB)
  var PALETTE = [
    0xFF94A6,0xFFA529,0xCC9927,0xF7F47C,0xBFFB00,0x1AFF2F,0x25FFA8,0x5CFFE8,0x8BC5FF,0x5480E4,0x92A7FF,0xD86CE4,0xE553A0,0xFFFFFF,
    0xFF3636,0xF66C03,0x99724B,0xFFF034,0x87FF67,0x3DC300,0x00BFAF,0x19E9FF,0x10A4EE,0x007DC0,0x886CE4,0xB677C6,0xFF39D4,0xD0D0D0,
    0xE2675A,0xFFA374,0xD3AD71,0xEDFFAE,0xD2E498,0xBAD074,0x9BC48D,0xD4FDE1,0xCDF1F8,0xB9C1E3,0xCDBBE4,0xAE98E5,0xE5DCE1,0xA9A9A9,
    0xC6928B,0xB78256,0x99836A,0xBFBA69,0xA6BE00,0x7DB04D,0x88C2BA,0x9BB3C4,0x85A5C2,0x8393CC,0xA595B5,0xBF9FBE,0xBC7196,0x7B7B7B,
    0xAF3333,0xA95131,0x724F41,0xDBC300,0x85961F,0x539F31,0x0A9C8E,0x236384,0x1A2F96,0x2F52A2,0x624BAD,0xA34BAD,0xCC2E6E,0x3C3C3C
  ];
  // Stem-Spuren, die SetMaker Prep anlegt (z. B. "TOPS_IMSOLOST 132") – nie anfassen
  var STEM_RE = /^(BASS|KICK|TOPS|VOCALS|MELODY|SERUM|INST10|INST11|VOCALCHAIN|RISER|SPUR14)_.+ \d+$/;

  function col(i) { return { index: i, rgb: PALETTE[i] }; }
  function cat(id, label, lane, color, keywords, extra) {
    var c = { id: id, label: label, lane: lane, keywords: keywords, caseSensitive: false, color: col(color) };
    if (extra) for (var k in extra) c[k] = extra[k];
    return c;
  }
  function defaults() {
    return {
      version: 1,
      categories: [
        cat("kick", "Kick", "kick", 14, ["kick", "bd", "bassdrum", "kik"]),
        cat("snare", "Snare", "top", 18, ["snare", "clap", "rim", "rimshot", "sd", "snap"]),
        cat("hihat", "Hi-Hat", "top", 19, ["hihat", "hat", "hats", "hh", "oh", "ch"]),
        cat("tops", "Tops", "top", 61, ["tops", "top", "perc", "shaker", "ride", "crash", "cymbal", "conga", "bongo", "toms", "tom", "tamb", "cowbell"]),
        cat("bass", "Bass", "bass", 22, ["bass", "sub", "808", "reese"]),
        cat("vocalchop", "Vocal Chop", "vox", 25, ["chop", "vocal chop", "vox chop"]),
        cat("vocal", "Vocals", "vox", 26, ["vocal", "vocals", "vox", "voc", "acapella", "acappella", "voice", "chant", "adlib", "choir"]),
        cat("melody", "Melody", "melo", 17, ["melody", "melodie", "lead", "synth", "pluck", "pad", "chord", "chords", "piano", "keys", "arp", "guitar", "gitarre", "strings", "bell", "organ"]),
        cat("fx", "FX", "riser", 24, ["fx", "sfx", "riser", "uplifter", "downlifter", "sweep", "swoosh", "whoosh", "impact", "noise", "reverse"]),
        cat("serum", "Serum", "serum", 15, ["serum"], { midiOnly: true }),
        cat("drums", "Drums", "top", 1, ["drum", "drums", "loop", "break", "beat", "groove", "drum rack"], { fallback: true })
      ],
      rest: { label: "Rest", color: col(55) },
      sort: {
        rename: true, colorize: true, colorClips: false, numberSingle: false,
        pattern: "{name} {n}", keepCustomNames: false, renameRest: false, groups: true,
        sources: { trackName: true, clipNames: true, fileNames: true, devices: true }
      }
    };
  }
  // Fehlende Felder aus den Defaults ergänzen, unbekannte Keys (z. B. "cut") behalten
  function normalize(s) {
    var d = defaults();
    if (!s || typeof s !== "object") return d;
    if (!isArr(s.categories) || !s.categories.length) s.categories = d.categories;
    for (var i = 0; i < s.categories.length; i++) {
      var c = s.categories[i];
      if (!c.id) c.id = "cat" + i;
      if (!c.label) c.label = c.id;
      if (!isArr(c.keywords)) c.keywords = String(c.keywords || "").split(",");
      var kw = [];
      for (var k = 0; k < c.keywords.length; k++) { var w = String(c.keywords[k]).replace(/^\s+|\s+$/g, ""); if (w) kw.push(w); }
      c.keywords = kw;
      if (c.lane === undefined) c.lane = "";
      if (!c.color || typeof c.color.index !== "number") c.color = col(55);
      if (typeof c.color.rgb !== "number") c.color.rgb = PALETTE[c.color.index] || 0x7B7B7B;
    }
    if (!s.rest || !s.rest.color) s.rest = d.rest;
    if (!s.rest.label) s.rest.label = "Rest";
    if (!s.sort) s.sort = d.sort;
    for (var o in d.sort) if (s.sort[o] === undefined) s.sort[o] = d.sort[o];
    for (var q in d.sort.sources) if (s.sort.sources[q] === undefined) s.sort.sources[q] = d.sort.sources[q];
    s.version = 1;
    return s;
  }

  // ---------- Text-Matching ----------
  var SEP = /[\s_\-\.]+/g;
  var NOT_LETTER = "[^A-Za-zÄÖÜäöüß]";
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  // Ein Keyword -> Testfunktion. ≤3 Zeichen: ganzes Wort. Sonst Teilstring, Trennzeichen egal.
  function makeTest(word, caseSensitive) {
    var core = word.replace(SEP, "");
    if (!core) return null;
    if (core.length <= 3) {
      var re = new RegExp("(^|" + NOT_LETTER + ")" + escapeRe(word).replace(/[\s_\-]+/g, "[\\s_\\-.]*") + "(?=$|" + NOT_LETTER + ")", caseSensitive ? "" : "i");
      return function (text) { return re.test(text); };
    }
    var needle = caseSensitive ? core : core.toLowerCase();
    return function (text) {
      var t = text.replace(SEP, "");
      return (caseSensitive ? t : t.toLowerCase()).indexOf(needle) >= 0;
    };
  }
  function isDefaultName(name) {
    var s = String(name || "").replace(/^\s+|\s+$/g, "");
    return !s || /^\d+$/.test(s) || /^\d+[\s\-]*(audio|midi)(\s*\d+)?$/i.test(s) || /^(audio|midi)(\s*\d+)?$/i.test(s);
  }
  function baseName(path) {
    var b = String(path || "").split(/[\/:\\]/).pop();
    return b.replace(/\.[A-Za-z0-9]{2,5}$/, "");
  }
  // Ist der Name schon von uns vergeben (z. B. "Kick 2")? -> Kategorie-id oder null
  function ownName(name, s) {
    var pat = s.sort.pattern || "{name} {n}";
    for (var i = 0; i < s.categories.length; i++) {
      var c = s.categories[i];
      var re = new RegExp("^" + escapeRe(pat).replace("\\{name\\}", escapeRe(c.label)).replace("\\{n\\}", "\\d+") + "$");
      if (name === c.label || re.test(name)) return c.id;
    }
    var rp = new RegExp("^" + escapeRe(pat).replace("\\{name\\}", escapeRe(s.rest.label)).replace("\\{n\\}", "\\d+") + "$");
    if (name === s.rest.label || rp.test(name)) return "_rest";
    return null;
  }

  // ---------- Spuren aus Live lesen ----------
  function lget(a, p) { var v = a.get(p); return isArr(v) ? v.join(" ") : String(v); }
  function lnum(a, p) { return Number(lget(a, p)); }
  function lids(a, p) {
    var v = a.get(p), out = [];
    if (!isArr(v)) return out;
    for (var i = 0; i < v.length; i++) if (v[i] !== "id" && Number(v[i]) > 0) out.push(Number(v[i]));
    return out;
  }
  // Alle Spur-ids (ohne Returns/Master)
  function trackIds(LiveAPICtor) { return lids(new LiveAPICtor("live_set"), "tracks"); }
  // Eine Spur einlesen (so kann man in Häppchen lesen, ohne Live einzufrieren)
  function collectOne(LiveAPICtor, id, index, settings) {
    var src = (settings && settings.sort && settings.sort.sources) || defaults().sort.sources;
    function api(x) { return new LiveAPICtor("id " + x); }
    var a = api(id);
    var t = { id: id, index: index, name: lget(a, "name"), color: lnum(a, "color_index"),
      isGroup: lnum(a, "is_foldable") === 1, group: null, midi: lnum(a, "has_midi_input") === 1,
      clips: [], clipIds: [], files: [], devices: [] };
    function readClip(cid) {
      var c = api(cid);
      t.clips.push(lget(c, "name"));
      t.clipIds.push(cid);
      if (src.fileNames && lnum(c, "is_audio_clip") === 1) { var f = baseName(lget(c, "file_path")); if (f) t.files.push(f); }
    }
    if (lnum(a, "is_grouped") === 1) t.group = lids(a, "group_track")[0] || null;
    if (!t.isGroup && (src.clipNames || src.fileNames)) {
      var slots = lids(a, "clip_slots");
      for (var s = 0; s < slots.length; s++) {
        var sl = api(slots[s]);
        if (lnum(sl, "has_clip") === 1) { var cid = lids(sl, "clip")[0]; if (cid) readClip(cid); }
      }
      var arr = []; try { arr = lids(a, "arrangement_clips"); } catch (e) {}
      for (var c = 0; c < arr.length; c++) readClip(arr[c]);
    }
    if (src.devices) {
      var dv = lids(a, "devices");
      for (var d = 0; d < dv.length; d++) {
        var dev = api(dv[d]);
        if (lnum(dev, "type") === 1) t.devices.push(lget(dev, "name"));   // nur Instrumente
      }
    }
    return t;
  }
  // Alles auf einmal (blockiert Live kurz; für viele Spuren lieber trackIds + collectOne in Häppchen)
  function collectTracks(LiveAPICtor, settings) {
    var tIds = trackIds(LiveAPICtor), out = [];
    for (var i = 0; i < tIds.length; i++) out.push(collectOne(LiveAPICtor, tIds[i], i, settings));
    return out;
  }

  // ---------- Erkennung ----------
  // tracks: von collectTracks (oder gleich aufgebaut). overrides: {trackId: categoryId | "_rest" | "_skip"}
  function analyze(tracks, settings, overrides) {
    var s = normalize(settings), o = s.sort, src = o.sources;
    overrides = overrides || {};
    var cats = s.categories, byCat = {};
    for (var ci = 0; ci < cats.length; ci++) byCat[cats[ci].id] = cats[ci];

    // Keyword-Tests bauen
    var tests = [];
    for (var i = 0; i < cats.length; i++) {
      var list = [];
      for (var k = 0; k < cats[i].keywords.length; k++) {
        var fn = makeTest(cats[i].keywords[k], !!cats[i].caseSensitive);
        if (fn) list.push({ word: cats[i].keywords[k], fn: fn });
      }
      tests.push(list);
    }
    // Keywords, die in den Clipnamen fast aller Spuren vorkommen (Songtitel o. ä.), ignorieren
    var withClips = [], ignored = [];
    for (var t0 = 0; t0 < tracks.length; t0++) if (!tracks[t0].isGroup && tracks[t0].clips.length && !STEM_RE.test(tracks[t0].name)) withClips.push(tracks[t0]);
    if (withClips.length >= 4) {
      for (var a = 0; a < tests.length; a++) for (var b = 0; b < tests[a].length; b++) {
        var hit = 0;
        for (var w = 0; w < withClips.length; w++) {
          var all = withClips[w].clips.concat(withClips[w].files), any = false;
          for (var x = 0; x < all.length && !any; x++) if (tests[a][b].fn(all[x])) any = true;
          if (any) hit++;
        }
        if (hit / withClips.length >= 0.7) { tests[a][b].ignored = true; ignored.push(tests[a][b].word); }
      }
    }
    function matchWord(ci, text) {
      for (var q = 0; q < tests[ci].length; q++) if (!tests[ci][q].ignored && tests[ci][q].fn(text)) return tests[ci][q].word;
      return null;
    }
    function frac(ci, texts) {
      if (!texts.length) return { m: 0, word: null };
      var m = 0, word = null;
      for (var q = 0; q < texts.length; q++) { var hw = matchWord(ci, texts[q]); if (hw) { m++; word = word || hw; } }
      return { m: m, word: word };
    }

    function score(t, nameOnly) {
      var best = null, bestFb = null, total = 0, res = [];
      var nameUsable = src.trackName && !isDefaultName(t.name);
      var own = ownName(t.name, s);
      for (var c = 0; c < cats.length; c++) {
        var cc = cats[c];
        if (cc.midiOnly && !t.midi) continue;
        var sc = 0, why = [];
        if (own === cc.id) { sc += 3; why.push("Name schon vergeben"); }
        else if (nameUsable) { var nw = matchWord(c, t.name); if (nw) { sc += 3; why.push("Spurname: " + nw); } }
        if (!nameOnly) {
          if (src.clipNames) { var f1 = frac(c, t.clips); if (f1.m) { sc += 3 * f1.m / t.clips.length; why.push(f1.m + "/" + t.clips.length + " Clips: " + f1.word); } }
          if (src.fileNames) { var f2 = frac(c, t.files); if (f2.m) { sc += 2 * f2.m / t.files.length; why.push(f2.m + "/" + t.files.length + " Samples: " + f2.word); } }
          if (src.devices) { var f3 = frac(c, t.devices); if (f3.m) { sc += 2; why.push("Instrument: " + f3.word); } }
        }
        if (sc <= 0) continue;
        total += sc;
        var r = { cat: cc.id, score: sc, why: why };
        res.push(r);
        if (cc.fallback) { if (!bestFb || sc > bestFb.score) bestFb = r; }
        else if (!best || sc > best.score) best = r;
      }
      // Allgemeine Kategorie (z. B. Drums) nur, wenn nichts Genaueres passt oder sie klar überwiegt
      var pick = (best && !(bestFb && bestFb.score >= 2 * best.score)) ? best : (bestFb || best);
      if (!pick) return null;
      var share = pick.score / total;
      return { cat: pick.cat, score: pick.score, why: pick.why,
               conf: (share >= 0.7 && pick.score >= 1.5) ? "sicher" : "unsicher",
               alt: res.length > 1 ? res.sort(function (p, q) { return q.score - p.score; })[1].cat : null };
    }

    var rows = [], byId = {};
    for (var r = 0; r < tracks.length; r++) {
      var tr = tracks[r];
      var row = { id: tr.id, index: tr.index !== undefined ? tr.index : r, name: tr.name, color: tr.color, isGroup: !!tr.isGroup,
                  group: tr.group, depth: 0, cat: null, source: "", conf: "", why: [], alt: null };
      if (STEM_RE.test(tr.name)) { row.source = "stem"; }
      else {
        var sres = score(tr, tr.isGroup);
        if (sres) { row.cat = sres.cat; row.source = "auto"; row.conf = sres.conf; row.why = sres.why; row.alt = sres.alt; }
      }
      rows.push(row); byId[tr.id] = row;
    }
    for (var d = 0; d < rows.length; d++) { var p = rows[d], dep = 0; while (p.group && byId[p.group] && dep < 20) { p = byId[p.group]; dep++; } rows[d].depth = dep; }

    // Unbekannte Spur in einer erkannten Gruppe (z. B. Gruppe "Vocals") -> erbt die Kategorie
    for (var u = 0; u < rows.length; u++) {
      var ru = rows[u];
      if (ru.cat || ru.isGroup || ru.source === "stem") continue;
      var pg = ru.group ? byId[ru.group] : null;
      while (pg && !pg.cat) pg = pg.group ? byId[pg.group] : null;
      if (pg && pg.cat) { ru.cat = pg.cat; ru.source = "group"; ru.conf = "unsicher"; ru.why = ["Gruppe: " + pg.name]; }
    }
    // Overrides für normale Spuren
    for (var v = 0; v < rows.length; v++) applyOverride(rows[v]);
    function applyOverride(rw) {
      var ov = overrides[rw.id];
      if (ov === undefined) return;
      if (ov === "_skip") { rw.cat = null; rw.source = "skip"; rw.conf = ""; rw.why = ["Von Hand: unverändert"]; }
      else if (ov === "_rest") { rw.cat = null; rw.source = "manual"; rw.conf = ""; rw.why = ["Von Hand: Rest"]; }
      else if (byCat[ov]) { rw.cat = ov; rw.source = "manual"; rw.conf = ""; rw.why = ["Von Hand"]; }
    }
    // Gruppen: alle Spuren darin gleiche Kategorie -> Gruppe bekommt sie; gemischt -> Rest
    if (o.groups) {
      for (var gi = rows.length - 1; gi >= 0; gi--) {
        var gr = rows[gi];
        if (!gr.isGroup || gr.source === "stem" || overrides[gr.id] !== undefined) continue;
        var leafCats = {}, nLeaf = 0, nKnown = 0, inherited = 0;
        for (var li = 0; li < rows.length; li++) {
          var lr = rows[li]; if (lr.isGroup || lr.source === "stem") continue;
          var anc = lr.group ? byId[lr.group] : null, inside = false;
          while (anc) { if (anc === gr) { inside = true; break; } anc = anc.group ? byId[anc.group] : null; }
          if (!inside) continue;
          nLeaf++;
          if (lr.cat) { nKnown++; leafCats[lr.cat] = 1; if (lr.source === "group") inherited++; }
        }
        var keys = []; for (var kc in leafCats) keys.push(kc);
        if (nLeaf && nKnown === nLeaf && keys.length === 1) {
          if (gr.cat !== keys[0]) { gr.cat = keys[0]; gr.source = "auto"; gr.conf = "sicher"; gr.why = ["Alle " + nLeaf + " Spuren in der Gruppe: " + byCat[keys[0]].label]; }
        } else if (nKnown > inherited) {
          gr.cat = null; gr.source = "auto"; gr.conf = ""; gr.why = ["Gemischte Gruppe"];
        }
      }
    }

    // Neue Namen + Farben
    var count = {}, groupCount = {}, seen = {}, groupSeen = {};
    for (var e = 0; e < rows.length; e++) {
      var rr = rows[e]; if (rr.source === "stem" || rr.source === "skip") continue;
      var key = rr.cat || "_rest";
      if (rr.isGroup) groupCount[key] = (groupCount[key] || 0) + 1; else count[key] = (count[key] || 0) + 1;
    }
    for (var f = 0; f < rows.length; f++) {
      var row2 = rows[f];
      row2.newName = row2.name; row2.newColor = row2.color; row2.lane = "";
      if (row2.source === "stem" || row2.source === "skip") continue;
      var c2 = row2.cat ? byCat[row2.cat] : null, key2 = row2.cat || "_rest";
      row2.lane = c2 ? (c2.lane || "") : "";
      if (o.colorize) row2.newColor = c2 ? c2.color.index : s.rest.color.index;
      var label = c2 ? c2.label : s.rest.label;
      var doRename = o.rename && (c2 || o.renameRest);
      if (doRename && o.keepCustomNames && !isDefaultName(row2.name) && !ownName(row2.name, s)) doRename = false;
      if (doRename) {
        var nr, total2;
        if (row2.isGroup) { nr = groupSeen[key2] = (groupSeen[key2] || 0) + 1; total2 = groupCount[key2]; }
        else { nr = seen[key2] = (seen[key2] || 0) + 1; total2 = count[key2]; }
        row2.newName = (total2 > 1 || o.numberSingle) ? (o.pattern || "{name} {n}").replace("{name}", label).replace("{n}", nr) : label;
      }
    }
    return { rows: rows, ignored: ignored };
  }

  // Für Prep: Vorauswahl je Spalte. Kinder fallen weg, wenn ihre Gruppe schon dieselbe Spalte hat.
  function preselect(plan) {
    var byId = {}, out = {};
    for (var i = 0; i < plan.rows.length; i++) byId[plan.rows[i].id] = plan.rows[i];
    for (var j = 0; j < plan.rows.length; j++) {
      var r = plan.rows[j];
      if (!r.lane) continue;
      var p = r.group ? byId[r.group] : null, covered = false;
      while (p) { if (p.lane === r.lane) { covered = true; break; } p = p.group ? byId[p.group] : null; }
      if (covered) continue;
      (out[r.lane] = out[r.lane] || []).push(r.id);
    }
    return out;
  }

  return { LANES: LANES, PALETTE: PALETTE, STEM_RE: STEM_RE, defaults: defaults, normalize: normalize,
           isDefaultName: isDefaultName, collectTracks: collectTracks, trackIds: trackIds, collectOne: collectOne, analyze: analyze, preselect: preselect,
           FILE: "setmaker_settings.json" };
})();
if (typeof exports !== "undefined") { for (var smk in SM) exports[smk] = SM[smk]; }
// ==== END setmaker_shared ====
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
var STEM_RE = SM.STEM_RE;
var settings = null;
var cfg = { colors: {}, cut: null, rest: null }; // für die UI: Farbe pro Spalte
var job = null;                        // laufende Aufnahme
var task = null;

// ---------- Hilfen ----------
function say(kind, obj){ outlet(0, kind, encodeURIComponent(JSON.stringify(obj))); }
var lastStatus = "";
function status(s){ lastStatus = s; post("prepn: " + s + "\n"); say("status", { text: s }); }
function g(api, prop){ var v = api.get(prop); return (v instanceof Array) ? v.join(" ") : String(v); }
function n(api, prop){ return Number(g(api, prop)); }
function ids(api, prop){
  var v = api.get(prop), out = [];
  if (!(v instanceof Array)) return out;
  for (var i = 0; i < v.length; i++) if (v[i] !== "id" && Number(v[i]) > 0) out.push(Number(v[i]));
  return out;
}
function byId(id){ return new LiveAPI("id " + id); }
function parseDict(v, key){
  if (v instanceof Array) v = v.join(" ");
  try { var o = JSON.parse(v); return (key && o[key] !== undefined) ? o[key] : o; } catch (e) { return null; }
}
function dictProp(api, prop){ return parseDict(api.get(prop), prop); }
function laneById(id){ for (var i = 0; i < LANES.length; i++) if (LANES[i].id === id) return LANES[i]; return null; }
function isGrey(rgb){ var r = (rgb >> 16) & 255, gg = (rgb >> 8) & 255, b = rgb & 255; return Math.abs(r - gg) < 12 && Math.abs(gg - b) < 12 && Math.abs(r - b) < 12; }

// ---------- Einstellungen (Farben) neben dem Device speichern ----------
function deviceDir(){
  var fp = this.patcher ? this.patcher.filepath : "";
  if (!fp) return "";
  return fp.substring(0, fp.lastIndexOf("/") + 1);
}
var DIR = "";
// Prep ist eigenständig: eigene Einstellungen im eigenen Ordner, nicht mit Sort geteilt
var CFG_FILE = "prepn_settings.json", OLD_CFG_FILE = "setmaker_prep_settings.json", oldCfgNoted = false; // alter Name bis v0.7.2
function cfgPath(){ return DIR + CFG_FILE; }
function readText(path){
  var f = new File(path, "read", "TEXT"); if (!f.isopen) return null;
  var s = "", line; while ((line = f.readline(32767)) !== null && line !== undefined) { s += line + "\n"; if (f.position >= f.eof) break; }
  f.close(); return s;
}
function writeText(path, s){
  var f = new File(path, "write", "TEXT"); if (!f.isopen) return false;
  f.position = 0;
  for (var i = 0; i < s.length; i += 16000) f.writestring(s.substring(i, i + 16000));
  f.eof = f.position; f.close(); return true;
}
function loadCfg(){
  var raw = readText(cfgPath()), parsed = null, oldRaw = readText(DIR + OLD_CFG_FILE);
  if (raw){ try { parsed = JSON.parse(raw); } catch (e) {} }
  // Umzug: alte Einstellungsdatei einmal in die neue übernehmen (die alte bleibt liegen, Max kann nicht löschen)
  if (!parsed && oldRaw){
    try { parsed = JSON.parse(oldRaw); } catch (e) {}
    if (parsed) writeText(cfgPath(), JSON.stringify(SM.normalize(parsed), null, 1));
  }
  if (oldRaw && parsed && !oldCfgNoted){ oldCfgNoted = true; status("Einstellungen aus " + OLD_CFG_FILE + " übernommen. Die alte Datei kannst du im Finder löschen."); }
  settings = SM.normalize(parsed);
  if (!parsed){ // Defaults einmal anlegen: eine Farbe pro Spalte
    var first = {};
    for (var i = 0; i < settings.categories.length; i++){
      var c = settings.categories[i];
      if (!first[c.lane]) first[c.lane] = c.color; else c.color = first[c.lane];
    }
    settings.cut = { index: 41, rgb: SM.PALETTE[41] };
    writeText(cfgPath(), JSON.stringify(settings, null, 1));
  }
  deriveCfg();
}
function saveCfg(){ writeText(cfgPath(), JSON.stringify(settings, null, 1)); deriveCfg(); }
function deriveCfg(){
  cfg = { colors: {}, cut: settings.cut || null, rest: settings.rest ? settings.rest.color : null };
  for (var i = 0; i < settings.categories.length; i++){
    var c = settings.categories[i];
    if (c.color && !cfg.colors[c.lane]) cfg.colors[c.lane] = c.color;
  }
}
function laneOfColor(index){
  for (var i = 0; i < settings.categories.length; i++){
    var c = settings.categories[i], col = c.color || cfg.colors[c.lane];
    if (col && col.index === index) return c.lane;
  }
  return null;
}
function catColor(c){ return c.color || cfg.colors[c.lane] || null; }

// ---------- Start ----------
function init(){
  if (this.patcher) PATCH = this.patcher;
  DIR = deviceDir.call(this);
  if (DIR){
    var posix = DIR.indexOf(":/") >= 0 ? DIR.substring(DIR.indexOf(":/") + 1) : DIR;
    outlet(0, "url", "file://" + encodeURI(posix) + "prepn.html");
  }
  loadCfg();
  watch(); // liest gleich einmal ein, danach nur noch bei Änderungen
}
function bang(){ init.call(this); }

// ---------- Beobachter statt Abfragen ----------
// Kein Timer im Leerlauf: Live meldet selbst, wenn Spuren dazukommen/wegfallen oder Farbe/Name ändern.
// Viele Meldungen kurz hintereinander (z. B. sortn färbt 50 Spuren) werden zu EINEM Neu-Einlesen zusammengefasst.
var songObs = null, trackObs = {}, refreshTask = null, refreshDue = 0, lastStateJson = "", rewatchTask = null;
function watch(){
  if (!rewatchTask) rewatchTask = new Task(rewatch);
  if (!songObs){
    songObs = new LiveAPI(onTracks, "live_set");
    songObs.property = "tracks";
  }
  rewatch();
}
// Aus dem Callback nichts direkt tun, sondern kurz verschieben (Live mag keine API-Arbeit im Callback)
function onTracks(){ rewatchTask.cancel(); rewatchTask.schedule(50); }
function rewatch(){
  var now = ids(new LiveAPI("live_set"), "tracks"), keep = {};
  for (var i = 0; i < now.length; i++){
    var id = now[i]; keep[id] = 1;
    if (trackObs[id]) continue;
    var c = new LiveAPI(onTrackChange, "id " + id); c.property = "color_index";
    var nm = new LiveAPI(onTrackChange, "id " + id); nm.property = "name";
    trackObs[id] = [c, nm];
  }
  for (var k in trackObs) if (!keep[k]){ trackObs[k][0].property = ""; trackObs[k][1].property = ""; delete trackObs[k]; }
  laterRefresh();
}
function onTrackChange(){ laterRefresh(); }
function laterRefresh(){
  if (!refreshTask) refreshTask = new Task(function (){ refreshDue = 0; if (job) return; if (busy){ laterRefresh(); return; } refresh(); });
  var t = new Date().getTime();
  if (!refreshDue) refreshDue = t + 1000;          // spätestens nach 1 s, auch bei Dauer-Änderungen
  refreshTask.cancel();
  refreshTask.schedule(Math.max(0, Math.min(250, refreshDue - t)));
}
// UI meldet sich (neu geladen / Fenster geöffnet): letzten Stand schicken, ohne Live neu einzulesen
function hello(){
  if (lastStateJson) outlet(0, "state", lastStateJson); else refresh();
  if (lastStatus) say("status", { text: lastStatus }); // z. B. Hinweis aus dem Start, bevor die Seite geladen war
}

// ---------- Spuren nach Farbe einsortieren ----------
function scan(){
  var song = new LiveAPI("live_set");
  var tIds = ids(song, "tracks"), tracks = [];
  for (var i = 0; i < tIds.length; i++){
    var t = byId(tIds[i]);
    tracks.push({ id: tIds[i], api: t, name: g(t, "name"), color: n(t, "color_index"),
      midi: n(t, "has_midi_input") === 1, group: n(t, "is_grouped") ? ids(t, "group_track")[0] : null });
  }
  var byIdMap = {}; for (var k = 0; k < tracks.length; k++) byIdMap[tracks[k].id] = tracks[k];
  var res = { lanes: {}, stems: {} };
  for (var j = 0; j < tracks.length; j++){
    var tr = tracks[j];
    if (STEM_RE.test(tr.name)){ res.stems[tr.name.split("_")[0]] = tr; continue; }
    var laneId = laneOfColor(tr.color);
    if (!laneId) continue;
    // Wenn die Gruppe schon zur selben Spalte gehört, kommt der Ton über die Gruppe
    var parent = tr.group ? byIdMap[tr.group] : null;
    if (parent && laneOfColor(parent.color) === laneId) continue;
    (res.lanes[laneId] = res.lanes[laneId] || []).push(tr);
  }
  return res;
}

function refresh(){
  var s = scan(), song = new LiveAPI("live_set");
  var counts = {}, names = {};
  for (var l = 0; l < LANES.length; l++){
    var arr = s.lanes[LANES[l].id] || [];
    counts[LANES[l].id] = arr.length;
    names[LANES[l].id] = arr.map(function (t) { return t.name; });
  }
  var stems = []; for (var k in s.stems) stems.push(k);
  var enc = encodeURIComponent(JSON.stringify({ version: VERSION, cfg: cfg, counts: counts, names: names, stems: stems,
                 tempo: n(song, "tempo"), setName: g(song, "name"), recording: !!job }));
  if (enc === lastStateJson) return;               // nichts geändert -> UI nicht neu zeichnen
  lastStateJson = enc;
  outlet(0, "state", enc);
}

// ---------- Farbe lernen: aus ausgewählter Spur (Spalten) bzw. ausgewähltem Clip (Schnitt) ----------
function learn(laneId){
  loadCfg();
  if (laneId === "cut"){
    var clip = new LiveAPI("live_set view detail_clip");
    if (!clip.id || Number(clip.id) === 0){ status("Erst einen grau gefärbten Clip anklicken."); return; }
    settings.cut = { index: n(clip, "color_index"), rgb: n(clip, "color") };
  } else {
    var t = new LiveAPI("live_set view selected_track");
    if (!t.id || Number(t.id) === 0){ status("Erst eine Spur anklicken."); return; }
    var col = { index: n(t, "color_index"), rgb: n(t, "color") };
    if (laneId === "rest") settings.rest = { label: "Rest", color: col };
    else {
      applyLaneColor(laneId, col);
    }
  }
  saveCfg(); refresh();
}
// Farbe aus der Palette wählen (Index 0..69 wie in Ableton)
function setcolor(laneId, index){
  loadCfg();
  var col = { index: Number(index), rgb: SM.PALETTE[Number(index)] };
  if (laneId === "cut") settings.cut = col;
  else if (laneId === "rest") settings.rest = { label: "Rest", color: col };
  else applyLaneColor(laneId, col);
  saveCfg(); refresh();
}
// Eine Farbe pro Spalte: gilt für alle Kategorien dieser Spalte (Kick, Hi-Hat, Snare … -> Tops)
function applyLaneColor(laneId, col){
  var found = false;
  for (var i = 0; i < settings.categories.length; i++)
    if (settings.categories[i].lane === laneId){ settings.categories[i].color = col; found = true; }
  if (!found) settings.categories.push({ id: laneId, label: laneId, lane: laneId, keywords: [], color: col });
}
function hasLaneCat(laneId){ for (var i = 0; i < settings.categories.length; i++) if (settings.categories[i].lane === laneId) return true; return false; }
function forget(laneId){
  loadCfg();
  if (laneId === "cut") settings.cut = null;
  else if (laneId === "rest") settings.rest = null;
  else for (var i = 0; i < settings.categories.length; i++) if (settings.categories[i].lane === laneId) delete settings.categories[i].color;
  saveCfg(); refresh();
}

// ---------- In Häppchen arbeiten, damit Ableton nicht einfriert ----------
// fn(item, i) wird so oft aufgerufen, wie in ~12 ms passt, dann gibt das Device Live wieder frei.
var busy = false, worker = null, lastPct = -1;
// Großes Overlay in der UI: zeigt deutlich, dass gearbeitet wird (Ableton darf dabei ruckeln)
// ---------- Native Anzeige während der Aufnahme ----------
// Die Web-Oberfläche (jweb) wird während der Aufnahme schwarz, sobald Live Spuren anlegt und aufnimmt.
// Deshalb wird sie dann ausgeblendet und eine einfache Max-Anzeige (Text) eingeblendet, im Gerät und im Schwebefenster.
var PATCH = null, NAT = ["natbg", "natT", "natP", "natB", "natS"];
function natPatchers(){
  var list = [];
  if (!PATCH) return list;
  list.push(PATCH);
  try { var ui = PATCH.getnamed("ui"); if (ui && ui.subpatcher()) list.push(ui.subpatcher()); } catch (e) {}
  return list;
}
function nat(on, title, sub){
  var ps = natPatchers();
  for (var i = 0; i < ps.length; i++){
    try {
      var web = ps[i].getnamed("web"); if (web) web.hidden = on ? 1 : 0;
      for (var k = 0; k < NAT.length; k++){ var o = ps[i].getnamed(NAT[k]); if (o) o.hidden = on ? 0 : 1; }
      if (on){
        var t = ps[i].getnamed("natT"); if (t && title) t.message("set", title);
        var s2 = ps[i].getnamed("natS"); if (s2 && sub) s2.message("set", sub);
      }
    } catch (e) {}
  }
  if (on) natPct(0);
}
function natPct(pct){
  var full = Math.round(pct / 4), bar = "";
  for (var b = 0; b < 25; b++) bar += b < full ? "\u2588" : "\u2591";
  var ps = natPatchers();
  for (var i = 0; i < ps.length; i++){
    try {
      var p = ps[i].getnamed("natP"); if (p) p.message("set", pct + " %");
      var bb = ps[i].getnamed("natB"); if (bb) bb.message("set", bar);
    } catch (e) {}
  }
}

// ---------- Main stumm + Ansicht festhalten ----------
// Aufgenommen wird hinter dem Mixer der Quellspuren, also VOR dem Main. Main-Lautstärke auf -inf
// macht die Aufnahme still, ohne die Stems leiser zu machen. Danach wird der alte Wert zurückgesetzt.
function masterVol(){ return new LiveAPI("live_set master_track mixer_device volume"); }
function muteMain(){
  var v = masterVol(); if (!Number(v.id)) return null;
  var before = n(v, "value");
  v.set("value", 0);
  return before;
}
function unmuteMain(before){
  if (before === null || before === undefined || isNaN(before)) return;
  var v = masterVol(); if (Number(v.id)) v.set("value", before);
}
function showDevice(){
  // Live springt beim Anlegen auf die neue Spur. Zurück zur Spur, auf der prepn liegt.
  try {
    var me = new LiveAPI("this_device canonical_parent");
    if (Number(me.id)) new LiveAPI("live_set view").set("selected_track", "id", Number(me.id));
    new LiveAPI("live_app view").call("show_view", "Detail/DeviceChain");
  } catch (e) {}
}

function overlay(on, title, sub){ say("overlay", { on: on ? 1 : 0, title: title || "", sub: sub || "" }); }
function work(items, fn, label, done){
  busy = true; lastPct = -1;
  overlay(true, label, "Kurz warten, Ableton kann dabei ruckeln.");
  var i = 0;
  worker = new Task(function (){
    var start = new Date().getTime();
    try {
      while (i < items.length && new Date().getTime() - start < 12){ fn(items[i], i); i++; }
    } catch (e) { busy = false; worker = null; overlay(false); say("progress", { pct: 0 }); status("Fehler: " + e); return; }
    var pct = items.length ? Math.round(100 * i / items.length) : 100;
    if (pct !== lastPct){ lastPct = pct; say("progress", { pct: pct }); say("status", { text: label + " " + i + "/" + items.length + " …" }); }
    if (i < items.length) worker.schedule(8);
    else { busy = false; worker = null; overlay(false); say("progress", { pct: 0 }); done(); }
  });
  worker.schedule(0);
}
function isBusy(){ if (busy || job){ status(job ? "Aufnahme läuft schon." : "Bin noch beschäftigt, kurz warten."); return true; } return false; }

// ---------- Auto: Spuren per Keywords erkennen und einfärben (Vorauswahl zum Prüfen) ----------
var lastAuto = [];
function auto(){
  if (isBusy()) return;
  loadCfg();
  var tIds = SM.trackIds(LiveAPI), tracks = [];
  work(tIds, function (id, i){ tracks.push(SM.collectOne(LiveAPI, id, i, settings)); }, "Lese Spuren", function (){
    var plan = SM.analyze(tracks, settings, {});
    var byCat = {}; for (var c = 0; c < settings.categories.length; c++) byCat[settings.categories[c].id] = settings.categories[c];
    var byTrack = {}; for (var k = 0; k < tracks.length; k++) byTrack[tracks[k].id] = tracks[k];
    var counts = {}, rest = 0, unsure = [], todo = [];
    for (var i = 0; i < plan.rows.length; i++){
      var r = plan.rows[i];
      if (r.source === "stem" || r.source === "skip") continue;
      var tr = byTrack[r.id];
      if (!r.isGroup && tr && !tr.clipIds.length) continue; // leere Spuren nicht anfassen
      var cat = r.cat ? byCat[r.cat] : null;
      var col = cat ? cat.color : (settings.rest ? settings.rest.color : null);
      if (!col) continue;
      todo.push({ id: r.id, from: tr ? tr.color : -1, to: col.index });
      if (r.isGroup) continue;
      if (cat){ counts[cat.label] = (counts[cat.label] || 0) + 1; if (r.conf === "unsicher") unsure.push(r.name); }
      else rest++;
    }
    lastAuto = [];
    work(todo, function (t){
      lastAuto.push({ id: t.id, index: t.from });
      if (t.from !== t.to) byId(t.id).set("color_index", t.to);
    }, "Färbe Spuren", function (){
      var parts = []; for (var m in counts) parts.push(m + " " + counts[m]);
      status("Auto: " + (parts.join(", ") || "nichts erkannt") + (rest ? ", Rest " + rest : "") +
             (unsure.length ? ". Unsicher: " + unsure.join(", ") : "") + ". Bitte prüfen, dann Rendern.");
      refresh();
    });
  });
}
function autoundo(){
  if (isBusy()) return;
  var list = lastAuto; lastAuto = [];
  work(list, function (u){ if (u.index >= 0){ var t = byId(u.id); if (Number(t.id)) t.set("color_index", u.index); } }, "Färbe zurück", function (){
    status("Auto rückgängig: " + list.length + " Spuren zurückgefärbt."); refresh();
  });
}

// ---------- Rendern = Echtzeit-Aufnahme auf Stem-Spuren ----------
function render(songNameEnc){
  if (isBusy()) return;
  var songName = decodeURIComponent(songNameEnc || "SONG").toUpperCase();
  var s = scan();
  var plan = [], srcs = [], endTime = 0, startTime = -1;
  for (var l = 0; l < LANES.length; l++){
    var lane = LANES[l], src = s.lanes[lane.id];
    if (lane.midi || !src || !src.length) continue;
    if (s.stems[lane.short]){ status("Stem-Spur " + lane.short + " gibt es schon. Bitte erst löschen."); return; }
    plan.push({ lane: lane, src: src });
    for (var i = 0; i < src.length; i++) srcs.push(src[i]);
  }
  if (!plan.length){ status("Keine eingefärbten Spuren gefunden. Erst Farben lernen."); return; }
  // Song-Ende suchen: Clips Spur für Spur in Häppchen lesen (Spuren mit Hunderten Clips frieren sonst Live ein)
  work(srcs, function (tr){
    var cl = ids(tr.api, "arrangement_clips");
    for (var c = 0; c < cl.length; c++){
      var cc = byId(cl[c]), st0 = n(cc, "start_time");
      endTime = Math.max(endTime, n(cc, "end_time"));
      if (startTime < 0 || st0 < startTime) startTime = st0;
    }
  }, "Suche Song-Ende", function (){
    if (!endTime){ status("Keine Clips im Arrangement gefunden."); return; }
    startRecording(plan, songName, endTime, Math.max(0, startTime), 1, null);
  });
}
// Aufnahme-Kette pro Stem:
//  - eine Quellspur:   Stem "Audio From" = diese Spur (Post Mixer)
//  - mehrere Quellen:  Quellen "Audio To" = Hilfs-Bus, Stem "Audio From" = Bus (Post Mixer)
// Stem: scharf, Monitor Aus (sonst doppelt laut). Bus-Spuren werden danach gelöscht.
var NO_INPUT = ["No Input", "Kein Eingang"];
var POST_MIXER = ["Post Mixer"];
function newAudioTrack(song, name, colorIndex){
  song.call("create_audio_track", -1);
  var all = ids(song, "tracks"), t = byId(all[all.length - 1]);
  t.set("name", name);
  if (colorIndex !== undefined && colorIndex !== null) t.set("color_index", colorIndex);
  return t;
}
function trackIndex(id){
  var all = ids(new LiveAPI("live_set"), "tracks");
  for (var i = 0; i < all.length; i++) if (Number(all[i]) === Number(id)) return i;
  return -1;
}
function deleteTrack(id){
  var i = trackIndex(id);
  if (i >= 0) try { new LiveAPI("live_set").call("delete_track", i); } catch (e) {}
}
// Live zeigt Spuren in der Routing-Liste je nach Version als "Name" oder "3-Name".
// Erst exakt "<Nummer>-<Name>" suchen (eindeutig, auch bei doppelten Namen), dann "Name".
function setRoutingToTrack(api, prop, availProp, trackId, trackName){
  var avail = dictProp(api, availProp) || [], nr = trackIndex(trackId) + 1;
  var tries = [function (d){ return d === nr + "-" + trackName; },
               function (d){ return d === trackName; },
               function (d){ return d.replace(/^\d+-/, "") === trackName; }];
  for (var t = 0; t < tries.length; t++)
    for (var a = 0; a < avail.length; a++)
      if (tries[t](String(avail[a].display_name))) return setRoutingById(api, avail[a].identifier, prop);
  return false;
}
function setInputFromTrack(st, trackId, trackName){
  if (!setRoutingToTrack(st, "input_routing_type", "available_input_routing_types", trackId, trackName)) return false;
  setRoutingByName(st, "input_routing_channel", "available_input_routing_channels", POST_MIXER); // sonst Live-Standard
  return true;
}
function cleanupJob(j){
  for (var i = 0; i < j.rerouted.length; i++){ var r = j.rerouted[i]; setRoutingById(byId(r.id), r.identifier); }
  for (var b = j.buses.length - 1; b >= 0; b--) deleteTrack(j.buses[b]);
  for (var k = 0; k < j.stems.length; k++){
    var st = byId(j.stems[k].id);
    if (!Number(st.id)) continue;
    st.set("arm", 0);
    setRoutingByName(st, "input_routing_type", "available_input_routing_types", NO_INPUT);
  }
}
function startRecording(plan, songName, endTime, startTime, attempt, mainBefore){
  var song = new LiveAPI("live_set");
  var tempo = Math.round(n(song, "tempo"));
  var fails = [];

  if (attempt === 1){
    nat(true, "● STEMS WERDEN AUFGENOMMEN", "Nichts anfassen, einfach laufen lassen. Main ist solange stumm. Stopp = abbrechen.");
    mainBefore = muteMain();
  }
  job = { stems: [], buses: [], rerouted: [], endTime: endTime + 4, startTime: startTime, started: false, checked: false,
          plan: plan, songName: songName, attempt: attempt, mainBefore: mainBefore };
  for (var p = 0; p < plan.length; p++){
    var lane = plan[p].lane, src = plan[p].src;
    var stemName = lane.short + "_" + songName + " " + tempo;
    var col = cfg.colors[lane.id] ? cfg.colors[lane.id].index : null;
    var st = newAudioTrack(song, stemName, col);
    job.stems.push({ id: st.id, name: stemName });
    var feedName, feedId;
    if (src.length === 1){
      feedName = src[0].name; feedId = src[0].api.id;
    } else {
      feedName = "SETMAKER BUS " + lane.short;
      var bus = newAudioTrack(song, feedName, col);
      job.buses.push(bus.id); feedId = bus.id;
      bus.set("current_monitoring_state", 0); // In: Bus spielt, was reinkommt
      for (var q = 0; q < src.length; q++){
        var sa = src[q].api, before = dictProp(sa, "output_routing_type");
        if (before) job.rerouted.push({ id: sa.id, identifier: before.identifier });
        if (!setRoutingToTrack(sa, "output_routing_type", "available_output_routing_types", bus.id, feedName))
          fails.push(src[q].name + " → Bus");
      }
    }
    if (!setInputFromTrack(st, feedId, feedName)) fails.push(stemName + ": Eingang „" + feedName + "“ nicht wählbar");
    st.set("current_monitoring_state", 2); // Aus: Stem nimmt nur auf, klingt nicht doppelt
    st.set("arm", 1);
    if (n(st, "arm") !== 1) fails.push(stemName + ": lässt sich nicht scharf schalten");
  }
  if (fails.length){
    var j = job; job = null;
    cleanupJob(j);
    for (var d = j.stems.length - 1; d >= 0; d--) deleteTrack(j.stems[d].id);
    nat(false); unmuteMain(j.mainBefore); showDevice();
    status("Aufnahme nicht gestartet: " + fails.join("; ") + ". Nichts wurde verändert.");
    refresh();
    return;
  }
  song.set("loop", 0);
  song.set("arrangement_overdub", 0);
  song.set("record_mode", 0);
  song.call("stop_playing");
  // Live startet sonst ab dem Einfüge-Marker (z. B. Takt 19). Deshalb: Wiedergabe starten, im selben Moment
  // auf den Anfang springen und erst dann Aufnahme an. tick() prüft, ob es wirklich vorne losging.
  if (attempt === 1){
    song.call("start_playing");
    song.set("current_song_time", 0);
    song.set("record_mode", 1);
  } else {
    song.call("stop_playing"); // zweimal Stopp = zurück zum Anfang
    song.set("current_song_time", 0);
    song.set("record_mode", 1);
    song.call("continue_playing");
  }
  showDevice();
  task = new Task(tick); task.interval = 200; task.repeat(); // nur während der Aufnahme, finish() stoppt ihn
  status("Aufnahme läuft … nicht anfassen.");
  overlay(true, "● STEMS WERDEN AUFGENOMMEN", "Nichts anfassen, einfach laufen lassen. Stopp = abbrechen.");
}

function tick(){
  if (!job) return;
  var song = new LiveAPI("live_set");
  var t = n(song, "current_song_time"), playing = n(song, "is_playing");
  if (playing) job.started = true;
  if (playing && !job.checked){
    job.checked = true;
    if (t > Math.min(job.startTime, 0) + 2){ wrongStart(t); return; } // nach 0,2 s darf es höchstens ~1 Schlag weit sein
  }
  var pct = Math.min(100, Math.round(100 * t / job.endTime));
  if (pct !== job.pct){ job.pct = pct; say("progress", { pct: pct }); natPct(pct); } // nur bei Änderung an die UI
  if (job.started && (!playing || t >= job.endTime)) finish(!playing && t < job.endTime);
}

// Start lag nicht am Anfang: alles zurückbauen und einmal mit der anderen Start-Methode neu versuchen.
function wrongStart(t){
  if (task){ task.cancel(); task = null; }
  var song = new LiveAPI("live_set");
  song.set("record_mode", 0);
  song.call("stop_playing");
  var j = job; job = null;
  cleanupJob(j);
  for (var d = j.stems.length - 1; d >= 0; d--) deleteTrack(j.stems[d].id);
  if (j.attempt < 2){ startRecording(j.plan, j.songName, j.endTime - 4, j.startTime, j.attempt + 1, j.mainBefore); return; }
  nat(false); unmuteMain(j.mainBefore); showDevice();
  status("Aufnahme abgebrochen: Live startete nicht am Anfang (bei Schlag " + Math.round(t) + "). Bitte einmal Stopp doppelt drücken und neu rendern.");
  refresh();
}

function finish(aborted){
  if (task){ task.cancel(); task = null; }
  overlay(false);
  var song = new LiveAPI("live_set");
  song.set("record_mode", 0);
  song.call("stop_playing");
  var j = job; job = null;
  cleanupJob(j);
  nat(false); unmuteMain(j.mainBefore);
  // Nur melden, was wirklich aufgenommen wurde. Leere Stem-Spuren wieder löschen.
  var ok = [], empty = [], late = [];
  for (var k = 0; k < j.stems.length; k++){
    var st = byId(j.stems[k].id);
    var rec = ids(st, "arrangement_clips");
    if (rec.length){
      st.set("mute", 1); ok.push(j.stems[k].name.split("_")[0]);
      var first = -1;
      for (var r = 0; r < rec.length; r++){ var rs = n(byId(rec[r]), "start_time"); if (first < 0 || rs < first) first = rs; }
      if (first > j.startTime + 0.25) late.push(j.stems[k].name.split("_")[0] + " ab Takt " + (Math.floor(first / 4) + 1));
    }
    else { empty.push(j.stems[k].name.split("_")[0]); deleteTrack(j.stems[k].id); }
  }
  var msg;
  if (!ok.length) msg = "Es wurde nichts aufgenommen. Leere Stem-Spuren wieder gelöscht. Prüfe: Aufnahme in den Live-Einstellungen erlaubt, Quellspuren nicht stumm.";
  else {
    msg = (aborted ? "Abgebrochen. " : "") + ok.length + " Full-Stems liegen unten (stumm): " + ok.join(", ") + ".";
    if (empty.length) msg += " Ohne Aufnahme (gelöscht): " + empty.join(", ") + ".";
    if (late.length) msg += " ACHTUNG, Anfang fehlt: " + late.join(", ") + ".";
    msg += aborted ? " Stem-Spuren löschen und neu rendern." : " Jetzt in den Stem-Spuren Passagen markieren und 0 drücken, dann „Paket“.";
  }
  showDevice();
  status(msg);
  refresh();
}

function setRoutingByName(api, prop, availProp, names){
  var avail = dictProp(api, availProp) || [];
  for (var a = 0; a < avail.length; a++)
    for (var k = 0; k < names.length; k++)
      if (avail[a].display_name === names[k]) return setRoutingById(api, avail[a].identifier, prop);
  return false;
}
function setRoutingById(api, identifier, prop){
  prop = prop || "output_routing_type";
  try { api.set(prop, { identifier: identifier }); } catch (e) {}
  var now = dictProp(api, prop);
  if (!now || now.identifier !== identifier){
    try { api.set(prop, JSON.stringify({ identifier: identifier })); } catch (e2) {}
    now = dictProp(api, prop);
  }
  return !!now && now.identifier === identifier;
}

// ---------- Paket schreiben ----------
function isCutClip(clip){
  // Markiert = deaktiviert (Bereich im Arrangement wählen, Taste 0: Live schneidet und deaktiviert das Stück).
  // Alte Markierung per Grau/Schnitt-Farbe geht weiter.
  return n(clip, "muted") === 1 || (cfg.cut && n(clip, "color_index") === cfg.cut.index) || isGrey(n(clip, "color"));
}
function pkg(songNameEnc){
  if (isBusy()) return;
  var songName = decodeURIComponent(songNameEnc || "SONG").toUpperCase();
  var song = new LiveAPI("live_set"), s = scan();
  var setPath = g(song, "file_path");
  if (!setPath){ status("Live-Set erst speichern, dann „Paket“."); return; }
  var out = { format: "setmaker-song", version: 2, song: songName, tempo: n(song, "tempo"),
              sourceSet: setPath, lanes: [] };
  // Erst nur die Clip-ids sammeln (billig), die Clips selbst dann in Häppchen lesen
  var items = [];
  for (var l = 0; l < LANES.length; l++){
    var lane = LANES[l];
    if (lane.midi){
      var midiTracks = s.lanes[lane.id] || [];
      var me = { lane: lane.id, clipName: lane.short + "_" + songName + " " + Math.round(out.tempo), midi: [] };
      for (var m = 0; m < midiTracks.length; m++){
        var cl = ids(midiTracks[m].api, "arrangement_clips");
        for (var c = 0; c < cl.length; c++) items.push({ midi: true, entry: me, id: cl[c], track: midiTracks[m].name });
      }
      out.lanes.push(me);
      continue;
    }
    var st = s.stems[lane.short];
    if (!st) continue;
    var entry = { lane: lane.id, clipName: st.name, fullStem: null, cuts: [] };
    var ac = ids(st.api, "arrangement_clips");
    for (var a = 0; a < ac.length; a++) items.push({ midi: false, entry: entry, id: ac[a] });
    out.lanes.push(entry);
  }
  work(items, function (it){
    var clip = byId(it.id);
    if (it.midi){
      var len = n(clip, "length");
      var notes = parseDict(clip.call("get_notes_extended", 0, 128, n(clip, "start_marker"), len), "notes") || [];
      it.entry.midi.push({ name: g(clip, "name"), track: it.track, start_time: n(clip, "start_time"),
                           length: len, cut: isCutClip(clip), active: true, notes: notes });
      return;
    }
    var file = g(clip, "file_path");
    if (!it.entry.fullStem) it.entry.fullStem = file;
    if (isCutClip(clip)){
      it.entry.cuts.push({ name: g(clip, "name"), file: file,
        start_marker: n(clip, "start_marker"), end_marker: n(clip, "end_marker"),
        start_time: n(clip, "start_time"), end_time: n(clip, "end_time"), active: true }); // im Live-Set wieder aktiv
    }
  }, "Lese Clips", function (){
    var lanes = [];
    for (var z = 0; z < out.lanes.length; z++){
      var e = out.lanes[z];
      if (e.midi){ if (e.midi.length) lanes.push(e); continue; }
      e.cuts.sort(function (x, y) { return x.start_time - y.start_time; });
      for (var i = 0; i < e.cuts.length; i++) e.cuts[i].clipName = e.clipName + " (" + (i + 1) + ")";
      lanes.push(e);
    }
    out.lanes = lanes;
    if (!out.lanes.length){ status("Nichts zu packen: erst rendern."); return; }
    var dir = setPath.substring(0, setPath.lastIndexOf("/") + 1);
    var path = dir + "SETMAKER - " + songName + ".json";
    if (writeText(path, JSON.stringify(out, null, 1))){
      var cuts = 0; for (var q = 0; q < out.lanes.length; q++) cuts += (out.lanes[q].cuts || out.lanes[q].midi || []).length;
      status("Paket gespeichert: " + path + " (" + out.lanes.length + " Spalten, " + cuts + " Schnitte/MIDI-Clips)");
    } else status("Konnte Paket nicht schreiben: " + path);
  });
}

// ---------- Update über GitHub ----------
function update(){
  status("Suche Update …");
  LU.check(PLUGIN_ID, VERSION, function (err, info){
    if (err){ status(err); return; }
    if (!info.newer){ status("Aktuell: v" + VERSION + " ist die neueste Version."); return; }
    status("Lade v" + info.latest + " …");
    LU.install(info.entry, DIR, writeText, function (e2, count, left){
      if (e2){ status("Update fehlgeschlagen: " + e2); return; }
      var msg = "v" + info.latest + " geladen (" + count + " Dateien). Device löschen und neu reinziehen.";
      if (left && left.length) msg += " Alte Dateien bitte im Finder löschen: " + left.join(", ");
      status(msg);
    });
  });
}

function anything(){ /* andere jweb-Meldungen ignorieren */ }
