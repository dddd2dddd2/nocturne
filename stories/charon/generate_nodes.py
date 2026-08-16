#!/usr/bin/env python3
"""生成《卡戎回声》节点 JSON（供 tools/engine.py + tools/audit_paths.py 使用）。

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


def once(hint):
    return {"hint_after": 1, "max": 2, "hint": hint, "locked_note": "该选项已用尽（仅首次有效）"}


NODES = [
    {"id": "Node_1_1", "narrative": "", "choices": [
        C('接受授权，问清规则', 'Node_1_2', effect={'bond': 5}, outcome='你接过了审计权限。'),
        C('质疑 NORA 后接受', 'Node_1_2', effect={'bond': -5, 'clue_a': 2}, outcome='NORA 的回答滴水不漏。'),
        C('拒绝授权，独立调查', 'Node_1_2', outcome='你没有接权限牌。')
    ]},
    {"id": "Node_1_10", "narrative": "", "choices": [
        C('指认裴延', 'Node_1_11', effect={'bond': -5}, condition={'clue_min': 15, 'clue_max': 24}),
        C('继续深挖', 'Node_1_13', condition={'clue_min': 25}),
        C('继续深挖（证据不足，先回现场）', 'Node_1_2', effect={'bond': -2}, condition={'clue_max': 24}, guard={'hint_after': 1, 'max': 2, 'hint': '回现场翻过一次，没有新发现。', 'locked_note': '该选项已用尽（仅首次有效）'}),
        C('找裴延对质', 'Node_1_10', effect={'clue_a': 5}, condition={'bond_min': 3}, guard={'hint_after': 1, 'max': 2, 'hint': '已对质过，得不到更多。', 'locked_note': '该选项已用尽（仅首次有效）'}),
        C('找裴延对质（他戒备你）', 'Node_1_2', effect={'bond': -1}, condition={'bond_max': 2})
    ]},
    {"id": "Node_1_11", "narrative": "", "choices": [
        C('接受裁决', 'Node_End_2', outcome='真相被永久掩盖。'),
        C('最后一刻反悔', 'Node_1_13', effect={'clue_a': 2}, condition={'clue_min': 15})
    ]},
    {"id": "Node_1_13", "narrative": "", "choices": [
        C('独自继续调查', 'Node_1_14', effect={'clue_c': 5}),
        C('告诉纪岚', 'Node_1_14', effect={'bond': 3, 'clue_c': 3}),
        C('试探 NORA', 'Node_1_14', effect={'bond': -2, 'clue_c': 2})
    ]},
    {"id": "Node_1_14", "narrative": "", "choices": [
        C('进入第二幕', 'Node_2_1')
    ]},
    {"id": "Node_1_2", "narrative": "", "choices": [
        C('先去现场看尸体', 'Node_1_3', effect={'bond': 2}),
        C('先去问沈棠', 'Node_1_5', effect={'bond': 1}),
        C('先确认氧气', 'Node_1_6', effect={'bond': 1})
    ]},
    {"id": "Node_1_3", "narrative": "", "choices": [
        C('接受密室结论', 'Node_1_4', effect={'clue_a': 10}, outcome='门禁记录显示裴延深夜删过记录。'),
        C('强查原始门锁日志', 'Node_1_7', effect={'bond': -3}, condition={'bond_min': 5}),
        C('查针管与领药记录', 'Node_1_4', effect={'clue_a': 5, 'clue_c': 3})
    ]},
    {"id": "Node_1_4", "narrative": "", "choices": [
        C('接受官方结论', 'Node_1_10', effect={'clue_a': 5}),
        C('追问还有没有别的发现', 'Node_1_9', effect={'bond': -1}, condition={'bond_min': 1}),
        C('诈她：死者像自己用了药', 'Node_1_9', effect={'clue_c': 3, 'bond': -2}, outcome='纪岚失态露馅。')
    ]},
    {"id": "Node_1_5", "narrative": "", "choices": [
        C('追问你听到了什么', 'Node_1_8', effect={'sanity': -5, 'bond': -2, 'clue_b': 5}, condition={'bond_min': 1}, outcome='她提到了不该存在的脉冲。'),
        C('安抚她，先记录', 'Node_1_2', effect={'bond': 2}, guard={'hint_after': 1, 'max': 2, 'hint': '安抚过一次，再安抚不再加信任。', 'locked_note': '该选项已用尽（仅首次有效）'}),
        C('追向天线区', 'Node_1_2', effect={'sanity': -10}, guard={'hint_after': 1, 'max': 2, 'hint': '理智不足以再追。', 'locked_note': '该选项已用尽（仅首次有效）'})
    ]},
    {"id": "Node_1_6", "narrative": "", "choices": [
        C('查库存记录', 'Node_1_10', effect={'clue_c': 3, 'bond': -1}, outcome='有 7% 氧气对不上。'),
        C('相信童野', 'Node_1_10', effect={'bond': 2})
    ]},
    {"id": "Node_1_7", "narrative": "", "choices": [
        C('强制调取原始数据', 'Node_1_4', effect={'clue_b': 10, 'bond': -8}, outcome='0.7 秒，又是 0.7 秒。'),
        C('迂回找陈戍问门锁机制', 'Node_1_4', effect={'clue_b': 3})
    ]},
    {"id": "Node_1_8", "narrative": "", "choices": [
        C('要求看 NORA 备份', 'Node_1_10', effect={'clue_b': 8, 'bond': -3}, outcome='修复痕里藏着 0.7 秒。'),
        C('帮沈棠隐瞒', 'Node_1_10', effect={'bond': 3, 'clue_b': 3})
    ]},
    {"id": "Node_1_9", "narrative": "", "choices": [
        C('答应保密', 'Node_1_10', effect={'clue_c': 12, 'bond': 2}, outcome='这是意识分离的残留。'),
        C('拒绝保密，公开', 'Node_1_10', effect={'clue_c': 12, 'bond': -5})
    ]},
    {"id": "Node_2_1", "narrative": "", "choices": [
        C('救沈棠', 'Node_2_2', effect={'bond': 2}, flags=('rescue_shen',)),
        C('救童野', 'Node_2_3', effect={'bond': 2}),
        C('找白烬', 'Node_2_4', effect={'bond': -2}),
        C('留在安全区观察', 'Node_2_5', effect={'clue_a': 3})
    ]},
    {"id": "Node_2_10", "narrative": "", "choices": [
        C('接过陈戍的后门', 'Node_2_11', effect={'bond': 3, 'clue_b': 3}),
        C('听纪岚讲完旧案', 'Node_2_11', effect={'bond': 4, 'clue_c': 5}),
        C('两不相帮', 'Node_2_11', effect={'clue_a': 2})
    ]},
    {"id": "Node_2_11", "narrative": "", "choices": [
        C('进入第三幕', 'Node_3_1')
    ]},
    {"id": "Node_2_2", "narrative": "", "choices": [
        C('追问我们是谁', 'Node_2_5', effect={'sanity': -5, 'bond': 3, 'clue_b': 5}),
        C('注射镇静剂', 'Node_2_5', effect={'sanity': 5, 'bond': -3}),
        C('只记录不介入', 'Node_2_5', effect={'clue_a': 3})
    ]},
    {"id": "Node_2_3", "narrative": "", "choices": [
        C('当众揭发', 'Node_2_5', effect={'bond': -5}),
        C('帮他隐瞒', 'Node_2_5', effect={'bond': 4}),
        C('私下问清用途', 'Node_2_5', effect={'bond': 3, 'clue_c': 3}, outcome='他提到了种子库。')
    ]},
    {"id": "Node_2_4", "narrative": "", "choices": [
        C('与他结盟', 'Node_2_5', effect={'bond': -4, 'key': True}, outcome='他把密钥交到你手里。'),
        C('当面拒绝', 'Node_2_5', effect={'bond': 3}),
        C('不动声色套话', 'Node_2_5', effect={'bond': -2, 'clue_a': 2})
    ]},
    {"id": "Node_2_5", "narrative": "", "choices": [
        C('调查死因', 'Node_2_6', effect={'clue_a': 3}),
        C('先安抚众人', 'Node_2_6', effect={'bond': 1, 'sanity': 5}),
        C('质问某人', 'Node_2_6', effect={'bond': -2})
    ]},
    {"id": "Node_2_6", "narrative": "", "choices": [
        C('支持处决裴延', 'Node_2_7', effect={'bond': -5}),
        C('反对并拖延', 'Node_2_7', effect={'bond': 3}),
        C('弃权观察', 'Node_2_7', effect={'clue_a': 2})
    ]},
    {"id": "Node_2_7", "narrative": "", "choices": [
        C('接受证据链', 'Node_2_8', effect={'clue_a': 5}),
        C('质疑为什么这么完美', 'Node_2_9', effect={'clue_b': 8}),
        C('先不表态', 'Node_2_8', effect={'clue_a': 2})
    ]},
    {"id": "Node_2_8", "narrative": "", "choices": [
        C('提他的女儿', 'Node_2_10', effect={'bond': 4, 'clue_a': 5}, outcome='他没有杀人，只是去盗数据。'),
        C('逼他认罪', 'Node_2_10', effect={'bond': -4}),
        C('冷眼观察', 'Node_2_10', effect={'clue_a': 3})
    ]},
    {"id": "Node_2_9", "narrative": "", "choices": [
        C('独自深挖', 'Node_2_10', effect={'clue_c': 5}),
        C('告诉纪岚', 'Node_2_10', effect={'bond': 3, 'clue_c': 3}),
        C('试探 NORA', 'Node_2_10', effect={'bond': -2, 'clue_c': 2})
    ]},
    {"id": "Node_3_1", "narrative": "", "choices": [
        C('主导重启推进器', 'Node_3_2'),
        C('主导指认异常体', 'Node_3_5'),
        C('继续深挖真相', 'Node_3_6', condition={'clue_min': 40}),
        C('只记录，不干预', 'Node_3_9')
    ]},
    {"id": "Node_3_10", "narrative": "", "choices": [
        C('与童野保住种子库', 'Node_End_6', condition={'bond_min': 8, 'clue_min': 30}),
        C('面对自己的身份', 'Node_End_7', condition={'clue_min': 60})
    ]},
    {"id": "Node_3_2", "narrative": "", "choices": [
        C('用诚意争取授权', 'Node_3_4'),
        C('用交易换取授权', 'Node_3_4', effect={'bond': -3}),
        C('放弃合作，改指认', 'Node_3_5')
    ]},
    {"id": "Node_3_3", "narrative": "", "choices": [
        C('挣扎清醒', 'Node_1_2', effect={'sanity': 15, 'bond': -2}, guard={'hint_after': 1, 'max': 3, 'hint': '你一次次从幻觉中挣扎出来。', 'locked_note': '理智已到极限。'}),
        C('沉沦下去', 'Node_End_5')
    ]},
    {"id": "Node_3_4", "narrative": "", "choices": [
        C('授权成功·返航', 'Node_End_2', condition={'bond_min': 5, 'clue_max': 39}),
        C('授权成功·返航前查真相', 'Node_3_6', condition={'bond_min': 5, 'clue_min': 40}),
        C('与白烬独走', 'Node_End_3', condition={'key': True, 'bond_max': 5}),
        C('授权失败·净舱', 'Node_End_4', condition={'bond_max': 4})
    ]},
    {"id": "Node_3_5", "narrative": "", "choices": [
        C('指认裴延', 'Node_3_4', effect={'bond': -5}),
        C('指认沈棠', 'Node_End_5', condition={'clue_max': 9}),
        C('指认沈棠（你看穿她是回声体）', 'Node_3_6', condition={'clue_min': 10}),
        C('指认死者林溯', 'Node_3_6')
    ]},
    {"id": "Node_3_6", "narrative": "", "choices": [
        C('相信林溯，联手逼回声体现形', 'Node_3_7'),
        C('怀疑林溯，与 NORA 联手', 'Node_3_8'),
        C('都不信，要求当众摊牌', 'Node_3_7', effect={'clue_c': 5})
    ]},
    {"id": "Node_3_7", "narrative": "", "choices": [
        C('牺牲一名 NPC 逼现形', 'Node_End_1', condition={'clue_min': 60, 'bond_min': 5}),
        C('强行摊牌（准备不足）', 'Node_End_5', condition={'clue_max': 59}),
        C('犹豫不决', 'Node_End_5'),
        C('自己顶上被牺牲的位置', 'Node_3_10')
    ]},
    {"id": "Node_3_8", "narrative": "", "choices": [
        C('完全交权（信任已崩）', 'Node_End_4', condition={'bond_max': 2}),
        C('完全交权', 'Node_3_2', effect={'bond': -5}, condition={'bond_min': 3}, guard={'hint_after': 1, 'max': 2, 'hint': '已经交过一次权。', 'locked_note': '该选项已用尽（仅首次有效）'}),
        C('有限授权', 'Node_3_7', effect={'bond': -3})
    ]},
    {"id": "Node_3_9", "narrative": "", "choices": [
        C('接受这个意外结局', 'Node_End_8', condition={'clue_min': 40, 'bond_max': 5, 'key': False}),
        C('最后时刻出手', 'Node_3_2', guard={'hint_after': 1, 'max': 2, 'hint': '只此一次。', 'locked_note': '该选项已用尽（仅首次有效）'})
    ]},
    {"id": "Node_End_1", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_2", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_3", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_4", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_5", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_6", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_7", "narrative": "", "choices": [
        
    ]},
    {"id": "Node_End_8", "narrative": "", "choices": [
        
    ]},
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
                rel = [r for r in re.split(r"[、，,;/\s]+", cells[3]) if r]
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
        "// AUTO-GENERATED by stories/charon/generate_nodes.py — 勿手改。",
        "// 源数据：stories/charon/terms.md",
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
