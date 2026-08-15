# 互动小说引擎 · React 应用

一个故事驱动的互动小说 Web 应用：书架选择故事 → 标题页 → 播放（叙事/分支/变量结算）→ 节点树 / 人物图谱。引擎规则与 `tools/engine.py` 语义对齐，已接入 `tools/audit_static.py` 等审计工具。

当前内置故事：**《卡戎回声》CHARON ECHO**（三幕网状叙事 + 8 结局，42/42 节点可达）。

## 运行

```bash
npm install     # 首次
npm run dev     # 本地开发：http://127.0.0.1:5173
```

其他命令：

```bash
npm run typecheck   # tsc --noEmit
npm run build       # 类型检查 + 生产构建（dist/）
npm run sync:data   # 把各故事的 nodes/*.json 同步为 nodes.data.ts
```

## 功能

- **书架**：主页面列出所有故事，可「进入」；显示每部故事的存档进度。
- **标题页**：故事引言 + 开始 / 继续 / 节点树 / 人物图谱。
- **进入游戏**：叙事 → 选择 → 变量结算（SAN/信任/三类线索/密钥），支持条件隐藏、loop_guard、SAN<30 强制濒危、结局判定。
- **自动存档**：每一步选择都会实时写入本机（localStorage，按故事分档）。下次进入同一故事可「继续游戏」，也可删除存档。
- **节点树**：三幕网状结构（SVG 分层布局），点击看详情，游玩中高亮当前节点与下一步。
- **人物图谱**：角色关系网 + 已确认信息 + 随进度实时解密的隐藏档案（未解密显示 ？？？）。

## 目录结构

```
src/
├── engine/          # 通用引擎（不绑定任何故事）
│   ├── engine.ts    # 交互引擎（对齐 tools/engine.py）
│   ├── types.ts     # 共享类型（NodeDef / Character / StoryDefinition / Session…）
│   └── format.ts    # 分幕/配色约定
├── components/      # 通用 UI：StoryLibrary / TitleScreen / Player / NodeMap / CharacterGraph
├── stories.ts       # 书架注册表（新故事在此加一行 import）
├── storage.ts       # 自动存档（localStorage）
├── App.tsx          # 两级导航：书架 → 故事
└── styles.css

stories/<id>/        # 一个故事 = 一个目录（量产其他小说的单位）
└── charon/
    ├── story.ts     # 故事清单：标题文案 + 节点标题 + 人物 + 关系 + 变量标签
    ├── nodes/       # 节点 JSON（由 generate_nodes.py 生成）
    ├── nodes.data.ts# 引擎数据（npm run sync:data 生成，勿手改）
    ├── generate_nodes.py / verify_witness.py
    ├── prose/       # 剧本正文（每个节点一个 .md，直接编辑它即改游戏文案）
    └── docs/        # 大纲 / 人物 / 时间线 / 节点 / 结局 / 质检
```

## 改正文（写文档，不用碰代码）

正文以纯文档形式放在 `stories/<id>/prose/<节点ID>.md`，直接编辑即可。结构（选项/条件/变量）在 `generate_nodes.py` 里，正文在文档里，两者互不干扰：

```bash
# 编辑 stories/charon/prose/node_1_1.md 后，重新生成数据：
cd stories/charon && python generate_nodes.py && cd ../.. && npm run sync:data
```

新故事同理：把每个节点的正文写进 `prose/<节点ID>.md`，结构写在 `generate_nodes.py` 的 `NODES` 里，运行时自动按节点 ID 读取对应文档。

## 如何新增一个故事

1. 新建 `stories/<id>/` 目录，放入节点 JSON（`nodes/node_*.json`）。
2. 写 `stories/<id>/story.ts`，默认导出 `StoryDefinition`（标题文案、`nodeTitles`、人物、关系、`startNode`）。
3. 运行 `npm run sync:data` 生成 `nodes.data.ts`。
4. 在 `src/stories.ts` 加一行 import。

引擎、书架、图谱、节点树、自动存档都是通用的，新故事只需提供数据。

> 说明：简化模型里用 bond 代理「信任/NORA 评估」、用线索 C 代理「假死与真相」、SAN=0 直通净舱线——与 Python 引擎完全一致。变量的面板文案可在 `story.ts` 的 `varLabels` 里自定义。
