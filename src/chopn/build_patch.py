# Baut src/chopn/chopn.maxpat und chopn/chopn.amxd(.json). chopn ist ein Instrument (Typ "iiii").
# Aufruf aus dem Repo-Ordner: python3 src/chopn/build_patch.py
import json, pathlib, struct

root = pathlib.Path(__file__).resolve().parent.parent.parent

def col(h, a=1.0):
    return [round(int(h[1:3], 16) / 255, 4), round(int(h[3:5], 16) / 255, 4), round(int(h[5:7], 16) / 255, 4), a]

BG, SURF, RAISED, RAISED2, LINE = col("#141414"), col("#1C1B1A"), col("#232221"), col("#2A2928"), col("#32312F")
TEXT, MUTED, ORANGE, FILL = col("#F0EEE9"), col("#8F8C86"), col("#FF5A1F"), col("#EC6636")

BUF = "---chopnbuf"   # "---" = pro Device eindeutig
DW, DH, UW = 556, 169, 458   # Device-Breite/-Höhe, Breite der jsui

boxes, lines, params = [], [], {}

def box(id, cls, rect, btext=None, nin=1, nout=0, otype=None, **kw):
    b = {"id": id, "maxclass": cls, "numinlets": nin, "numoutlets": nout,
         "outlettype": otype if otype is not None else [""] * nout, "patching_rect": rect}
    if btext is not None:
        b["text"] = btext
    b.update(kw)
    boxes.append({"box": b})

def line(a, ao, b, bi):
    lines.append({"patchline": {"source": [a, ao], "destination": [b, bi]}})

def obj(id, text, rect, nin=1, nout=1, otype=None, **kw):
    box(id, "newobj", rect, text, nin, nout, otype, **kw)

def msg(id, text, rect):
    box(id, "message", rect, text, 2, 1, [""])

def valueof(longname, short, ptype, **extra):
    v = {"parameter_longname": longname, "parameter_shortname": short, "parameter_type": ptype}
    v.update(extra)
    return {"valueof": v}

# ---------- Oberfläche ----------
# Unsichtbares Sample-Feld hinter der Welle (Hintergrund-Ebene): Sample direkt auf die Welle ziehen.
box("drop2", "live.drop", [700, 560, 100, 30], None, 1, 2, ["", ""], parameter_enable=1, background=1,
    varname="SampleWelle", legend=" ", bordercolor=SURF, textcolor=SURF, focusbordercolor=ORANGE,
    presentation=1, presentation_rect=[8, 30, 442, 108],
    saved_attribute_attributes=valueof("SampleWelle", "SampleWelle", 4, parameter_invisible=1))
box("bgp", "panel", [700, 600, 100, 40], None, 1, 0, [], background=1, bgcolor=BG, bordercolor=BG, border=0,
    ignoreclick=1, presentation=1, presentation_rect=[0, 0, DW, DH])
box("ui", "jsui", [400, 300, UW, DH], None, 1, 10, [""] * 10, varname="chopui",
    filename="chopn.js", parameter_enable=0, presentation=1, presentation_rect=[0, 0, UW, DH])

# Rechte Spalte: Sample-Feld, Pegel, Ton, Stopp (echte Live-Regler)
box("drop", "live.drop", [700, 520, 100, 30], None, 1, 2, ["", ""], parameter_enable=1,
    varname="Sample", legend="Sample", bordercolor=LINE, textcolor=TEXT, focusbordercolor=ORANGE, fontsize=10.0,
    presentation=1, presentation_rect=[464, 6, 86, 36],
    hint="Sample hier reinziehen (aus Live oder dem Finder).",
    annotation="Sample: Datei aus dem Live-Browser oder dem Finder hier reinziehen. Ein neues Sample löscht die gemerkten Punkte.",
    saved_attribute_attributes=valueof("Sample", "Sample", 4, parameter_invisible=1))
dialcol = dict(activedialcolor=ORANGE, dialcolor=LINE, needlecolor=TEXT, activeneedlecolor=TEXT,
               textcolor=TEXT, focusbordercolor=ORANGE, presentation=1)
box("vol", "live.dial", [20, 420, 44, 66], None, 1, 2, ["", "float"], parameter_enable=1, varname="Pegel",
    presentation_rect=[464, 48, 42, 70],
    hint="Pegel: Lautstärke des Samplers.", annotation="Pegel: Lautstärke des Samplers in dB.",
    saved_attribute_attributes=valueof("Pegel", "Pegel", 0, parameter_mmin=-70.0, parameter_mmax=6.0,
                                       parameter_initial_enable=1, parameter_initial=[0.0], parameter_unitstyle=4), **dialcol)
