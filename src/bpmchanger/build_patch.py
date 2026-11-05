# Baut src/bpmchanger/bpmchanger.maxpat und bpmchanger/BPM Changer.amxd(.json).
# Aufruf aus dem Repo-Ordner: python3 src/bpmchanger/build_patch.py
import json, pathlib, struct

root = pathlib.Path(__file__).resolve().parent.parent.parent

def col(h, a=1.0):
    return [round(int(h[1:3], 16) / 255, 4), round(int(h[3:5], 16) / 255, 4), round(int(h[5:7], 16) / 255, 4), a]

BG, SURF, RAISED, RAISED2, LINE = col("#141414"), col("#1C1B1A"), col("#232221"), col("#2A2928"), col("#32312F")
TEXT, MUTED, ORANGE, FILL = col("#F0EEE9"), col("#8F8C86"), col("#FF5A1F"), col("#EC6636")

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

# Linke Spalte: jsui (Anzeige + Logik). Rechts daneben, ohne Überlappung, die echten Live-Regler (MIDI-mappbar).
box("ui", "jsui", [400, 300, 212, 169], None, 1, 7, [""] * 7, varname="bpmui",
    filename="bpmchanger.js", parameter_enable=0, presentation=1, presentation_rect=[0, 0, 212, 169])

obj("in", "plugin~", [20, 20, 60, 22], 2, 2, ["signal", "signal"])
obj("out", "plugout~", [20, 60, 60, 22], 2, 0, [])
line("in", 0, "out", 0); line("in", 1, "out", 1)

# Start: live.thisdevice -> Zahlenfelder ausgeben, dann jsui initialisieren
obj("dev", "live.thisdevice", [120, 20, 100, 22], 1, 3, ["bang", "int", "int"])
obj("tb", "t b b b", [120, 50, 60, 22], 1, 3, ["bang", "bang", "bang"])
line("dev", 0, "tb", 0)

common = {"presentation": 1}

def valueof(longname, short, ptype, mn, mx, initial, unitstyle, **extra):
    v = {"parameter_longname": longname, "parameter_shortname": short, "parameter_type": ptype,
         "parameter_mmin": mn, "parameter_mmax": mx, "parameter_initial_enable": 1,
         "parameter_initial": [initial], "parameter_unitstyle": unitstyle}
    v.update(extra)
    return {"valueof": v}

# Tempo-Knopf (MIDI-mappbar)
box("dial", "live.dial", [20, 120, 60, 72], None, 1, 2, ["", "float"], parameter_enable=1,
    presentation_rect=[220, 4, 72, 72], varname="Tempo",
    activedialcolor=ORANGE, dialcolor=LINE, needlecolor=TEXT, activeneedlecolor=TEXT,
    textcolor=TEXT, focusbordercolor=ORANGE,
    hint="Tempo: drehen gleitet weich, nach dem Loslassen auf ganze BPM.",
    annotation="Tempo: weich drehen. Nach dem Loslassen rundet BPM Changer auf ganze BPM. Cmd+M und hier klicken, um einen Controller-Knopf zuzuweisen.",
    saved_attribute_attributes=valueof("Tempo", "Tempo", 0, 60.0, 200.0, 128.0, 1), **common)
obj("pdial", "prepend dial", [20, 200, 80, 22])
line("dial", 0, "pdial", 0); line("pdial", 0, "ui", 0)
line("ui", 0, "dial", 0)

numcol = dict(activebgcolor=RAISED2, bordercolor=RAISED2, focusbordercolor=ORANGE, textcolor=TEXT,
              tricolor=MUTED, trioncolor=ORANGE, activeslidercolor=ORANGE)
box("bars", "live.numbox", [120, 120, 76, 20], None, 1, 2, ["", "float"], parameter_enable=1,
    presentation_rect=[218, 82, 76, 20], varname="Takte", fontsize=12.0, fontface=1,
    hint="Takte: so lange dauert die Rampe. Ziehen oder Zahl tippen.",
    annotation="Takte: über so viele Takte gleitet das Tempo zum Ziel.",
    saved_attribute_attributes=valueof("Takte", "Takte", 1, 1, 64, 16, 9, parameter_units="%d Takte"), **numcol, **common)
