// SET MAKER LIVE – sortn v0.2 (Max for Live, [js])
// Erkennt die Rolle jeder Spur (Kick, Hi-Hat, Bass …), benennt einheitlich um und färbt nach Kategorie.
// Einstellungen in sortn_settings.json im eigenen Ordner (unabhängig von prepn).
autowatch = 0; // nicht automatisch neu laden (Updates überschreiben diese Datei)
var VERSION = "0.2.8";
var PLUGIN_ID = "setmaker-sort";
inlets = 1;
outlets = 1; // -> jweb (über s ---toweb)

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
        cat("snare", "Snare", "top", 18, ["snare", "rim", "rimshot", "sd"]),
        cat("clap", "Clap", "top", 46, ["clap", "claps", "clp", "snap", "handclap"]),
        cat("hihat", "Hi-Hat", "top", 19, ["hihat", "hat", "hats", "hh", "oh", "ch"]),
        cat("shaker", "Shaker", "top", 34, ["shaker", "shakers", "shake", "shk", "maracas"]),
        cat("perc", "Perc", "top", 47, ["perc", "percs", "percussion", "conga", "bongo", "toms", "tom", "tamb", "tambourine", "cowbell", "timbale", "woodblock", "clave"]),
        cat("tops", "Tops", "top", 61, ["tops", "top", "ride", "crash", "cymbal"]),
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
        rename: true, colorize: true, colorClips: false, matchClips: false, keepColor: 13, numberSingle: false,
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
    return !s || /^\d+$/.test(s) || /^\d+[\s\-]*(audio|midi|group|gruppe)(\s*\d+)?$/i.test(s) || /^(audio|midi|group|gruppe)(\s*\d+)?$/i.test(s);
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
      // Spuren in der "Nicht ändern"-Farbe bleiben, wie sie sind
      else if (o.keepColor !== undefined && o.keepColor !== null && o.keepColor >= 0 && tr.color === o.keepColor) { row.source = "keep"; row.why = ["Farbe „Nicht ändern“"]; }
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
      if (ru.cat || ru.isGroup || ru.source === "stem" || ru.source === "keep") continue;
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
        if (!gr.isGroup || gr.source === "stem" || gr.source === "keep" || overrides[gr.id] !== undefined) continue;
        var leafCats = {}, nLeaf = 0, nKnown = 0, inherited = 0;
        for (var li = 0; li < rows.length; li++) {
          var lr = rows[li]; if (lr.isGroup || lr.source === "stem" || lr.source === "keep") continue;
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
          // Gemischte Gruppe: Farbe = Rest (damit nichts doppelt gezählt wird), Name aber trotzdem sauber:
          // 1. eigener Name passt zu einer Kategorie (z. B. "DRUMS"), 2. alle Spuren in derselben Spalte (z. B. Snare + Clap -> Drums)
          var label3 = gr.cat ? byCat[gr.cat].label : "";
          if (!label3) {
            var lane3 = null, same = true;
            for (var k3 in leafCats) { var l3 = byCat[k3].lane || ""; if (lane3 === null) lane3 = l3; else if (l3 !== lane3) same = false; }
            if (same && lane3) {
              var pickFb = null, pickAny = null;
              for (var q3 = 0; q3 < cats.length; q3++) if (cats[q3].lane === lane3) { if (!pickAny) pickAny = cats[q3]; if (cats[q3].fallback && !pickFb) pickFb = cats[q3]; }
              label3 = (pickFb || pickAny).label;
            }
          }
          gr.cat = null; gr.source = "auto"; gr.conf = ""; gr.groupLabel = label3;
          gr.why = ["Gemischte Gruppe" + (label3 ? ", heißt " + label3 + " Group" : "")];
        }
      }
    }

    // Neue Namen + Farben
    var count = {}, groupCount = {}, seen = {}, groupSeen = {};
    function gLabel(r) { return r.cat ? byCat[r.cat].label : (r.groupLabel || ""); }
    for (var e = 0; e < rows.length; e++) {
      var rr = rows[e]; if (rr.source === "stem" || rr.source === "skip" || rr.source === "keep") continue;
      if (rr.isGroup) { var gl = gLabel(rr); if (gl) groupCount[gl] = (groupCount[gl] || 0) + 1; }
      else { var key = rr.cat || "_rest"; count[key] = (count[key] || 0) + 1; }
    }
    for (var f = 0; f < rows.length; f++) {
      var row2 = rows[f];
      row2.newName = row2.name; row2.newColor = row2.color; row2.lane = "";
      if (row2.source === "stem" || row2.source === "skip" || row2.source === "keep") continue;
      var c2 = row2.cat ? byCat[row2.cat] : null, key2 = row2.cat || "_rest";
      row2.lane = c2 ? (c2.lane || "") : "";
      if (o.colorize) row2.newColor = c2 ? c2.color.index : s.rest.color.index;
      var label = c2 ? c2.label : s.rest.label;
      if (row2.isGroup) {
        // Gruppen heißen "<Kategorie> Group", bei mehreren gleichen "<Kategorie> Group 2" usw.
        var gl2 = gLabel(row2);
        if (o.rename && gl2 && !(o.keepCustomNames && !isDefaultName(row2.name))) {
          var gn = groupSeen[gl2] = (groupSeen[gl2] || 0) + 1;
          row2.newName = gl2 + " Group" + (gn > 1 ? " " + gn : "");
        }
        continue;
      }
      var doRename = o.rename && (c2 || o.renameRest);
      if (doRename && o.keepCustomNames && !isDefaultName(row2.name) && !ownName(row2.name, s)) doRename = false;
      if (doRename) {
        var nr = seen[key2] = (seen[key2] || 0) + 1, total2 = count[key2];
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


var settings = SM.defaults();
var plan = null;          // letzte Analyse
var overrides = {};       // trackId -> categoryId | "_rest" | "_skip"
var undoStack = null;     // [{id, name, color, clips:[{id,color}]}]
var DIR = "";
var lastStatus = "Bereit. „Analysieren“ zeigt die Vorschau, „Ausführen“ benennt um und färbt.";

function say(kind, obj){ outlet(0, kind, encodeURIComponent(JSON.stringify(obj))); }
function status(s){ lastStatus = s; post("sortn: " + s + "\n"); say("status", { text: s }); }
function byId(id){ return new LiveAPI("id " + id); }

// ---------- Dateien ----------
function deviceDir(){
  var fp = this.patcher ? this.patcher.filepath : "";
  if (!fp) return "";
  return fp.substring(0, fp.lastIndexOf("/") + 1);
}
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
// Eigene Einstellungsdatei nur für sortn, im eigenen Ordner (unabhängig von prepn)
var SETTINGS_FILE = "sortn_settings.json";
function settingsPath(){ return DIR + SETTINGS_FILE; }
function readSettingsFile(){
  var txt = readText(settingsPath());
  if (!txt) return null;
  try { return JSON.parse(txt); } catch (e) { post("sortn: sortn_settings.json ist kaputt, nehme Standard.\n"); return null; }
}
// Einfaches Tool: nur diese Optionen sind einstellbar, alles andere ist fest auf Standard
var USER_OPTS = { numberSingle: 1, keepColor: 1, matchClips: 1 };
// Einmalige Anpassungen alter Einstellungsdateien (pro Name nur einmal, danach darf der Nutzer frei ändern)
function migrate(x){
  if (!x.migrations) x.migrations = [];
  if (x.migrations.indexOf("clap") < 0){
    var has = false, at = -1;
    for (var i = 0; i < x.categories.length; i++){
      var c = x.categories[i];
      if (c.id === "clap") has = true;
      if (c.id === "snare"){
        at = i;
        c.keywords = c.keywords.filter(function (w){ var l = String(w).toLowerCase(); return l !== "clap" && l !== "claps" && l !== "snap"; });
      }
    }
    if (!has){
      var dc = SM.defaults().categories;
      for (var j = 0; j < dc.length; j++) if (dc[j].id === "clap") x.categories.splice(at >= 0 ? at + 1 : x.categories.length, 0, dc[j]);
    }
    x.migrations.push("clap");
  }
  if (x.migrations.indexOf("perc") < 0){
    // Shaker und Perc bekommen eigene Kategorien vor "Tops"; ihre Begriffe wandern aus Tops heraus
    var dc2 = SM.defaults().categories, move = {}, ids = {}, k, n;
    for (k = 0; k < dc2.length; k++) if (dc2[k].id === "shaker" || dc2[k].id === "perc")
      for (n = 0; n < dc2[k].keywords.length; n++) move[dc2[k].keywords[n]] = 1;
    for (k = 0; k < x.categories.length; k++) ids[x.categories[k].id] = k;
    if (ids.tops !== undefined)
      x.categories[ids.tops].keywords = x.categories[ids.tops].keywords.filter(function (w){ return !move[String(w).toLowerCase()]; });
    var pos = ids.tops !== undefined ? ids.tops : x.categories.length;
    for (k = 0; k < dc2.length; k++){
      var id2 = dc2[k].id;
      if ((id2 === "shaker" || id2 === "perc") && ids[id2] === undefined){ x.categories.splice(pos, 0, dc2[k]); pos++; }
    }
    x.migrations.push("perc");
  }
  return x;
}
function norm(s){
  var x = migrate(SM.normalize(s)), d = SM.defaults().sort;
  for (var k in d) if (!USER_OPTS[k]) x.sort[k] = d[k];
  return x;
}
function loadSettings(){
  var s = readSettingsFile();
  settings = norm(s);
  saveSettings(); // fehlende Felder/Standardwerte in die Datei schreiben, fremde Keys bleiben
}
// Vor dem Schreiben neu lesen, damit Prep-Felder (z. B. "cut") erhalten bleiben
function saveSettings(){
  var disk = readSettingsFile() || {};
  for (var k in settings) disk[k] = settings[k];
  settings = norm(disk);
  if (!writeText(settingsPath(), JSON.stringify(settings, null, 1))) status("Konnte Einstellungen nicht speichern: " + settingsPath());
}

// ---------- Start ----------
function init(){
  DIR = deviceDir.call(this);
  if (DIR){
    var posix = DIR.indexOf(":/") >= 0 ? DIR.substring(DIR.indexOf(":/") + 1) : DIR;
    outlet(0, "url", "file://" + encodeURI(posix) + "sortn.html");
  }
  loadSettings();
  analyze();
}
function bang(){ init.call(this); }
function hello(){
  // Großes Fenster wird erst beim ersten Öffnen geladen: ⚙ davor soll trotzdem die Einstellungen zeigen
  if (wantTab && new Date().getTime() - wantTab < 5000) say("tab", { tab: "set" });
  if (busy) return; if (!plan) analyze(); else send();
}

// Große Nachrichten in Stücken an die Oberfläche (lange Max-Symbole kommen sonst nicht an)
var msgSeq = 0;
function sayBig(kind, obj){
  var s = encodeURIComponent(JSON.stringify(obj)), size = 4000;
  if (s.length <= size){ outlet(0, kind, s); return; }
  var id = ++msgSeq, n = Math.ceil(s.length / size);
  for (var i = 0; i < n; i++) outlet(0, "chunk", kind, id, i, n, s.substring(i * size, (i + 1) * size));
}
function slimPlan(){
  if (!plan) return null;
  var rows = [];
  for (var i = 0; i < plan.rows.length; i++){
    var r = plan.rows[i];
    rows.push({ id: r.id, name: r.name, color: r.color, isGroup: r.isGroup, depth: r.depth, cat: r.cat,
                source: r.source, conf: r.conf, why: r.why, newName: r.newName, newColor: r.newColor });
  }
  return { rows: rows, ignored: plan.ignored };
}
function send(){
  sayBig("state", { version: VERSION, settings: settings, plan: slimPlan(), overrides: overrides, lanes: SM.LANES,
                    palette: SM.PALETTE, canUndo: !!undoStack, busy: busy, status: lastStatus });
}
var lastPct = -1;
function progress(text, done, total){
  var pct = total ? Math.round(100 * done / total) : 100;
  if (pct === lastPct && pct < 100) return; // UI nur bei sichtbarer Änderung neu zeichnen
  lastPct = pct; say("progress", { text: text, pct: pct });
}

// ---------- In Häppchen arbeiten, damit Ableton nicht einfriert ----------
var busy = false, worker = null;
function work(items, fn, label, done){
  busy = true; lastPct = -1;
  var i = 0;
  progress(label + " 0/" + items.length, 0, items.length); // Anzeige sofort zeigen
  worker = new Task(function (){
    var start = new Date().getTime();
    try {
      while (i < items.length && new Date().getTime() - start < 12){ fn(items[i], i); i++; }
    } catch (e) { busy = false; worker = null; status("Fehler: " + e); send(); return; }
    progress(label + " " + i + "/" + items.length, i, items.length);
    if (i < items.length) worker.schedule(8);
    else { busy = false; worker = null; done(); }
  }, this);
  worker.schedule(0);
}

// ---------- Analysieren ----------
function analyze(after){
  if (busy) return;
  loadSettingsQuiet();
  var ids = SM.trackIds(LiveAPI), tracks = [];
  work(ids, function (id, i){ tracks.push(SM.collectOne(LiveAPI, id, i, settings)); }, "Lese Spuren", function (){
    plan = SM.analyze(tracks, settings, overrides);
    plan.tracks = tracks;
    if (typeof after === "function") after();
    else { summary(); send(); }
  });
}
function summary(){
  var known = 0, rest = 0, change = 0;
  for (var i = 0; i < plan.rows.length; i++){
    var r = plan.rows[i];
    if (r.source === "stem" || r.source === "skip" || r.source === "keep") continue;
    if (r.cat) known++; else rest++;
    if (r.newName !== r.name || r.newColor !== r.color) change++;
  }
  status(plan.rows.length + " Spuren: " + known + " erkannt, " + rest + " Rest, " + change + " werden geändert."
         + (plan.ignored.length ? " Ignoriert (Songtitel?): " + plan.ignored.join(", ") : ""));
}
// Datei kann von Prep geändert worden sein
function loadSettingsQuiet(){ var s = readSettingsFile(); if (s) settings = norm(s); }

// Nur neu rechnen (Overrides/Einstellungen), ohne Live neu einzulesen
function recompute(){
  if (busy) return;
  if (!plan || !plan.tracks) { analyze(); return; }
  var tracks = plan.tracks;
  plan = SM.analyze(tracks, settings, overrides);
  plan.tracks = tracks;
  summary(); send();
}

function override(trackId, catId){
  trackId = Number(trackId); catId = String(catId);
  if (catId === "_auto") delete overrides[trackId]; else overrides[trackId] = catId;
  recompute();
}

// ---------- Ausführen ----------
function run(){
  if (busy) return;
  analyze(apply); // Live einmal frisch einlesen, dann ändern
}
function apply(){
  var o = settings.sort, todo = [], undo = [];
  for (var i = 0; i < plan.rows.length; i++){
    var r = plan.rows[i];
    if (r.source === "stem" || r.source === "skip" || r.source === "keep") continue;
    if (r.newName !== r.name || r.newColor !== r.color || o.matchClips || (o.colorize && o.colorClips)) todo.push(r);
  }
  if (!todo.length){ status("Alles war schon sortiert, nichts geändert."); send(); return; }
  work(todo, function (r){
    var t = byId(r.id), tr = findTrack(r.id), entry = { id: r.id, name: r.name, color: r.color, clips: [] }, did = false;
    if (r.newName !== r.name){ t.set("name", r.newName); did = true; }
    if (r.newColor !== r.color){ t.set("color_index", r.newColor); did = true; }
    // Clips angleichen: Clips bekommen Spurname und Spurfarbe (oder nur Farbe mit "Clips mitfärben")
    var clipColor = o.matchClips || (o.colorize && o.colorClips), clipName = o.matchClips;
    if ((clipColor || clipName) && tr){
      for (var c = 0; c < tr.clipIds.length; c++){
        var cl = byId(tr.clipIds[c]);
        if (!Number(cl.id)) continue;
        var bc = Number(cl.get("color_index")), bnArr = cl.get("name"), bn = (bnArr && bnArr.join) ? bnArr.join(" ") : String(bnArr);
        var ch = { id: tr.clipIds[c], color: bc, name: bn }, any = false;
        if (clipColor && bc !== r.newColor){ cl.set("color_index", r.newColor); any = true; }
        if (clipName && bn !== r.newName){ cl.set("name", r.newName); any = true; }
        if (any){ entry.clips.push(ch); did = true; }
      }
    }
    if (did) undo.push(entry);
    if (tr){ tr.name = r.newName; tr.color = r.newColor; } // Plan aktuell halten, ohne neu einzulesen
  }, "Ändere Spuren", function (){
    if (undo.length) undoStack = undo;
    overrides = {};
    var tracks = plan.tracks; plan = SM.analyze(tracks, settings, overrides); plan.tracks = tracks;
    status(undo.length ? undo.length + " Spuren umbenannt/gefärbt. „↶“ stellt alles wieder her." : "Alles war schon sortiert, nichts geändert.");
    send();
  });
}
function findTrack(id){
  if (!plan || !plan.tracks) return null;
  for (var i = 0; i < plan.tracks.length; i++) if (plan.tracks[i].id === id) return plan.tracks[i];
  return null;
}

function undo(){
  if (busy) return;
  if (!undoStack){ status("Nichts zum Rückgängigmachen."); return; }
  var list = undoStack, n = 0;
  work(list, function (u){
    var t = byId(u.id);
    if (!t.id || Number(t.id) === 0) return; // Spur gelöscht
    t.set("name", u.name); t.set("color_index", u.color);
    for (var c = 0; c < u.clips.length; c++){ var cl = byId(u.clips[c].id); if (Number(cl.id)){ cl.set("color_index", u.clips[c].color); if (u.clips[c].name !== undefined) cl.set("name", u.clips[c].name); } }
    var tr = findTrack(u.id); if (tr){ tr.name = u.name; tr.color = u.color; }
    n++;
  }, "Setze zurück", function (){
    undoStack = null;
    if (plan && plan.tracks){ var tracks = plan.tracks; plan = SM.analyze(tracks, settings, overrides); plan.tracks = tracks; }
    status(n + " Spuren zurückgesetzt.");
    send();
  });
}
var wantTab = 0;
function showsettings(){ wantTab = new Date().getTime(); say("tab", { tab: "set" }); }

// ---------- Einstellungen aus der UI ----------
function setsettings(enc){
  var s;
  try { s = JSON.parse(decodeURIComponent(enc)); } catch (e) { status("Einstellungen unlesbar."); return; }
  settings = norm(s);
  saveSettings();
  recompute();
}
function resetsettings(){
  var keep = readSettingsFile() || {};
  var d = SM.defaults();
  for (var k in d) keep[k] = d[k];
  settings = norm(keep);
  writeText(settingsPath(), JSON.stringify(settings, null, 1));
  overrides = {};
  status("Standard-Einstellungen geladen.");
  recompute();
}
// Farbe der in Live ausgewählten Spur für eine Kategorie übernehmen
function learncolor(catId){
  var t = new LiveAPI("live_set view selected_track");
  if (!t.id || Number(t.id) === 0){ status("Erst eine Spur in Ableton anklicken."); return; }
  var idx = Number(t.get("color_index")), rgb = Number(t.get("color"));
  var c = { index: idx, rgb: rgb };
  if (catId === "_rest") settings.rest.color = c;
  else for (var i = 0; i < settings.categories.length; i++) if (settings.categories[i].id === catId) settings.categories[i].color = c;
  saveSettings();
  status("Farbe übernommen.");
  recompute();
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
