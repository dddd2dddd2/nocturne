#!/usr/bin/env python3
"""从 prose/ 自动生成剧情文档，避免正文两处漂移（《高太公战纪》版）。

正文的**唯一手改处**是 prose/<NodeID>.md。本脚本把它单向同步到文档：

生成物（勿手改，改完正文跑 python generate_nodes.py 即自动刷新）：
  1. docs/剧本/剧本正文.md —— 全剧本正文（节点：标题 + 正文 + 选项）
  2. docs/结局/ENDING_*.md —— 重写「终局剧情概要与尾声后日谈」为 prose 自动摘录
  3. docs/名词表/名词表.md —— 由 terms.md 生成

结构只读来源：
  - nodes/*.json      —— 选项/跳转（由 generate_nodes.py 生成）
  - story.ts          —— 节点标题 nodeTitles
"""
import io
import os
import re
import json
import glob
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROSE = os.path.join(HERE, "prose")
NODES_DIR = os.path.join(HERE, "nodes")
SCRIPT_OUT = os.path.join(HERE, "docs", "剧本")
SCRIPT_FILE = os.path.join(SCRIPT_OUT, "剧本正文.md")
ENDINGS_DIR = os.path.join(HERE, "docs", "结局")
TERMS_OUT = os.path.join(HERE, "docs", "名词表")
TERMS_FILE = os.path.join(TERMS_OUT, "名词表.md")
STORY_TS = os.path.join(HERE, "story.ts")

_SENT_END = "。！？…!?；;"
STORY_TITLE = "高太公战纪"
ACT_TITLES = {1: "第一幕 · 高老庄", 2: "第二幕 · 地府", 3: "第三幕 · 反天", 9: "结局"}


def read_prose(nid):
    path = os.path.join(PROSE, nid + ".md")
    if os.path.exists(path):
        with io.open(path, "r", encoding="utf-8") as fh:
            return fh.read().strip()
    return ""


def read_nodes():
    nodes = {}
    for path in sorted(glob.glob(os.path.join(NODES_DIR, "node_*.json"))):
        with io.open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        nodes[data["id"]] = data
    return nodes


def read_titles():
    titles = {}
    with io.open(STORY_TS, "r", encoding="utf-8") as fh:
        text = fh.read()
    for m in re.finditer(r"(Node_\w+):\s*\"([^\"]+)\"", text):
        titles[m.group(1)] = m.group(2)
    return titles


def sort_key(nid):
    if nid.startswith("Node_End_"):
        return (9, int(nid.rsplit("_", 1)[1]))
    _, act, num = nid.split("_")
    return (int(act), int(num))


def summarize(text, limit=240):
    """取正文开头作摘要：压缩空白，按句末边界截断。"""
    flat = re.sub(r"\s+", " ", text).strip()
    if len(flat) <= limit:
        return flat
    cut = flat[:limit]
    idx = max([cut.rfind(ch) for ch in _SENT_END])
    if idx > limit // 2:
        return cut[: idx + 1] + "……"
    return cut + "……"


def gen_script(nodes, titles):
    L = [
        "# 《%s》剧本正文" % STORY_TITLE,
        "",
        "> ⚠️ 本文件由 `generate_docs.py` 自动生成，**请勿手改**。",
        "> 正文唯一手改处是 `prose/<节点ID>.md`；改完运行 `python generate_nodes.py` 即自动同步本文件。",
        "",
    ]
    last_act = None
    for nid in sorted(nodes.keys(), key=sort_key):
        act = sort_key(nid)[0]
        if act != last_act:
            L += ["", "## " + ACT_TITLES.get(act, "其它"), ""]
            last_act = act
        title = titles.get(nid, nid)
        extra = ""
        if nid.startswith("Node_End_"):
            extra = "（ENDING_%02d）" % int(nid.rsplit("_", 1)[1])
        L.append("### %s · %s%s" % (nid, title, extra))
        L.append("")
        L.append(nodes[nid]["narrative"])
        L.append("")
        variants = nodes[nid].get("variants") or []
        if variants:
            conds = "、".join(
                ", ".join("%s=%s" % (k, "真" if v else "假") for k, v in v.get("when", {}).get("flags", {}).items())
                for v in variants
            )
            L.append(
                "> 本节点含 %d 个按剧情分支切换的叙事变体（旗标：%s），见 `prose/%s.variants.md`。"
                % (len(variants), conds, nid)
            )
            L.append("")
        choices = nodes[nid].get("choices") or []
        if choices:
            L.append("**选项**")
            L.append("")
            for c in choices:
                line = "- ▶ %s → `%s`" % (c["text"], c["target"])
                if c.get("outcome"):
                    line += "（%s）" % c["outcome"]
                L.append(line)
            L.append("")
    return "\n".join(L)


