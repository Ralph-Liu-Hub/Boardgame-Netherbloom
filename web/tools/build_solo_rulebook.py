# -*- coding: utf-8 -*-
"""Writes the Solo Rulebooks (docs/rules/zh-TW/V5/Solo-Rulebook.md, docs/rules/en/Solo-Rulebook.md) from the Rulebooks.

A solo player must be able to set up and play from the Solo Rulebook alone, so its §3 (set-up), §4 (your turn) and §5 (the
end of the turn) are the Rulebook's own sections with the solo changes worked in; the same numbering keeps the
cross-references inside them right. Everything else (glossary, components, the river, the Loom, the Book, the cards)
is referred back to the Rulebook.

    python3 web/tools/build_solo_rulebook.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def section(t, start, stop):
    a = t.index(start)
    b = t.index(stop, a)
    return t[a:b].rstrip() + "\n"


def rep(t, a, b, n=1):
    assert t.count(a) == n, (t.count(a), a[:80])
    return t.replace(a, b)


ZH_SOLO = [
    ("持有「守魂者」稱號的玩家（不必是本回合玩家）可以讓亡魂駐足", "你持有「守魂者」稱號時，可以讓亡魂駐足"),
    ("持有「守魂者」稱號、且本輪尚未使用能力的玩家（不必是本回合玩家），可以阻止這次額外移動", "你持有「守魂者」稱號、且「守魂者」尚未橫放時，可以阻止這次額外移動"),
    ("有玩家持有「守魂者」稱號且本輪尚未使用（不必是本回合玩家）", "你持有「守魂者」稱號，且「守魂者」尚未橫放"),
    ("每位玩家整局一次。", "整局一次。"),
    ("還沒抵銷裂痕的護盾標記，在擁有者的下一個回合結束時移除。", "還沒抵銷裂痕的護盾標記，在你的下一個回合結束時移除。"),
]
EN_SOLO = [
    ('a player holding the "Spirit Warden" (not necessarily the active player) may make them Stay', 'if you hold the "Spirit Warden", you may make them Stay'),
    ('A player who holds the "Spirit Warden" and has not used it this round (not necessarily the active player) may stop this extra move', 'If you hold the "Spirit Warden" and it is not turned sideways, you may stop this extra move'),
    ('A player holds the "Spirit Warden" and has not used it this round (not necessarily the active player)', 'You hold the "Spirit Warden" and it is not turned sideways'),
    ("Each player may do it once per game.", "You may do it once per game."),
    ("is removed at the end of its owner's next turn.", "is removed at the end of your next turn."),
    ("you win when the soul reaches the Far Shore with your 1 Commission fulfilled; Faded, Shattered, Deluge or Lost and you lose.",
     "you win when the soul reaches the Far Shore with your 1 Commission fulfilled, and you lose if the game ends in Faded, Shattered, Deluge or Lost."),
]


def solo_words(t, pairs):
    for a, b in pairs:
        t = rep(t, a, b)
    return t


def zh():
    src = open(os.path.join(ROOT, "docs/rules/zh-TW/V5/Rulebook.md"), encoding="utf-8").read()
    s3 = section(src, "## 3. 遊戲準備", "### 第一局準備範例")
    s4 = section(src, "## 4. 你的回合", "## 5. 回合結束")
    s5 = section(src, "## 5. 回合結束", "## 6. ")
    # §3: the solo set-up
    s3 = rep(s3, "**設定表**：依人數查出第三河段的墳墓數量、要完成的託付張數，與每人的手牌張數。", "**單人模式的設定**：")
    a = s3.index("|  | **2 人** |")
    b = s3.index("\n\n", a)
    s3 = s3[:a] + "| 項目 | 單人模式 |\n|---|---|\n| 第三河段的墳墓 | 2 塊 |\n| 要完成的託付 | 1 張 |\n| 手牌（暨上限） | 6 張 |" + s3[b:]
    s3 = rep(s3, "第三河段依設定表。", "第三河段 2 塊。")
    s3 = rep(s3, "第三河段 10 塊減去設定表指定之墳墓數。", "第三河段 8 塊（10 塊減去 2 塊墳墓）。")
    s3 = rep(s3, "再各放 1 個傷疤標記在同一條結軌的 7（淡紅色的「傷疤 0」格）。", "再各放 1 個傷疤標記在同一條結軌的 10（淡藍綠色的「傷疤 0」格，單人模式的門檻，見第 6 節）。")
    s3 = rep(s3, "11. **託付卡**：把所選亡魂的 8 張託付卡洗勻，每位玩家秘密抽 1 張，面朝下放在自己面前，自己可以看。其餘面朝下放在一旁，供重抽使用。",
             "11. **託付卡**：把所選亡魂的 8 張託付卡洗勻，抽 1 張面朝下放在自己面前，自己可以看。其餘面朝下放在一旁，供重抽使用。你需要完成這 1 張。")
    s3 = rep(s3, "12. **擺渡人**：依設定表發給每人手牌。每人拿 1 個破浪標記，藍色面朝上。起始玩家拿船槳。",
             "12. **擺渡人**：抽 6 張手牌。拿 1 個破浪標記，藍色面朝上。船槳整局放在你面前。\n13. **幽靈牌庫**：洗混 12 張幽靈牌，面朝下放在一旁（見本書第 8 節）。")
    s3 = rep(s3, "從此刻起適用隱憶之約，由起始玩家進行第一個回合。", "準備完成後，開始你的第一個回合。")
    s3 = rep(s3, "先選一位亡魂（見第 13 節）", "先選一位亡魂（見《規則書》第 13 節）")
    # §4: one player
    s4 = rep(s4, "從拿著船槳的起始玩家開始，玩家依順時針輪流進行回合。輪到你時，依序：", "你獨自進行每一個回合，每個回合依序執行：")
    a = s4.index("### 4-3. 換牌")
    b = s4.index("</div>", a)
    s4 = s4[:a] + """### 4-3. 換牌（單人模式）

