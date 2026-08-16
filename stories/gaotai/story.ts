/* 《高太公战纪》故事包 —— 一个故事 = stories/<id>/ 目录。
   引擎、书架、图谱、节点树都只依赖这里导出的 StoryDefinition，不感知具体故事。 */
import type {
  Character,
  Faction,
  GameState,
  Relation,
  RelationType,
  Secret,
  StoryDefinition,
} from "../../src/engine/types";
import { NODES } from "./nodes.data";
import { TERMS, TERM_CATEGORIES } from "./terms.data";

const S = (label: string, value: string, fn: (s: GameState | null) => boolean): Secret => ({
  label,
  value,
  revealed: fn,
});

const characters: Character[] = [
  {
    id: "zero",
    name: "高太公",
    role: "高老庄庄主 · 死后反天的老鬼（主角）",
    tagline: "那口气，咽不下",
    face: "高",
    faction: "ghost",
    trueFaction: "rebel",
    trueFactionWhen: (s) => !!s && s.clue_c >= 12,
    pos: { x: 450, y: 340 },
    known: [
      "高老庄的庄主，七十岁，养女翠兰，招了个猪妖女婿",
      "得知女婿得道成神、再不回庄后，一气而亡，进了阴间",
      "在生死簿上看见自己的阳寿八十四，被借走十三年",
    ],
    secrets: [
      S("阳寿被借", "那十三年，记在「借与取经功果」的账上——你女婿的得道，是用你的命换的。", (s) =>
        !!s && s.clue_a >= 5,
      ),
      S("戏外的布景", "高老庄从头到尾都是取经剧本里的一块布景。你这位庄主，是布景上画的一棵树。", (s) =>
        !!s && s.clue_b >= 10,
      ),
    ],
  },
  {
    id: "cuilan",
    name: "高翠兰",
    role: "高太公之女 · 被抹去名字的人",
    tagline: "活着，却忘了自己是谁",
    face: "翠",
    faction: "mortal",
    pos: { x: 300, y: 200 },
    known: [
      "高太公的女儿，十四年前被猪妖强娶",
      "如今独居高老庄，神思恍惚，谁也认不得",
    ],
    secrets: [
      S("名字被抹", "生死簿上没有高翠兰——那一页被人整页撕掉，连纸毛都不留。她是那出戏的证，证不能留在簿上。", (s) =>
        !!s && s.clue_c >= 8,
      ),
      S("忘川水", "她被灌了忘川水，活着喝的。十四年的记忆，被连根拔了。", (s) =>
        !!s && s.clue_c >= 15,
      ),
    ],
  },
  {
    id: "bajie",
    name: "猪八戒",
    role: "净坛使者 · 高家的猪头女婿",
    tagline: "成了神，也没忘高老庄的门",
    face: "猪",
    faction: "heaven",
    trueFaction: "remorse",
    trueFactionWhen: (s) => !!s && (s.bond >= 5 || s.clue_c >= 12),
    pos: { x: 600, y: 200 },
    known: [
      "原是掌管天河的天蓬元帅，投了猪胎，入赘高家",
      "随唐僧取经功成，敕封净坛使者，享受十方供品",
    ],
    secrets: [
      S("净坛使者", "这封号听着风光，差事却是替神佛收拾剩饭供品——名为成神，实为天界的净差。", (s) =>
        !!s && s.clue_b >= 10,
      ),
      S("找了她十四年", "他查过生死簿，小姐的名字被人抹了。他问菩萨，菩萨说：她很好，已经忘了。", (s) =>
        !!s && s.clue_c >= 8,
      ),
    ],
  },
  {
    id: "chuntao",
    name: "春桃",
    role: "高家丫鬟 · 灭口的冤魂",
    tagline: "台上的灰，台下的证",
    face: "桃",
    faction: "ghost",
    trueFaction: "witness",
    trueFactionWhen: (s) => !!s && s.clue_b >= 6,
    pos: { x: 300, y: 500 },
    known: [
      "高家的丫鬟，伺候翠兰，十四年前死于一场「瘟疫」",
      "死后成了忘川边的冤魂，一直等着见老爷一面",
    ],
    secrets: [
      S("被灭口", "她不是病死的，是被人灭口的——她是高老庄一难的「台下土」，戏演完，灰要扫干净。", (s) =>
        !!s && s.clue_b >= 5,
      ),
      S("见过剧本", "她亲眼见过观音身边的人对词：「第二十四难，高老庄收伏猪悟能」「此难需一民女为饵」。", (s) =>
        !!s && s.clue_b >= 8,
      ),
    ],
  },
  {
    id: "cuijue",
    name: "崔珏",
    role: "阴间判官 · 生死簿的执笔人",
    tagline: "判了一千年，攒了一千个红点",
    face: "判",
    faction: "hell",
    trueFaction: "ledger",
    trueFactionWhen: (s) => !!s && (s.clue_a >= 10 || s.bond >= 4),
    pos: { x: 600, y: 500 },
    known: [
      "执掌生死簿的判官，阴间最会写字的人",
      "判了千年案，青袍上磨不掉的墨渍",
    ],
    secrets: [
      S("一千个红点", "每个冤死的人，他都在名字旁点一个红点，再在自己胳膊上扎一针。攒了一千年，扎了一千针。", (s) =>
        !!s && s.clue_a >= 12,
      ),
      S("交出判官印", "判官印是他故意交出去的——他等一个能改命的人，等了一千年。", (s) =>
        !!s && (s.clue_a >= 15 || s.key),
      ),
    ],
  },
  {
    id: "yanluo",
    name: "阎罗王",
    role: "十殿之主 · 生死轮回的看守",
    tagline: "守着别人写的规矩，守到忘了自己",
    face: "阎",
    faction: "hell",
    pos: { x: 750, y: 340 },
    known: [
      "十殿之主，生死轮回的看守，千年未离正殿",
      "掌管生死簿的审阅与轮回的判决",
    ],
    secrets: [
      S("他也是借命的", "他做阎罗之前也是鬼。生死簿上写着：阳寿七十二，借走三十年，以充幽冥守门之职。", (s) =>
        !!s && s.clue_a >= 10,
      ),
      S("天条的真本", "他知道天条不是天庭写的——天庭只是抄书的人，真本在西天那位手里。", (s) =>
        !!s && s.clue_b >= 10,
      ),
    ],
  },
  {
    id: "mengpo",
    name: "孟婆",
    role: "忘川桥头的掌汤人",
    tagline: "让人忘的人，自己先忘干净了",
    face: "婆",
    faction: "hell",
    trueFaction: "keeper",
    trueFactionWhen: (s) => !!s && s.clue_c >= 8,
    pos: { x: 150, y: 340 },
    known: [
      "忘川桥头的掌汤人，千年不变的微笑",
      "她熬的汤，一半给死人，一半给活人",
    ],
    secrets: [
      S("第一个喝汤的人", "她是这桥上第一个端碗的人，那碗汤是她自己先尝的。她忘了自己的孩子。", (s) =>
        !!s && s.clue_c >= 10,
      ),
      S("偷了一瓢井水", "她偷偷在汤里兑了一瓢人间井水——让放不下的人，能想起点啥。她这辈子，就偷了这一回。", (s) =>
        !!s && s.clue_c >= 15,
      ),
    ],
  },
  {
    id: "erlang",
    name: "二郎神",
    role: "天庭钦差 · 传旨领兵的人",
    tagline: "半人半神，在天上也是外人",
    face: "神",
    faction: "heaven",
    trueFaction: "outsider",
    trueFactionWhen: (s) => !!s && s.clue_c >= 8,
    pos: { x: 450, y: 120 },
    known: [
      "天庭派来传旨、领兵的钦差，三尖两刃刀",
      "玉帝的外甥，半人半神，听调不听宣",
    ],
    secrets: [
      S("天上的外人", "他在天上也是外人——半人半神的出身，让他在天庭永远隔着一层。", (s) =>
        !!s && s.clue_c >= 10,
      ),
      S("撤了半队兵", "传旨那夜，你问他「在天上也是外人吧」，他没答，却撤了半队天兵。", (s) =>
        !!s && s.clue_c >= 12,
      ),
    ],
  },
];