box("tune", "live.dial", [120, 420, 44, 66], None, 1, 2, ["", "float"], parameter_enable=1, varname="Ton",
    presentation_rect=[508, 48, 42, 70],
    hint="Ton: Tonhöhe in Halbtönen (ändert auch das Tempo).",
    annotation="Ton: Tonhöhe in Halbtönen. Höher = schneller, tiefer = langsamer.",
    saved_attribute_attributes=valueof("Ton", "Ton", 0, parameter_mmin=-24.0, parameter_mmax=24.0,
                                       parameter_initial_enable=1, parameter_initial=[0.0], parameter_unitstyle=7), **dialcol)
box("stop", "live.text", [220, 420, 76, 30], None, 1, 2, ["", ""], parameter_enable=1, mode=0,
    text="Stopp", fontsize=12.0, rounded=7.0, presentation=1, presentation_rect=[464, 126, 86, 36], varname="Stopp",
    bgcolor=RAISED2, activebgcolor=RAISED2, bgoncolor=LINE, activebgoncolor=LINE,
    textcolor=TEXT, activetextcolor=TEXT, textoncolor=TEXT, activetextoncolor=TEXT,
    bordercolor=RAISED2, focusbordercolor=ORANGE,
    hint="Stopp: Ton aus.", annotation="Stopp: hält den Ton an. Lässt sich per MIDI mappen.",
    saved_attribute_attributes=valueof("Stopp", "Stopp", 2, parameter_mmax=1, parameter_enum=["aus", "an"]))

# ---------- Start ----------
obj("dev", "live.thisdevice", [20, 20, 100, 22], 1, 3, ["bang", "int", "int"])
# von rechts nach links: compile, Buffer-Name, Zustand, Regler, init, Sample-Feld
obj("tb", "t b b b b b b", [20, 50, 130, 22], 1, 6, ["bang"] * 6)
msg("comp0", "compile", [160, 80, 55, 22])
msg("bn", "bufname " + BUF, [230, 80, 130, 22])
line("dev", 0, "tb", 0)
line("tb", 5, "comp0", 0); line("comp0", 0, "ui", 0)
line("tb", 4, "bn", 0); line("bn", 0, "ui", 0)
# Zustand (Sample-Pfad + Punkte) im Live-Set: pattr als unsichtbarer Blob-Parameter
obj("st", "pattr chopstate", [380, 80, 100, 22], 1, 3, ["", "", ""], parameter_enable=1, varname="chopstate",
    saved_attribute_attributes=valueof("Zustand", "Zustand", 3, parameter_invisible=1, parameter_modmode=0),
    saved_object_attributes={"parameter_enable": 1, "parameter_mappable": 0})
obj("pst", "prepend state", [380, 110, 90, 22])
line("tb", 3, "st", 0); line("st", 1, "pst", 0); line("pst", 0, "ui", 0)
line("ui", 4, "st", 0)
line("tb", 2, "vol", 0); line("tb", 2, "tune", 0)
line("tb", 1, "ui", 0)
line("tb", 0, "drop", 0)
obj("pdrop", "prepend drop", [700, 480, 90, 22]); line("drop", 0, "pdrop", 0); line("pdrop", 0, "ui", 0)
obj("pdrop2", "prepend drop2", [800, 480, 90, 22]); line("drop2", 0, "pdrop2", 0); line("pdrop2", 0, "ui", 0)
line("ui", 9, "drop", 0)
# Neustart nach Update
obj("dl", "deferlow", [560, 20, 60, 22]); line("ui", 2, "dl", 0); line("dl", 0, "tb", 0)

# ---------- Sample ----------
obj("buf", "buffer~ " + BUF, [560, 360, 130, 22], 1, 2, ["float", "bang"])
msg("bdone", "bufdone", [640, 390, 60, 22])
line("ui", 0, "buf", 0); line("buf", 1, "bdone", 0); line("bdone", 0, "ui", 0)

