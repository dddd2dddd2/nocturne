/* 互动引擎 —— 移植自 tools/engine.py（语义对齐：钳位/条件/loop_guard/SAN 规则）。
   引擎本身不绑定任何故事：构造时传入节点列表即可。
   变量说明（见 stories/charon/nodes/README.md）：
   - sanity   SAN 值 0-100，归零触发净舱线，<30 强制进入 SAN 濒危节点
   - bond     信任/绑定度 0-100（真相派绑定，低 = 离心/未绑定）
   - clue_a/b/c  三类线索 0-40（表面证据 / 0.7 秒深层指纹 / 假死与真相）
   - key      逃生舱密钥（布尔）
   CLUE = min(100, clue_a + clue_b + clue_c) */

import type {
  Choice,
  ChoiceCondition,
  ChoiceEffect,
  GameState,
  NodeDef,
  Visits,
} from "./types";

export interface RenderedChoice {
  text: string;
  outcome?: string;
  locked?: boolean;
  locked_note?: string;
  hint?: string;
}

export interface RenderResult {
  id: string;
  narrative: string;
  choices: RenderedChoice[];
}

export interface ChooseResult {
  outcome: string | null;
  nextNode: string;
  state: GameState;
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function initialState(): GameState {
  return { sanity: 70, bond: 0, clue_a: 0, clue_b: 0, clue_c: 0, key: false, flags: {} };
}

export function clueTotal(s: GameState): number {
  return Math.min(100, s.clue_a + s.clue_b + s.clue_c);
}

export function meets(state: GameState, cond?: ChoiceCondition): boolean {
  if (!cond) return true;
  if (cond.key !== undefined && Boolean(cond.key) !== state.key) return false;
  if (cond.san_min !== undefined && state.sanity < cond.san_min) return false;
  if (cond.san_max !== undefined && state.sanity > cond.san_max) return false;
  if (cond.bond_min !== undefined && state.bond < cond.bond_min) return false;
  if (cond.bond_max !== undefined && state.bond > cond.bond_max) return false;
  const c = clueTotal(state);
  if (cond.clue_min !== undefined && c < cond.clue_min) return false;
  if (cond.clue_max !== undefined && c > cond.clue_max) return false;
  if (cond.flags) {
    for (const [name, want] of Object.entries(cond.flags)) {
      if (Boolean(state.flags?.[name]) !== want) return false;
    }
  }
  return true;
}

function apply(state: GameState, effect: ChoiceEffect): GameState {
  const st: GameState = {
    sanity: clamp(state.sanity + (effect.sanity ?? 0)),
    bond: clamp(state.bond + (effect.bond ?? 0)),
    clue_a: clamp(state.clue_a + (effect.clue_a ?? 0), 0, 40),
    clue_b: clamp(state.clue_b + (effect.clue_b ?? 0), 0, 40),
    clue_c: clamp(state.clue_c + (effect.clue_c ?? 0), 0, 40),
    key: state.key,
    flags: { ...state.flags },
  };
  if (effect.key) st.key = true;
  return st;
}

/** 选正文：取第一个 when 满足的叙事变体；没有则用节点默认正文。 */
function narrativeOf(node: NodeDef, state: GameState): string {
  for (const v of node.variants ?? []) {
    if (!v.when || meets(state, v.when)) return v.narrative;
  }
  return node.narrative;
}

export class Engine {
  nodes: Record<string, NodeDef>;

  constructor(nodes: NodeDef[]) {
    this.nodes = Object.fromEntries(nodes.map((n) => [n.id, n]));
  }

  render(nodeId: string, state: GameState, visits: Visits = {}): RenderResult {
    const node = this.nodes[nodeId];
    const count = visits[nodeId] ?? 0;
    const choices: RenderedChoice[] = [];
    for (const choice of node.choices) {
      if (!meets(state, choice.condition)) continue;
      const guard = choice.loop_guard;
      if (guard && count >= guard.max) {
        choices.push({ text: choice.text, locked: true, locked_note: guard.locked_note });
        continue;
      }
      const item: RenderedChoice = { text: choice.text, outcome: choice.outcome };
      if (guard && count >= guard.hint_after) item.hint = guard.hint;
      choices.push(item);
    }
    return { id: nodeId, narrative: narrativeOf(node, state), choices };
  }

  choose(nodeId: string, choiceText: string, state: GameState, visits: Visits = {}): ChooseResult {
    const node = this.nodes[nodeId];
    const count = visits[nodeId] ?? 0;
    const choice: Choice | undefined = node.choices.find((c) => c.text === choiceText);
    if (!choice) throw new Error(`no choice "${choiceText}" in ${nodeId}`);
    if (!meets(state, choice.condition)) {
      throw new Error(`choice "${choiceText}" is not visible at ${nodeId} under current state`);
    }
    const guard = choice.loop_guard;
    if (guard && count >= guard.max) {
      throw new Error(`choice "${choiceText}" is locked by loop_guard at ${nodeId}`);
    }

    let target = choice.target;
    let effect: ChoiceEffect = { ...(choice.effect ?? {}) };
    if (choice.branch) {
      if (meets(state, choice.branch.when)) {
        effect = { ...effect, ...(choice.branch.effect ?? {}) };
        if (choice.branch.target) target = choice.branch.target;
      } else {
        effect = { ...effect, ...(choice.branch.otherwise ?? {}) };
      }
    }

    const next = apply(state, effect);
    if (choice.flags) {
      for (const flag of choice.flags) next.flags[flag] = true;
    }

    // 引擎规则（对齐 tools/engine.py）：
    // SAN=0 -> 立即进入净舱线；SAN<30 -> 强制进入 Node_3_3（结局/濒危节点除外）。
    if (next.sanity === 0) {
      target = "Node_End_4";
    } else if (
      next.sanity < 30 &&
      !target.startsWith("Node_End") &&
      target !== "Node_3_3" &&
      target !== "Node_3_4"
    ) {
      target = "Node_3_3";
    }

    // 记录进入「带 loop_guard 选项」的节点次数
    const targetNode = this.nodes[target];
    if (targetNode && targetNode.choices.some((c) => c.loop_guard)) {
      visits[target] = (visits[target] ?? 0) + 1;
    }

    return { outcome: choice.outcome ?? null, nextNode: target, state: next };
  }
}