把 1 張手牌放到記憶牌庫底，翻開記憶牌庫頂的 1 張，並立即正面打出，照上方的步驟執行，包括共鳴與迴響銘刻。

- 每回合最多換牌一次。

""" + s4[b:]
    # §5: the Ghost acts after drawing; the Oar stays with you
    s5 = rep(s5, "每位玩家的回合之後，都要依序執行這些步驟：", "你的每一個回合之後，都要依序執行這些步驟：")
    s5 = rep(s5, "1. **引花人**：當本回合玩家持有「引花人」稱號時，可以免費使 1 個根綻放。", "1. **引花人**：你持有「引花人」稱號時，可以免費使 1 個根綻放。")
    s5 = rep(s5, "8. 把船槳傳給左手邊的玩家。", "8. **幽靈行動**：翻開幽靈牌庫頂的 1 張並執行（見第 5-4 節）。")
    s5 = s5.rstrip() + """

<div class="rulebox" markdown="1">

### 5-4. 幽靈行動

1. 翻開幽靈牌庫頂的 1 張，執行牌上的行動（見本書第 8 節）。
2. 在這張幽靈牌的絲線上打 1 個結。絲線打滿時，立即反噬。
3. 將迴響標記移到這張幽靈牌的絲線上。
4. 再整理一次河流（回合結束步驟 6）。
5. 幽靈牌放入幽靈棄牌堆。幽靈牌庫用盡時，把棄牌堆洗混成新的幽靈牌庫。

