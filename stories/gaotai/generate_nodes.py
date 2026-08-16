#!/usr/bin/env python3
"""生成《高太公战纪》节点 JSON（供 tools/engine.py + tools/audit_static.py 使用）。

正文一律放在 prose/<节点ID>.md 里，直接编辑文档即可；本文件只负责结构
（选项 / 条件 / 变量）与组装。改完正文后运行：python generate_nodes.py

叙事变体：prose/<节点ID>.variants.md 里用 ``<!-- flags: 名=值, ... -->``
分割多段正文，每段是一个按旗标条件切换的变体（引擎 render 时取第一个
满足的变体，否则用默认 prose/<节点ID>.md）。
"""
import io
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "nodes")
PROSE = os.path.join(HERE, "prose")


def C(text, target, effect=None, condition=None, outcome=None, guard=None, flags=None):
    d = {"text": text, "target": target}
    if effect:
        d["effect"] = effect
    if condition:
        d["condition"] = condition
    if outcome:
        d["outcome"] = outcome
    if guard:
        d["loop_guard"] = guard
    if flags:
        d["flags"] = list(flags)
    return d


def load_variants(nid):
    """读取 prose/<nid>.variants.md：按 ``<!-- flags: 名=值, ... -->`` 切块。
    返回 [{"when": {"flags": {...}}, "narrative": 正文}] 或 None。"""
    path = os.path.join(PROSE, nid + ".variants.md")
    if not os.path.exists(path):
        return None
    with io.open(path, "r", encoding="utf-8") as fh:
        text = fh.read()
    parts = re.split(r"<!--\s*flags:\s*([^>]*?)-->", text)
    variants = []
    for i in range(1, len(parts), 2):
        cond_str, body = parts[i], (parts[i + 1] if i + 1 < len(parts) else "")
        flags = {}
        for kv in cond_str.split(","):
            k, _, v = kv.partition("=")
            flags[k.strip()] = v.strip().lower() == "true"
        body = body.strip()
        if body:
            variants.append({"when": {"flags": flags}, "narrative": body})
    return variants or None


# ---------------------------------------------------------------------------
# 《高太公战纪》变量说明（见 docs/大纲/04_核心机制变量.md）
#   sanity  怒意·那口气（0-100，归零 = 怒气散尽，被招安；<30 强制进 Node_3_3 濒危）
#   bond    人情（与翠兰/春桃/八戒/判官/孟婆的牵连，0-100）
#   clue_a  账·生死簿（阳寿被借走、名字被抹的实证，0-40）
#   clue_b  卷·取经剧本（高老庄一难是写好的戏，0-40）
#   clue_c  秘·轮回真相（忘川、孟婆汤、天条的作者，0-40）
#   key     判官印（可改生死簿的唯一凭证，布尔）
# ---------------------------------------------------------------------------

