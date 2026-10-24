"""Makes the factory PDFs press-ready, in place, from the print plan (press-plan.json, written by build.mjs):
  1. converts every page to CMYK with the press profile (Ghostscript, relative colorimetric with black point compensation);
  2. adds a slug round the bleed with crop marks, bleed marks, registration targets, a CMYK colour bar and a page label,
     all in registration colour (100% of each ink) so they print on every plate; the marks sit at the same places on a
     front and its back, so the two sides can be registered on press;
  3. sets the PDF TrimBox and BleedBox, measured from the top-left corner where the artwork is anchored.
Usage: python3 print/factory/press.py print/out/factory/en   (needs Ghostscript and PyMuPDF; the profile is
print/factory/icc/FOGRA39-argyll.icc)."""
import json, os, subprocess, sys, tempfile
import pymupdf

MM = 72 / 25.4
HERE = os.path.dirname(os.path.abspath(__file__))
PROFILE = os.path.join(HERE, "icc", "FOGRA39-argyll.icc")
REG = (1, 1, 1, 1)          # registration colour
MARK = "netherbloom-press-v1"


def to_cmyk(src, dst):
    subprocess.run(["gs", "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.6",
                    "-sColorConversionStrategy=CMYK", "-sProcessColorModel=DeviceCMYK", f"-sOutputICCProfile={PROFILE}",
                    "-dRenderIntent=1", "-dBlackPtComp=1", "-dEmbedAllFonts=true", "-dSubsetFonts=true",
                    "-dDownsampleColorImages=false", "-dDownsampleGrayImages=false", "-dAutoFilterColorImages=false",
                    "-dColorImageFilter=/DCTEncode", "-dJPEGQ=95", f"-sOutputFile={dst}", src], check=True)


def target(shape, x, y):
    r = 2.2 * MM
    shape.draw_circle((x, y), r); shape.draw_circle((x, y), r * .5)
    shape.draw_line((x - r * 1.6, y), (x + r * 1.6, y)); shape.draw_line((x, y - r * 1.6), (x, y + r * 1.6))


def press(path, entry, bleed, slug, profile_name):
    tmp = tempfile.mktemp(suffix=".pdf")
    to_cmyk(path, tmp)
    src = pymupdf.open(tmp)
    out = pymupdf.open()
    tw, th = entry["trim"][0] * MM, entry["trim"][1] * MM
    b, s = bleed * MM, slug * MM
    n = len(src)
    labels = entry.get("labels") or []
    for i, page in enumerate(src):
        pw, ph = page.rect.width, page.rect.height
        W, H = tw + 2 * b + 2 * s, th + 2 * b + 2 * s
        p = out.new_page(width=W, height=H)
        # the artwork, anchored at its top-left corner exactly where the bleed box starts
        p.show_pdf_page(pymupdf.Rect(s, s, s + pw, s + ph), src, i)
        # cover anything the browser rounded past the nominal bleed box (at most 0.2 mm) with paper white
        p.draw_rect(pymupdf.Rect(s + tw + 2 * b, 0, W, H), color=None, fill=(0, 0, 0, 0), overlay=True)
        p.draw_rect(pymupdf.Rect(0, s + th + 2 * b, W, H), color=None, fill=(0, 0, 0, 0), overlay=True)
        x0, y0, x1, y1 = s + b, s + b, s + b + tw, s + b + th           # trim
        sh = p.new_shape()
        gap, ln = b + 1 * MM, 5 * MM                                      # marks start outside the bleed
        for x in (x0, x1):
            for y, d in ((y0, -1), (y1, 1)):
                sh.draw_line((x, y + d * gap), (x, y + d * (gap + ln)))
        for y in (y0, y1):
            for x, d in ((x0, -1), (x1, 1)):
                sh.draw_line((x + d * gap, y), (x + d * (gap + ln), y))
        sh.finish(color=REG, width=.25); sh.commit()
        # bleed marks: short ticks at the bleed edge
        sb = p.new_shape()
        for x in (x0 - b, x1 + b):
            for y, d in ((y0 - b, -1), (y1 + b, 1)):
                sb.draw_line((x, y + d * 1 * MM), (x, y + d * 3 * MM))
        sb.finish(color=REG, width=.15, dashes="[1 1] 0"); sb.commit()
        st = p.new_shape()
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        for (x, y) in ((cx, s / 2), (s / 2, cy), (W - s / 2, cy)):        # top, left, right: on the centre lines
            target(st, x, y)
        st.finish(color=REG, width=.25); st.commit()
        # CMYK colour bar, down the left slug between the top corner mark and the left target
        sw = min(3.2 * MM, (th / 2 - 5 * MM) / 9)
        for k, c in enumerate([(1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1), (.5, 0, 0, 0), (0, .5, 0, 0), (0, 0, .5, 0), (0, 0, 0, .5), (.6, .5, .5, 1)]):
            r = pymupdf.Rect(s / 2 - sw / 2, y0 + MM + k * sw, s / 2 + sw / 2, y0 + MM + (k + 1) * sw)
            p.draw_rect(r, color=None, fill=c)
        label = labels[i] if i < len(labels) else entry.get("labelsAuto", "page {n}").replace("{n}", str(i + 1)).replace("{N}", str(n)) \
            .replace("{c}", str(i // 2 + 1)).replace("{side}", "FRONT" if i % 2 == 0 else "BACK")
        dont = label.startswith(("DIE", "TRIM"))
        text = ("CUTTING GUIDE - DO NOT PRINT  |  " if dont else "") + f"{entry['path']}  p.{i + 1}/{n}  |  {label}  |  trim {entry['trim'][0]} x {entry['trim'][1]} mm, bleed {bleed} mm, {entry['sides']}, CMYK {profile_name}"
        # the label wraps inside the bottom slug, between the corner marks
        box = pymupdf.Rect(x0, y1 + b + 1.2 * MM, x1, H - 0.8 * MM)
        for fs in (5.5, 4.8, 4.2, 3.6):
            if p.insert_textbox(box, text, fontsize=fs, fontname="helv", color=(0, 0, 0, 1)) >= 0:
                break
        p.set_mediabox(pymupdf.Rect(0, 0, W, H))
        p.set_bleedbox(pymupdf.Rect(x0 - b, y0 - b, x1 + b, y1 + b))
        p.set_trimbox(pymupdf.Rect(x0, y0, x1, y1))
    out.set_metadata({**(src.metadata or {}), "keywords": MARK, "subject": f"CMYK, {profile_name}; trim {entry['trim'][0]} x {entry['trim'][1]} mm; bleed {bleed} mm"})
    out.save(path + ".tmp", garbage=3, deflate=True)
    out.close(); src.close(); os.remove(tmp)
    os.replace(path + ".tmp", path)


def main(d):
    plan = json.load(open(os.path.join(d, "press-plan.json")))
    for f in plan["files"]:
        path = os.path.join(d, f["path"])
        if not os.path.exists(path):
            continue
        doc = pymupdf.open(path)
        done = (doc.metadata or {}).get("keywords") == MARK
        doc.close()
        if done:
            continue
        press(path, f, plan["bleed"], plan["slug"], "FOGRA39")
        print("pressed", f["path"])


if __name__ == "__main__":
    main(sys.argv[1])
