#!/usr/bin/env python3
"""静态审查器：区间抽象解释 + 定向路径搜索（适配大状态空间的故事）。

tools/audit_paths.py 的穷举 BFS 对变量维度多、节点多的故事会状态爆炸；
本工具用两类互补方法给出可靠结论：

1. 区间抽象解释（fixpoint）：对每个节点维护 sanity/bond/clue_a/b/c/key 的
   可达区间（over-approximation）。用于**可靠地**检测：
   - 不可达节点（区间从未被填充）
   - 死选项（该选项的条件在该节点的可达区间下永不可满足）
   - 软锁节点（非结局且所有选项皆死/无选项）
   - 结局抽象可达性（区间非空；若此处即不可达，则为真不可达）

2. 定向 DFS 见证路径：用真实引擎状态找一条到达某结局的具体路径（成功即证明可达）。

用法：
    python tools/audit_static.py --nodes stories/charon/nodes --output 质检/charon_静态审查报告.md
"""
import argparse
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.engine import DEFAULT_NODES_DIR, Engine  # noqa: E402

LO, HI = 0, 1
EXEMPT_SAN = ("Node_3_3", "Node_3_4")


def _story_id(nodes_dir):
    return os.path.basename(os.path.dirname(os.path.abspath(nodes_dir)))


def _iv(v):
    return (v, v)


def _clamp_iv(k, iv):
    hi = 40 if k.startswith("clue") else 100
    return (max(0, iv[LO]), min(hi, iv[HI]))


def _join(a, b):
    if a is None:
        return b
    out = {}
    for k in ("sanity", "bond", "clue_a", "clue_b", "clue_c"):
        out[k] = (min(a[k][LO], b[k][LO]), max(a[k][HI], b[k][HI]))
    out["key"] = a["key"] | b["key"]
    return out


def _apply(a, effect):
    out = {}
    for k in ("sanity", "bond", "clue_a", "clue_b", "clue_c"):
        d = effect.get(k, 0)
        out[k] = _clamp_iv(k, (a[k][LO] + d, a[k][HI] + d))
    out["key"] = set(a["key"])
    if effect.get("key"):
        out["key"].add(True)
    return out


def _clue_iv(a):
    lo = a["clue_a"][LO] + a["clue_b"][LO] + a["clue_c"][LO]
    hi = min(100, a["clue_a"][HI] + a["clue_b"][HI] + a["clue_c"][HI])
    return (lo, hi)


def _meets(a, cond):
    if not cond:
        return True
    if cond.get("key") is not None and bool(cond["key"]) not in a["key"]:
        return False
    if "san_min" in cond and a["sanity"][HI] < cond["san_min"]:
        return False
    if "san_max" in cond and a["sanity"][LO] > cond["san_max"]:
        return False
    if "bond_min" in cond and a["bond"][HI] < cond["bond_min"]:
        return False
    if "bond_max" in cond and a["bond"][LO] > cond["bond_max"]:
        return False
    clue = _clue_iv(a)
    if "clue_min" in cond and clue[HI] < cond["clue_min"]:
        return False
    if "clue_max" in cond and clue[LO] > cond["clue_max"]:
        return False
    return True


def fixpoint(engine):
    start = "Node_1_1"
    abstract = {nid: None for nid in engine.nodes}
    st = engine.initial_state()
    abstract[start] = {
        "sanity": _iv(st["sanity"]), "bond": _iv(st["bond"]),
        "clue_a": _iv(st["clue_a"]), "clue_b": _iv(st["clue_b"]),
        "clue_c": _iv(st["clue_c"]), "key": {st["key"]},
    }
    q = deque([start])
    while q:
        nid = q.popleft()
        a = abstract[nid]
        for ch in engine.nodes[nid].get("choices", []):
            if not _meets(a, ch.get("condition")):
                continue
            a2 = _apply(a, ch.get("effect", {}))
            tgt = ch["target"]
            targets = [(tgt, a2)]
            # 引擎内置规则：SAN=0 -> End_4；SAN<30 -> Node_3_3（抽象近似）
            if a2["sanity"][LO] == 0 and tgt != "Node_End_4":
                targets.append(("Node_End_4", a2))
            if (a2["sanity"][LO] < 30 and not tgt.startswith("Node_End")
                    and tgt not in EXEMPT_SAN):
                targets.append(("Node_3_3", a2))
            for t, av in targets:
                if t not in abstract:
                    continue
                new = _join(abstract[t], av)
                if new != abstract[t]:
                    abstract[t] = new
                    q.append(t)
    return abstract


def _state_key(node, state, visits):
    v = tuple(sorted(visits.items()))
    return (node, state["sanity"], state["bond"], state["clue_a"],
            state["clue_b"], state["clue_c"], state["key"], v)