def update_endings():
    """重写 6 个结局文档的「终局剧情概要与尾声后日谈」为 prose 自动摘录。"""
    updated = 0
    for path in sorted(glob.glob(os.path.join(ENDINGS_DIR, "ENDING_*.md"))):
        m = re.search(r"ENDING_(\d+)_", os.path.basename(path))
        if not m:
            continue
        nid = "Node_End_%d" % int(m.group(1))
        prose = read_prose(nid)
        if not prose:
            continue
        excerpt = summarize(prose, 240)
        gen_block = (
            "<!-- generated-from-prose:start -->\n"
            "  " + excerpt + "\n\n"
            "  > 完整终局正文见 [剧本正文](../%s/%s)（自动同步自 `prose/%s.md`）。\n"
            "  <!-- generated-from-prose:end -->"
        ) % (os.path.basename(SCRIPT_OUT), os.path.basename(SCRIPT_FILE), nid)

        with io.open(path, "r", encoding="utf-8") as fh:
            text = fh.read()

        pattern = re.compile(
            r"(- \*\*终局剧情概要与尾声后日谈\*\*：\n)(.*?)(?=\n- \*\*本结局揭示的世界观碎屑\*\*：)",
            re.DOTALL,
        )
        new_text, count = pattern.subn(lambda mo: mo.group(1) + gen_block, text, count=1)
        if count == 0:
            continue
        if new_text != text:
            with io.open(path, "w", encoding="utf-8") as fh:
                fh.write(new_text)
            updated += 1
    return updated


def gen_terms_doc():
    """从 terms.md 生成 docs/名词表/名词表.md（分类配色 + 各分类词条表）。"""
    import generate_nodes
    categories, terms = generate_nodes.parse_terms()
    if not terms:
        return 0
    L = [
        "# 《%s》名词表" % STORY_TITLE,
        "",
        "> ⚠️ 本文件由 `generate_docs.py` 自动生成，**请勿手改**。",
        "> 唯一手改处是 `stories/gaotai/terms.md`；改完运行 `python generate_nodes.py` 即自动同步。",
        "",
        "## 分类配色",
        "",
        "| 分类 | 颜色 |",
        "| --- | --- |",
    ]
    for cat, info in categories.items():
        L.append("| %s | `%s` |" % (cat, info["color"]))
    L += ["", "> 正文中的词条按此配色高亮，悬停可见释义；「名词表」页随剧情进度逐条解密（到达首次出现节点后解锁）。", ""]
    for cat in categories:
        group = [t for t in terms if t["category"] == cat]
        if not group:
            continue
        L.append("## " + cat)
        L.append("")
        L.append("| 词条 | 首次出现 | 释义 | 关联 |")
        L.append("| --- | --- | --- | --- |")
        for t in group:
            first = t.get("firstSeen", "—")
            rel = "、".join(t.get("related", [])) or "—"
            L.append("| %s | %s | %s | %s |" % (t["term"], first, t["meaning"], rel))
        L.append("")
    os.makedirs(TERMS_OUT, exist_ok=True)
    with io.open(TERMS_FILE, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L))
    return len(terms)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    nodes = read_nodes()
    titles = read_titles()
    os.makedirs(SCRIPT_OUT, exist_ok=True)
    content = gen_script(nodes, titles)
    with io.open(SCRIPT_FILE, "w", encoding="utf-8") as fh:
        fh.write(content)
    n_endings = update_endings()
    n_terms = gen_terms_doc()
    print(
        "docs: %d nodes -> %s; updated %d ending summaries; %d terms -> %s"
        % (len(nodes), SCRIPT_FILE, n_endings, n_terms, TERMS_FILE)
    )


if __name__ == "__main__":
    main()