NODES = [
    # ============================ 第一幕 · 高老庄 ============================
    {"id": "Node_1_1", "narrative": "", "choices": [
        C("把喜报从头听到尾", "Node_1_2", effect={"clue_a": 3}, outcome="你记住了每一个字：净坛使者，享受十方供品。"),
        C("掀了桌子，骂了半条街", "Node_1_2", effect={"sanity": -5, "bond": 2}, outcome="全庄的人都来扶你，你骂得越响，他们越扶。"),
        C("先回屋去看翠兰", "Node_1_2", effect={"clue_c": 2, "sanity": -3}, outcome="她坐在窗下，看着天，不认得你。")
    ]},
    {"id": "Node_1_2", "narrative": "", "choices": [
        C("用最后一口气问个明白", "Node_1_3", effect={"sanity": -3, "clue_a": 2}, outcome="你问报喜人：那猪头，可提起过高老庄？"),
        C("骂完最后一句再走", "Node_1_3", effect={"sanity": 2, "bond": 1}, outcome="那句骂，一直骂到黄泉路口。"),
        C("看着翠兰，把气咽了", "Node_1_3", effect={"sanity": -6, "bond": 2}, outcome="咽气之前，你只想再看她一眼。")
    ]},
    {"id": "Node_1_3", "narrative": "", "choices": [
        C("问牛头，翠兰的名字可在簿上", "Node_1_4", effect={"clue_a": 3}, outcome="牛头嗤笑：你自家性命都保不住，还问女儿？"),
        C("一路沉默，数着步子走", "Node_1_4", effect={"sanity": 2}, outcome="你数到一万两千步，忘川就到了。"),
        C("挣了一下锁链", "Node_1_4", effect={"sanity": -3, "bond": 1}, outcome="马面抽了你一鞭，鞭梢带着火光。")
    ]},
    {"id": "Node_1_4", "narrative": "", "choices": [
        C("细看翠兰，看她的眼睛", "Node_1_5", effect={"clue_c": 4}, outcome="她的眼睛是空的——像喝过忘川水的人。"),
        C("再看一眼自家门楣上的喜报", "Node_1_5", effect={"clue_a": 3, "sanity": -2}, outcome="灵堂门口贴着喜报，红纸白幡，喜丧同堂。"),
        C("扭过头去，不看", "Node_1_5", effect={"sanity": 2, "bond": -1}, outcome="你怕再多看一眼，就再也走不动了。")
    ]},
    {"id": "Node_1_5", "narrative": "", "choices": [
        C("叩头申冤，问我的阳寿哪去了", "Node_1_6", effect={"clue_a": 5, "bond": -2}, outcome="簿上写着：阳寿八十四，借走十三年。"),
        C("站直了，指着簿子问", "Node_1_6", effect={"clue_a": 3, "sanity": -2}, outcome="满殿哗然：头一回见鬼魂敢指着生死簿骂。"),
        C("不说话，只盯着判官手里的笔", "Node_1_6", effect={"clue_b": 3}, outcome="你看见他笔尖顿了顿，在簿角点下一个红点。")
    ]},
    {"id": "Node_1_6", "narrative": "", "choices": [
        C("问他，我的阳寿还能不能要回来", "Node_1_7", effect={"clue_a": 3}, outcome="崔珏说：簿上已定，天条在上。"),
        C("问他，翠兰的名字在哪一页", "Node_1_7", effect={"clue_c": 3}, outcome="判官没有说话——那页上，没有她的名字。"),
        C("求他，给我指一条明路", "Node_1_7", effect={"bond": 3}, outcome="崔珏看着你：明路不在我手里，在你那口气里。")
    ]},
    {"id": "Node_1_7", "narrative": "", "choices": [
        C("抱着春桃，哭了一场", "Node_1_8", effect={"bond": 3, "sanity": -3}, outcome="七十年没哭过的人，在忘川边哭成了孩子。"),
        C("追问她，这出戏是谁写的", "Node_1_8", effect={"clue_b": 5}, outcome="春桃说：是西天那位写的，天兵唱戏，我们听戏。"),
        C("问她，翠兰如今怎么样", "Node_1_8", effect={"clue_c": 3}, outcome="春桃低下头：小姐还活着，只是什么都不记得了。")
    ]},
    {"id": "Node_1_8", "narrative": "", "choices": [
        C("跪下去，认了", "Node_2_1", effect={"sanity": -8, "bond": 2}, outcome="膝盖碰地的一瞬，你看见判官眼里的怜悯。"),
        C("跪到一半，直起腰", "Node_2_1", effect={"sanity": 3, "clue_a": 2}, outcome="你想起翠兰，想起那十三年——腰直了。"),
        C("挣断锁链，大喝一声", "Node_2_1", effect={"sanity": 5, "clue_c": 2}, outcome="那一声喝，震得阎罗殿的烛火全灭。")
    ]},
    # ============================ 第二幕 · 地府 ============================
    {"id": "Node_2_1", "narrative": "", "choices": [
        C("讲高老庄的事", "Node_2_2", effect={"bond": 3}, outcome="讲女儿，讲那猪头，讲十三年的阳寿。"),
        C("讲生死簿上的账", "Node_2_2", effect={"clue_a": 4}, outcome="满川的鬼都安静了，只剩河水在响。"),
        C("只问一句，你们想不想回家", "Node_2_2", effect={"bond": 3, "sanity": 2}, outcome="这句话问出来，忘川的水都晃了。")
    ]},
    {"id": "Node_2_2", "narrative": "", "choices": [
        C("向他要判官印", "Node_2_3", effect={"key": True, "bond": -3, "clue_a": 3}, outcome="崔珏把印推过来：拿去，老夫早想砸了它。"),
        C("问他，那红点是什么意思", "Node_2_3", effect={"clue_b": 4, "bond": 2}, outcome="崔珏说：老夫判了一千年，攒了一千年。"),
        C("拉他入伙", "Node_2_3", effect={"bond": 4}, outcome="崔珏摇头：官不反。可那枚印，还是到了你手里。")
    ]},
    {"id": "Node_2_3", "narrative": "", "choices": [
        C("不喝，问她忘了什么", "Node_2_4", effect={"clue_c": 4, "bond": 2}, outcome="孟婆愣了一千年头一回：她说，我忘了我的孩子。"),
        C("尝了一口，又吐出来", "Node_2_4", effect={"sanity": -4, "clue_a": 2}, outcome="那汤里，掺着高老庄井水的味道。"),
        C("请她指一条路", "Node_2_4", effect={"bond": 2, "clue_c": 2}, outcome="孟婆指了指桥那头：先让桥知道，谁不想过。")
    ]},
    {"id": "Node_2_4", "narrative": "", "choices": [
        C("翻开簿子，找翠兰的名字", "Node_2_5", effect={"clue_c": 4}, outcome="那一页被撕了，只留下半边纸毛。"),
        C("把簿子往火里送", "Node_2_5", effect={"clue_a": 5, "sanity": -5}, outcome="火起的一瞬，判官扑了上来：现在还烧不得！"),
        C("先夺印，再翻簿", "Node_2_5", effect={"key": True, "clue_a": 3}, outcome="印到手，你才知道这簿子原来能改。")
    ]},
    {"id": "Node_2_5", "narrative": "", "choices": [
        C("掀了阎罗的案桌", "Node_2_6", effect={"sanity": 3, "bond": -3}, outcome="案桌掀翻，判官印滚到你的脚边。"),
        C("让阎罗自己翻簿子看自己", "Node_2_6", effect={"clue_a": 3, "clue_c": 2}, outcome="阎罗的手停在半空——他的命，也是借来的。"),
        C("问他，天条是谁写的", "Node_2_6", effect={"clue_b": 4}, outcome="阎罗沉默半晌：天条是西天那位写的，天庭只是抄的。")
    ]},
    {"id": "Node_2_6", "narrative": "", "choices": [
        C("听春桃把戏讲完", "Node_2_7", effect={"clue_b": 4, "sanity": -5}, outcome="讲那出戏怎么开场：观音借了猪，借了女儿，借了门楣。"),
        C("攥着那半张纸，不说话", "Node_2_7", effect={"sanity": -3, "bond": 2}, outcome="那半张纸毛，你攥了一夜，攥出火来。"),
        C("大笑三声", "Node_2_7", effect={"sanity": 5, "clue_c": 3}, outcome="你笑这天地：我活了七十年，原是戏台上的一根柱子。")
    ]},
    {"id": "Node_2_7", "narrative": "", "choices": [
        C("撕了那道旨", "Node_2_8", effect={"sanity": 5, "clue_b": 3}, outcome="二郎神眼里，闪过一丝不易察觉的笑意。"),
        C("接旨，先稳住他", "Node_2_8", effect={"bond": -4, "clue_a": 2}, outcome="你接了旨，袖子里攥着判官印。"),
        C("与他单独说一句话", "Node_2_8", effect={"bond": 3, "clue_c": 3}, outcome="你问：真君在天上，也是外人吧？他没答，撤了半队兵。")
    ]},
    {"id": "Node_2_8", "narrative": "", "choices": [
        C("举旗，打上阎罗殿", "Node_3_1", effect={"sanity": 3, "clue_a": 2}, outcome="旗是你的灵幡，幡上还绣着「高」字。"),
        C("举旗，朝天门方向去", "Node_3_1", effect={"clue_b": 2, "sanity": 2}, outcome="天兵还没来，你就先朝天门的方向走。"),
        C("按兵不动，先等天兵的动静", "Node_3_1", effect={"bond": 2, "clue_c": 2}, outcome="你让众鬼先歇，自己守夜。")
    ]},
    # ============================ 第三幕 · 反天 ============================
    {"id": "Node_3_1", "narrative": "", "choices": [
        C("引忘川水，水淹天兵", "Node_3_2", effect={"sanity": 2, "clue_a": 3}, outcome="忘川的水漫上云头，天兵的火把都灭了。"),
        C("让冤魂齐声哭", "Node_3_2", effect={"bond": 3, "clue_c": 2}, outcome="十万冤魂同哭，天兵的胆子先垮了一半。"),
        C("独自上前，与二郎神说话", "Node_3_2", effect={"bond": 2, "sanity": -2}, outcome="你一个老鬼，拎着灵幡，走上两军阵前。")
    ]},
    {"id": "Node_3_2", "narrative": "", "choices": [
        C("劝他睁一只眼，放冤魂过去", "Node_3_4", effect={"bond": 3, "clue_b": 3}, outcome="二郎神没答应，也没拒绝——他让了半条路。"),
        C("以命相搏", "Node_3_4", effect={"sanity": -3, "clue_a": 2}, outcome="你拎着灵幡冲上去，像年轻时打猎一样。"),
        C("喊话，让净坛使者来见我", "Node_3_3", effect={"bond": 2, "clue_c": 2}, outcome="喊出那句话，你那口气忽然散了，人往忘川边倒。")
    ]},
    # 濒危节点：怒意<30 时被引擎强制拖入（与卡戎 Echo 的 Node_3_3 同构）
    {"id": "Node_3_3", "narrative": "", "choices": [
        C("挣扎着站起来，去见八戒", "Node_3_4", effect={"sanity": 15, "bond": 1}, outcome="你扶着灵幡站起来，那口气又回来了。"),
        C("喝了那碗汤", "Node_End_5", effect={"sanity": -10}, outcome="你端起碗，忽然想起高老庄的井。")
    ]},
    {"id": "Node_3_4", "narrative": "", "choices": [
        C("骂他，骂完问他翠兰在哪", "Node_3_5", effect={"bond": 3, "clue_c": 3}, outcome="八戒说：小姐的名字被人抹了，我一直在找她。"),
        C("一脚把他踹起来", "Node_3_5", effect={"bond": 5, "sanity": 2}, outcome="你骂：你是神了，跪我一个老鬼！他哭了。"),
        C("把锁链当刀，朝他举起", "Node_3_5", effect={"bond": -6, "sanity": 2}, outcome="锁链举到一半，落了地——你下不去手。")
    ]},
    {"id": "Node_3_5", "narrative": "", "choices": [
        C("烧了它", "Node_3_6", effect={"clue_a": 4, "sanity": -3}, outcome="火舌舔上纸页，众鬼的眼睛都亮了。"),
        C("封了它，让判官守着", "Node_3_6", effect={"bond": 2, "clue_b": 2}, outcome="崔珏接回簿子，笔尖难得地抖了一下。"),
        C("留着，当面问天条的作者", "Node_3_6", effect={"clue_c": 3, "sanity": -2}, outcome="你揣着簿子，朝天门的方向走去。")
    ]},
    {"id": "Node_3_6", "narrative": "", "choices": [
        C("擂鼓，打上凌霄", "Node_End_1", effect={"sanity": 5}, condition={"san_min": 60}, outcome="那口气还在，擂鼓，一路擂到南天门。"),
        C("焚了生死簿", "Node_End_2", effect={"clue_a": 3}, condition={"clue_min": 25}, outcome="火起的时候，你听见十万个名字在哭，也在笑。"),
        C("认下这门亲，带八戒回家", "Node_End_3", effect={"bond": 3}, condition={"bond_min": 8}, outcome="你伸出手，八戒的手又大又软，还带着猪圈的热气。"),
        C("接过神位", "Node_End_4", effect={"sanity": 5}, condition={"bond_max": 3, "san_max": 45}, outcome="旨意下来，敕封你为高老庄灶君，即刻赴任。"),
        C("喝下孟婆汤", "Node_End_5", condition={"san_max": 30}, outcome="你端起碗，一饮而尽。"),
        C("谁也不理，做孤魂野鬼去", "Node_End_6", condition={"clue_min": 25}, outcome="你不接旨，不焚簿，不回家，一个人往风里走。")
    ]},
    # ============================ 结局 ============================
    {"id": "Node_End_1", "narrative": "", "choices": []},
    {"id": "Node_End_2", "narrative": "", "choices": []},
    {"id": "Node_End_3", "narrative": "", "choices": []},
    {"id": "Node_End_4", "narrative": "", "choices": []},
    {"id": "Node_End_5", "narrative": "", "choices": []},
    {"id": "Node_End_6", "narrative": "", "choices": []},
]


