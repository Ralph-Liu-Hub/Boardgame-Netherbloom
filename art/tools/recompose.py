"""Move a centred subject off-centre without generative AI.

The canvas is widened on one side by `shift` x width; the new strip is filled from the painting's own background
(the edge strip, mirrored, nudged vertically and slightly rescaled so it doesn't read as a reflection), the join is
blended with Frequency Selective Reconstruction inpainting (OpenCV xphoto, a classical algorithm), and the picture is
cropped back to its original size from the other side. The subject moves by `shift` x width toward that other side.
  python3 recompose.py IN OUT --shift 0.12        # positive: subject moves left (new strip on the right)
  python3 recompose.py IN OUT --shift -0.12       # negative: subject moves right
"""
import argparse
import numpy as np, cv2

def widen_right(img, e, rng):
    h, w = img.shape[:2]
    src = img[:, w - e:][:, ::-1]                            # mirrored edge strip
    s = 1 + rng.uniform(0.04, 0.09)                          # slight rescale and vertical nudge break the symmetry
    big = cv2.resize(src, (int(e * s), int(h * s)), interpolation=cv2.INTER_CUBIC)
    dy = int(rng.uniform(0.02, 0.06) * h) * (1 if rng.random() < .5 else -1)
    y0 = max(0, min(big.shape[0] - h, (big.shape[0] - h) // 2 + dy))
    strip = big[y0:y0 + h, :e]
    strip = cv2.GaussianBlur(strip, (0, 0), 1.2)             # quieter than the subject's side
    out = np.concatenate([img, strip], axis=1)
    # blend the join: inpaint a band either side of it
    band = max(8, int(0.05 * w))
    mask = np.zeros(out.shape[:2], np.uint8)
    mask[:, w - band // 3: w + band] = 255
    small = 2                                                # inpaint at half size (FSR is slow), then paste back
    o2 = cv2.resize(out, (out.shape[1] // small, h // small), interpolation=cv2.INTER_AREA)
    m2 = cv2.resize(mask, (o2.shape[1], o2.shape[0]), interpolation=cv2.INTER_NEAREST)
    fill = np.zeros_like(o2)
    cv2.xphoto.inpaint(o2, 255 - m2, fill, cv2.xphoto.INPAINT_FSR_FAST)
    fill = cv2.resize(fill, (out.shape[1], h), interpolation=cv2.INTER_CUBIC)
    soft = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), band / 4)[..., None]
    out = (out * (1 - soft) + fill * soft).astype(np.uint8)
    return out

def crop_in(img, c, x0, y0):
    """Tighten the frame to c x the size at (x0, y0) (fractions), then scale back up to the original size."""
    h, w = img.shape[:2]
    cw, ch = int(round(c * w)), int(round(c * h)); X, Y = int(round(x0 * w)), int(round(y0 * h))
    return cv2.resize(img[Y:Y + ch, X:X + cw], (w, h), interpolation=cv2.INTER_LANCZOS4)

def recompose(img, shift, seed=0):
    rng = np.random.default_rng(seed)
    h, w = img.shape[:2]
    e = int(round(abs(shift) * w))
    if e < 2: return img
    if shift < 0: img = img[:, ::-1]
    out = widen_right(img, e, rng)[:, e:]
    return out[:, ::-1] if shift < 0 else out

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src"); ap.add_argument("dst"); ap.add_argument("--shift", type=float, default=0); ap.add_argument("--crop", type=float, nargs=3, metavar=("C", "X0", "Y0")); ap.add_argument("--seed", type=int, default=0)
    o = ap.parse_args()
    img = cv2.imread(o.src, cv2.IMREAD_COLOR)
    cv2.imwrite(o.dst, crop_in(img, *o.crop) if o.crop else recompose(img, o.shift, o.seed))
