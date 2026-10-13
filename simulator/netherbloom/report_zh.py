"""Traditional Chinese (Taiwan) edition of the balance report, made line by line from the English one
so the two always carry the same numbers.
    python -m netherbloom.report_zh [reports/balance_report.md]"""
import re
import sys

SOULS = {"king": "渡船上的國王", "garland": "花環少女", "bride": "留在冥府的新娘", "child": "最後火光的孩子", "open": "無名渡河"}
SHORT = {"king": "國王", "garland": "花環少女", "bride": "新娘", "child": "孩子", "open": "無名渡河"}
ENDS = {"inscribed": "已銘刻", "unspoken": "未曾說出", "forgotten": "已遺忘", "high": "高", "low": "低"}
SIGNALS = {"resonance rate": "共鳴率", "burns": "焚燒次數", "lingers": "徘徊次數", "summons": "召喚次數",
           "oblivion played": "打出的忘卻牌", "keepsakes": "信物", "final forgotten": "最終遺忘數"}
FIXED = {
    "# Netherbloom Simulator — Balance Report": "# Netherbloom（暫定中文名：彼岸花渡）模擬器——平衡報告",
    "## 1. Player counts (Lantern 3, Open Crossing)": "## 1. 玩家人數（燈籠 3，無名渡河）",
    "| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |":
        "| 玩家人數 | 勝率 | 落敗原因分布 消散／破碎／滅頂 | 回合數（平均） | 各河段回合數 第一／第二／第三 | 半滿的絲線數（共 3 條） | 驚險勝利 | 每河段反噬次數 |",
    "## 2. Before and after tuning (GDD v0.4 as written)": "## 2. 調整前後對照（依原文撰寫的 GDD v0.4）",
    "| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |":
        "| 玩家人數 | 原版：勝率 | 原版：落敗原因分布 消／破／滅 | 原版：回合數 | 調整後：勝率 | 調整後：落敗原因分布 | 調整後：回合數 |",
    "## 3. Souls (3 players, Lantern 3)": "## 3. 亡魂（3 人，燈籠 3）",
    "| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |": "| 亡魂 | 勝率 | 落敗原因分布 消／破／滅 | 回合數 | 達成的結局（勝場中） |",
    "## 4. Lantern difficulty (3 players)": "## 4. 燈籠難度（3 人）",
    "| Lantern | Win rate | Loss split F/S/D | Turns |": "| 燈籠 | 勝率 | 落敗原因分布 消／破／滅 | 回合數 |",
    "## 5. The Book of Remembrance (3 players)": "## 5. 憶念之書（3 人）",
    "| | Win rate | Inscriptions | Full pages | Turns |": "| | 勝率 | 銘刻次數 | 填滿頁數 | 回合數 |",
    "## 6. Other signals (3 players)": "## 6. 其他指標（3 人）",
}


def line(s):
    if s in FIXED:
        return FIXED[s]
    if m := re.match(r"(\d+) games per main configuration \(half that for variants\)\. Echo-following AI players\. Run time (\d+) s\.", s):
        return f"每種主要設定各 {m[1]} 場（變體設定為其一半）。由跟隨迴響的 AI 玩家進行。執行時間 {m[2]} 秒。"
    if m := re.match(r"\| (king|garland|bride|child|open) \| (.*) \| ([^|]*) \|$", s):
        ends = re.sub(r"(\w+)/(\w+) (\d+%)", lambda e: f"{ENDS[e[1]]}／{ENDS[e[2]]} {e[3]}", m[3]).replace(", ", "、")
        return f"| {SOULS[m[1]]}（{m[1]}） | {m[2]} | {ends} |"
    if s.startswith("Same Souls at **Lantern 2**:"):
        return "同樣的亡魂在**燈籠 2**：" + "、".join(f"{SHORT[k]} {v}" for k, v in re.findall(r"(\w+) (\d+%)", s.split(":", 1)[1]))
    if s.startswith("| Book used"):
        return s.replace("Book used", "使用憶念之書")
    if s.startswith("| Book ignored"):
        return s.replace("Book ignored", "忽略憶念之書")
    if m := re.match(r"Book impact: \*\*([+-]\d+) points\*\* \(target \+5 to \+10\)\.", s):
        return f"憶念之書的影響：**{m[1]} 個百分點**（目標為 +5 至 +10）。"
    if m := re.match(r"- \*\*(.+)\*\*: (.*)", s):
        return f"- **{SIGNALS.get(m[1], m[1])}**：{m[2]}"
    return s


def translate(md):
    return "[English](balance_report.md) | 正體中文\n\n" + "\n".join(line(s) for s in md.split("\n"))


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "reports/balance_report.md"
    open(src.replace(".md", ".zh-TW.md"), "w").write(translate(open(src).read()))