# ---------- MIDI: Note -> Startpunkt ----------
obj("nin", "notein", [20, 560, 60, 22], 1, 3, ["int", "int", "int"])
obj("sn", "stripnote", [20, 600, 60, 22], 2, 2, ["int", "int"])
line("nin", 0, "sn", 0); line("nin", 1, "sn", 1)
# Note-On: 1. als letzte Note merken, 2. im coll nachschlagen (startet den Ton), 3. ans Script (Lernen, Anzeige)
obj("ton", "t i i i", [20, 630, 70, 22], 1, 3, ["int", "int", "int"])
line("sn", 0, "ton", 0)
obj("cl", "coll", [60, 670, 60, 22], 1, 4, ["", "", "", ""], saved_object_attributes={"embed": 0, "precision": 6})
obj("pnote", "prepend note", [20, 700, 80, 22])
line("ton", 1, "cl", 0); line("ton", 0, "pnote", 0); line("pnote", 0, "ui", 0)
line("ui", 3, "cl", 0)
# Note-Off der zuletzt gespielten Note -> Ton aus (nur wenn "Halten" an ist)
obj("pk", "pack 0 0", [140, 600, 60, 22], 2, 1, [""])
line("nin", 0, "pk", 0); line("nin", 1, "pk", 1)
obj("rev", "zl rev", [140, 630, 50, 22], 2, 2, ["", ""])
obj("r0", "route 0", [140, 660, 50, 22], 1, 2, ["", ""])
obj("eq", "== -1", [140, 690, 50, 22], 2, 1, ["int"])
obj("s1", "sel 1", [140, 720, 40, 22], 2, 2, ["bang", ""])
obj("hg", "gate 1 1", [140, 750, 60, 22], 2, 1, [""])
line("pk", 0, "rev", 0); line("rev", 0, "r0", 0); line("r0", 0, "eq", 0); line("eq", 0, "s1", 0); line("s1", 0, "hg", 1)
line("ton", 2, "eq", 1)
line("ui", 6, "hg", 0)

# ---------- Zwei Stimmen im Wechsel (jeder Start blendet die andere kurz aus = kein Knacksen) ----------
obj("tin", "t f b", [300, 560, 40, 22], 1, 2, ["float", "bang"])
obj("cnt", "counter 0 1", [340, 590, 70, 22], 5, 4, ["int", "", "", "int"])
obj("p1", "+ 1", [340, 620, 30, 22], 2, 1, ["int"])
obj("vg", "gate 2", [300, 650, 50, 22], 2, 2, ["", ""])
line("cl", 0, "tin", 0)
line("tin", 1, "cnt", 0); line("cnt", 0, "p1", 0); line("p1", 0, "vg", 0); line("tin", 0, "vg", 1)
# Maus-Klick aus dem Script: letzte Note vergessen, dann starten
obj("mt", "t f b", [420, 560, 40, 22], 1, 2, ["float", "bang"])
msg("m1", "-1", [460, 590, 30, 22])
line("ui", 1, "mt", 0); line("mt", 1, "m1", 0); line("m1", 0, "eq", 1); line("mt", 0, "tin", 0)

obj("rate", "sig~ 1.", [560, 620, 50, 22], 1, 1, ["signal"])
obj("ex", "expr pow(2.\\, $f1/12.)", [560, 590, 130, 22], 1, 1, [""])
obj("ptune", "prepend tune", [700, 590, 80, 22])
line("tune", 0, "ex", 0); line("ex", 0, "rate", 0); line("tune", 0, "ptune", 0); line("ptune", 0, "ui", 0)

for i, v in enumerate(["a", "b"]):
    x = 300 + i * 200
    o = "b" if v == "a" else "a"
    obj("tv" + v, "t b f b", [x, 690, 60, 22], 1, 3, ["bang", "float", "bang"])
    msg("on" + v, "1 2", [x, 720, 35, 22])
    msg("off" + v, "0 4", [x + 60, 720, 35, 22])
    obj("gr" + v, "groove~ " + BUF + " 2", [x, 760, 130, 22], 3, 3, ["signal", "signal", "signal"])
    obj("env" + v, "line~", [x + 140, 760, 40, 22], 2, 2, ["signal", "bang"])
    obj("ml" + v, "*~", [x, 800, 30, 22], 2, 1, ["signal"])
    obj("mr" + v, "*~", [x + 50, 800, 30, 22], 2, 1, ["signal"])
    line("vg", i, "tv" + v, 0)
    line("tv" + v, 1, "gr" + v, 0); line("tv" + v, 0, "on" + v, 0); line("on" + v, 0, "env" + v, 0)
    line("rate", 0, "gr" + v, 0)
    line("gr" + v, 0, "ml" + v, 0); line("gr" + v, 1, "mr" + v, 0)
    line("env" + v, 0, "ml" + v, 1); line("env" + v, 0, "mr" + v, 1)
    line("ui", 5, "gr" + v, 0)
