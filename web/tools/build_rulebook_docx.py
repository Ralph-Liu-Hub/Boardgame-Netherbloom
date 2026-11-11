# -*- coding: utf-8 -*-
"""Writes web/public/downloads/netherbloom-rulebook-v5.zh-TW.docx (the zh-TW V5 rulebook as an editable Word file) from
docs/rules/zh-TW/V5/Rulebook.md: pandoc for the structure (headings, tables, lists stay editable), python-docx for the
fonts, page and table borders, Chromium (Playwright) for the set-up figure, then a pass that puts pandoc's XML in the order
the Word schema requires.

    python3 web/tools/build_rulebook_docx.py      (needs pandoc, python-docx, lxml, Pillow and node with playwright)
"""
import re, subprocess, os, tempfile, zipfile, shutil
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from lxml import etree
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = tempfile.mkdtemp() + "/"
import sys
SOLO = "solo" in sys.argv[1:]   # python3 web/tools/build_rulebook_docx.py solo  -> the Solo Rulebook
OUT = os.path.join(ROOT, "web", "public", "downloads", "netherbloom-solo-rulebook-v5.zh-TW.docx" if SOLO else "netherbloom-rulebook-v5.zh-TW.docx")

src = open(os.path.join(ROOT, "docs", "rules", "zh-TW", "V5", "Solo-Rulebook.md" if SOLO else "Rulebook.md"), encoding="utf-8").read()
src = re.sub(r"^> 單人模式依照.*?\n\n", "", src, flags=re.S | re.M) if SOLO else src
src = re.sub(r"^> 設計理由.*?\n\n", "", src, flags=re.S | re.M)              # repository note, not for players
src = re.sub(r"```mermaid\n.*?```\n", "", src, flags=re.S)                  # the flowchart: the numbered list after it says the same
m_fig = re.search(r'<div class="figure">(<svg.*?</svg>)</div>', src, flags=re.S)
svg = m_fig.group(1) if m_fig else "<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'></svg>"
open(D + "fig.svg", "w").write(svg)
# the figure: drawn by Chromium at twice its size, dark lines on white
subprocess.run(["node", "-e", """
const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
  const svg = fs.readFileSync(process.argv[1], "utf8").replace(/max-width:720px/, "width:720px");
  await p.setContent(`<div id=f style="color:#2b2420;background:#fff;width:720px;padding:6px">${svg}</div>`);
  await (await p.$("#f")).screenshot({ path: process.argv[2] }); await b.close(); })();""", D + "fig.svg", D + "fig-setup.png"], check=True)
src = re.sub(r'<div class="figure"><svg.*?</svg></div>', "![兩人局的桌面配置](" + D + "fig-setup.png)", src, flags=re.S)
# token pictures (docs/rules/icons): drawn by Chromium at 64 px, shown about 5 mm wide
ICONS = os.path.join(ROOT, "docs", "rules", "icons")
subprocess.run(["node", "-e", """
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  for (const f of fs.readdirSync(process.argv[1]).filter(f => f.endsWith(".svg"))) {
    await p.setContent(`<div id=f style="width:64px;height:64px;background:#fff">${fs.readFileSync(path.join(process.argv[1], f), "utf8").replace('width="48" height="48"', 'width="64" height="64"')}</div>`);
    await (await p.$("#f")).screenshot({ path: path.join(process.argv[2], "icon-" + f.replace(".svg", ".png")) });
  }
  await b.close(); })();""", ICONS, D], check=True)
for f in os.listdir(D):
    if f.startswith("icon-"): Image.open(D + f).save(D + f, dpi=(330, 330))
src = re.sub(r'<img src="(?:\.\./)+icons/([\w-]+)\.svg" alt="([^"]*)"[^>]*>', lambda m: f"![{m.group(2)}]({D}icon-{m.group(1)}.png)", src)
# rule boxes: marker paragraphs that the pass below turns into a border around everything between them
src = src.replace("<br>", "⏎")   # a line break inside a table cell; turned into a Word line break below
src = src.replace('<div class="rulebox" markdown="1">', "BOXSTART").replace("</div>\n", "BOXEND\n")
open(D + "rulebook.md", "w", encoding="utf-8").write(src)
# the first heading becomes the document title, the numbered sections Heading 1, their parts Heading 2;
# the rulebook's own contents list stays (its links jump to the sections)
subprocess.run(["pandoc", D + "rulebook.md", "-f", "gfm", "-t", "docx", "--shift-heading-level-by=-1", "-o", D + "raw.docx"], check=True)

