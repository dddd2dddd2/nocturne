import type { Session, StoryDefinition } from "../engine/types";
import { categoryInfo, termUnlocked } from "../engine/terms";

interface Props {
  story: StoryDefinition;
  session: Session;
  spoiler: boolean;
  onOpenGlossary: () => void;
}

/* 结局结算：本局名词表档案一览 —— 解锁进度 + 未录入词条（附二周目去向）。 */
export default function CodexSettlement({ story, session, spoiler, onOpenGlossary }: Props) {
  const terms = story.terms ?? [];
  if (terms.length === 0) return null;
  const categories = story.termCategories;
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;
  const unlocked = terms.filter((t) => termUnlocked(t, session, spoiler)).length;
  const locked = terms.filter((t) => !termUnlocked(t, session, spoiler));
  const pct = Math.round((unlocked / terms.length) * 100);
  const order = [...new Set(terms.map((t) => t.category))];

  return (
    <div className="codex-settlement">
      <div className="codex-head">
        <div className="codex-title">本局档案 · 名词表结算</div>
        <div className="codex-progress">
          <div className="codex-bar">
            <div className="codex-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="codex-count">
            {unlocked} / {terms.length}
          </span>
        </div>
      </div>

      <div className="codex-cats">
        {order.map((cat) => {
          const info = categoryInfo(categories, cat);
          const group = terms.filter((t) => t.category === cat);
          const open = group.filter((t) => termUnlocked(t, session, spoiler)).length;
          return (
            <span className="codex-cat" key={cat}>
              <span className="glossary-dot" style={{ background: info.color }} />
              {info.label} <strong>{open}/{group.length}</strong>
            </span>
          );
        })}
      </div>

      {spoiler ? (
        <div className="codex-all">◎ 剧透模式 · 全部档案已直接解密（不计入本局进度）。</div>
      ) : locked.length > 0 ? (
        <>
          <div className="codex-locked-title">
            ⚑ 本局未录入 {locked.length} 个词条 —— 换一条路走，或许会遇见它们（二周目线索）
          </div>
          <div className="codex-locked">
            {locked.map((t, i) => {
              const info = categoryInfo(categories, t.category);
              return (
                <span className="codex-locked-chip" key={i}>
                  <span className="codex-locked-name" style={{ color: info.color }}>
                    {t.term}
                  </span>
                  <span className="codex-locked-hint">
                    {t.firstSeen ? `首次见于「${titleOf(t.firstSeen)}」` : "始终公开"}
                  </span>
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <div className="codex-all">★ 档案全解锁 —— 这一局，你听完了所有人的名字。</div>
      )}

      <button className="btn" onClick={onOpenGlossary}>
        名词表 · 完整档案 →
      </button>
    </div>
  );
}
