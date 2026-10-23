"""Break up too-perfect faces on the female figures, by hand-made-looking ink and wash marks (no generative AI).
faces.json gives, per painting, the face ellipse [cx, cy, rx, ry] (fractions of width / height) and a mode:
  soot    - soot smudges and fine speckle (the Child)          mud  - silt, water stains, wet hair strands (the Garland Girl)
  ash     - grey ash smudges and dust (the Bride below)          weather - light grime and uneven skin (the Widow, the wedding day)
  veil    - a sheer veil over the face (kept, but not used: procedural veils read as a shape laid on top)
Every mode also mottles the skin so it is no longer airbrushed-smooth.
  python3 faces.py IN OUT --name soul-child [--faces faces.json]
"""
import argparse, json, math
import numpy as np, cv2

def blob_noise(h, w, scale, rng):
    s = max(2, int(scale)); small = rng.standard_normal((h // s + 3, w // s + 3)).astype(np.float32)
    n = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)[:h, :w]
    return n / (n.std() + 1e-6)

def ellipse_mask(h, w, cx, cy, rx, ry, soft):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    return np.clip((1 - d) / soft + 0.5, 0, 1)

def smudge(h, w, cx, cy, r, rng, elong=1.0, ang=0.0):
    """One irregular smudge: a noisy blob, denser in the middle, ragged at the edge."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    c, s = math.cos(ang), math.sin(ang)
    u = ((xx - cx) * c + (yy - cy) * s) / (r * elong); v = (-(xx - cx) * s + (yy - cy) * c) / r
    d = np.sqrt(u * u + v * v)
    n = blob_noise(h, w, max(3, r / 1.5), rng) * 0.25 + blob_noise(h, w, max(2, r / 5), rng) * 0.06
    return cv2.GaussianBlur(np.clip(1.1 - d + n, 0, 1) ** 1.3, (0, 0), max(1, r / 10))

def treat_face(img, face, mode, seed=0):
    rng = np.random.default_rng(seed)
    H, W = img.shape[:2]
    cx, cy, rx, ry = face[0] * W, face[1] * H, face[2] * W, face[3] * H
    # work on a padded crop around the face only
    x0, x1 = int(max(0, cx - 2.6 * rx)), int(min(W, cx + 2.6 * rx)); y0, y1 = int(max(0, cy - 2.6 * ry)), int(min(H, cy + 2.6 * ry))
    f = img[y0:y1, x0:x1].astype(np.float32) / 255; h, w = f.shape[:2]
    cx, cy = cx - x0, cy - y0
    face_m = ellipse_mask(h, w, cx, cy, rx, ry, 0.35)
    r = (rx + ry) / 2

    # every mode: mottled, uneven skin (light and dark patches, a little warmth variation)
    mott = blob_noise(h, w, r / 4, rng) * 0.6 + blob_noise(h, w, r / 12, rng) * 0.4
    f = f * (1 + 0.05 * mott * face_m)[..., None]
    yy0 = np.mgrid[0:h, 0:w][0].astype(np.float32)
    eyes = 1 - np.exp(-((yy0 - (cy - 0.12 * ry)) / (0.22 * ry)) ** 2)   # keep marks off the eyes

    if mode in ("soot", "weather", "ash"):
        soot = np.array([0.43, 0.41, 0.38] if mode == "ash" else [0.20, 0.16, 0.13], np.float32)
        spots = [(rng.choice([-1, 1]) * rng.uniform(.35, .6), rng.uniform(.25, .55)), (rng.uniform(-.4, .4), -rng.uniform(.55, .8)), (rng.uniform(-.3, .3), rng.uniform(.7, .85))]
        for (dx, dy) in spots[: 1 if mode == "weather" else 3]:
            m = smudge(h, w, cx + dx * rx, cy + dy * ry, r * rng.uniform(0.24, 0.34), rng, rng.uniform(1.6, 2.6), rng.uniform(-0.5, 0.5))
            al = (m * face_m * eyes * (rng.uniform(0.45, 0.6) if mode == "soot" else rng.uniform(0.55, 0.68) if mode == "ash" else 0.22))[..., None]
            f = f * (1 - al) + soot * al
        if mode in ("soot", "ash"):   # fine speckle (soot or ash dust)
            sp = (rng.random((h, w)) > 0.997).astype(np.float32)
            sp = cv2.GaussianBlur(sp, (0, 0), 0.7) * 3 * face_m * eyes
            f = f * (1 - np.clip(sp, 0, .6)[..., None] * 0.5)

    if mode == "mud":
        silt = np.array([0.30, 0.27, 0.20], np.float32)
        for i in range(2):   # silt patches near the temple and jaw
            a = rng.choice([math.pi * .85, math.pi * .15, math.pi * 1.2]) + rng.uniform(-.3, .3)
            m = smudge(h, w, cx + math.cos(a) * .65 * rx, cy + math.sin(a) * .6 * ry, r * rng.uniform(.25, .4), rng, 1.6, rng.uniform(0, 3))
            al = (m * face_m * eyes * 0.6)[..., None]; f = f * (1 - al) + silt * al
        # water runs: thin wavering drips from the hairline downward
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        for i in range(5):
            x_start = cx + rx * rng.uniform(-.8, .8); wob = rng.uniform(1.5, 3.5)
            line_x = x_start + wob * np.sin(yy / rng.uniform(6, 12) + rng.uniform(0, 6)) + (yy - (cy - ry)) * rng.uniform(-.08, .08)
            dist = np.abs(xx - line_x)
            m = np.exp(-(dist / rng.uniform(1.0, 1.8)) ** 2) * (yy > cy - ry * rng.uniform(.6, 1.0)) * (yy < cy + ry * rng.uniform(.2, .9))
            al = (m * face_m * 0.5)[..., None]; f = f * (1 - al) + silt * 0.6 * al
        # wet hair strands across the face
        for i in range(7):
            p0 = np.array([cx + rx * rng.uniform(-1.1, 1.1), cy - ry * 1.05]); p1 = p0 + [rx * rng.uniform(-.7, .7), ry * rng.uniform(1.2, 1.9)]
            pc = (p0 + p1) / 2 + [rx * rng.uniform(-.5, .5), 0]
            pts = np.array([(1 - t) ** 2 * p0 + 2 * (1 - t) * t * pc + t ** 2 * p1 for t in np.linspace(0, 1, 40)], np.int32)
            lay = np.zeros((h, w), np.float32); cv2.polylines(lay, [pts], False, 1.0, max(2, int(r / 18)), cv2.LINE_AA)
            lay = cv2.GaussianBlur(lay, (0, 0), 0.7) * ellipse_mask(h, w, cx, cy, rx * 1.3, ry * 1.3, 0.3)
            f = f * (1 - (lay * 0.8)[..., None]) + np.array([0.16, 0.10, 0.07], np.float32) * (lay * 0.8)[..., None]

    if mode == "veil":
        # a sheer veil: rounded over the crown, then falling past the face and flaring toward the shoulders;
        # its sides waver (cloth, not a cut shape), its edges fade with only a broken trace of a drawn line,
        # and it carries soft folds, a faint mesh and an uneven lace hem
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        hcx, hcy = cx, cy - ry * 0.35                                  # the crown sits above the face centre
        crown = ((xx - hcx) / (rx * 1.3)) ** 2 + ((yy - hcy) / (ry * 1.35)) ** 2 <= 1
        t = np.clip((yy - hcy) / (ry * 2.0), 0, 1)
        wav = blob_noise(h, w, r / 1.5, rng)[:, :1] * 0                 # placeholder keeps shapes aligned
        sidew = rx * (1.3 + 0.55 * t ** 1.3) * (1 + 0.07 * np.sin(yy / (ry * 0.33) + rng.uniform(0, 6)))
        skirt = (yy >= hcy) & (np.abs(xx - hcx) <= sidew)
        bot = cy + ry * (1.25 + 0.12 * np.sin((xx - cx) / (rx * 0.5) + rng.uniform(0, 6)))
        shape = (crown | skirt) & (yy <= bot)
        m = cv2.GaussianBlur(shape.astype(np.float32), (0, 0), max(2.0, r / 25))
        fold = 0.5 + 0.5 * np.sin((xx - hcx) / (rx * rng.uniform(.15, .21)) * (1 - 0.3 * t) + 0.7 * np.sin(yy / (ry * .7)))
        mesh = (0.5 + 0.5 * np.sin((xx + yy) * 1.7)) * (0.5 + 0.5 * np.sin((xx - yy) * 1.7))
        bone = np.array([0.88, 0.84, 0.76], np.float32)
        under = cv2.GaussianBlur(f, (0, 0), max(0.8, r / 70))
        al = m * (0.12 + 0.11 * fold + 0.05 * mesh)
        f = under * (1 - al[..., None]) + bone * al[..., None]
        # a broken trace of the edge and hem, as if drawn with a fine pen
        edge = cv2.morphologyEx(shape.astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((2, 2), np.uint8)).astype(np.float32)
        brk = (blob_noise(h, w, r / 4, rng) > 0.2).astype(np.float32)
        ink = cv2.GaussianBlur(edge * brk, (0, 0), 0.6) * 0.35
        f = f * (1 - ink[..., None]) + bone * ink[..., None]

    out = img.copy()
    out[y0:y1, x0:x1] = (np.clip(f, 0, 1) * 255 + .5).astype(np.uint8)
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("dst"); ap.add_argument("--name", required=True)
    ap.add_argument("--faces", default="faces.json"); ap.add_argument("--seed", type=int, default=3)
    o = ap.parse_args()
    F = json.load(open(o.faces))[o.name]
    img = cv2.cvtColor(cv2.imread(o.src), cv2.COLOR_BGR2RGB)
    out = treat_face(img, F["face"], F["mode"], o.seed)
    cv2.imwrite(o.dst, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