const relations: Relation[] = [
  { from: "bajie", to: "cuilan", type: "bond", label: "强娶·旧情" },
  { from: "cuilan", to: "zero", type: "bond", label: "父女" },
  { from: "chuntao", to: "cuilan", type: "ally", label: "主仆" },
  { from: "chuntao", to: "zero", type: "ally", label: "旧仆·告密" },
  { from: "bajie", to: "zero", type: "bond", label: "翁婿·旧账" },
  { from: "cuijue", to: "zero", type: "watch", label: "笔与簿" },
  { from: "yanluo", to: "zero", type: "zero", label: "官vs民" },
  { from: "mengpo", to: "zero", type: "watch", label: "汤与桥" },
  { from: "erlang", to: "zero", type: "zero", label: "天兵vs反贼" },
  { from: "erlang", to: "bajie", type: "ally", label: "同僚" },
  { from: "cuijue", to: "yanluo", type: "use", label: "奉命判案" },
  { from: "mengpo", to: "cuijue", type: "ally", label: "千年同僚" },
];

const relationMeta: Record<RelationType, { label: string; color: string }> = {
  zero: { label: "零和冲突", color: "#f87171" },
  use: { label: "利用/操纵", color: "#fb923c" },
  watch: { label: "提防/怀疑", color: "#a3a3a3" },
  ally: { label: "同盟/绑定", color: "#34d399" },
  bond: { label: "情感羁绊", color: "#f472b6" },
};

