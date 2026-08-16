import { useMemo, useState } from "react";
import type { NodeDef, Session, StoryDefinition } from "../engine/types";
import { actOf, nodeColorOf } from "../engine/format";
import type { Engine } from "../engine/engine";

const BOX_W = 148;
const BOX_H = 58;
const GAP_X = 178;
const GAP_Y = 142;
const PAD = 24;

interface LayoutInfo {
  pos: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
}

function computeLayout(nodes: NodeDef[], startNode: string): LayoutInfo {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pos = new Map<string, { x: number; y: number }>();
  const depth = new Map<string, number>();
  depth.set(startNode, 0);
  const queue: string[] = [startNode];
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    const node = byId.get(id);
    if (!node) continue;
    for (const c of node.choices) {
      if (!byId.has(c.target) || depth.has(c.target)) continue;
      depth.set(c.target, d + 1);
      queue.push(c.target);
    }
  }
  const layers = new Map<number, string[]>();
  for (const [id, d] of depth) {
    if (!layers.has(d)) layers.set(d, []);
    layers.get(d)!.push(id);
  }
  let maxCount = 0;
  for (const list of layers.values()) maxCount = Math.max(maxCount, list.length);
  for (const [d, list] of layers) {
    list.sort();
    list.forEach((id, i) => {
      pos.set(id, { x: PAD + i * GAP_X, y: PAD + d * GAP_Y });
    });
  }
  const maxDepth = layers.size ? Math.max(...[...layers.keys()]) : 0;
  return {
    pos,
    width: Math.max(400, PAD * 2 + maxCount * GAP_X - (GAP_X - BOX_W)),
    height: PAD * 2 + maxDepth * GAP_Y + BOX_H + 20,
  };
}

function fmtCond(cond: NodeDef["choices"][number]["condition"] | undefined): string {
  if (!cond) return "";
  const parts: string[] = [];
  if (cond.key !== undefined) parts.push(`密钥=${cond.key ? "持有" : "无"}`);
  if (cond.san_min !== undefined) parts.push(`SAN≥${cond.san_min}`);
  if (cond.san_max !== undefined) parts.push(`SAN≤${cond.san_max}`);
  if (cond.bond_min !== undefined) parts.push(`信任≥${cond.bond_min}`);
  if (cond.bond_max !== undefined) parts.push(`信任≤${cond.bond_max}`);
  if (cond.clue_min !== undefined) parts.push(`线索≥${cond.clue_min}`);
  if (cond.clue_max !== undefined) parts.push(`线索≤${cond.clue_max}`);
  return parts.join(" · ");
}

interface Props {
  story: StoryDefinition;
  engine: Engine;
  session: Session | null;
}

