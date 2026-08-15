import type { CSSProperties } from "react";
import { STORIES } from "../stories";
import { hasSave, loadSave } from "../storage";

interface Props {
  onOpen: (storyId: string) => void;
}

export default function StoryLibrary({ onOpen }: Props) {
  return (
    <div className="library">
      <div className="library-head">
        <h2 style={{ margin: "0 0 6px", letterSpacing: "4px" }}>书架</h2>
        <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 13.5 }}>
          选择一个故事开始。游戏进度会自动存档到本机，下次可直接继续。
        </p>
      </div>
      <div className="library-grid">
        {STORIES.map((s) => {
          const saved = hasSave(s.id);
          const sess = saved ? loadSave(s.id) : null;
          const style = { "--accent": s.accent } as CSSProperties;
          return (
            <button
              key={s.id}
              className="story-card"
              style={style}
              onClick={() => onOpen(s.id)}
            >
              <div className="story-card-kicker">{s.kicker}</div>
              <div className="story-card-title">{s.title}</div>
              <div className="story-card-sub">{s.subtitle}</div>
              <p className="story-card-intro">{s.intro.split("\n")[0]}</p>
              <div className="story-card-foot">
                <span className={saved ? "save-badge on" : "save-badge"}>
                  {saved && sess ? `已存档 · 第 ${sess.history.length} 步` : "尚未开始"}
                </span>
                <span className="story-card-arrow">进入 →</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
