import re, base64, subprocess, sys, os
# HTML -> self-contained HTML (pictures embedded) -> .docx and .pdf through LibreOffice.
CSS = """<style>
body{font-family:'Georgia','Noto Serif CJK TC',serif;font-size:10.5pt;line-height:1.35}
h1{font-size:22pt} h2{font-size:15pt;margin-top:16pt} h3{font-size:12pt} h4{font-size:11.5pt;margin-top:10pt}
table{border-collapse:collapse;width:100%} th,td{border:0.5pt solid #a89a86;padding:3pt;vertical-align:top;font-size:9pt}
th{background:#efe6d6} p.fig{text-align:center}
</style>"""
b64 = lambda f: base64.b64encode(open(f, "rb").read()).decode()
for lang in ["en", "zh"]:
    s = open(f"{lang}.html").read()
    s = re.sub(r'<img src="([^"]+)" style="width:([\d.]+)in" />', lambda m: f'<img src="data:image/jpeg;base64,{b64(m.group(1))}" width="{int(float(m.group(2))*96)}" />', s)
    s = re.sub(r'<img class="ic" src="([^"]+)" />', lambda m: f'<img src="data:image/png;base64,{b64(m.group(1))}" width="14" height="14" align="absmiddle" />', s)
    title = re.search(r"<title>(.*?)</title>", s).group(1)
    s = s.replace("</head>", CSS + "</head>").replace("<body>", f"<body><h1>{title}</h1>", 1)
    open(f"{lang}_emb.html", "w").write(s)
os.makedirs("lo", exist_ok=True)
subprocess.run(["soffice", "--headless", "--convert-to", "docx:MS Word 2007 XML", "--outdir", "lo", "en_emb.html", "zh_emb.html"], capture_output=True, timeout=300)
subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", "lo", "lo/en_emb.docx", "lo/zh_emb.docx"], capture_output=True, timeout=300)
print(os.listdir("lo"))
