# -*- coding: utf-8 -*-
"""Writes every memory-slot sentence filled with every card that can go there.

    cd simulator && python3 tools/mkcombos.py ../docs/design/V5-memory-combos.zh-TW.md
"""
import os
import re
import sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from netherbloom.engine import CARD  # noqa: E402
from netherbloom.cards import OBL  # noqa: E402
from netherbloom.storybook_data import SOULS  # noqa: E402

zh = open(os.path.join(ROOT, "..", "web", "public", "assets", "zh.js"), encoding="utf-8").read()
BAND = dict(re.findall(r'"?([A-Z]-?\d\d)"?: "([^"]*)"', zh[zh.index("ZH_BANDS"):zh.index("ZH_SOULS")]))
SLOT = {"Place": "地點", "Person": "人物", "Deed": "事蹟", "Feeling": "感受"}
OWN = {"king": "K", "garland": "G-", "bride": "B", "child": "L", "open": "E"}
NUM = "一二三"


def pool(soul, cat):
    seen, out = set(), []
    for c in CARD.values():
        if c.tag == OBL or SLOT.get(c.slot) != cat or c.cid in seen:
            continue
        if c.cid.startswith("C") or c.cid.startswith(OWN[soul]):
            seen.add(c.cid)
            out.append(c.cid)
    return out


out = ["# 《彼岸花渡》V5 記憶格句子：所有組合", "",
       "每個記憶格的句子，填進每一張可能放進去的記憶牌（基本牌 23 張中可銘刻的，加上那位亡魂的 6 張專屬牌；無名用迴響牌）。",
       "由 `simulator/tools/mkcombos.py` 從故事書資料產生。", "",
       "**寫法標準**（11/7）：",
       "- 句子不替空格決定情緒、性別或關係；空格放在「想起、記得、心裡只有、曾經」這類中性位置。",
       "- 事蹟格前面一律能接「我（曾經）」；感受格接「心裡只有／只剩／想起」。",
       "- 情緒交給句子的其他部分，或交給那條路線（執念、釋懷、忘卻）。", ""]
total = 0
for s in SOULS:
    out += [f"## {s['name']}", ""]
    for i, ch in enumerate(s["chapters"]):
        out += [f"### 第{NUM[i]}章・{ch['title']}", ""]
        for n in ch["nodes"]:
            if n[0] not in "mg":
                continue
            frame = n[3]
            out.append(f"**{n[1]}（{n[2]}{'・關口' if n[0] == 'g' else ''}）** {frame}")
            out.append("")
            for cid in pool(s["key"], n[2]):
                out.append(f"- {frame.replace('＿＿', '〈' + BAND[cid] + '〉')}　`{cid}`")
                total += 1
            out.append("")
out.insert(4, f"共 {total} 句。")
open(sys.argv[1], "w", encoding="utf-8").write("\n".join(out) + "\n")
print(total)