def load_narrative(nid):
    path = os.path.join(PROSE, nid + ".md")
    if os.path.exists(path):
        with io.open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    return ""


def load_variant_texts(nid):
    """返回该节点的全部正文（默认 + 变体）拼接，供词条校验。"""
    texts = [load_narrative(nid)]
    vpath = os.path.join(PROSE, nid + ".variants.md")
    if os.path.exists(vpath):
        with io.open(vpath, "r", encoding="utf-8") as fh:
            texts.append(fh.read())
    return texts


def parse_terms():
    """解析 terms.md：分类配色 + 按分类分组的词条表。
    返回 (categories, terms)，terms 为已校验的字典列表。"""
    path = os.path.join(HERE, "terms.md")
    if not os.path.exists(path):
        return {}, []
    with io.open(path, "r", encoding="utf-8") as fh:
        lines = fh.read().splitlines()
    sections = {}
    current = None
    for line in lines:
        line = line.rstrip()
        if line.startswith("## "):
            current = line[3:].strip()
            sections.setdefault(current, [])
        elif current and line.startswith("|"):
            sections[current].append(line)

    def rows(section):
        out = []
        for line in sections.get(section, []):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 2 or all(not c for c in cells):
                continue
            if all(not c or re.fullmatch(r":?-{2,}:?", c) for c in cells):
                continue  # 分隔行
            if cells[0] in ("词条", "分类"):
                continue  # 表头行
            out.append(cells)
        return out

    categories = {}
    for cells in rows("分类配色"):
        if len(cells) >= 2 and cells[0] and re.fullmatch(r"#[0-9a-fA-F]{6}", cells[1]):
            categories[cells[0]] = {"label": cells[0], "color": cells[1].lower()}

    terms = []
    for name in sections:
        if name == "分类配色":
            continue
        for cells in rows(name):
            if len(cells) < 3 or not cells[0]:
                continue
            term, first, meaning = cells[0], cells[1], cells[2]
            d = {"term": term, "category": name, "meaning": meaning}
            if first not in ("", "—", "-"):
                d["firstSeen"] = first
            if len(cells) > 3 and cells[3] not in ("", "—", "-"):
                rel = [r for r in re.split(r"[、，,;/\\s]+", cells[3]) if r]
                if rel:
                    d["related"] = rel
            terms.append(d)
    return categories, terms


