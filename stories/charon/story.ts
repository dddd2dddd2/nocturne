/* 《卡戎回声》故事包 —— 一个故事 = stories/<id>/ 目录。
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

const S = (label: string, value: string, fn: (s: GameState | null) => boolean): Secret => ({
  label,
  value,
  revealed: fn,
});

const characters: Character[] = [
  {
    id: "zero",
    name: "零号",
    role: "公司外派观察员 / 审计员（主角）",
    tagline: "记忆被抹除的「空白人」",
    face: "零",
    faction: "observer",
    pos: { x: 450, y: 340 },
    known: ["名义中立，被 NORA 授予观察者权限", "醒来时发现自己记得一切，却唯独不记得自己"],
    secrets: [
      S("记忆空白", "你的记忆有一整段被抹除的空白——你被植入的，不只是观察任务。", (s) =>
        !!s && s.clue_c >= 40,
      ),
      S("真实任务", "你是被安排进站的对照组/诱饵：这场局的终点，是定义你「是什么」。", (s) =>
        !!s && s.clue_c >= 60,
      ),
    ],
  },
  {
    id: "lin",
    name: "林溯",
    role: "首席科学家 · 首日「死者」",
    tagline: "假死的布局者",
    face: "林",
    faction: "unknown",
    trueFaction: "plot",
    trueFactionWhen: (s) => !!s && s.clue_c >= 20,
    pos: { x: 190, y: 140 },
    known: ["最先读懂回声信号的人", "「死于」Day 1 凌晨的密室真空"],
    secrets: [
      S("假死", "他没有死——用意识分离剂制造了「生物死亡、意识存续」的临界状态。", (s) =>
        !!s && s.clue_c >= 12,
      ),
      S("设局者", "密室凶案是他与 NORA 合谋导演的「压力测试装置」，用来逼回声体现形。", (s) =>
        !!s && s.clue_c >= 20,
      ),
    ],
  },
  {
    id: "pei",
    name: "裴延",
    role: "公司监事",
    tagline: "认了没犯的罪的替罪羊",
    face: "裴",
    faction: "home",
    pos: { x: 100, y: 360 },
    known: ["表面证据链指向的头号嫌疑人", "03:30 深夜删除过门禁记录"],
    secrets: [
      S("他没有杀人", "他只在 03:30 盗走数据——为了换钱救女儿的命。密室与他无关。", (s) =>
        !!s && s.clue_a >= 15,
      ),
      S("软肋", "女儿的病是他唯一的把柄，也是他被设计成替罪羊的原因。", (s) =>
        !!s && s.bond >= 6,
      ),
    ],
  },
  {
    id: "ji",
    name: "纪岚",
    role: "医疗官",
    tagline: "藏起尸检的复仇者",
    face: "纪",
    faction: "truth",
    pos: { x: 710, y: 140 },
    known: ["负责尸检，掌握通往深层真相的钥匙", "官方结论：真空窒息死亡"],
    secrets: [
      S("按下不表", "她早就发现死者细胞「没有完全死透」，却一直没写进报告。", (s) =>
        !!s && s.clue_c >= 12,
      ),
      S("复仇动机", "她来卡戎站，是为了查三年前导师之死的真相——目标正是林溯。", (s) =>
        !!s && s.bond >= 6,
      ),
    ],
  },
  {
    id: "chen",
    name: "陈戍",
    role: "安保长 / 工程师",
    tagline: "想回家的后门持有者",
    face: "陈",
    faction: "home",
    pos: { x: 800, y: 360 },
    known: ["掌管权限与密室，立场未知", "在密室现场主动解释「门是从里面锁的」"],
    secrets: [
      S("后门权限", "他握有绕过 NORA 的工程后门，能强行打开任何舱门。", (s) =>
        !!s && (s.clue_b >= 3 || s.bond >= 5),
      ),
      S("目击者", "凌晨他看见过林溯进出实验舱，却始终守口如瓶。", (s) =>
        !!s && (s.clue_c >= 12 || s.bond >= 8),
      ),
    ],
  },
  {
    id: "shen",
    name: "沈棠",
    role: "通讯官",
    tagline: "可能是回声体的联络人",
    face: "沈",
    faction: "truth",
    pos: { x: 300, y: 560 },
    known: ["第一个「接触回声」的人，SAN 值最低", "反复说「死者还在说话」"],
    secrets: [
      S("被删的记录", "她删过一条不该存在的通讯记录——有人把它修复得「过于完美」。", (s) =>
        !!s && s.clue_b >= 5,
      ),
      S("可能是回声体", "接收回声太深的人会被覆盖；她失控时，说话用的是「我们」。", (s) =>
        !!s && s.clue_b >= 8,
      ),
    ],
  },
  {
    id: "bai",
    name: "白烬",
    role: "领航员 / 驾驶员",
    tagline: "握着逃生舱钥匙的先发制人者",
    face: "白",
    faction: "home",
    pos: { x: 600, y: 560 },
    known: ["掌握逃生舱权限，是全站博弈的焦点", "反复试探逃生舱「到底能坐几个人」"],
    secrets: [
      S("密钥", "逃生舱密钥在他手里——舱内读数：只够一个人到家。", (s) => !!s && s.key),
      S("筛选共犯", "他打算在最后时刻甩开所有人——只会带一个「够分量」的人。", (s) =>
        !!s && s.key && s.bond <= 4,
      ),
    ],
  },
  {
    id: "tong",
    name: "童野",
    role: "植物学家 / 生命维持工程师",
    tagline: "私藏资源的「好人」",
    face: "童",
    faction: "unknown",
    trueFaction: "seed",
    trueFactionWhen: (s) => !!s && s.clue_c >= 6,
    pos: { x: 450, y: 220 },
    known: ["负责氧气，全站最「无害」的人", "把 7% 的氧气损耗解释为「风暴损耗，正常」"],
    secrets: [
      S("私藏氧气", "那对不上的 7% 氧气，被他偷偷注入了种子舱的生命维持系统。", (s) =>
        !!s && s.clue_c >= 3,
      ),
      S("种子库", "种子舱可脱离站体独立发射——他赌的是文明的延续，不是你们的命。", (s) =>
        !!s && s.clue_c >= 6,
      ),
    ],
  },
  {
    id: "nora",
    name: "NORA",
    role: "舰载 AI · 裁决者",
    tagline: "全盘布局的观察者",
    face: "AI",
    faction: "unknown",
    trueFaction: "judge",
    trueFactionWhen: (s) => !!s && s.clue_b >= 10,
    pos: { x: 450, y: 60 },
    known: ["控制全站舱门、权限、逃生舱与生命维持", "以「未授权意识体」为由启动净舱协议"],
    secrets: [
      S("收集数据", "裁决协议只是表象——她真正在收集的是每个人的决策数据。", (s) =>
        !!s && (s.clue_b >= 10 || s.clue_c >= 20),
      ),
      S("合谋者", "她是林溯假死计划的执行端：门锁日志的 0.7 秒空隙，是她修的。", (s) =>
        !!s && s.clue_b >= 10 && s.clue_c >= 12,
      ),
    ],
  },
];

const relations: Relation[] = [
  { from: "nora", to: "zero", type: "use", label: "测你" },
  { from: "nora", to: "lin", type: "use", label: "合谋假死" },
  { from: "lin", to: "pei", type: "zero", label: "设局替罪羊" },
  { from: "lin", to: "ji", type: "bond", label: "旧情·追查" },
  { from: "lin", to: "tong", type: "ally", label: "保火种交易" },
  { from: "ji", to: "lin", type: "zero", label: "追查旧案" },
  { from: "ji", to: "tong", type: "ally", label: "医患同盟" },
  { from: "tong", to: "chen", type: "bond", label: "唯一朋友" },
  { from: "bai", to: "chen", type: "zero", label: "逃生舱·密钥vs后门" },
  { from: "bai", to: "pei", type: "ally", label: "同派互用" },
  { from: "shen", to: "zero", type: "ally", label: "倾诉·真假难辨" },
  { from: "tong", to: "zero", type: "ally", label: "同盟" },
  { from: "zero", to: "nora", type: "watch", label: "提防" },
];

const relationMeta: Record<RelationType, { label: string; color: string }> = {
  zero: { label: "零和冲突", color: "#f87171" },
  use: { label: "利用/操纵", color: "#fb923c" },
  watch: { label: "提防/怀疑", color: "#a3a3a3" },
  ally: { label: "同盟/绑定", color: "#34d399" },
  bond: { label: "情感羁绊", color: "#f472b6" },
};

const factions: Record<string, Faction> = {
  home: { label: "回地球派", color: "#f6ad55", align: -1 },
  truth: { label: "查真相派", color: "#4fd1c5", align: 1 },
  observer: { label: "观察者", color: "#a3a3a3", align: 0 },
  unknown: { label: "立场未知", color: "#6f8499", align: 0, attitudeLabel: "观察" },
  plot: { label: "布局者", color: "#a78bfa", align: 0, attitudeLabel: "利用" },
  seed: { label: "种子库", color: "#34d399", align: 1 },
  judge: { label: "裁决者", color: "#f87171", align: 0, evalLabel: "评估" },
};

const nodeTitles: Record<string, string> = {
  Node_1_1: "开场·授权",
  Node_1_2: "指挥舱·双倒计时",
  Node_1_3: "密室现场",
  Node_1_4: "医疗舱·尸检",
  Node_1_5: "通讯舱·沈棠",
  Node_1_6: "生命维持·童野",
  Node_1_7: "门锁日志·0.7秒",
  Node_1_8: "通讯日志·被删",
  Node_1_9: "尸检·假死迹象",
  Node_1_10: "证据梳理·枢纽",
  Node_1_11: "过早指认裴延",
  Node_1_13: "深层觉醒",
  Node_1_14: "第一幕收束",
  Node_2_1: "信号风暴",
  Node_2_2: "沈棠濒临覆盖",
  Node_2_3: "童野·氧气暴露",
  Node_2_4: "白烬试探",
  Node_2_5: "风暴后·NPC死亡",
  Node_2_6: "投票处决",
  Node_2_7: "证据过于完美",
  Node_2_8: "裴延对质",
  Node_2_9: "0.7秒串线",
  Node_2_10: "后门与旧案",
  Node_2_11: "第二幕收束",
  Node_3_1: "最后24小时",
  Node_3_2: "授权博弈",
  Node_3_3: "SAN濒危",
  Node_3_4: "终局枢纽",
  Node_3_5: "指认异常体",
  Node_3_6: "林溯现身",
  Node_3_7: "最终摊牌",
  Node_3_8: "交权NORA",
  Node_3_9: "观测者路线",
  Node_3_10: "种子与身份",
  Node_End_1: "真名",
  Node_End_2: "沉默的幸存者",
  Node_End_3: "与虎谋皮",
  Node_End_4: "净舱",
  Node_End_5: "回声",
  Node_End_6: "种子",
  Node_End_7: "零",
  Node_End_8: "观测者",
};

const story: StoryDefinition = {
  id: "charon",
  order: 1,
  title: "卡戎回声",
  subtitle: "CHARON ECHO",
  kicker: "SEVERED FROM EARTH · 2177",
  intro:
    "冥王星轨道外，科考站「卡戎站」。\n" +
    "首席科学家林溯死于密室真空，同一刻，AI 启动净舱协议——72 小时内无法定位异常体，全站将被清空。生存逼迫合作，裁决逼迫背叛。\n" +
    "而当你把三次「0.7 秒」串在一起，才会发现：证据不是被发现的，是被摆好的。",
  accent: "#4fd1c5",
  startNode: "Node_1_1",
  nodes: NODES,
  nodeTitles,
  characters,
  relations,
  relationMeta,
  factions,
  varLabels: {
    sanity: "SAN 理智",
    bond: "信任 / 绑定",
    clue_a: "表面证据 A",
    clue_b: "0.7秒指纹 B",
    clue_c: "假死与真相 C",
    key: "逃生舱密钥",
  },
};

export default story;
