import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Session, StoryDefinition } from "../engine/types";
import { clueTotal } from "../engine/engine";
import type { Engine } from "../engine/engine";
import { actOf } from "../engine/format";
import { readScrollPos, writeScrollPos } from "../storage";
import DeathList from "./DeathList";
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

interface ReadingPrefs {
  immersive: boolean;
  fontSize: number; // 14..26 px
  lineHeight: number; // 1.6..3.0
  paraSpacing: number; // 0.5..3.0 em
  autoScroll: boolean;
  speed: number; // 1..5
  slideshow: boolean; // 逐段淡入的幻灯片式阅读
  serif: boolean; // 正文衬线字体
  eyeCare: boolean; // 深色护眼背景（暖色低蓝光暗底）
}

const READ_DEFAULTS: ReadingPrefs = {
  immersive: false,
  fontSize: 16,
  lineHeight: 2.1,
  paraSpacing: 1.2,
  autoScroll: false,
  speed: 3,
  slideshow: false,
  serif: false,
  eyeCare: false,
};

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
  const [prefs, setPrefs] = useState<ReadingPrefs>(() => loadPrefs(story.id));
  // 移动端：侧栏状态面板默认收起为一行摘要（桌面端由 CSS 始终展开）
  const [panelOpen, setPanelOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const prevNodeRef = useRef(session.nodeId);

  const rendered = useMemo(
    () => engine.render(session.nodeId, session.state, session.visits),
    [engine, session],
  );
  const isEnd = session.nodeId.startsWith("Node_End");
  const last = session.history[session.history.length - 1];
  const total = clueTotal(session.state);
  const labels = story.varLabels ?? {};
  const statSummary = `SAN ${session.state.sanity} · 线索 ${total} · ${labels.key ?? "密钥"} ${session.state.key ? "✔" : "✘"}`;
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;
  const death = story.resolveDeath?.(session) ?? null;
  const showDeathList = !!death && session.nodeId.startsWith("Node_2");

  const set = (patch: Partial<ReadingPrefs>) =>
    setPrefs((p) => ({ ...p, ...patch }));

  // 持久化阅读偏好
  useEffect(() => {
    try {
      localStorage.setItem(READ_KEY(story.id), JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, story.id]);

  // 深色护眼背景：切换 body 类名（暖色低蓝光暗底），离开播放器时自动移除
  useEffect(() => {
    document.body.classList.toggle("eye-care", prefs.eyeCare);
    return () => document.body.classList.remove("eye-care");
  }, [prefs.eyeCare]);

  // 自动滚动：setInterval 平滑滚动（约 30fps），到底即停
  useEffect(() => {
    if (!prefs.autoScroll) return;
    const pxPerSec = 16 + prefs.speed * 14; // speed 1..5 → 30..86 px/s
    const id = setInterval(() => {
      window.scrollBy(0, pxPerSec / 30);
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 8;
      if (atBottom) {
        setPrefs((p) => (p.autoScroll ? { ...p, autoScroll: false } : p));
      }
    }, 33);
    return () => clearInterval(id);
  }, [prefs.autoScroll, prefs.speed]);

  // 手动滚动 / 按键即暂停自动滚动
  useEffect(() => {
    if (!prefs.autoScroll) return;
    const stop = () =>
      setPrefs((p) => (p.autoScroll ? { ...p, autoScroll: false } : p));
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [prefs.autoScroll]);

  // 换节点：沉浸模式平滑滚到正文开头，否则直接回顶（首次挂载不处理）
  useEffect(() => {
    if (prevNodeRef.current === session.nodeId) return;
    prevNodeRef.current = session.nodeId;
    const el = mainRef.current;
    if (prefs.immersive && el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.nodeId]);

  // 首次进入播放器：恢复到该节点上次离开时的滚动位置；没有记录则回到顶部（同步、绘制前，避免闪烁）
  useLayoutEffect(() => {
    const saved = readScrollPos(story.id, session.nodeId);
    window.scrollTo(0, saved > 0 ? saved : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 滚动位置记忆：滚动时防抖写入；离开（卸载/换节点）时保存最终位置
  useEffect(() => {
    let timer: number | undefined;
    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(
        () => writeScrollPos(story.id, session.nodeId, window.scrollY),
        250,
      );
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, [story.id, session.nodeId]);

  const readerStyle = {
    ["--read-size" as string]: `${prefs.fontSize}px`,
    ["--read-leading" as string]: String(prefs.lineHeight),
    ["--read-para" as string]: `${prefs.paraSpacing}em`,
  };

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
      <div
        className={"player-layout" + (prefs.immersive ? " reading" : "") + (prefs.serif ? " serif" : "")}
        style={readerStyle}
      >
        {!prefs.slideshow && <ReadingProgress accent={story.accent} />}
        <aside className="sidebar">
          <button
            className="sidebar-toggle"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
          >
            <span className="sidebar-toggle-summary">{statSummary}</span>
            <span className="sidebar-toggle-caret">{panelOpen ? "▴" : "▾"}</span>
          </button>
          <div className={"sidebar-body" + (panelOpen ? " open" : "")}>
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
          </div>
        </aside>
        <main ref={mainRef}>
          <ReaderBarPanel prefs={prefs} onChange={set} />
          <div className="ending-card">
            <div className="ending-badge">ENDING · {actOf(session.nodeId)}</div>
            <div className="ending-title">{title}</div>
            <ProseView text={body} slideshow={prefs.slideshow} accent={story.accent} />
          </div>
          <HistoryStrip story={story} session={session} />
        </main>
        {dialogEl}
      </div>
    );
  }

  return (
    <div
      className={"player-layout" + (prefs.immersive ? " reading" : "") + (prefs.serif ? " serif" : "")}
      style={readerStyle}
    >
      {!prefs.slideshow && <ReadingProgress accent={story.accent} />}
      <aside className="sidebar">
        <button
          className="sidebar-toggle"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
        >
          <span className="sidebar-toggle-summary">{statSummary}</span>
          <span className="sidebar-toggle-caret">{panelOpen ? "▴" : "▾"}</span>
        </button>
        <div className={"sidebar-body" + (panelOpen ? " open" : "")}>
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
        </div>
      </aside>
      <main ref={mainRef}>
        <div className="node-title">{titleOf(session.nodeId)}</div>
        <div className="node-sub">
          {session.nodeId} · {actOf(session.nodeId)} · 已走过 {session.history.length} 步
          <span className="autosave"> · 已自动存档</span>
        </div>
        {last?.outcome && <div className="outcome">↳ {last.outcome}</div>}
        <ReaderBarPanel prefs={prefs} onChange={set} />
        <div className="narrative">
          <ProseView text={rendered.narrative} slideshow={prefs.slideshow} accent={story.accent} />
        </div>
        {showDeathList && death && <DeathList story={story} death={death} />}
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

const READ_PREFIX = "reader-prefs:";
function READ_KEY(storyId: string) {
  return READ_PREFIX + storyId;
}
function loadPrefs(storyId: string): ReadingPrefs {
  try {
    const raw = localStorage.getItem(READ_KEY(storyId));
    if (raw) return { ...READ_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...READ_DEFAULTS };
}

/* 阅读进度条：固定在视口顶部，独立监听滚动，不触发播放器整体重渲染 */
function ReadingProgress({ accent }: { accent: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setP(total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="read-progress" aria-hidden="true">
      <div
        className="read-progress-fill"
        style={{ width: `${(p * 100).toFixed(2)}%`, background: accent }}
      />
    </div>
  );
}

/* 按空行拆段 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* 普通逐段渲染，段落间距由 CSS 变量 --read-para 控制 */
function NarrativeText({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.length === 0) return null;
  return (
    <>
      {paragraphs.map((p, i) => (
        <p className="narrative-p" key={i}>
          {p}
        </p>
      ))}
    </>
  );
}

/* 幻灯片式阅读：逐段淡入，点击 / 空格 / 方向键翻页 */
function Slideshow({ paragraphs, accent }: { paragraphs: string[]; accent: string }) {
  const [idx, setIdx] = useState(0);
  const last = paragraphs.length - 1;
  const cur = Math.min(idx, last);

  const go = useCallback(
    (delta: number) => setIdx((i) => Math.max(0, Math.min(last, i + delta))),
    [last],
  );

  // 换节点（正文变化）时回到第一段
  useEffect(() => {
    setIdx(0);
  }, [paragraphs]);

  // 键盘翻页：空格/→/Enter/PageDown 下一页，←/Backspace/PageUp 上一页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName)) return;
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter" || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "Backspace" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="slideshow" role="button" tabIndex={0} onClick={() => go(1)}>
      <div className="slide-stage">
        <div key={cur} className="slide fade-in">
          <p className="narrative-p">{paragraphs[cur]}</p>
        </div>
      </div>
      <div className="slide-nav" onClick={(e) => e.stopPropagation()}>
        <button className="btn-sm" disabled={cur === 0} onClick={() => go(-1)}>
          ← 上一段
        </button>
        <span className="slide-count">
          {cur + 1} / {paragraphs.length}
        </span>
        <button className="btn-sm" disabled={cur === last} onClick={() => go(1)}>
          下一段 →
        </button>
      </div>
      <div className="slide-progress">
        <div
          className="slide-progress-fill"
          style={{ width: `${((cur + 1) / paragraphs.length) * 100}%`, background: accent }}
        />
      </div>
      <div className="slide-hint" onClick={(e) => e.stopPropagation()}>
        {cur === last ? "已读完本段 —— 请在下方做出选择" : "点击正文或按空格翻页"}
      </div>
    </div>
  );
}

/* 根据阅读模式渲染正文：普通逐段 或 幻灯片 */
function ProseView({ text, slideshow, accent }: { text: string; slideshow: boolean; accent: string }) {
  const paragraphs = useMemo(() => splitParagraphs(text), [text]);
  if (paragraphs.length === 0) return null;
  return slideshow ? (
    <Slideshow paragraphs={paragraphs} accent={accent} />
  ) : (
    <NarrativeText paragraphs={paragraphs} />
  );
}

function ReaderBar({
  prefs,
  onChange,
}: {
  prefs: ReadingPrefs;
  onChange: (p: Partial<ReadingPrefs>) => void;
}) {
  return (
    <div className="reader-bar">
      <button
        className={"btn-sm" + (prefs.immersive ? " on" : "")}
        onClick={() => onChange({ immersive: !prefs.immersive })}
        title="隐藏侧栏，居中排版，沉浸阅读"
      >
        {prefs.immersive ? "◧ 退出沉浸" : "▦ 沉浸阅读"}
      </button>
      <label className="reader-ctl" title="正文字号">
        字号
        <input
          type="range"
          min={14}
          max={26}
          step={1}
          value={prefs.fontSize}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
        />
        <span className="reader-val">{prefs.fontSize}px</span>
      </label>
      <label className="reader-ctl" title="行距">
        行距
        <input
          type="range"
          min={1.6}
          max={3}
          step={0.1}
          value={prefs.lineHeight}
          onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
        />
      </label>
      <label className="reader-ctl" title="段落间距">
        段距
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.1}
          value={prefs.paraSpacing}
          onChange={(e) => onChange({ paraSpacing: Number(e.target.value) })}
        />
      </label>
      <button
        className={"btn-sm" + (prefs.autoScroll ? " on" : "")}
        onClick={() => onChange({ autoScroll: !prefs.autoScroll, slideshow: false })}
        title="自动向下滚动，鼠标滚轮/按键即暂停"
      >
        {prefs.autoScroll ? "⏸ 暂停滚动" : "▶ 自动滚动"}
      </button>
      {prefs.autoScroll && (
        <label className="reader-ctl" title="滚动速度">
          速度
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={prefs.speed}
            onChange={(e) => onChange({ speed: Number(e.target.value) })}
          />
        </label>
      )}
      <button
        className={"btn-sm" + (prefs.slideshow ? " on" : "")}
        onClick={() => onChange({ slideshow: !prefs.slideshow, autoScroll: false })}
        title="逐段淡入的幻灯片式阅读，点击或按空格翻页"
      >
        {prefs.slideshow ? "◧ 退出幻灯片" : "▦ 幻灯片"}
      </button>
      <button
        className={"btn-sm" + (prefs.serif ? " on" : "")}
        onClick={() => onChange({ serif: !prefs.serif })}
        title="正文使用衬线字体，长文阅读更舒适"
      >
        {prefs.serif ? "衬线 ✓" : "衬线"}
      </button>
      <button
        className={"btn-sm" + (prefs.eyeCare ? " on" : "")}
        onClick={() => onChange({ eyeCare: !prefs.eyeCare })}
        title="深色护眼背景：暖色低蓝光暗底"
      >
        {prefs.eyeCare ? "护眼 ✓" : "护眼"}
      </button>
    </div>
  );
}

/* 阅读工具条：移动端收起为单个“阅读设置”开关，桌面端始终展开（由 CSS 控制） */
function ReaderBarPanel({
  prefs,
  onChange,
}: {
  prefs: ReadingPrefs;
  onChange: (p: Partial<ReadingPrefs>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="reader-group">
      <button
        className="reader-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>阅读设置</span>
        <span className="reader-toggle-caret">{open ? "▴" : "▾"}</span>
      </button>
      <div className={"reader-body" + (open ? " open" : "")}>
        <ReaderBar prefs={prefs} onChange={onChange} />
      </div>
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