doc = Document(D + "raw.docx")
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
for side in ("left_margin", "right_margin"): setattr(sec, side, Cm(2.2))
sec.top_margin, sec.bottom_margin = Cm(2.2), Cm(2.2)
sec.header_distance, sec.footer_distance, sec.gutter = Cm(1.2), Cm(1.2), Cm(0)

CJK, LAT = "Microsoft JhengHei", "Calibri"
def font(style, size=None, bold=None, color=None):
    f = style.font
    f.name = LAT
    if size: f.size = Pt(size)
    if bold is not None: f.bold = bold
    if color: f.color.rgb = RGBColor.from_string(color)
    rpr = style.element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    if rf is None: rf = OxmlElement("w:rFonts"); rpr.insert(0, rf)
    for k in ("w:ascii", "w:hAnsi", "w:cs"): rf.set(qn(k), LAT)
    rf.set(qn("w:eastAsia"), CJK)
    for k in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        if rf.get(qn(k)) is not None: del rf.attrib[qn(k)]
names = {s.name: s for s in doc.styles}
for n, sz, b, c in [("Normal", 11, None, None), ("Body Text", 11, None, None), ("First Paragraph", 11, None, None), ("Compact", 11, None, None),
                    ("Title", 24, True, "5A1E24"), ("Heading 1", 18, True, "5A1E24"), ("Heading 2", 14, True, "7A4A1E"), ("Heading 3", 12, True, "333333"),
                    ("Block Text", 10.5, None, "444444"), ("TOC Heading", 16, True, "5A1E24")]:
    if n in names: font(names[n], sz, b, c)
for n in ("Body Text", "First Paragraph", "Compact"):
    if n in names:
        pf = names[n].paragraph_format; pf.line_spacing = 1.3; pf.space_after = Pt(4)
for n in ("Heading 1", "Heading 2", "Heading 3"):
    if n not in names: continue
    pf = names[n].paragraph_format; pf.space_before = Pt(14 if n == "Heading 1" else 10); pf.space_after = Pt(6); pf.keep_with_next = True

# every table: thin borders, a shaded header row, a little cell padding
def borders(tbl):
    tblPr = tbl._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "4"); e.set(qn("w:color"), "999999"); b.append(e)
    old = tblPr.find(qn("w:tblBorders"))
    if old is not None: tblPr.remove(old)
    tblPr.append(b)
    mar = OxmlElement("w:tblCellMar")
    for edge, w in (("top", 40), ("left", 80), ("bottom", 40), ("right", 80)):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:w"), str(w)); e.set(qn("w:type"), "dxa"); mar.append(e)
    tblPr.append(mar)
    w = tblPr.find(qn("w:tblW"))   # full page width
    if w is None: w = OxmlElement("w:tblW"); tblPr.append(w)
    w.set(qn("w:w"), "5000"); w.set(qn("w:type"), "pct")
    for cell in tbl.rows[0].cells:
        tcPr = cell._tc.get_or_add_tcPr()
        sh = OxmlElement("w:shd"); sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), "EFE6D6"); tcPr.append(sh)
        for p in cell.paragraphs:
            for r in p.runs: r.bold = True
for t in doc.tables: borders(t)
# line breaks inside table cells (⏎ from <br>): python-docx writes "\n" in a run as a Word line break
for tbl in doc.tables:
    for row in tbl.rows:
        for cell in row.cells:
            for para in cell.paragraphs:
                for run in para.runs:
                    if "⏎" in run.text: run.text = run.text.replace("⏎", "\n")
# column widths by how much each column holds, so the table fills the printed width without crowding any column;
# a table with five or more columns is set a size smaller
PAGE = 9400   # A4 less the margins, in twentieths of a point
def fit_widths(tbl):
    rows = tbl.rows
    n = len(tbl.columns)
    if n < 2: return
    want = [0] * n
    for r in rows:
        for i, c in enumerate(r.cells[:n]):
            want[i] = max(want[i], min(max(len(x) for x in c.text.strip().split("\n")) if c.text.strip() else 0, 40) + 4)
    tot = sum(want)
    widths = [max(int(PAGE * w / tot), 1500 if n >= 4 else 1100) for w in want]
    over = sum(widths) - PAGE
    if over > 0:   # take the excess from the widest column
        widths[widths.index(max(widths))] -= over
    widths[-1] += PAGE - sum(widths)
    tblPr = tbl._tbl.tblPr
    lay = tblPr.find(qn("w:tblLayout"))
    if lay is None: lay = OxmlElement("w:tblLayout"); tblPr.append(lay)
    lay.set(qn("w:type"), "fixed")
    grid = tbl._tbl.find(qn("w:tblGrid"))
    if grid is not None:
        for gc, w in zip(grid.findall(qn("w:gridCol")), widths): gc.set(qn("w:w"), str(w))
    for r in rows:
        for c, w in zip(r.cells[:n], widths):
            tcPr = c._tc.get_or_add_tcPr()
            tw = tcPr.find(qn("w:tcW"))
            if tw is None: tw = OxmlElement("w:tcW"); tcPr.insert(0, tw)
            tw.set(qn("w:w"), str(w)); tw.set(qn("w:type"), "dxa")
            if n >= 5:
                for p in c.paragraphs:
                    for run in p.runs: run.font.size = Pt(9)
