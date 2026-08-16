import type { Session, StoryDefinition } from "../engine/types";
import { categoryInfo, termUnlocked } from "../engine/terms";

interface Props {
  story: StoryDefinition;
  session: Session | null;
  spoiler: boolean;
  onToggleSpoiler: () => void;
}

export default function Glossary({ story, session, spoiler, onToggleSpoiler }: Props) {
  const terms = story.terms ?? [];
  if (terms.length === 0) {
    return (
      <div className="empty">
        <p>本故事还没有建立名词表。</p>
      </div>
    );
  }
  const categories = story.termCategories;
  const titleOf = (id: string) => story.nodeTitles[id] ?? id;
  const unlocked = terms.filter((t) => termUnlocked(t, session, spoiler)).length;
  // 分类展示顺序：按词条在表里的出现顺序分组（保持作者排布）
  const order = [...new Set(terms.map((t) => t.category))];

  return (
    <div>
      <div className="chars-title-row">
        <h2 style={{ margin: "4px 0 6px", letterSpacing: "3px" }}>
          {story.title} · 名词表 · 档案解密
        </h2>
        <button
          className={"btn spoiler-toggle" + (spoiler ? " on" : "")}
          onClick={onToggleSpoiler}
          title="开启后所有词条直接解密，方便通读/校对；不影响游戏进度"
        >
          {spoiler ? "◎ 剧透模式 ✓" : "◎ 剧透模式"}
        </button>
      </div>
      <div className="glossary-summary">
        已解锁 <strong>{unlocked}</strong> / {terms.length} 个词条 —— 正文中的词条按分类高亮、悬停可见释义；
        档案随阅读进度逐条录入：读到词条出现的正文段落（含分支变体）即解密。
        {spoiler && (
          <span className="spoiler-note">（剧透模式：全部词条已直接解密，不随进度变化）</span>
        )}
      </div>
      {order.map((cat) => {
        const info = categoryInfo(categories, cat);
        const group = terms.filter((t) => t.category === cat);
        const open = group.filter((t) => termUnlocked(t, session, spoiler)).length;
        return (
          <div className="glossary-cat" key={cat}>
            <div className="glossary-cat-head">
              <span className="glossary-dot" style={{ background: info.color }} />
              <span className="glossary-cat-label">{info.label}</span>
              <span className="glossary-cat-count">
                {open}/{group.length}
              </span>
            </div>
            <div className="glossary-entries">
              {group.map((t, i) => {
                const isOpen = termUnlocked(t, session, spoiler);
                return (
                  <div className={"glossary-entry" + (isOpen ? "" : " locked")} key={i}>
                    <div className="glossary-term" style={isOpen ? { color: info.color } : undefined}>
                      {t.term}
                    </div>
                    {isOpen ? (
                      <div className="glossary-meaning">{t.meaning}</div>
                    ) : (
                      <div className="glossary-unknown">
                        ？？？ —— 尚未相遇
                        {t.firstSeen ? `（首次见于「${titleOf(t.firstSeen)}」）` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.8 }}>
        {spoiler
          ? "剧透模式已开启：全部词条直接解密，便于通读与校对；关闭后恢复按阅读进度录入。"
          : session
            ? "继续推进剧情，遇到新的人名、地点与概念会自动录入本表。抵达结局后，本局未录入的词条会留在结算页，作为二周目线索。"
            : "从标题页开始游戏后，名词表会随剧情进度逐条解密；正文中的词条始终以分类配色高亮。"}
      </div>
    </div>
  );
}
