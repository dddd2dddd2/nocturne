/* 引擎与故事的共享类型。故事包（stories/<id>/story.ts）与引擎、组件都依赖这里。
   故事节点命名约定：Node_1_x / Node_2_x / Node_3_x / Node_End_x（三幕 + 结局）。 */

// ---------------- 节点数据 ----------------
export interface ChoiceEffect {
  sanity?: number;
  bond?: number;
  clue_a?: number;
  clue_b?: number;
  clue_c?: number;
  key?: boolean;
}

export interface ChoiceCondition {
  key?: boolean;
  san_min?: number;
  san_max?: number;
  bond_min?: number;
  bond_max?: number;
  clue_min?: number;
  clue_max?: number;
}

export interface LoopGuard {
  hint_after: number;
  max: number;
  hint?: string;
  locked_note?: string;
}

export interface ChoiceBranch {
  when?: ChoiceCondition;
  effect?: ChoiceEffect;
  otherwise?: ChoiceEffect;
  target?: string;
}

export interface Choice {
  text: string;
  target: string;
  effect?: ChoiceEffect;
  condition?: ChoiceCondition;
  outcome?: string;
  loop_guard?: LoopGuard;
  branch?: ChoiceBranch;
}

export interface NodeDef {
  id: string;
  narrative: string;
  choices: Choice[];
}

// ---------------- 运行时状态 ----------------
export interface GameState {
  sanity: number;
  bond: number;
  clue_a: number;
  clue_b: number;
  clue_c: number;
  key: boolean;
}

export type Visits = Record<string, number>;

export interface HistoryEntry {
  nodeId: string;
  choice: string | null;
  outcome: string | null;
}

export interface Session {
  nodeId: string;
  state: GameState;
  visits: Visits;
  history: HistoryEntry[];
}

// ---------------- 人物图谱 ----------------
export interface Secret {
  label: string;
  value: string;
  revealed: (s: GameState | null) => boolean;
}

export type RelationType = "zero" | "use" | "watch" | "ally" | "bond";

export interface Relation {
  from: string;
  to: string;
  type: RelationType;
  label: string;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  tagline: string;
  face: string; // 头像字符
  pos: { x: number; y: number };
  known: string[];
  secrets: Secret[];
  faction: string; // 表面阵营 id
  trueFaction?: string; // 真实阵营 id（随进度揭示后覆盖）
  trueFactionWhen?: (s: GameState | null) => boolean;
}

export interface Faction {
  label: string;
  color: string;
  align: 1 | -1 | 0; // 与 bond 的方向：+1 同向 / -1 反向 / 0 无关
  evalLabel?: string; // 若有，则把 bond 显示为该标签的百分比（如 NORA 评估）
  attitudeLabel?: string; // align=0 时的固定态度文案
}

// ---------------- 故事清单（一个故事包导出它） ----------------
export interface VariableLabels {
  sanity?: string;
  bond?: string;
  clue_a?: string;
  clue_b?: string;
  clue_c?: string;
  key?: string;
}

export interface StoryDefinition {
  id: string;
  order: number; // 书架排序
  title: string; // 《卡戎回声》
  subtitle: string; // CHARON ECHO
  kicker: string; // 标题页小字
  intro: string; // 引言（\n 换行）
  accent: string; // 主题色
  startNode: string;
  nodes: NodeDef[];
  nodeTitles: Record<string, string>;
  characters: Character[];
  relations: Relation[];
  relationMeta: Record<RelationType, { label: string; color: string }>;
  factions: Record<string, Faction>;
  varLabels?: VariableLabels; // 状态面板文案（缺省用通用标签）
}