for t in doc.tables: fit_widths(t)
# children of table and cell properties in the order the schema requires
TBL = "tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook tblCaption tblDescription".split()
TC = "cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark".split()
def order(el, names):
    kids = list(el)
    for k in kids: el.remove(k)
    for k in sorted(kids, key=lambda e: names.index(e.tag.split("}")[1]) if e.tag.split("}")[1] in names else len(names)): el.append(k)
for t in doc.tables:
    order(t._tbl.tblPr, TBL)
    for row in t.rows:
        for c in row.cells:
            if c._tc.tcPr is not None: order(c._tc.tcPr, TC)
for shp in doc.inline_shapes:   # the set-up figure: 16 cm wide (token pictures keep their own small size)
    if shp.width > Cm(3):
        r = shp.height / shp.width; shp.width = Cm(16); shp.height = int(Cm(16) * r)
# rule boxes: everything between the BOXSTART and BOXEND paragraphs moves into a one-cell table with a gold border
body = doc.element.body
for start in [p for p in body.iterchildren(qn("w:p")) if "".join(p.itertext()).strip().startswith("BOXSTART")]:
    items, node = [], start.getnext()
    while not (node.tag == qn("w:p") and "".join(node.itertext()).strip().startswith("BOXEND")):
        items.append(node); node = node.getnext()
    end = node
    tbl = OxmlElement("w:tbl")
    tblPr = OxmlElement("w:tblPr")
    w = OxmlElement("w:tblW"); w.set(qn("w:w"), "5000"); w.set(qn("w:type"), "pct"); tblPr.append(w)
    bd = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "12"); e.set(qn("w:space"), "0"); e.set(qn("w:color"), "B08A4A"); bd.append(e)
    tblPr.append(bd)
    mar = OxmlElement("w:tblCellMar")
    for edge, v in (("top", 80), ("left", 160), ("bottom", 80), ("right", 160)):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); mar.append(e)
    tblPr.append(mar)
    tbl.append(tblPr)
    grid = OxmlElement("w:tblGrid"); gc = OxmlElement("w:gridCol"); gc.set(qn("w:w"), "9600"); grid.append(gc); tbl.append(grid)
    tr = OxmlElement("w:tr"); tc = OxmlElement("w:tc"); tcPr = OxmlElement("w:tcPr")
    tw = OxmlElement("w:tcW"); tw.set(qn("w:w"), "5000"); tw.set(qn("w:type"), "pct"); tcPr.append(tw)
    sh = OxmlElement("w:shd"); sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), "FAF5EA"); tcPr.append(sh)
    tc.append(tcPr)
    for it in items: tc.append(it)
    if items and items[-1].tag != qn("w:p"): tc.append(OxmlElement("w:p"))
    tr.append(tc); tbl.append(tr)
    start.addprevious(tbl)
    body.remove(start); body.remove(end)
assert not any("BOX" in p.text for p in doc.paragraphs)
# paragraph properties in schema order (pandoc puts numPr before pStyle in list items)
PPR = """pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku
wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents
suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange""".split()
for ppr in doc.element.body.iter(qn("w:pPr")): order(ppr, PPR)
doc.core_properties.title = "《彼岸花渡》Netherbloom — " + ("單人模式規則書 V5" if SOLO else "規則書 V5")
doc.core_properties.author = "Netherbloom"
doc.save(D + "built.docx")

