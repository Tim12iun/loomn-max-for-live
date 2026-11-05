# Kopiert die gemeinsamen Blöcke aus src/shared/ in die Device-Scripts (zwischen BEGIN/END-Markern).
# Aufruf aus dem Repo-Ordner: python3 src/shared/sync_shared.py
#  - loomn_update.js   -> alle Plugins (Update-Knopf)
#  - setmaker_shared.js -> nur sortn (prepn hat seine eigene, eingefrorene Kopie und bleibt unabhängig)
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent.parent
shared = root / "src" / "shared"
BLOCKS = {
    "loomn_update": (shared / "loomn_update.js", ["prepn/setmaker_prep.js", "sortn/sortn.js"]),
    "setmaker_shared": (shared / "setmaker_shared.js", ["sortn/sortn.js"]),
}
for name, (src, targets) in BLOCKS.items():
    B, E = "// ==== BEGIN " + name, "// ==== END " + name + " ===="
    txt = src.read_text()
    blk = txt[txt.index(B):txt.index(E) + len(E)]
    for t in targets:
        p = root / t
        s = p.read_text()
        s = s[:s.index(B)] + blk + s[s.index(E) + len(E):]
        p.write_text(s)
        print("ok", name, "->", t)
