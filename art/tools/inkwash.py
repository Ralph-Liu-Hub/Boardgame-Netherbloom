"""Ink-and-wash treatment for the Netherbloom paintings (no generative AI).

Pushes each painting away from the glossy generated look and toward a hand-made ink-and-watercolour plate:
  1. colour restraint: less saturation overall; lily reds pulled toward a dull madder; cyan/teal greyed; colour casts by tone neutralised
  2. light: glows and blown highlights compressed; blacks lifted to the darkest an ink wash on toned paper reaches
  3. watercolour: edge-preserving flattening into washes, pigment pooling at wash edges, uneven density
  4. pen: soft difference-of-Gaussians line work in sepia ink, its pressure varying across the sheet
  5. paper: toned paper grain and fibres showing through, strongest in thin (light) passages
Usage: python3 inkwash.py IN OUT [--kind painting|back|texture] [--seed N]
"""
import argparse, math
import numpy as np, cv2

def noise(h, w, scale, rng, octaves=4):
    """Smooth value noise in [-1, 1] with features about `scale` px across."""
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        s = max(2, int(scale / 2 ** o))
        small = rng.standard_normal((h // s + 2, w // s + 2)).astype(np.float32)
        out += amp * cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)[:h, :w]
        tot += amp; amp *= 0.5
    out /= tot
    return np.clip(out / (out.std() * 2.5 + 1e-6), -1, 1)

def paper(h, w, rng, k):
    """Toned paper: fine grain plus a few long fibres, as a multiplicative map around 1."""
    grain = cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), 0.7 * k)
    grain /= grain.std() + 1e-6
    fib = rng.standard_normal((h, w)).astype(np.float32)
    fib = cv2.GaussianBlur(fib, (0, 0), sigmaX=6 * k, sigmaY=0.6 * k)
    fib = cv2.warpAffine(fib, cv2.getRotationMatrix2D((w / 2, h / 2), rng.uniform(-25, 25), 1), (w, h), borderMode=cv2.BORDER_REFLECT)
    fib /= fib.std() + 1e-6
    tooth = noise(h, w, 40 * k, rng, 3)
    return 1 + 0.042 * grain + 0.03 * fib + 0.035 * tooth

def treat(img, kind="painting", seed=0):
    rng = np.random.default_rng(seed)
    h, w = img.shape[:2]
    k = max(h, w) / 1456.0                       # scale every radius to the image size
    f = img.astype(np.float32) / 255.0

    # 1. colour restraint, in Lab (L 0-100)
    lab = cv2.cvtColor(f, cv2.COLOR_RGB2LAB)
    L, a, b = cv2.split(lab)
    C = np.hypot(a, b); H = np.degrees(np.arctan2(b, a)) % 360
    red = np.exp(-(((H - 35 + 180) % 360 - 180) / 30) ** 2)        # lily reds (a+, b small/+)
    cyan = np.exp(-(((H - 225 + 180) % 360 - 180) / 40) ** 2)      # teal / cyan glow
    orange = np.exp(-(((H - 70 + 180) % 360 - 180) / 22) ** 2)     # warm golden-hour cast
    scale = 0.74 - 0.34 * cyan - 0.02 * orange + 0.06 * red
    H2 = np.radians(H + 9 * red)                                    # reds toward brown madder
    C2 = C * scale
    a, b = C2 * np.cos(H2), C2 * np.sin(H2)
    # neutralise colour casts per tonal band (teal shadows, orange highlights)
    for lo, hi in ((0, 30), (30, 60), (60, 101)):
        m = (L >= lo) & (L < hi)
        if m.sum() > 500:
            band = np.clip(1 - np.abs(L - (lo + hi) / 2) / ((hi - lo) * 0.9), 0, 1)
            a -= 0.55 * band * np.median(a[m]); b -= 0.55 * band * np.median(b[m])

    # 2. light: compress glows and highlights, lift blacks to ink-on-toned-paper
    bloom = cv2.GaussianBlur(L, (0, 0), 18 * k)
    halo = np.clip(bloom - 35, 0, None) * np.clip((L - 30) / 40, 0, 1)   # bright surroundings of light sources
    L = L - 0.30 * halo
    L = np.where(L > 74, 74 + (L - 74) * 0.65, L)
    L = 48 + (L - 48) * 1.12                                         # keep the ink darks deep
    L = 4 + np.clip(L, 0, 100) * 0.96
    f = cv2.cvtColor(cv2.merge([L, a, b]).astype(np.float32), cv2.COLOR_LAB2RGB)
    f = np.clip(f, 0, 1)

    # 3. watercolour washes
    u8 = (f * 255).astype(np.uint8)
    flat = u8
    for _ in range(2):
        flat = cv2.bilateralFilter(flat, d=0, sigmaColor=22, sigmaSpace=4 * k)
    if kind != "back":
        flat = cv2.pyrMeanShiftFiltering(flat, sp=int(7 * k) + 2, sr=22)
    flat = flat.astype(np.float32) / 255.0
    keep = {"painting": 0.2, "texture": 0.4, "back": 0.55}[kind]   # how much of the original detail survives
    wash = flat * (1 - keep) + f * keep
    gl = cv2.cvtColor(flat, cv2.COLOR_RGB2GRAY)
    edge = cv2.magnitude(cv2.Sobel(gl, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(gl, cv2.CV_32F, 0, 1, ksize=3))
    edge = cv2.GaussianBlur(np.clip(edge * 3, 0, 1), (0, 0), 0.8 * k)
    density = 1 + 0.07 * noise(h, w, 180 * k, rng)                 # washes laid unevenly
    wash = wash * (1 - 0.32 * edge[..., None]) * density[..., None]

    # 4. pen line (XDoG), pressure varying across the sheet
    if kind != "texture":
        g = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)
        g1 = cv2.GaussianBlur(g, (0, 0), 0.9 * k); g2 = cv2.GaussianBlur(g, (0, 0), 1.6 * k)
        d = g1 - 0.985 * g2
        line = np.clip(1 - (1 + np.tanh(90 * (d + 0.006))) / 2, 0, 1)
        line = cv2.GaussianBlur(line, (0, 0), 0.5 * k)
        press = 0.55 + 0.45 * (noise(h, w, 260 * k, rng) * 0.5 + 0.5)
        ink = np.array([0.16, 0.12, 0.09], np.float32)
        alpha = (line * press * (0.8 if kind == "painting" else 0.45))[..., None]
        wash = wash * (1 - alpha) + ink * alpha

    # 5. toned paper showing through, mostly in light passages
    pap = paper(h, w, rng, k)
    tone = np.array([0.80, 0.74, 0.64], np.float32)                 # warm grey-brown paper
    lum = cv2.cvtColor(np.clip(wash, 0, 1), cv2.COLOR_RGB2GRAY)[..., None]
    wash = wash * (1 - 0.09 * lum) + tone * 0.09 * lum
    wash = wash * pap[..., None]
    return (np.clip(wash, 0, 1) * 255 + 0.5).astype(np.uint8)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst")
    ap.add_argument("--kind", default="painting", choices=["painting", "back", "texture"])
    ap.add_argument("--seed", type=int, default=0)
    o = ap.parse_args()
    img = cv2.cvtColor(cv2.imread(o.src, cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
    out = treat(img, o.kind, o.seed)
    cv2.imwrite(o.dst, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
