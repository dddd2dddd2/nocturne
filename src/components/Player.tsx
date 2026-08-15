import { useMemo, useState } from "react";
import type { Session, StoryDefinition } from "../engine/types";
import { clueTotal } from "../engine/engine";
import type { Engine } from "../engine/engine";
import { actOf } from "../engine/format";
import SaveDialog from "./SaveDialog";

interface Props {
  story: StoryDefinition;
  engine: Engine;
  session: Session;
  onChoose: (text: string) => void;
  onRestart: () => void;
  onOpenMap: () => void;
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
}

function parseEnding(narrative: string): { title: string; body: string } {
  const m = narrative.match(/^【([^】]+)】\s*(.*)$/s);
  if (m) return { title: m[1], body: m[2] };
  return { title: "结局", body: narrative };
}

export default function Player({
  story,
  engine,
  session,
  onChoose,
  onRestart,
  onOpenMap,
  onSave,
  onLoad,
  onDelete,
}: Props) {
  const [dialog, setDialog] = useState<null | "save" | "load">(null);
  const rendered = useMemo(
    () => engine.render(session.nodeId, session.state, session.visits),
    [engine, session],
  );
  const isEnd = session.nodeId.startsWith("Node_End");
  const last = session.history[session.history.length - 1];
  const total = clueTotal(session.state);
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;

  const dialogEl =
    dialog && story ? (
      <SaveDialog
        mode={dialog}
        storyId={story.id}
        onSave={onSave}
        onLoad={onLoad}
        onDelete={onDelete}
        onClose={() => setDialog(null)}
      />
    ) : null;

  if (isEnd) {
    const { title, body } = parseEnding(rendered.narrative);
    return (
      <div className="player-layout">
        <aside className="sidebar">
          <StatePanel story={story} session={session} total={total} />
          <button className="btn" onClick={onRestart}>
            ↺ 重新开始
          </button>
          <button className="btn" onClick={() => setDialog("load")}>
            📂 读档
          </button>
          <button className="btn" onClick={onOpenMap}>
            ◈ 查看节点树
          </button>
        </aside>
        <main>
          <div className="ending-card">
            <div className="ending-badge">ENDING · {actOf(session.nodeId)}</div>
            <div className="ending-title">{title}</div>
            <p style={{ lineHeight: 2.1, fontSize: 15, color: "var(--text)" }}>{body}</p>
          </div>
          <HistoryStrip story={story} session={session} />
        </main>
        {dialogEl}
      </div>
    );
  }

  return (
    <div className="player-layout">
      <aside className="sidebar">
        <StatePanel story={story} session={session} total={total} />
        <button className="btn" onClick={() => setDialog("save")}>
          💾 存档
        </button>
        <button className="btn" onClick={() => setDialog("load")}>
          📂 读档
        </button>
        <button className="btn" onClick={onOpenMap}>
          ◈ 查看节点树
        </button>
      </aside>
      <main>
        <div className="node-title">{titleOf(session.nodeId)}</div>
        <div className="node-sub">
          {session.nodeId} · {actOf(session.nodeId)} · 已走过 {session.history.length} 步
          <span className="autosave"> · 已自动存档</span>
        </div>
        {last?.outcome && <div className="outcome">↳ {last.outcome}</div>}
        <p className="narrative">{rendered.narrative}</p>
        <div className="choices">
          {rendered.choices.map((c, i) => (
            <button
              key={i}
              className="choice"
              disabled={!!c.locked}
              onClick={() => onChoose(c.text)}
            >
              ▶ {c.text}
              {c.hint && <span className="hint">提示：{c.hint}</span>}
              {c.locked && c.locked_note && <span className="locked-note">{c.locked_note}</span>}
            </button>
          ))}
          {rendered.choices.length === 0 && (
            <div style={{ color: "var(--red)", letterSpacing: "2px" }}>
              —— 没有可行动的选项。此路已尽。
            </div>
          )}
        </div>
        <HistoryStrip story={story} session={session} />
      </main>
      {dialogEl}
    </div>
  );
}

function StatePanel({
  story,
  session,
  total,
}: {
  story: StoryDefinition;
  session: Session;
  total: number;
}) {
  const s = session.state;
  const L = story.varLabels ?? {};
  const bar = (v: number, cls: string) => (
    <div className="stat-bar">
      <div className={`stat-fill ${cls}`} style={{ width: `${Math.max(2, Math.min(100, v))}%` }} />
    </div>
  );
  const rows: Array<{ label: string; value: number; cls: string; warn?: boolean }> = [
    { label: L.sanity ?? "SAN 理智", value: s.sanity, cls: "sanity", warn: s.sanity < 30 },
    { label: L.bond ?? "信任 / 绑定", value: s.bond, cls: "bond" },
    { label: "线索总量", value: total, cls: "clue" },
    { label: L.clue_a ?? "线索 A", value: (s.clue_a / 40) * 100, cls: "sub" },
    { label: L.clue_b ?? "线索 B", value: (s.clue_b / 40) * 100, cls: "sub" },
    { label: L.clue_c ?? "线索 C", value: (s.clue_c / 40) * 100, cls: "sub" },
  ];
  return (
    <>
      {rows.map((r) => (
        <div className="stat" key={r.label}>
          <div className="stat-label">
            <span>{r.label}</span>
            <span>{r.cls === "sub" ? `${Math.round((r.value / 100) * 40)}/40` : r.value}</span>
          </div>
          {bar(r.value, r.cls)}
          {r.warn && (
            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 5 }}>
              ⚠ 理智濒危——幻觉正在逼近
            </div>
          )}
        </div>
      ))}
      <div className="stat-chip">
        {L.key ?? "密钥"}：{s.key ? "✔ 已持有" : "✘ 未持有"}
      </div>
    </>
  );
}

function HistoryStrip({ story, session }: { story: StoryDefinition; session: Session }) {
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;
  return (
    <div className="history">
      <div style={{ marginBottom: 4, color: "var(--text-dim)", fontWeight: 700 }}>行动记录</div>
      {session.history.map((h, i) => (
        <div key={i}>
          {h.choice ? (
            <>
              <span style={{ color: "var(--amber)" }}>「{h.choice}」</span>
              <span style={{ color: "var(--text-dim)" }}> → </span>
              {titleOf(h.nodeId)}
            </>
          ) : (
            <span style={{ color: "var(--cyan)" }}>◉ {titleOf(h.nodeId)}</span>
          )}
        </div>
      ))}
    </div>
  );
}