obj("pbars", "prepend bars", [120, 200, 80, 22])
line("bars", 0, "pbars", 0); line("pbars", 0, "ui", 0)
line("ui", 3, "bars", 0)

box("ziel", "live.numbox", [220, 120, 76, 20], None, 1, 2, ["", "float"], parameter_enable=1,
    presentation_rect=[218, 106, 76, 20], varname="Ziel", fontsize=12.0, fontface=1,
    hint="Ziel-BPM der Rampe. Ziehen oder Zahl tippen.",
    annotation="Ziel: auf dieses Tempo gleitet die Rampe.",
    saved_attribute_attributes=valueof("Ziel", "Ziel", 1, 60, 200, 128, 9, parameter_units="%d BPM"), **numcol, **common)
obj("pziel", "prepend target", [220, 200, 90, 22])
line("ziel", 0, "pziel", 0); line("pziel", 0, "ui", 0)
line("ui", 4, "ziel", 0)

box("start", "live.text", [320, 120, 76, 30], None, 1, 2, ["", ""], parameter_enable=1, mode=1,
    text="Start", texton="Stopp", fontsize=13.0, fontface=1,
    presentation_rect=[218, 132, 76, 30], varname="Start",
    bgcolor=FILL, activebgcolor=FILL, bgoncolor=RAISED2, activebgoncolor=RAISED2,
    textcolor=TEXT, activetextcolor=TEXT, textoncolor=ORANGE, activetextoncolor=ORANGE,
    bordercolor=FILL, focusbordercolor=ORANGE,
    hint="Start: Rampe beginnt auf der nächsten 1. Nochmal = abbrechen.",
    annotation="Start: die Rampe beginnt auf der nächsten 1 und gleitet über die eingestellten Takte zum Ziel. Nochmal drücken bricht ab.",
    saved_attribute_attributes={"valueof": {"parameter_longname": "Start", "parameter_shortname": "Start",
                                            "parameter_type": 2, "parameter_mmax": 1, "parameter_enum": ["aus", "an"],
                                            "parameter_initial_enable": 1, "parameter_initial": [0]}}, **common)
obj("pstart", "prepend start", [320, 200, 90, 22])
line("start", 0, "pstart", 0); line("pstart", 0, "ui", 0)
line("ui", 1, "start", 0)

line("tb", 2, "bars", 0); line("tb", 1, "ziel", 0); line("tb", 0, "ui", 0)

# Schläge: Metro im Takt von Live (läuft nur, wenn Live spielt)
obj("lb", "loadbang", [500, 20, 60, 22], 1, 1, ["bang"])
box("one", "message", [500, 50, 30, 22], "1", 2, 1, [""])
obj("met", "metro 4n @quantize 4n", [500, 80, 140, 22], 2, 1, ["bang"])
box("tick", "message", [500, 110, 40, 22], "tick", 2, 1, [""])
line("lb", 0, "one", 0); line("one", 0, "met", 0); line("met", 0, "tick", 0); line("tick", 0, "ui", 0)

# Neustart nach Update: compile, dann wie beim Laden
obj("dl", "deferlow", [720, 300, 60, 22])
obj("rt", "t b b", [720, 330, 40, 22], 1, 2, ["bang", "bang"])
box("comp", "message", [760, 360, 55, 22], "compile", 2, 1, [""])
line("ui", 2, "dl", 0); line("dl", 0, "rt", 0); line("rt", 1, "comp", 0); line("comp", 0, "ui", 0); line("rt", 0, "tb", 0)

