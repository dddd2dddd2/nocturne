#!/usr/bin/env python3
"""全路径穷举审计器（复用 tools/engine.py，含 loop_guard 语义）。

节点目录通过 --nodes 指定，默认读取《雾镇》剧本 stories/fog_town/nodes。

用法：
    python tools/audit_paths.py                 # 全路径（含受控回环）
    python tools/audit_paths.py --no-loop       # 单遍视图（禁止 2_4→2_1 折返）
    python tools/audit_paths.py --output 05_report.md

输出：
    1. 结局可达性矩阵 + 最短路径（含选项）
    2. 死锁报告（未达节点 / 死锁状态 / 软锁状态 / 回环防护生效检查）
    3. Node_3_4 终局前沿统计（各选项可见状态数，仅当故事含 Node_3_4）

退出码：任一结局不可达或存在死锁/软锁状态时为 1，否则 0（可接入 CI）。
"""
import argparse
import os
import sys
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.engine import DEFAULT_NODES_DIR, Engine  # noqa: E402

# 结局自动探测：故事里所有 id 以 Node_End 开头的节点均视为结局（多剧本兼容）
def _endings(engine):
    return sorted(n for n in engine.nodes if n.startswith("Node_End"))


def _story_id(nodes_dir):
    """从节点目录推导故事名（stories/<id>/nodes）。"""
    return os.path.basename(os.path.dirname(os.path.abspath(nodes_dir)))


class Auditor:
    def __init__(self, nodes_dir=DEFAULT_NODES_DIR, no_loop=False):
        self.engine = Engine(nodes_dir=nodes_dir)
        self.no_loop = no_loop
        self.start = ("Node_1_1", self.engine.initial_state(), {})

    # ------------------------------------------------------------ helpers
    @staticmethod
    def _key(node, state, visits):
        v = tuple(sorted((n, c) for n, c in visits.items()))
        return (
            node, state["sanity"], state["bond"], state["clue_a"],
            state["clue_b"], state["clue_c"], state["key"], v,
        )

    @staticmethod
    def _clue(state):
        return min(100, state["clue_a"] + state["clue_b"] + state["clue_c"])

    def _clamp_visits(self, visits):
        """visits 超过 guard max 后行为不再变化，钳位以保证状态空间有限。"""
        for nid in list(visits):
            maxes = [
                c["loop_guard"]["max"]
                for c in self.engine.nodes.get(nid, {}).get("choices", [])
                if c.get("loop_guard")
            ]
            if maxes:
                visits[nid] = min(visits[nid], max(maxes))
        return visits

    def _expand(self, node, state, visits):
        rendered = self.engine.render(node, state, visits)
        for choice in rendered["choices"]:
            if choice.get("locked"):
                continue
            v2 = dict(visits)
            res = self.engine.choose(node, choice["text"], state, v2)
            self._clamp_visits(v2)
            if self.no_loop and node == "Node_2_4" and res["next_node"] == "Node_2_1":
                continue
            yield res["next_node"], res["state"], v2, choice["text"]

    # ---------------------------------------------------------------- run
    def run(self):
        start_key = self._key(*self.start)
        states = {start_key: self.start}
        dist = {start_key: 0}
        prev = {}
        reverse = {}
        queue = deque([start_key])
        max_visits = {}

        while queue:
            key = queue.popleft()
            node, state, visits = states[key]
            for nid, count in visits.items():
                max_visits[nid] = max(max_visits.get(nid, 0), count)
            if node.startswith("Node_End"):
                continue
            for nxt, st2, v2, text in self._expand(node, state, visits):
                key2 = self._key(nxt, st2, v2)
                reverse.setdefault(key2, []).append(key)
                if key2 not in dist:
                    dist[key2] = dist[key] + 1
                    prev[key2] = (key, text)
                    states[key2] = (nxt, st2, v2)
                    queue.append(key2)
                elif dist[key2] > dist[key] + 1:
                    dist[key2] = dist[key] + 1
                    prev[key2] = (key, text)
                    queue.append(key2)

        # 反向 BFS：从所有结局状态出发，求「可到达结局」的状态集
        good = set()
        gq = deque(k for k, (n, _, _) in states.items() if n.startswith("Node_End"))
        good.update(gq)
        while gq:
            key = gq.popleft()
            for pred in reverse.get(key, []):
                if pred not in good:
                    good.add(pred)
                    gq.append(pred)

        deadlock = [
            k for k, (n, _, _) in states.items()
            if not n.startswith("Node_End") and k not in good
        ]
        softlock = [
            k for k, (n, s, v) in states.items()
            if not n.startswith("Node_End")
            and not [c for c in self.engine.render(n, s, v)["choices"] if not c.get("locked")]
        ]

        return {
            "states": states, "dist": dist, "prev": prev,
            "max_visits": max_visits, "deadlock": deadlock, "softlock": softlock,
        }


def _reconstruct(prev, end_key):
    path = []
    key = end_key
    while key in prev:
        pk, text = prev[key]
        path.append((key, text))
        key = pk
    path.append((key, None))
    path.reverse()
    return path


def _fmt_state(state):
    clue = min(100, state["clue_a"] + state["clue_b"] + state["clue_c"])
    return f"SAN={state['sanity']} BOND={state['bond']} CLUE={clue} KEY={'T' if state['key'] else 'F'}"