def validate_terms(categories, terms):
    """词条校验：重复词条、未在 prose 中出现、firstSeen 节点不存在 / 不包含词条。
    返回 (errors, warnings)。"""
    node_ids = {n["id"] for n in NODES}
    prose_has = {}
    for nid in node_ids:
        text = "\n".join(load_variant_texts(nid))
        prose_has[nid] = text
    all_prose = "\n".join(prose_has.values())

    errors, warnings = [], []
    seen = {}
    all_names = {t["term"] for t in terms}
    for t in terms:
        term, cat = t["term"], t["category"]
        if term in seen:
            errors.append("重复词条「%s」（%s 与 %s）" % (term, seen[term], cat))
            continue
        seen[term] = cat
        if cat not in categories:
            warnings.append("词条「%s」的分类「%s」未在「分类配色」表中定义" % (term, cat))
        if term not in all_prose:
            errors.append("词条「%s」在 prose 中从未出现，无法高亮" % term)
        fs = t.get("firstSeen")
        if fs:
            if fs not in node_ids:
                errors.append("词条「%s」的首次出现节点 %s 不存在" % (term, fs))
            elif term not in prose_has[fs]:
                warnings.append("词条「%s」声称首次出现于 %s，但该节点正文不含此词条" % (term, fs))
        for r in t.get("related", []):
            if r not in all_names:
                errors.append("词条「%s」的关联词条「%s」不存在于名词表" % (term, r))
    return errors, warnings


