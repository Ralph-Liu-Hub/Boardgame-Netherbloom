import re, base64, subprocess, sys, os, glob
# The Word Books of Remembrance: each <lang>-<soul>.html (from books.mjs) -> pictures embedded -> .docx (page numbers) and .pdf.
#   cd <out dir> && python3 books.py
CSS = """<style>
body{font-family:'Georgia','Noto Serif CJK TC',serif;font-size:11pt;line-height:1.4}
h1{font-size:22pt;text-align:center} h2{font-size:15pt;margin-top:16pt} h3{font-size:12pt}
p.eyebrow{text-align:center;letter-spacing:2pt;color:#8a6a3e} p.lore{text-align:center;color:#5c4a3a} p.fig{text-align:center}
table{border-collapse:collapse;width:100%} td{border:0.5pt solid #a89a86;padding:4pt;vertical-align:top}
</style>"""
b64 = lambda f: base64.b64encode(open(f, "rb").read()).decode()
names = sorted(f[:-5] for f in glob.glob("*.html") if not f.endswith("_emb.html"))
for n in names:
    s = open(f"{n}.html").read()
    s = re.sub(r'<img src="([^"]+)" style="width:([\d.]+)in" />', lambda m: f'<img src="data:image/jpeg;base64,{b64(m.group(1))}" width="{int(float(m.group(2))*96)}" />', s)
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    s = s.replace("</head>", CSS + "</head>").replace("</p>", "</p><h1>" + title + "</h1>", 1)
    open(f"{n}_emb.html", "w").write(s)
os.makedirs("lo", exist_ok=True)
subprocess.run(["soffice", "--headless", "--convert-to", "docx:MS Word 2007 XML", "--outdir", "lo"] + [f"{n}_emb.html" for n in names], capture_output=True, timeout=600)

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Mm
for n in names:
    doc = Document(f"lo/{n}_emb.docx")
    for sec in doc.sections:
        sec.page_width, sec.page_height = Mm(210), Mm(280)
        p = sec.footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run()
        run.font.size = Pt(10.5)
        for kind, text in (("begin", None), (None, " PAGE "), ("separate", None), (None, "1"), ("end", None)):
            if kind:
                el = OxmlElement("w:fldChar"); el.set(qn("w:fldCharType"), kind)
            elif text == "1":
                el = OxmlElement("w:t"); el.text = text
            else:
                el = OxmlElement("w:instrText"); el.set(qn("xml:space"), "preserve"); el.text = text
            run._r.append(el)
    doc.save(f"lo/{n}.docx")
subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", "lo"] + [f"lo/{n}.docx" for n in names], capture_output=True, timeout=600)
print("\n".join(sorted(os.listdir("lo"))))