# beim Start einer Stimme die andere ausblenden
line("tva", 2, "offb", 0); line("offb", 0, "envb", 0)
line("tvb", 2, "offa", 0); line("offa", 0, "enva", 0)

# Ton aus: beide Stimmen ausblenden, Script Bescheid geben
obj("rel", "t b b", [140, 790, 40, 22], 1, 2, ["bang", "bang"])
msg("rz", "0 8", [140, 820, 35, 22])
msg("rmsg", "released", [190, 820, 60, 22])
line("hg", 0, "rel", 0); line("ui", 8, "rel", 0)
obj("stb", "t b", [220, 460, 30, 22], 1, 1, ["bang"]); line("stop", 0, "stb", 0); line("stb", 0, "rel", 0)
line("rel", 1, "rz", 0); line("rz", 0, "enva", 0); line("rz", 0, "envb", 0)
line("rel", 0, "rmsg", 0); line("rmsg", 0, "ui", 0)

# Mono-Datei: links auch nach rechts. Dann Pegel und raus.
obj("mono", "*~ 0.", [420, 840, 40, 22], 2, 1, ["signal"])
line("mla", 0, "mono", 0); line("mlb", 0, "mono", 0); line("ui", 7, "mono", 1)
obj("db", "dbtoa", [20, 500, 50, 22], 1, 1, [""])
msg("vm", "$1 20", [20, 530, 45, 22])
obj("vl", "line~", [20, 840, 40, 22], 2, 2, ["signal", "bang"])
line("vol", 0, "db", 0); line("db", 0, "vm", 0); line("vm", 0, "vl", 0)
obj("ol", "*~", [300, 880, 30, 22], 2, 1, ["signal"])
obj("or", "*~", [360, 880, 30, 22], 2, 1, ["signal"])
line("mla", 0, "ol", 0); line("mlb", 0, "ol", 0)
line("mra", 0, "or", 0); line("mrb", 0, "or", 0); line("mono", 0, "or", 0)
line("vl", 0, "ol", 1); line("vl", 0, "or", 1)
obj("out", "plugout~", [300, 920, 90, 22], 2, 0, [])
line("ol", 0, "out", 0); line("or", 0, "out", 1)

for b in boxes:
    bb = b["box"]
    if bb.get("parameter_enable") == 1:
        v = bb["saved_attribute_attributes"]["valueof"]
        params[bb["id"]] = [v["parameter_longname"], v["parameter_shortname"], 0]
params["parameterbanks"] = {}
params["inherited_shortname"] = 1

patch = {"patcher": {
    "fileversion": 1,
    "appversion": {"major": 8, "minor": 6, "revision": 0, "architecture": "x64", "modernui": 1},
    "classnamespace": "box", "rect": [100, 100, 1000, 700], "bglocked": 0, "openinpresentation": 1,
    "default_fontsize": 12.0, "default_fontface": 0, "default_fontname": "Arial",
    "gridonopen": 1, "gridsize": [15.0, 15.0], "gridsnaponopen": 1, "toolbarvisible": 1,
    "devicewidth": float(DW), "locked_bgcolor": BG, "editing_bgcolor": BG,
    "description": "chopn – Sampler: mit der Maus Startpunkte suchen, auf Tasten legen, spielen",
    "boxes": boxes, "lines": lines, "parameters": params,
    "dependency_cache": [], "autosave": 0,
}}
ids = [b["box"]["id"] for b in boxes]
assert len(ids) == len(set(ids)), "doppelte id"
for l in lines:
    s, d = l["patchline"]["source"], l["patchline"]["destination"]
    bs = next(b["box"] for b in boxes if b["box"]["id"] == s[0]); bd = next(b["box"] for b in boxes if b["box"]["id"] == d[0])
    assert s[1] < bs["numoutlets"], ("outlet", s); assert d[1] < bd["numinlets"], ("inlet", d)
txt = json.dumps(patch, indent=1, ensure_ascii=False)
(root / "src" / "chopn" / "chopn.maxpat").write_text(txt)
(root / "chopn" / "chopn.amxd.json").write_text(txt)
body = txt.encode("utf-8") + b"\n\0"
head = b"ampf" + struct.pack("<I", 4) + b"iiii" + b"meta" + struct.pack("<I", 4) + struct.pack("<I", 0) + b"ptch" + struct.pack("<I", len(body))
(root / "chopn" / "chopn.amxd").write_bytes(head + body)
print("ok", len(boxes), "boxes", len(lines), "lines")