# Schwebe-Fenster: eigene jsui-Instanz (Argument "win"), Zustand über ---bpmstate, Bedienung über ---bpmcmd
obj("sst", "s ---bpmstate", [420, 500, 100, 22], 1, 0, [])
obj("rcmd", "r ---bpmcmd", [420, 260, 90, 22], 0, 1, [""])
line("ui", 5, "sst", 0); line("rcmd", 0, "ui", 0)
obj("pc", "pcontrol", [560, 530, 60, 22], 1, 1, [""])
line("ui", 6, "pc", 0)
SW, SH = 450, 254
win_boxes = [
    {"box": {"id": "w1", "maxclass": "inlet", "numinlets": 0, "numoutlets": 1, "outlettype": [""], "patching_rect": [10, 10, 30, 30]}},
    {"box": {"id": "w2", "maxclass": "newobj", "text": "r ---bpmstate", "numinlets": 0, "numoutlets": 1, "outlettype": [""], "patching_rect": [10, 60, 90, 22]}},
    {"box": {"id": "w3", "maxclass": "jsui", "filename": "bpmchanger.js", "jsarguments": ["win"], "parameter_enable": 0,
             "numinlets": 1, "numoutlets": 7, "outlettype": [""] * 7, "patching_rect": [10, 100, SW, SH],
             "presentation": 1, "presentation_rect": [0, 0, SW, SH]}},
    {"box": {"id": "w4", "maxclass": "newobj", "text": "s ---bpmcmd", "numinlets": 1, "numoutlets": 0, "outlettype": [], "patching_rect": [10, 400, 90, 22]}},
    {"box": {"id": "w5", "maxclass": "newobj", "text": "loadbang", "numinlets": 1, "numoutlets": 1, "outlettype": ["bang"], "patching_rect": [500, 10, 60, 22]}},
    {"box": {"id": "w6", "maxclass": "message", "numinlets": 2, "numoutlets": 1, "outlettype": [""], "patching_rect": [500, 40, 420, 22],
             "text": "window flags float, window flags nogrow, window flags nozoom, window size 200 200 %d %d, window exec, title BPM Changer" % (200 + SW, 200 + SH)}},
    {"box": {"id": "w7", "maxclass": "newobj", "text": "thispatcher", "numinlets": 1, "numoutlets": 2, "outlettype": ["", ""], "patching_rect": [500, 80, 80, 22]}},
    {"box": {"id": "w8", "maxclass": "message", "numinlets": 2, "numoutlets": 1, "outlettype": [""], "patching_rect": [120, 10, 60, 22], "text": "wopen"}},
]
win_lines = [{"patchline": {"source": a, "destination": b}} for a, b in [
    (["w2", 0], ["w3", 0]), (["w3", 0], ["w4", 0]), (["w5", 0], ["w6", 0]), (["w6", 0], ["w7", 0]),
    (["w1", 0], ["w8", 0]), (["w8", 0], ["w4", 0])]]
boxes.append({"box": {"id": "win", "maxclass": "newobj", "text": "p window", "varname": "window", "numinlets": 1, "numoutlets": 0,
    "outlettype": [], "patching_rect": [560, 570, 70, 22],
    "patcher": {"fileversion": 1, "appversion": {"major": 8, "minor": 6, "revision": 0, "architecture": "x64", "modernui": 1},
                "classnamespace": "box", "rect": [200, 200, SW, SH], "bglocked": 0, "openinpresentation": 1,
                "default_fontsize": 12.0, "default_fontface": 0, "default_fontname": "Arial", "gridonopen": 1,
                "gridsize": [15.0, 15.0], "gridsnaponopen": 1, "toolbarvisible": 0, "boxes": win_boxes, "lines": win_lines}}})
line("pc", 0, "win", 0)

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
    "classnamespace": "box", "rect": [100, 100, 900, 500], "bglocked": 0, "openinpresentation": 1,
    "default_fontsize": 12.0, "default_fontface": 0, "default_fontname": "Arial",
    "gridonopen": 1, "gridsize": [15.0, 15.0], "gridsnaponopen": 1, "toolbarvisible": 1,
    "devicewidth": 300.0, "locked_bgcolor": BG, "editing_bgcolor": BG, "description": "BPM Changer – Tempo weich ändern, Rampe über Takte",
    "boxes": boxes, "lines": lines, "parameters": params,
    "dependency_cache": [], "autosave": 0,
}}
txt = json.dumps(patch, indent=1, ensure_ascii=False)
(root / "src" / "bpmchanger" / "bpmchanger.maxpat").write_text(txt)
(root / "bpmchanger" / "BPM Changer.amxd.json").write_text(txt)
body = txt.encode("utf-8") + b"\n\0"
head = b"ampf" + struct.pack("<I", 4) + b"aaaa" + b"meta" + struct.pack("<I", 4) + struct.pack("<I", 0) + b"ptch" + struct.pack("<I", len(body))
(root / "bpmchanger" / "BPM Changer.amxd").write_bytes(head + body)
print("ok", len(boxes), "boxes")