export default function NodeMap({ story, engine, session }: Props) {
  const { nodes, nodeTitles, startNode } = story;
  const layout = useMemo(() => computeLayout(nodes, startNode), [nodes, startNode]);
  const [selected, setSelected] = useState<string | null>(null);

  const highlight = useMemo(() => {
    if (!session) return null;
    const rendered = engine.render(session.nodeId, session.state, session.visits);
    return {
      current: session.nodeId,
      next: new Set(
        rendered.choices
          .filter((c) => !c.locked)
          .map((c) => {
            const def = nodes.find((n) => n.id === session.nodeId);
            return def?.choices.find((cc) => cc.text === c.text)?.target ?? "";
          }),
      ),
    };
  }, [session, engine, nodes]);

  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null;
  const titleOf = (id: string) => nodeTitles[id] ?? id;

  return (
    <div>
      <h2 style={{ margin: "4px 0 6px", letterSpacing: "3px" }}>
        {story.title} · 节点树 · 三幕网状结构
      </h2>
      <div className="map-legend">
        <span><span className="dot" style={{ background: "#2a6b64" }} />第一幕</span>
        <span><span className="dot" style={{ background: "#6b5226" }} />第二幕</span>
        <span><span className="dot" style={{ background: "#4c3a78" }} />第三幕</span>
        <span><span className="dot" style={{ background: "#6b2a2a" }} />结局</span>
        {highlight && (
          <>
            <span><span className="dot" style={{ background: "var(--cyan)" }} />当前节点</span>
            <span><span className="dot" style={{ background: "var(--amber)" }} />下一步可选</span>
          </>
        )}
        <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>点击节点查看详情</span>
      </div>
      <div className="map-wrap">
        <div className="map-canvas">
          <svg width={layout.width} height={layout.height} style={{ display: "block" }}>
            {nodes.map((n) => {
              const src = layout.pos.get(n.id);
              if (!src) return null;
              return n.choices.map((c, i) => {
                const dst = layout.pos.get(c.target);
                if (!dst) return null;
                const x1 = src.x + BOX_W / 2;
                const y1 = src.y + BOX_H;
                const x2 = dst.x + BOX_W / 2;
                const y2 = dst.y;
                const isBack = y2 <= y1;
                const midY = (y1 + y2) / 2 + (isBack ? 70 : 0);
                const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                const active =
                  highlight && highlight.current === n.id && highlight.next.has(c.target);
                return (
                  <path
                    key={`${n.id}-${i}`}
                    d={d}
                    fill="none"
                    stroke={active ? "var(--amber)" : "#23344d"}
                    strokeWidth={active ? 1.6 : 1}
                    strokeDasharray={active ? "4 3" : undefined}
                    opacity={active ? 0.95 : 0.6}
                  />
                );
              });
            })}
            {nodes.map((n) => {
              const p = layout.pos.get(n.id);
              if (!p) return null;
              const isEnd = n.id.startsWith("Node_End");
              const isCurrent = highlight?.current === n.id;
              const isNext = highlight?.next.has(n.id);
              const isSelected = selected === n.id;
              const fill = isEnd ? "#3a1a1a" : nodeColorOf(n.id);
              return (
                <g
                  key={n.id}
                  className="char-card"
                  onClick={() => setSelected(isSelected ? null : n.id)}
                >
                  <rect
                    x={p.x}
                    y={p.y}
                    width={BOX_W}
                    height={BOX_H}
                    rx={6}
                    fill={fill}
                    stroke={
                      isCurrent
                        ? "var(--cyan)"
                        : isNext
                          ? "var(--amber)"
                          : isSelected
                            ? "#e8f4f2"
                            : "#2a3d55"
                    }
                    strokeWidth={isCurrent || isSelected ? 2 : isNext ? 1.6 : 1}
                    style={{ filter: isCurrent ? "drop-shadow(0 0 8px rgba(79,209,197,.6))" : undefined }}
                  />
                  <text
                    x={p.x + BOX_W / 2}
                    y={p.y + 24}
                    textAnchor="middle"
                    fill="#c9d7e6"
                    fontSize="13"
                    fontWeight="600"
                  >
                    {titleOf(n.id)}
                  </text>
                  <text
                    x={p.x + BOX_W / 2}
                    y={p.y + 42}
                    textAnchor="middle"
                    fill="#6f8499"
                    fontSize="10.5"
                    fontFamily="var(--mono)"
                  >
                    {n.id} · {actOf(n.id, story.actLabels)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <aside className="panel map-detail">
          {selectedNode ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                {titleOf(selectedNode.id)}
              </div>
              <div className="node-sub">
                {selectedNode.id} · {actOf(selectedNode.id, story.actLabels)}
              </div>
              <p style={{ lineHeight: 1.9, fontSize: 13.5, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {selectedNode.narrative}
              </p>
              {selectedNode.choices.length > 0 ? (
                selectedNode.choices.map((c, i) => (
                  <div className="choice-line" key={i}>
                    <strong>▶ {c.text}</strong>
                    {c.outcome && (
                      <div style={{ color: "var(--amber)", marginTop: 3 }}>↳ {c.outcome}</div>
                    )}
                    <div style={{ marginTop: 3 }}>
                      → <span style={{ color: "var(--text)" }}>{titleOf(c.target)}</span>
                      {fmtCond(c.condition) && (
                        <span className="cond">　[需要：{fmtCond(c.condition)}]</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "var(--red)", letterSpacing: "2px" }}>■ 终局节点</div>
              )}
            </>
          ) : (
            <div style={{ color: "var(--text-dim)", lineHeight: 2, fontSize: 13.5 }}>
              点击任意节点查看其叙事、选项分支与入场条件。
              {highlight ? (
                <p style={{ marginTop: 10 }}>
                  当前进度：<strong style={{ color: "var(--cyan)" }}>{titleOf(highlight.current)}</strong>
                </p>
              ) : (
                <p style={{ marginTop: 10 }}>
                  尚无进行中的游戏——从标题页「开始游戏」后，这里会标出你当前所在节点与下一步。
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
