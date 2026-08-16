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
  /** 旗标要求：{ 旗标名: 期望值 }，全部满足才算通过（旗标由选项的 flags 置位）。 */
  flags?: Record<string, boolean>;
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
  /** 选中后置位的旗标名（单调：一旦置位不再清除）。 */
  flags?: string[];
}

export interface NodeDef {
  id: string;
  narrative: string;
  /** 按状态切换的叙事变体：render 时取第一个 when 满足的变体，否则用 narrative。 */
  variants?: NarrativeVariant[];
  choices: Choice[];
}

export interface NarrativeVariant {
  when?: ChoiceCondition;
  narrative: string;
}

// ---------------- 运行时状态 ----------------
export interface GameState {
  sanity: number;
  bond: number;
  clue_a: number;
  clue_b: number;
  clue_c: number;
  key: boolean;
  /** 剧情旗标：由选项置位（单调），驱动叙事变体与条件。 */
  flags: Record<string, boolean>;
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
  /** 已读正文段落：nodeId → 玩家实际读到的段落（含变体分支的渲染文本）。
      名词表按「读到文本」解锁，而非「到达节点」。 */
  read?: Record<string, string[]>;
}

// ---------------- 名词表（正文高亮 + 档案解密） ----------------
export interface TermDef {
  /** 词条原文（正文高亮匹配用，需与 prose 中的写法一致）。 */
  term: string;
  /** 分类 id（中文，如 人物/地点/概念），配色见 termCategories。 */
  category: string;
  /** 首次出现的节点 id；缺省 = 始终公开。设置后，玩家走到该节点才解密。 */
  firstSeen?: string;
  /** 释义（解密后展示；悬停正文词条亦可见）。 */
  meaning: string;
  /** 关联词条名（按名互指，双向生效：A 列了 B，B 也能找到 A）。 */
  related?: string[];
}

export interface TermCategoryInfo {
  label: string;
  color: string;
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

// ---------------- 变量死亡（可选的故事钩子） ----------------
export interface DeathResult {
  victimId: string; // 死者角色 id
  cause: string; // 死因
  epitaph: string; // 一句话讣告
  roster: string[]; // 死亡名单上的角色 id（含死者），按展示顺序
  revealed: boolean; // false=身份待确认（死亡节点内），true=已结算
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
  /** 分幕文案覆盖（1/2/3/9 → 显示名；缺省用“第一幕 · Day N”等通用文案）。 */
  actLabels?: Partial<Record<number, string>>;
  /** 理智濒危警告文案（sanity<30 时显示；缺省用通用文案）。 */
  sanityWarning?: string;
  resolveDeath?: (s: Session) => DeathResult | null; // 变量死亡名单（无则禁用）
  /** 名词表：正文按词条高亮（分类配色 + 悬停释义），并可随进度逐条解密。 */
  terms?: TermDef[];
  termCategories?: Record<string, TermCategoryInfo>;
}