def _fmt_path(states, path):
    parts = []
    for i, (key, text) in enumerate(path):
        node = states[key][0]
        if i == 0:
            parts.append(node)
        else:
            parts.append(f"[{text}]")
            parts.append(node)
    return " -> ".join(parts)


def build_report(audit, nodes_dir, no_loop):
    engine = audit["engine"]
    states, dist, prev = audit["states"], audit["dist"], audit["prev"]
    L = []
    story = _story_id(nodes_dir)
    mode = "单遍（--no-loop，禁止 2_4→2_1 折返）" if no_loop else "全路径（含受控回环，loop_guard 生效）"
    L.append(f"# 全路径审计报告 · {story}\n")
    L.append(f"- 模式：{mode}")
    L.append(f"- 去重状态数：{len(states)}（含结局状态）")
    reachable_nodes = {n for n, _, _ in states.values()}

    # ---------------------------------------------------------- 一、结局可达性
    L.append("\n## 一、结局可达性\n")
    L.append("| 结局 | 可达 | 最短步数 | 最短路径终态 | 路径 |")
    L.append("|---|---|---|---|---|")
    unreachable = []
    for e in _endings(engine):
        cands = [(k, d) for k, d in dist.items() if states[k][0] == e]
        if not cands:
            L.append(f"| {e} | ❌ 不可达 | — | — | — |")
            unreachable.append(e)
            continue
        end_key, steps = min(cands, key=lambda x: x[1])
        st = states[end_key][1]
        L.append(f"| {e} | ✅ | {steps} | {_fmt_state(st)} | {_fmt_path(states, _reconstruct(prev, end_key))} |")

    # ---------------------------------------------------------- 二、死锁报告
    L.append("\n## 二、死锁报告\n")
    all_nodes = sorted(engine.nodes)
    missing = [n for n in all_nodes if n not in reachable_nodes]
    L.append(f"- 未达节点：{'无' if not missing else ', '.join(missing)}")
    L.append(f"- 死锁状态（无法到达任何结局）：{len(audit['deadlock'])} 个"
             + ("（无）" if not audit["deadlock"] else ""))
    L.append(f"- 软锁状态（无可选选项）：{len(audit['softlock'])} 个"
             + ("（无）" if not audit["softlock"] else ""))
    if audit["deadlock"]:
        for k in audit["deadlock"][:5]:
            n, s, v = states[k]
            L.append(f"  - {n} @ {_fmt_state(s)} visits={v}")
    if audit["softlock"]:
        for k in audit["softlock"][:5]:
            n, s, v = states[k]
            L.append(f"  - {n} @ {_fmt_state(s)} visits={v}")

    # -------------------------------------------------- 三、回环防护生效检查
    L.append("\n## 三、回环防护（loop_guard）生效检查\n")
    guarded = [
        (nid, c) for nid in sorted(engine.nodes)
        for c in engine.nodes[nid].get("choices", []) if c.get("loop_guard")
    ]
    if not guarded:
        L.append("- 无带 loop_guard 的选项")
    else:
        for nid, c in guarded:
            g = c["loop_guard"]
            mx = audit["max_visits"].get(nid, 0)
            locked_states = sum(
                1 for k, (n, s, v) in states.items()
                if n == nid and v.get(nid, 0) >= g["max"]
            )
            L.append(f"- {nid}「{c['text']}」：max={g['max']}，实测最高访问 {mx}，"
                     f"锁定状态 {locked_states} 个"
                     + ("（锁定已触发 ✓）" if mx >= g["max"] else "（未触发）"))

    # ------------------------------------------------------ 四、Node_3_4 前沿
    if "Node_3_4" in engine.nodes:
        L.append("\n## 四、Node_3_4 终局前沿\n")
        frontier = [s for k, (n, s, v) in states.items() if n == "Node_3_4"]
        L.append(f"- 前沿状态数：{len(frontier)}")
        if frontier:
            L.append(f"- 极值：SAN 最高 {max(s['sanity'] for s in frontier)}，"
                     f"BOND 最高 {max(s['bond'] for s in frontier)}，"
                     f"CLUE 最高 {max(min(100, s['clue_a']+s['clue_b']+s['clue_c']) for s in frontier)}")
            hub = engine.nodes["Node_3_4"]
            for c in hub.get("choices", []):
                n = sum(1 for s in frontier if engine._meets(s, c.get("condition")))
                L.append(f"- 「{c['text']}」可见状态数：{n}")

    problems = bool(unreachable) or bool(audit["deadlock"]) or bool(audit["softlock"])
    L.append(f"\n---\n结论：{'❌ 发现问题（退出码 1）' if problems else '✅ 全部结局可达，无死锁（退出码 0）'}")
    return "\n".join(L), problems


def main():
    ap = argparse.ArgumentParser(description="全路径审计器（多剧本）")
    ap.add_argument("--nodes", default=DEFAULT_NODES_DIR, help="节点 JSON 目录（默认《雾镇》）")
    ap.add_argument("--no-loop", action="store_true", help="禁止 2_4→2_1 折返（单遍视图）")
    ap.add_argument("--output", default=None, help="将报告写入文件（同时打印到 stdout）")
    args = ap.parse_args()

    auditor = Auditor(nodes_dir=args.nodes, no_loop=args.no_loop)
    audit = auditor.run()
    audit["engine"] = auditor.engine
    report, problems = build_report(audit, args.nodes, args.no_loop)
    print(report)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(report + "\n")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