const factions: Record<string, Faction> = {
  ghost: { label: "冤魂", color: "#6f8499", align: 0, attitudeLabel: "怒" },
  mortal: { label: "人间", color: "#a3a3a3", align: 0, attitudeLabel: "牵挂" },
  heaven: { label: "天庭", color: "#fbbf24", align: -1 },
  hell: { label: "地府", color: "#a78bfa", align: 0, attitudeLabel: "提防" },
  // —— 隐藏真身（随线索揭示后覆盖表面阵营）——
  rebel: { label: "反天者", color: "#f87171", align: 1 },
  remorse: { label: "念旧", color: "#f472b6", align: 1 },
  witness: { label: "戏中人", color: "#34d399", align: 1 },
  ledger: { label: "记账人", color: "#4fd1c5", align: 1 },
  keeper: { label: "守桥人", color: "#94a3b8", align: 0, attitudeLabel: "暗助" },
  outsider: { label: "局外人", color: "#e879f9", align: 0, attitudeLabel: "观望" },
};

const nodeTitles: Record<string, string> = {
  Node_1_1: "开场·喜报",
  Node_1_2: "断气·那口气",
  Node_1_3: "黄泉路",
  Node_1_4: "望乡台",
  Node_1_5: "阎罗殿·生死簿",
  Node_1_6: "判官崔珏",
  Node_1_7: "忘川·春桃",
  Node_1_8: "收束·那一跪",
  Node_2_1: "冤魂聚义",
  Node_2_2: "判官对质",
  Node_2_3: "孟婆·汤与桥",
  Node_2_4: "夺簿·生死簿",
  Node_2_5: "阎罗正殿",
  Node_2_6: "翠兰之谜",
  Node_2_7: "天庭来使·二郎神",
  Node_2_8: "收束·战旗",
  Node_3_1: "天兵压境",
  Node_3_2: "二郎神·阵前",
  Node_3_3: "忘川·那口气",
  Node_3_4: "八戒·净坛使者",
  Node_3_5: "生死簿·焚与守",
  Node_3_6: "佛光·剧本的作者",
  Node_End_1: "凌霄·擂鼓",
  Node_End_2: "焚簿·还命",
  Node_End_3: "高老庄·认亲",
  Node_End_4: "封神·灶神",
  Node_End_5: "忘川·投猪",
  Node_End_6: "孤魂",
};

const story: StoryDefinition = {
  id: "gaotai",
  order: 2,
  title: "高太公战纪",
  subtitle: "一怒撼天",
  kicker: "取经功成 · 诸神归位 · 高老庄的灯灭了",
  intro:
    "他们说，猪八戒成了净坛使者，得了正果，再不回高老庄了。\n" +
    "我高太公活了七十年，养大了女儿，修好了门楼，就等这一口气。那口气散了，我也就死了。\n" +
    "可死到地府我才发现——我这条命，我女儿的名字，我高老庄的门楣，都是别人簿子上写好的字。\n" +
    "那簿子既然能写，我就该能改。",
  accent: "#d9822b",
  startNode: "Node_1_1",
  nodes: NODES,
  nodeTitles,
  characters,
  relations,
  relationMeta,
  factions,
  terms: TERMS,
  termCategories: TERM_CATEGORIES,
  actLabels: { 1: "第一幕 · 高老庄", 2: "第二幕 · 地府", 3: "第三幕 · 反天", 9: "结局" },
  sanityWarning: "⚠ 那口气将散——喝下孟婆汤，就再也记不得了",
  varLabels: {
    sanity: "怒意·那口气",
    bond: "人情",
    clue_a: "账·生死簿",
    clue_b: "卷·取经剧本",
    clue_c: "秘·轮回真相",
    key: "判官印",
  },
};

export default story;
