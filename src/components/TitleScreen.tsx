import type { StoryDefinition } from "../engine/types";

interface Props {
  story: StoryDefinition;
  hasSave: boolean;
  stepCount: number;
  onNew: () => void;
  onContinue: () => void;
  onMap: () => void;
  onChars: () => void;
  onDeleteSave: () => void;
}

export default function TitleScreen({
  story,
  hasSave,
  stepCount,
  onNew,
  onContinue,
  onMap,
  onChars,
  onDeleteSave,
}: Props) {
  return (
    <div className="title-screen">
      <div className="title-kicker">{story.kicker}</div>
      <h1 className="title-main">{story.title}</h1>
      <div className="title-sub">{story.subtitle}</div>
      <p className="title-quote">
        {story.intro.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            <br />
          </span>
        ))}
      </p>
      <div className="title-buttons">
        {hasSave && (
          <button className="btn primary" onClick={onContinue}>
            ▶ 继续游戏（第 {stepCount} 步）
          </button>
        )}
        <button className={hasSave ? "btn" : "btn primary"} onClick={onNew}>
          {hasSave ? "开始新游戏" : "▶ 开始游戏"}
        </button>
        <button className="btn" onClick={onMap}>
          节点树
        </button>
        <button className="btn" onClick={onChars}>
          人物图谱
        </button>
        {hasSave && (
          <button className="btn danger" onClick={onDeleteSave}>
            删除存档
          </button>
        )}
      </div>
    </div>
  );
}