def write_terms_data(categories, terms):
    """把名词表写为 terms.data.ts（story.ts 导入）。"""
    out = os.path.join(HERE, "terms.data.ts")
    L = [
        "// AUTO-GENERATED by stories/gaotai/generate_nodes.py — 勿手改。",
        "// 源数据：stories/gaotai/terms.md",
        'import type { TermCategoryInfo, TermDef } from "../../src/engine/types";',
        "",
        "export const TERM_CATEGORIES: Record<string, TermCategoryInfo> = {",
    ]
    for cat, info in categories.items():
        L.append('  %s: { label: %s, color: %s },' % (
            json.dumps(cat, ensure_ascii=False),
            json.dumps(info["label"], ensure_ascii=False),
            json.dumps(info["color"]),
        ))
    L.append("};")
    L.append("")
    L.append("export const TERMS: TermDef[] = [")
    for t in terms:
        d = {"term": t["term"], "category": t["category"], "meaning": t["meaning"]}
        if t.get("firstSeen"):
            d["firstSeen"] = t["firstSeen"]
        if t.get("related"):
            d["related"] = t["related"]
        L.append("  %s," % json.dumps(d, ensure_ascii=False))
    L.append("];")
    with io.open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    for n in NODES:
        node = dict(n)
        node["narrative"] = load_narrative(node["id"])
        variants = load_variants(node["id"])
        if variants:
            node["variants"] = variants
        fn = node["id"].lower() + ".json"
        with open(os.path.join(OUT, fn), "w", encoding="utf-8") as fh:
            json.dump(node, fh, ensure_ascii=False, indent=2)
    print("written %d nodes -> %s" % (len(NODES), OUT))

    # 名词表：解析 terms.md → 校验 → terms.data.ts
    categories, terms = parse_terms()
    errors, warnings = validate_terms(categories, terms)
    for w in warnings:
        print("⚠ %s" % w)
    if errors:
        for e in errors:
            print("✗ %s" % e)
        raise SystemExit("名词表校验失败，已停止生成")
    if terms:
        out_terms = write_terms_data(categories, terms)
        print("written %d terms -> %s" % (len(terms), out_terms))

    # 顺带从 prose/ 重新生成剧情文档（docs/剧本/ + docs/结局/ + docs/名词表/）
    import generate_docs
    generate_docs.main()


if __name__ == "__main__":
    main()