# ---------------------------------------------------------------- schema order, smaller figure, pack
U = D + "unpacked"
with zipfile.ZipFile(D + "built.docx") as z: z.extractall(U)
ORDER = """writeProtection view zoom removePersonalInformation removeDateAndTime doNotDisplayPageBoundaries displayBackgroundShape
printPostScriptOverText printFractionalCharacterWidth printFormsData embedTrueTypeFonts embedSystemFonts saveSubsetFonts saveFormsData
mirrorMargins alignBordersAndEdges bordersDoNotSurroundHeader bordersDoNotSurroundFooter gutterAtTop hideSpellingErrors hideGrammaticalErrors
activeWritingStyle proofState formsDesign attachedTemplate linkStyles stylePaneFormatFilter stylePaneSortMethod documentType mailMerge
revisionView trackRevisions doNotTrackMoves doNotTrackFormatting documentProtection autoFormatOverride styleLockTheme styleLockQFSet
defaultTabStop autoHyphenation consecutiveHyphenLimit hyphenationZone doNotHyphenateCaps showEnvelope summaryLength clickAndTypeStyle
defaultTableStyle evenAndOddHeaders bookFoldRevPrinting bookFoldPrinting bookFoldPrintingSheets drawingGridHorizontalSpacing
drawingGridVerticalSpacing displayHorizontalDrawingGridEvery displayVerticalDrawingGridEvery doNotUseMarginsForDrawingGridOrigin
drawingGridHorizontalOrigin drawingGridVerticalOrigin doNotShadeFormData noPunctuationKerning characterSpacingControl printTwoOnOne
strictFirstAndLastChars noLineBreaksAfter noLineBreaksBefore savePreviewPicture doNotValidateAgainstSchema saveInvalidXml
ignoreMixedContent alwaysShowPlaceholderText doNotDemarcateInvalidXml saveXmlDataOnly useXSLTWhenSaving saveThroughXslt showXMLTags
alwaysMergeEmptyNamespace updateFields hdrShapeDefaults footnotePr endnotePr compat docVars rsids mathPr attachedSchema themeFontLang
clrSchemeMapping doNotIncludeSubdocsInStats doNotAutoCompressPictures forceUpgrade captions readModeInkLockDown smartTagType
schemaLibrary shapeDefaults doNotEmbedSmartTags decimalSymbol listSeparator""".split()
p = os.path.join(U, "word", "settings.xml")
tree = etree.parse(p)
root = tree.getroot()
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
kids = list(root)
def key(e):
    tag = e.tag.split("}")[1] if "}" in e.tag else e.tag
    return ORDER.index(tag) if tag in ORDER else len(ORDER)
for e in kids: root.remove(e)
for e in sorted(kids, key=key): root.append(e)
tree.write(p, xml_declaration=True, encoding="UTF-8", standalone=True)
print("reordered", len(kids))

# numbering.xml: nsid values are 8 hex digits
import os
num = os.path.join(os.path.dirname(p), "numbering.xml")
if os.path.exists(num):
    t = open(num, encoding="utf-8").read()
    t2 = re.sub(r'(<w:nsid w:val=")([0-9A-Fa-f]{1,7})(")', lambda m: m.group(1) + m.group(2).upper().zfill(8) + m.group(3), t)
    open(num, "w", encoding="utf-8").write(t2)
    print("nsid fixed", t != t2)

# styles.xml (pandoc's template): children of each style, and of table-cell properties, in schema order; no stray text in rPr
sty = os.path.join(os.path.dirname(p), "styles.xml")
STYLE = "name aliases basedOn next link autoRedefine hidden uiPriority semiHidden unhideWhenUsed qFormat locked personal personalCompose personalReply rsid pPr rPr tblPr trPr tcPr tblStylePr".split()
TC = "cnfStyle tcW gridSpan hMerge vMerge tcBorders shd noWrap tcMar textDirection tcFitText vAlign hideMark".split()
def reorder(el, names):
    kids = list(el)
    for k in kids: el.remove(k)
    for k in sorted(kids, key=lambda e: names.index(etree.QName(e).localname) if etree.QName(e).localname in names else len(names)): el.append(k)
st = etree.parse(sty); sr = st.getroot()
for e in sr.iter(W + "style"): reorder(e, STYLE)
for e in sr.iter(W + "tcPr"): reorder(e, TC)
PPR = """pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku
wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents
suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange""".split()
for e in sr.iter(W + "pPr"): reorder(e, PPR)
for e in sr.iter(W + "rPr"):
    if e.text and e.text.strip(): e.text = None
    for k in e:
        if k.tail and k.tail.strip(): k.tail = None
st.write(sty, xml_declaration=True, encoding="UTF-8", standalone=True)
print("styles reordered")

for png in [os.path.join(U, "word", "media", n) for n in os.listdir(os.path.join(U, "word", "media"))] if os.path.isdir(os.path.join(U, "word", "media")) else []:
    if png.endswith(".png"): Image.open(png).convert("RGB").quantize(colors=16).save(png, optimize=True)   # line art: 16 colours
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for base, _, files in os.walk(U):
        for n in files:
            full = os.path.join(base, n)
            z.write(full, os.path.relpath(full, U))
shutil.rmtree(D, ignore_errors=True)
print(OUT, os.path.getsize(OUT))
