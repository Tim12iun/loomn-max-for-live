# Kopiert den Block aus m4l/setmaker_shared.js in m4l/setmaker_prep.js (zwischen BEGIN/END-Markern).
import pathlib
d = pathlib.Path(__file__).resolve().parent.parent / "m4l"
shared = (d / "setmaker_shared.js").read_text()
B, E = "// ==== BEGIN setmaker_shared", "// ==== END setmaker_shared ===="
blk = shared[shared.index(B):shared.index(E) + len(E)]
p = d / "setmaker_prep.js"; s = p.read_text()
s = s[:s.index(B)] + blk + s[s.index(E) + len(E):]
p.write_text(s); print("ok")
