"""V5 storybooks for the simulator: route graphs and fate-mist cards parsed from storybook_data.py.

Each chapter becomes a dict:
  nodes  {id: {"kind": "m"|"g"|"x"|"p"|"f"|"o", "cat": slot name or None, "next": [ids] | {tag: id}}}
  first  id of the first node; starts {tag: id} when the page has several starts
  fates  [{"kind": "river"|"book", "name", "conds": [(pred, arg)], "ops": [(op, ...)], "tag": int}]
"""
import re

from . import storybook_data as D
from .cards import OBS, ACC, OBL

TAG = {D.OBS: OBS, D.ACC: ACC, D.OBL: OBL}
SLOT = {"地點": "Place", "人物": "Person", "事蹟": "Deed", "感受": "Feeling"}

COND_PATTERNS = [
    (r"本章第一次徘徊", lambda m: ("lingers", 1)),
    (r"本章第二次徘徊", lambda m: ("lingers", 2)),
    (r"怨念進入亡魂所在格", lambda m: ("griev_enter", 1)),
    (r"任一反噬", lambda m: ("backlash", 1)),
    (r"執念反噬", lambda m: ("backlash_obs", 1)),
    (r"霧已逼近", lambda m: ("fog_near", 0)),
    (r"亡魂承受裂痕", lambda m: ("cracks", 1)),
    (r"留下一道光牆", lambda m: ("walls", 1)),
    (r"墳墓被翻開", lambda m: ("graves", 1)),
    (r"前兩頁共有 (\d) 段點亮的記憶", lambda m: ("prev_lit", int(m.group(1)))),
    (r"本頁有 (\d) 段點亮的記憶", lambda m: ("page_lit", int(m.group(1)))),
    (r"關口被銘刻", lambda m: ("gate_insc", 0)),
    (r"關口(被|已)點亮", lambda m: ("gate_lit", 0)),
    (r"翻開一張託付", lambda m: ("reveals", 1)),
    (r"遺忘堆達到 (\d+) 張", lambda m: ("forgot", int(m.group(1)))),
    (r"她的專屬記憶在本頁被點亮", lambda m: ("own_lit", 0)),
]

OP_PATTERNS = [
    (r"(執念|釋懷|忘卻)加 (\d) 結", lambda m: ("knots", TAG[m.group(1)], int(m.group(2)))),
    (r"解開(執念|釋懷|忘卻)所有的結", lambda m: ("untie_all", TAG[m.group(1)])),
    (r"解開 (\d) 結", lambda m: ("untie", int(m.group(1)))),
    (r"本頁一段未點亮的記憶被遺忘", lambda m: ("forget_unlit",)),
    (r"得 (\d) 光", lambda m: ("light", int(m.group(1)))),
    (r"(?<!綻)放 (\d) 個根", lambda m: ("root", int(m.group(1)))),
    (r"亡魂前進 1 格，然後可以再前進 1 格", lambda m: ("advance", 2)),
    (r"亡魂前進 1 格（下一格沒有照亮也可以", lambda m: ("advance_dark",)),
    (r"亡魂前進 1 格", lambda m: ("advance", 1)),
    (r"前方 (\d) 朵花凋零", lambda m: ("wither", int(m.group(1)))),
    (r"免費喚回 1 次", lambda m: ("recall_free",)),
    (r"在亡魂所在格的兩岸各綻放 1 個根", lambda m: ("bloom_here",)),
    (r"綻放 (\d) 個根", lambda m: ("bloom", int(m.group(1)))),
    (r"(?<!被)遺忘 (\d) 張", lambda m: ("forget", int(m.group(1)))),
    (r"免費點亮 (\d) 段", lambda m: ("light_free", int(m.group(1)))),
    (r"霧推進 (\d)", lambda m: ("fog", int(m.group(1)))),
    (r"關鍵記憶若在任一玩家手上", lambda m: ("key_insc",)),
    (r"修補 1 道裂痕", lambda m: ("mend",)),
    (r"移除 1 道傷疤", lambda m: ("unscar",)),
    (r"前方第 1 格放 1 個怨念", lambda m: ("griev1",)),
    (r"驅散 1 個怨念", lambda m: ("banish",)),
    (r"從手牌銘刻 1 張", lambda m: ("insc_hand",)),
    (r"下一格放 1 個黑水", lambda m: ("bw1",)),
    (r"一位玩家失去稱號", lambda m: ("lose_title",)),
    (r"亡魂退回 1 格", lambda m: ("retreat",)),
]


def _scan(text, patterns):
    used, found = [], []
    for pat, build in patterns:
        for m in re.finditer(pat, text):
            if any(m.start() < b and a < m.end() for a, b in used):
                continue
            used.append((m.start(), m.end()))
            found.append((m.start(), build(m)))
    return [x for _, x in sorted(found)]


def parse_conds(text):
    out = []
    for clause in text.split("，而且"):
        got = _scan(clause, COND_PATTERNS)
        if len(got) != 1:
            raise ValueError(f"cannot parse condition: {clause!r}")
        out += got
    return out


def parse_ops(effects):
    out = []
    for e in effects:
        got = _scan(e, OP_PATTERNS)
        if not got:
            raise ValueError(f"cannot parse effect: {e!r}")
        out += got
    return out


def _chapter(ch):
    nodes = {}
    for n in ch["nodes"]:
        kind, nid = n[0], n[1]
        if kind in "mg":
            nodes[nid] = {"kind": kind, "cat": SLOT[n[2]], "next": n[4]}
        elif kind in "xp":
            nodes[nid] = {"kind": kind, "cat": None, "next": n[3]}
        elif kind == "f":
            nodes[nid] = {"kind": "f", "cat": None, "next": {TAG[t]: v for t, v in n[2].items()}}
        else:
            nodes[nid] = {"kind": "o", "cat": None, "next": []}
    first = ch["nodes"][0][1]
    starts = {TAG[t]: v for t, v in ch.get("starts", {}).items()}
    fates = []
    for kind, name, _omen, cond, _ev, eff, th in ch["fates"]:
        fates.append({"kind": "river" if kind == "河" else "book", "name": name, "conds": parse_conds(cond),
                      "ops": parse_ops(eff), "tag": TAG[th]})
    return {"nodes": nodes, "first": first, "starts": starts, "fates": fates}


BOOKS = {s["key"]: [_chapter(ch) for ch in s["chapters"]] for s in D.SOULS}
ENDINGS = {s["key"]: {("交織" if k == "交織" else TAG[k]): v[0] for k, v in s["endings"].items()} for s in D.SOULS}
