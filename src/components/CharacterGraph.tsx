import { useState } from "react";
import type { Character, GameState, Session, StoryDefinition, TermDef } from "../engine/types";
import { categoryInfo, termUnlocked } from "../engine/terms";

const W = 900;
const H = 640;
const CARD_W = 120;
const CARD_H = 88;

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  return {
    sx: from.x + ux * (CARD_H / 2 + 6),
    sy: from.y + uy * (CARD_H / 2 + 6),
    ex: to.x - ux * (CARD_H / 2 + 6),
    ey: to.y - uy * (CARD_H / 2 + 6),
  };
}

function resolvedFaction(c: Character, s: GameState | null): string {
  if (c.trueFaction && c.trueFactionWhen && c.trueFactionWhen(s)) return c.trueFaction;
  return c.faction;
}

function attitudeOf(
  c: Character,
  s: GameState | null,
  factions: StoryDefinition["factions"],
): { label: string; color: string } | null {
  if (!s) return null;
  if (c.id === "zero") return { label: "主角", color: "#a3a3a3" };
  const f = factions[resolvedFaction(c, s)];
  if (!f) return null;
  if (f.align === 0) {
    if (f.evalLabel) return { label: `${f.evalLabel} ${s.bond}%`, color: f.color };
    return { label: f.attitudeLabel ?? "观察", color: f.color };
  }
  const score = f.align === 1 ? s.bond : 100 - s.bond;
  if (score >= 60) return { label: "信任", color: "#34d399" };
  if (score >= 35) return { label: "中立", color: "#6f8499" };
  return { label: "提防", color: "#f6ad55" };
}

interface Props {
  story: StoryDefinition;
  session: Session | null;
  spoiler: boolean;
  onOpenGlossary: () => void;
}