def find_witness(engine, abstract, target_end, restarts=400, budget=3000):
    """随机重启 + 贪心 DFS：找一条到达 target_end 的具体路径（抽象上界剪枝）。"""
    import random
    need = 0
    for n in engine.nodes.values():
        for c in n.get("choices", []):
            if c.get("target") == target_end:
                need = max(need, c.get("condition", {}).get("clue_min", 0))

    def dfs_one(seed):
        rng = random.Random(seed)
        visited = set()
        path = []
        counter = [0]

        def dfs(node, state, visits, depth):
            counter[0] += 1
            if counter[0] > budget:
                return "budget"
            if node == target_end:
                return True
            if depth > 80:
                return False
            key = _state_key(node, state, visits)
            if key in visited:
                return False
            visited.add(key)
            a = abstract.get(node)
            if need and a:
                hi = min(100, a["clue_a"][HI] + a["clue_b"][HI] + a["clue_c"][HI])
                if hi < need:
                    return False
            try:
                rendered = engine.render(node, state, visits)
            except KeyError:
                return False
            choices = [c for c in rendered["choices"] if not c.get("locked")]
            raw = {c["text"]: c for c in engine.nodes[node].get("choices", [])}
            rng.shuffle(choices)

            def rank(ch):
                d = raw.get(ch["text"], {})
                tgt = d.get("target", "")
                eff = d.get("effect", {})
                gain = eff.get("clue_a", 0) + eff.get("clue_b", 0) + eff.get("clue_c", 0)
                return (0 if tgt.startswith("Node_End") else 1, -gain)

            choices.sort(key=rank)
            for ch in choices:
                v2 = dict(visits)
                try:
                    res = engine.choose(node, ch["text"], state, v2)
                except ValueError:
                    continue
                path.append((node, ch["text"]))
                r = dfs(res["next_node"], res["state"], v2, depth + 1)
                if r is True:
                    return True
                path.pop()
                if r == "budget":
                    return "budget"
            return False

        r = dfs("Node_1_1", engine.initial_state(), {}, 0)
        return path if r is True else None

    for seed in range(restarts):
        p = dfs_one(seed)
        if p:
            return p
    return None


def build_report(engine, abstract, witnesses, nodes_dir):
    L = []
    story = _story_id(nodes_dir)
    L.append(f"# 静态审查报告 · {story}\n")
    L.append("- 方法：区间抽象解释（fixpoint，over-approx）+ 定向 DFS 见证路径")
    L.append(f"- 节点数：{len(engine.nodes)}")

    reachable = [n for n, a in abstract.items() if a is not None]
    unreachable = [n for n, a in abstract.items() if a is None]
    endings = sorted(n for n in engine.nodes if n.startswith("Node_End"))

    L.append("\n## 一、节点可达性\n")
    L.append(f"- 可达节点：{len(reachable)} / {len(engine.nodes)}")
    L.append(f"- 不可达节点（抽象区间从未被填充）：{'无' if not unreachable else ', '.join(unreachable)}")

    L.append("\n## 二、死选项与软锁\n")
    dead_rows = []
    softlocks = []
    for nid in sorted(engine.nodes):
        node = engine.nodes[nid]
        a = abstract[nid]
        if a is None:
            continue
        dead = [c["text"] for c in node.get("choices", []) if not _meets(a, c.get("condition"))]
        if dead:
            dead_rows.append((nid, dead))
        is_end = nid.startswith("Node_End")
        alive = [c["text"] for c in node.get("choices", []) if _meets(a, c.get("condition"))]
        if not is_end and not alive:
            softlocks.append(nid)
    if not dead_rows:
        L.append("- 死选项：无")
    else:
        L.append("| 节点 | 永不可满足的选项 |")
        L.append("|---|---|")
        for nid, dead in dead_rows:
            L.append(f"| {nid} | {'；'.join(dead)} |")
    L.append(f"- 软锁节点（非结局且无可满足选项）：{'无' if not softlocks else ', '.join(softlocks)}")

    L.append("\n## 三、结局可达性\n")
    L.append("| 结局 | 抽象可达 | 见证路径 |")
    L.append("|---|---|---|")
    ok = True
    for e in endings:
        abs_ok = abstract.get(e) is not None
        w = witnesses.get(e)
        if w is None:
            L.append(f"| {e} | {'✅' if abs_ok else '❌'} | {'（抽象可达，未找到见证/超预算）' if abs_ok else '—'} |")
            ok = ok and abs_ok and bool(w)
        else:
            steps = " -> ".join([n for n, _ in w] + [e])
            L.append(f"| {e} | ✅ | ✅ {steps} |")
    if not ok:
        L.append("\n⚠️ 注：抽象可达为 over-approximation；缺见证路径的结局需人工复核条件组合。")

    problems = bool(unreachable) or bool(dead_rows) or bool(softlocks) or not ok
    L.append(f"\n---\n结论：{'❌ 发现问题（退出码 1）' if problems else '✅ 全部结局可达，无死选项/软锁（退出码 0）'}")
    return "\n".join(L), problems


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--nodes", default=DEFAULT_NODES_DIR)
    ap.add_argument("--output", default=None)
    args = ap.parse_args()

    engine = Engine(nodes_dir=args.nodes)
    abstract = fixpoint(engine)
    endings = sorted(n for n in engine.nodes if n.startswith("Node_End"))
    witnesses = {}
    for e in endings:
        w = find_witness(engine, abstract, e)
        if w:
            witnesses[e] = w
    report, problems = build_report(engine, abstract, witnesses, args.nodes)
    print(report)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(report + "\n")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
