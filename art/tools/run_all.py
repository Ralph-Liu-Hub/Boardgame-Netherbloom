"""The whole non-AI rework, in order: faces -> recompose -> ink-and-wash. Card backs and the scene-* animation art are left as they are.
  python3 run_all.py MASTERS_DIR OUT_DIR [name ...]"""
import json, sys, os, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from faces import treat_face
from recompose import recompose, crop_in
from inkwash import treat
HERE = os.path.dirname(os.path.abspath(__file__))
F = json.load(open(os.path.join(HERE, "faces.json"))); P = json.load(open(os.path.join(HERE, "plan.json")))
TEXTURE = lambda n: n.startswith(("tex-", "card-bank-")) or n == "card-fog"
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
names = sys.argv[3:] or sorted(f[:-4] for f in os.listdir(src) if f.endswith(".png"))
for i, n in enumerate(names):
    if n.startswith(("back-", "scene-")): continue
    img = cv2.cvtColor(cv2.imread(os.path.join(src, n + ".png")), cv2.COLOR_BGR2RGB)
    if n in F: img = treat_face(img, F[n]["face"], F[n]["mode"], 3)
    if n in P["extend"]: img = recompose(img, P["extend"][n], i)
    if n in P["crop"]: img = crop_in(img, *P["crop"][n])
    img = treat(img, "texture" if TEXTURE(n) else "painting", i)
    cv2.imwrite(os.path.join(dst, n + ".png"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
    print("done", n, flush=True)