export default function CharacterGraph({ story, session, spoiler, onOpenGlossary }: Props) {
  const [selected, setSelected] = useState<string | null>("zero");
  const [hover, setHover] = useState<string | null>(null);
  const state = session?.state ?? null;
  const { characters, relations, relationMeta, factions, terms, termCategories } = story;
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;

  const byId = new Map(characters.map((c) => [c.id, c]));
  const detail = selected ? byId.get(selected) : null;
  const tfWhen = detail?.trueFactionWhen;

  // 选中角色的词条档案：本人词条 + 关联词条（双向：A 列了 B，B 也能找到 A）
  const charTerm = detail ? terms?.find((t) => t.term === detail.name) : undefined;
  const relatedTerms: TermDef[] = (() => {
    if (!detail) return [];
    const rel = new Set<string>();
    if (charTerm?.related) for (const r of charTerm.related) rel.add(r);
    for (const t of terms ?? []) if (t.related?.includes(detail.name)) rel.add(t.term);
    rel.delete(detail.name);
    return (terms ?? []).filter((t) => rel.has(t.term));
  })();
  const charTerms = [...(charTerm ? [charTerm] : []), ...relatedTerms];
  const charTermsOpen = charTerms.filter((t) => termUnlocked(t, session, spoiler)).length;
  const detailRevealed = !!detail?.trueFaction && !!tfWhen && tfWhen(state);

  // 邻接表：悬停/选中某角色时，高亮其直接关联的边与相邻角色
  const neighbors = new Map<string, Set<string>>();
  for (const c of characters) neighbors.set(c.id, new Set([c.id]));
  for (const r of relations) {
    neighbors.get(r.from)?.add(r.to);
    neighbors.get(r.to)?.add(r.from);
  }
  const focusId = hover ?? selected;

  // 图例只显示当前已「浮出水面」的阵营（隐藏阵营在进度揭示后才出现，避免剧透）
  const visibleFactions = [...new Set(characters.map((c) => resolvedFaction(c, state)))]
    .map((id) => ({ id, ...factions[id] }))
    .filter((f) => !!f.label);

  return (
    <div>
      <div className="chars-title-row">
        <h2 style={{ margin: "4px 0 6px", letterSpacing: "3px" }}>
          {story.title} · 人物图谱 · 关系网络
        </h2>
        <button className="btn" onClick={onOpenGlossary}>
          名词表 →
        </button>
      </div>
      <div className="chars-legend">
        {Object.entries(relationMeta).map(([k, m]) => (
          <span className="edge-legend" key={k}>
            <span className="line" style={{ background: m.color }} />
            {m.label}
          </span>
        ))}
      </div>
      <div className="chars-legend">
        <span style={{ color: "var(--text-dim)" }}>阵营：</span>
        {visibleFactions.map((f) => (
          <span className="edge-legend" key={f.id}>
            <span className="line" style={{ background: f.color }} />
            {f.label}
          </span>
        ))}
        <span style={{ color: "var(--text-dim)" }}>　态度：</span>
        <span className="edge-legend"><span className="line" style={{ background: "#34d399" }} />信任</span>
        <span className="edge-legend"><span className="line" style={{ background: "#6f8499" }} />中立</span>
        <span className="edge-legend"><span className="line" style={{ background: "#f6ad55" }} />提防</span>
        <span style={{ marginLeft: "auto", color: "var(--text-dim)" }}>
          {state ? "阵营与态度随游戏进度变化" : "开始游戏后显示信任/提防态度"}
        </span>
      </div>
      <div className="chars-hint">悬停角色高亮其关系与盟友，点击查看档案；被聚焦的角色会呼吸发光。</div>
      <div className="chars-layout">
        <div className="chars-canvas">
          <svg width={W} height={H} style={{ display: "block" }}>
            {relations.map((r, i) => {
              const a = byId.get(r.from);
              const b = byId.get(r.to);
              if (!a || !b) return null;
              const meta = relationMeta[r.type];
              const e = edgePath(a.pos, b.pos);
              const touching = focusId ? a.id === focusId || b.id === focusId : false;
              const bothNear = focusId
                ? !!(neighbors.get(focusId)?.has(a.id) && neighbors.get(focusId)?.has(b.id))
                : false;
              const edgeOpacity = focusId
                ? touching
                  ? 1
                  : bothNear
                    ? 0.45
                    : 0.08
                : 0.55;
              return (
                <g key={i} style={{ opacity: edgeOpacity, transition: "opacity 0.2s ease" }}>
                  <path
                    d={`M ${e.sx} ${e.sy} L ${e.ex} ${e.ey}`}
                    fill="none"
                    stroke={meta.color}
                    strokeWidth={touching ? 2.6 : 1.4}
                    markerEnd={`url(#arrow-${r.type})`}
                  />
                  <text
                    x={(e.sx + e.ex) / 2}
                    y={(e.sy + e.ey) / 2 - 6}
                    textAnchor="middle"
                    fill={meta.color}
                    fontSize="10.5"
                    opacity={touching ? 1 : 0.9}
                  >
                    {r.label}
                  </text>
                </g>
              );
            })}
            <defs>
              {Object.entries(relationMeta).map(([k, m]) => (
                <marker
                  key={k}
                  id={`arrow-${k}`}
                  markerWidth="7"
                  markerHeight="7"
                  refX="6"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L7,3 L0,6 Z" fill={m.color} />
                </marker>
              ))}
            </defs>
            {characters.map((c) => {
              const isSel = selected === c.id;
              const isHover = hover === c.id;
              // 悬停时聚焦于悬停角色；离开鼠标后回到选中角色
              const isFocus = hover ? isHover : isSel;
              const near = focusId ? (neighbors.get(focusId)?.has(c.id) ?? false) : true;
              const dimmed = !!focusId && !near && !isFocus;
              const tier = !!focusId && near && !isFocus;
              const fid = resolvedFaction(c, state);
              const faction = factions[fid];
              const fc = faction?.color ?? "#6f8499";
              const attitude = attitudeOf(c, state, factions);
              const x = c.pos.x - CARD_W / 2;
              const y = c.pos.y - CARD_H / 2;
              return (
                <g
                  key={c.id}
                  className={`char-card${isFocus ? " focus-pulse" : ""}`}
                  onClick={() => setSelected(isSel ? null : c.id)}
                  onMouseEnter={() => setHover(c.id)}
                  onMouseLeave={() => setHover(null)}
                  style={{ opacity: isFocus ? 1 : dimmed ? 0.28 : tier ? 0.92 : 1, transition: "opacity 0.2s ease" }}
                >
                  {isFocus && (
                    <circle cx={c.pos.x} cy={c.pos.y} r={52} fill={fc} className="focus-halo" />
                  )}
                  <rect
                    x={x}
                    y={y}
                    width={CARD_W}
                    height={CARD_H}
                    rx={8}
                    fill="rgba(12,20,34,0.92)"
                    stroke={isSel ? "var(--cyan)" : isHover ? "#e8f4f2" : fc}
                    strokeWidth={isSel || isHover ? 2.2 : 1.3}
                    style={{ filter: isSel ? "drop-shadow(0 0 10px rgba(79,209,197,.35))" : undefined }}
                  />
                  <circle cx={c.pos.x} cy={y + 24} r={15} fill="rgba(12,20,34,0.6)" stroke={fc} strokeWidth={1.6} />
                  <text
                    x={c.pos.x}
                    y={y + 29}
                    textAnchor="middle"
                    fill="#e8f4f2"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {c.face}
                  </text>
                  <text
                    x={c.pos.x}
                    y={y + 58}
                    textAnchor="middle"
                    fill="#e8f4f2"
                    fontSize="13.5"
                    fontWeight="600"
                  >
                    {c.name}
                  </text>
                  <text
                    x={c.pos.x}
                    y={y + 73}
                    textAnchor="middle"
                    fill={fc}
                    fontSize="9.5"
                  >
                    {faction?.label ?? "—"}
                  </text>
                  {/* 态度圆点（左上角） */}
                  <circle
                    cx={x + 14}
                    cy={y + 14}
                    r={4.5}
                    fill={attitude ? attitude.color : "#2a3d55"}
                    stroke="#0c1420"
                    strokeWidth={1}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <aside className="panel char-detail">
          {detail ? (
            <>
              <div className="detail-name">{detail.name}</div>
              <div className="detail-role">{detail.role}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 10 }}>
                {detail.tagline}
              </div>

              <div className="detail-faction">
                <span
                  className="faction-dot"
                  style={{ background: factions[resolvedFaction(detail, state)]?.color ?? "#6f8499" }}
                />
                <span style={{ color: "var(--text-dim)" }}>阵营</span>
                <strong style={{ color: factions[resolvedFaction(detail, state)]?.color ?? "#6f8499" }}>
                  {factions[resolvedFaction(detail, state)]?.label ?? "—"}
                </strong>
                {detailRevealed ? (
                  <span className="faction-badge">真身</span>
                ) : detail.trueFaction ? (
                  <span className="faction-hint">真身未明</span>
                ) : null}
              </div>
              <div className="detail-faction">
                <span
                  className="faction-dot"
                  style={{ background: attitudeOf(detail, state, factions)?.color ?? "#2a3d55" }}
                />
                <span style={{ color: "var(--text-dim)" }}>对你的态度</span>
                <strong style={{ color: attitudeOf(detail, state, factions)?.color ?? "var(--text-dim)" }}>
                  {state ? (attitudeOf(detail, state, factions)?.label ?? "—") : "尚未开始游戏"}
                </strong>
              </div>

              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 700, margin: "12px 0 4px" }}>
                已确认信息
              </div>
              <ul className="known-list">
                {detail.known.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
              <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 700, margin: "12px 0 4px" }}>
                未知档案
              </div>
              {detail.secrets.map((s, i) => {
                const revealed = s.revealed(state);
                return (
                  <div className="secret" key={i}>
                    <span className="lab">{s.label}</span>
                    {revealed ? (
                      <span className="val">{s.value}</span>
                    ) : (
                      <span className="unknown">？？？ —— 档案未解密</span>
                    )}
                  </div>
                );
              })}
              {charTerms.length > 0 && (
                <>
                  <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 700, margin: "14px 0 2px" }}>
                    词条档案 · {charTermsOpen}/{charTerms.length}
                  </div>
                  <div className="char-terms">
                    {charTerms.map((t, i) => {
                      const info = categoryInfo(termCategories, t.category);
                      const open = termUnlocked(t, session, spoiler);
                      return (
                        <div className="char-term-row" key={i}>
                          <div className="char-term-head">
                            <span
                              className="char-term-name"
                              style={open ? { color: info.color } : undefined}
                            >
                              {t.term}
                            </span>
                            <span
                              className="char-term-cat"
                              style={{ color: info.color, borderColor: info.color }}
                            >
                              {info.label}
                            </span>
                          </div>
                          {open ? (
                            <div className="char-term-val">{t.meaning}</div>
                          ) : (
                            <div className="char-term-unknown">
                              ？？？ —— 首次见于「{t.firstSeen ? titleOf(t.firstSeen) : "始终公开"}」
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.8 }}>
                {state
                  ? "继续推进游戏，解锁线索可解密档案与真实阵营。"
                  : "从标题页开始游戏后，此处会随线索实时解密。"}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--text-dim)", lineHeight: 2, fontSize: 13.5 }}>
              点击角色查看其档案：阵营与信任/提防态度、已确认信息始终可见；未解密条目显示为 ？？？。
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
