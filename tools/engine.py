"""Minimal node-render engine for node JSONs (multi-story).

Nodes live in ``stories/<story>/nodes/``; point ``nodes_dir`` at the
story you want to play (default: ``stories/fog_town/nodes``, the 雾镇
script).

Rendering contract (used by tests/ and by any future UI):

* ``render(node_id, state) -> {"id", "narrative", "choices": [...]}``
  Returns the node narrative plus the choices currently visible under
  ``state``. Choices whose ``condition`` is not satisfied are hidden.
  Each rendered choice carries ``text`` and — when the author wrote one —
  the per-choice ``outcome`` text.

* ``choose(node_id, choice_text, state, visits=None) -> {"outcome", "next_node", "state"}``
  Resolves the choice: branch ``when``/``otherwise``, variable effects
  (with 0-100 / 0-40 clamps), the SAN=0 -> Node_End_4 and
  SAN<30 -> Node_3_3 engine rules, and returns the player-facing
  ``outcome`` text to render immediately after the choice (``None`` for
  choices that carry no outcome).

Loop guard: choices may declare ``loop_guard`` (schema in the story's
nodes/README.md, e.g. ``stories/fog_town/nodes/README.md``). ``visits`` is a caller-owned mutable dict counting
entries into nodes that carry guarded choices; the guard attaches a
``hint`` once the count passes ``hint_after`` and locks the choice
(``locked: true``, unselectable) once it reaches ``max``.

Variables: sanity(0-100), bond(0-100), clue_a/b/c(0-40), key(bool).
CLUE = min(100, clue_a + clue_b + clue_c).
"""
import glob
import json
import os

# 默认读取《雾镇》剧本的节点目录；新剧本请传 nodes_dir 覆盖
DEFAULT_NODES_DIR = os.path.join("stories", "fog_town", "nodes")


def _clamp(value, lo=0, hi=100):
    return max(lo, min(hi, value))


class Engine:
    def __init__(self, nodes_dir=DEFAULT_NODES_DIR):
        self.nodes = {}
        for path in sorted(glob.glob(os.path.join(nodes_dir, "node_*.json"))):
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
            self.nodes[data["id"]] = data

    # ------------------------------------------------------------------ state
    @staticmethod
    def initial_state():
        return {
            "sanity": 70,
            "bond": 0,
            "clue_a": 0,
            "clue_b": 0,
            "clue_c": 0,
            "key": False,
        }

    @staticmethod
    def clue(state):
        return min(100, state["clue_a"] + state["clue_b"] + state["clue_c"])

    def _meets(self, state, cond):
        if not cond:
            return True
        if cond.get("key") is not None and bool(cond["key"]) != bool(state["key"]):
            return False
        if "san_min" in cond and state["sanity"] < cond["san_min"]:
            return False
        if "san_max" in cond and state["sanity"] > cond["san_max"]:
            return False
        if "bond_min" in cond and state["bond"] < cond["bond_min"]:
            return False
        if "bond_max" in cond and state["bond"] > cond["bond_max"]:
            return False
        clue = self.clue(state)
        if "clue_min" in cond and clue < cond["clue_min"]:
            return False
        if "clue_max" in cond and clue > cond["clue_max"]:
            return False
        return True

    def _apply(self, state, effect):
        st = dict(state)
        st["sanity"] = _clamp(st["sanity"] + effect.get("sanity", 0))
        st["bond"] = _clamp(st["bond"] + effect.get("bond", 0))
        st["clue_a"] = _clamp(st["clue_a"] + effect.get("clue_a", 0), 0, 40)
        st["clue_b"] = _clamp(st["clue_b"] + effect.get("clue_b", 0), 0, 40)
        st["clue_c"] = _clamp(st["clue_c"] + effect.get("clue_c", 0), 0, 40)
        if effect.get("key"):
            st["key"] = True
        return st

    # ---------------------------------------------------------------- render
    def render(self, node_id, state, visits=None):
        node = self.nodes[node_id]
        visits = visits if visits is not None else {}
        count = visits.get(node_id, 0)
        choices = []
        for choice in node.get("choices", []):
            if not self._meets(state, choice.get("condition")):
                continue
            guard = choice.get("loop_guard")
            if guard and count >= guard.get("max", 0):
                choices.append(
                    {
                        "text": choice["text"],
                        "locked": True,
                        "locked_note": guard.get("locked_note"),
                    }
                )
                continue
            item = {"text": choice["text"], "outcome": choice.get("outcome")}
            if guard and count >= guard.get("hint_after", 0):
                item["hint"] = guard.get("hint")
            choices.append(item)
        return {"id": node_id, "narrative": node["narrative"], "choices": choices}

    # ---------------------------------------------------------------- choose
    def choose(self, node_id, choice_text, state, visits=None):
        node = self.nodes[node_id]
        visits = visits if visits is not None else {}
        count = visits.get(node_id, 0)
        for choice in node.get("choices", []):
            if choice["text"] == choice_text:
                break
        else:
            raise KeyError(f"no choice '{choice_text}' in {node_id}")

        if not self._meets(state, choice.get("condition")):
            raise ValueError(
                f"choice '{choice_text}' is not visible at {node_id} "
                f"under state {state}"
            )
        guard = choice.get("loop_guard")
        if guard and count >= guard.get("max", 0):
            raise ValueError(
                f"choice '{choice_text}' is locked by loop_guard at {node_id}"
            )

        target = choice["target"]
        effect = dict(choice.get("effect", {}))
        branch = choice.get("branch")
        if branch:
            if self._meets(state, branch.get("when", {})):
                effect.update(branch.get("effect", {}))
                if branch.get("target"):
                    target = branch["target"]
            else:
                effect.update(branch.get("otherwise", {}))

        next_state = self._apply(state, effect)

        # engine rules from 02_node_map.md 附录 B:
        # SAN=0 -> immediate E4; SAN<30 -> forced into Node_3_3
        # (transitions into Node_3_3 / Node_3_4 / endings are exempt).
        if next_state["sanity"] == 0:
            target = "Node_End_4"
        elif (
            next_state["sanity"] < 30
            and not target.startswith("Node_End")
            and target not in ("Node_3_3", "Node_3_4")
        ):
            target = "Node_3_3"

        # count entries into any node that carries loop-guarded choices
        if any(c.get("loop_guard") for c in self.nodes.get(target, {}).get("choices", [])):
            visits[target] = visits.get(target, 0) + 1

        return {
            "outcome": choice.get("outcome"),
            "next_node": target,
            "state": next_state,
        }