</div>
"""
    body = s3 + "\n" + s4 + "\n" + s5
    # cross-references outside §3-§5 point back to the Rulebook
    body = re.sub(r"（見第 (\d+)(-\d+)? 節）", lambda m: m.group(0) if m.group(1) in ("3", "4", "5") else f"（見《規則書》第 {m.group(1)}{m.group(2) or ''} 節）", body)
    body = re.sub(r"（見附錄 ([A-E])）", r"（見《規則書》附錄 \1）", body)
    body = re.sub(r"（附錄 ([A-E])）", r"（《規則書》附錄 \1）", body)
    body = body.replace("（見第 13 節，若無指定即是 0）", "（見《規則書》第 13 節，若無指定即是 0）")
    head = """# 《彼岸花渡》Netherbloom — 單人模式規則書 V5

> 單人模式的完整流程：遊戲準備、你的回合與回合結束都寫在本書，照著做就能開始遊玩。用語、配件、河流、命運織機、憶念之書、卡牌與亡魂的說明，請在需要時翻閱《規則書》的對應章節。本書由 web/tools/build_solo_rulebook.py 依《規則書》產生。

- [1. 單人模式怎麼玩](#1-單人模式怎麼玩)
- [2. 需要的配件](#2-需要的配件)
- [3. 遊戲準備](#3-遊戲準備)
- [4. 你的回合](#4-你的回合)
- [5. 回合結束](#5-回合結束)
- [6. 命運織機的門檻](#6-命運織機的門檻)
- [7. 稱號](#7-稱號)
- [8. 幽靈牌](#8-幽靈牌)

## 1. 單人模式怎麼玩

你獨自擔任擺渡人，帶亡魂渡過忘川，並寫下祂的憶念之書。勝負條件與《規則書》第 1 節相同：亡魂抵達彼岸時，完成你的 1 張託付即獲勝；消散、破碎、滅頂或失落則落敗。

**幽靈**是一位看不見的同伴：它沒有手牌，在你的每個回合結束時翻開一張幽靈牌，替你照料河流，也會在織機上打結、移動迴響標記。

單人模式中沒有其他玩家，所以隱憶之約不適用；用語表的「輪」即是你的 1 個回合。

## 2. 需要的配件

使用遊戲盒中的全部配件（見《規則書》附錄 A），另外加上 12 張**幽靈牌**（見第 8 節）。

"""
    tail = """
## 6. 命運織機的門檻

單人模式的門檻較高：傷疤標記從結軌的 10 開始，每道傷疤往小的數字移一格。結軌上淡藍綠色的 10／9／8 三格，就是單人模式的門檻格。反噬的效果與時機，見《規則書》第 7 節。

| 這條絲線的傷疤 | 門檻 | 打滿時執行 |
|---|---|---|
| 0 道 | 10 | 第一級反噬 |
| 1 道 | 9 | 第二級反噬 |
| 2 道 | 8 | 第三級反噬 |

## 7. 稱號

單人模式可以更換稱號（其他規則見《規則書》第 9 節）：

- 即使已持有稱號，仍可召喚新的稱號；原本的稱號牌翻到背面，之後不能再被召喚。
- 每個稱號整局只能被召喚一次，一局最多召喚 3 次。
- 召喚仍要支付光，並棄 1 張與該稱號同絲線的手牌。

## 8. 幽靈牌

| 幽靈牌 | 張數 | 行動 |
|---|---|---|
| 執念 | 3 | 在亡魂前方最遠的空河岸放置根 |
| 執念 | 2 | 在亡魂前方最近的空河岸放置根 |
| 釋懷 | 2 | 使最近的根綻放 |
| 釋懷 | 2 | 使最遠的根綻放 |
| 忘卻 | 2 | 驅散最近的怨念，或排乾最近的黑水 |
| 忘卻 | 1 | 不採取行動 |

幽靈放置根時，照放置根的規則：那個河岸必須連接根網。「最近的」「最遠的」照《規則書》用語表的定義。
"""
    out = solo_words(head + body + tail, ZH_SOLO)
    out = re.sub(r'src="\.\./\.\./icons/', 'src="../../icons/', out)
    open(os.path.join(ROOT, "docs/rules/zh-TW/V5/Solo-Rulebook.md"), "w", encoding="utf-8").write(out)


def en():
    src = open(os.path.join(ROOT, "docs/rules/en/Rulebook.md"), encoding="utf-8").read()
    s3 = section(src, "## 3. Setting up", "### Example:")
    s4 = section(src, "## 4. Your turn", "## 5. The end of the turn")
    s5 = section(src, "## 5. The end of the turn", "## 6. ")
    a = s3.index("**Set-up table**")
    b = s3.index("\n\n", s3.index("|  | 2 players |", a))
    s3 = s3[:a] + "**Solo set-up**:\n\n| Item | Solo play |\n|---|---|\n| Graves in Reach 3 | 2 |\n| Commissions to fulfil | 1 |\n| Hand (and hand limit) | 6 cards |" + s3[b:]
    s3 = s3.replace("and for Reach 3 as the set-up table says.", "and 2 for Reach 3.")
    s3 = s3.replace("and for Reach 3, 10 minus the Graves the set-up table gives.", "and 8 for Reach 3 (10 less the 2 Graves).")
    s3 = rep(s3, 'Then put 1 Scar marker on cell 7 of the same knot track (the pale red "Scar 0" cell).', 'Then put 1 Scar marker on cell 10 of the same knot track (the pale teal "Scar 0" cell: the solo threshold, see section 6 of this book).')
    s3 = re.sub(r"11\. \*\*Commission cards\*\*:[^\n]*", "11. **Commission card**: shuffle the chosen Soul's 8 Commission cards, draw 1 and put it face down in front of you, where you may look at it. Put the rest face down to one side for redraws. You must fulfil this one.", s3)
    s3 = re.sub(r"12\. \*\*Ferrymen\*\*:[^\n]*", "12. **Ferryman**: draw a hand of 6 cards. Take 1 Push Through token, blue side up. The Oar stays in front of you all game.\n13. **Ghost deck**: shuffle the 12 Ghost cards and put them face down to one side (section 8 of this book).", s3)
    s3 = re.sub(r"From this moment the Veiled Memories apply, and the first player takes the first turn\.", "When the set-up is done, begin your first turn.", s3)
    a = s4.index("### 4-3. Swap")
    b = s4.index("</div>", a)
    s4 = s4[:a] + """### 4-3. Swap (solo play)

Put 1 card from your hand on the bottom of the Memory deck, turn over the top card of the Memory deck and play it face up at once, following the steps above, Resonance and Echo inscription included.

- You may Swap at most once per turn.

""" + s4[b:]
    s4 = re.sub(r"Starting with the first player[^\n]*", "You play every turn yourself. On each turn, in order:", s4)
    s5 = re.sub(r"After every player's turn, carry out these steps in order:", "After each of your turns, carry out these steps in order:", s5)
    s5 = re.sub(r"1\. \*\*Bloombringer\*\*: if the active player holds[^\n]*", '1. **Bloombringer**: if you hold the "Bloombringer", you may make 1 Root Bloom for free.', s5)
    s5 = rep(s5, "8. Pass the Oar to the player on your left.", "8. **The Ghost acts**: turn over the top Ghost card and carry it out (section 5-4).")
    s5 = s5.rstrip() + """

<div class="rulebox" markdown="1">

### 5-4. The Ghost acts

1. Turn over the top card of the Ghost deck and carry out its action (section 8 of this book).
2. Tie 1 knot on that Ghost card's thread. If the thread becomes full, Backlash at once.
3. Move the Echo marker to that Ghost card's thread.
4. Clean up the river once more (step 6 of the end of the turn).
5. Put the Ghost card on the Ghost discard pile. When the Ghost deck runs out, shuffle the discard pile into a new Ghost deck.

</div>
"""
    body = s3 + "\n" + s4 + "\n" + s5
    body = re.sub(r"\(section (\d+)(-\d+)?\)", lambda m: m.group(0) if m.group(1) in ("3", "4", "5") else f"(section {m.group(1)}{m.group(2) or ''} of the *Rulebook*)", body)
    body = re.sub(r"\(Appendix ([A-E])\)", r"(Appendix \1 of the *Rulebook*)", body)
    body = re.sub(r"\(section 13; 0 if none is given\)", "(section 13 of the *Rulebook*; 0 if none is given)", body)
    body = body.replace("First choose a Soul (section 13 of the *Rulebook*)", "First choose a Soul (section 13 of the *Rulebook*)")
    head = """# Netherbloom — Solo Rulebook V5

> The whole of solo play: set-up, your turn and the end of the turn are written out in this book, so you can start playing from it alone. For the glossary, components, the river, the Loom, the Book of Remembrance, the cards and the Souls, turn to the matching sections of the *Rulebook* when you need them. This book is made from the *Rulebook* by web/tools/build_solo_rulebook.py.

- [1. How solo play works](#1-how-solo-play-works)
- [2. What you need](#2-what-you-need)
- [3. Setting up](#3-setting-up)
- [4. Your turn](#4-your-turn)
- [5. The end of the turn](#5-the-end-of-the-turn)
- [6. The Loom thresholds](#6-the-loom-thresholds)
- [7. Mantles](#7-mantles)
- [8. Ghost cards](#8-ghost-cards)

## 1. How solo play works

You are the only Ferryman: you guide the soul across Lethe and write their Book of Remembrance. Winning and losing are as in section 1 of the *Rulebook*: you win when the soul reaches the Far Shore with your 1 Commission fulfilled; Faded, Shattered, Deluge or Lost and you lose.

**The Ghost** is an unseen companion: it holds no cards, and at the end of each of your turns a Ghost card is turned over to tend the river for you; it also ties a knot on the Loom and moves the Echo marker.

There are no other players, so the Veiled Memories do not apply; a "round" in the glossary is one of your turns.

## 2. What you need

Everything in the box (Appendix A of the *Rulebook*), plus the 12 **Ghost cards** (section 8).

"""
    tail = """
## 6. The Loom thresholds

Solo thresholds are higher: the Scar marker starts on cell 10 of the knot track and moves one cell down for each Scar. The pale teal cells 10 / 9 / 8 are the solo threshold cells. For the Backlashes and their timing, see section 7 of the *Rulebook*.

| Scars on this thread | Threshold | When it becomes full |
|---|---|---|
| 0 | 10 | Level I Backlash |
| 1 | 9 | Level II Backlash |
| 2 | 8 | Level III Backlash |

## 7. Mantles

In solo play you may change Mantles (the other rules are in section 9 of the *Rulebook*):

- You may summon a new Mantle even while you hold one; turn your old Mantle card face down, and it can never be summoned again.
- Each Mantle may be summoned only once per game, and you may summon at most 3 times per game.
- Summoning still costs Light and a discarded card of the Mantle's thread.

## 8. Ghost cards

| Ghost card | Number | Action |
|---|---|---|
| Obsession | 3 | Place a Root on the furthest empty bank ahead of the soul |
| Obsession | 2 | Place a Root on the nearest empty bank ahead of the soul |
| Acceptance | 2 | The nearest Root Blooms |
| Acceptance | 2 | The furthest Root Blooms |
| Oblivion | 2 | Banish the nearest Shade, or drain the nearest Black Water |
| Oblivion | 1 | No action |

When the Ghost places a Root, it follows the rules for placing a Root: the bank must connect to the Root network. "Nearest" and "furthest" are as defined in the *Rulebook*'s glossary.
"""
    open(os.path.join(ROOT, "docs/rules/en/Solo-Rulebook.md"), "w", encoding="utf-8").write(solo_words(head + body + tail, EN_SOLO))


zh()
en()
print("ok")
