#!/bin/sh
# The illustrated Rulebook as Word files (and PDFs of them), English and Traditional Chinese, for Google Drive.
# Needs: the factory rulebooks built first (node print/factory/build.mjs --only rulebook, both languages),
# Playwright (PLAYWRIGHT_CORE, CHROMIUM_PATH), Python 3 with Pillow, and LibreOffice (soffice).
#   sh print/docx/build.sh   → print/out/docx/
set -e
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT="$ROOT/print/out/docx"; mkdir -p "$OUT/figs" "$OUT/jpg" "$OUT/icons"
for l in en zh-TW; do node "$ROOT/print/docx/figures.mjs" "$ROOT/print/out/factory/$l/rulebook/rulebook.html" "$l" "$OUT/figs"; done
python3 - "$OUT/figs" "$OUT/jpg" <<'PY'
import sys, os
from PIL import Image
src, dst = sys.argv[1:]
for f in sorted(os.listdir(src)):
    im = Image.open(os.path.join(src, f)).convert("RGB")
    if im.width > 1400: im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
    im.save(os.path.join(dst, f.replace(".png", ".jpg")), quality=84, optimize=True, progressive=True)
PY
node "$ROOT/print/docx/icons.mjs" "$ROOT" "$OUT/icons"
ICONS="$OUT/icons" node "$ROOT/print/docx/html.mjs" "$ROOT" "$OUT/jpg" "$OUT"
cd "$OUT" && python3 "$ROOT/print/docx/convert.py"
