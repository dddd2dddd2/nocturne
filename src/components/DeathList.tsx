import { useState } from "react";
import type { DeathResult, StoryDefinition } from "../engine/types";

interface Props {
  story: StoryDefinition;
  death: DeathResult;
}

export default function DeathList({ story, death }: Props) {
  const [focused, setFocused] = useState<string | null>(death.victimId);
  const byId = new Map(story.characters.map((c) => [c.id, c]));
  const roster = death.roster.map((id) => byId.get(id)).filter((c) => !!c);

  const focusedChar = focused ? byId.get(focused) : null;
  const isVictim = (id: string) => id === death.victimId;

  return (
    <div className={`death-list${death.revealed ? " revealed" : ""}`}>
      <div className="death-head">
        <span className="death-title">☠ 死亡名单</span>
        <span className="death-sub">
          {death.revealed ? "风暴结算 · 死者已确认" : "风暴结算 · 身份待确认"}
        </span>
      </div>
      <div className="death-roster">
        {roster.map((c) => {
          const dead = death.revealed && isVictim(c.id);
          const active = focused === c.id;
          return (
            <button
              key={c.id}
              type="button"
              className={`death-card${dead ? " dead" : ""}${active ? " focused" : ""}`}
              onClick={() => {
                if (death.revealed) setFocused(active ? null : c.id);
              }}
            >
              <span className="death-face">{death.revealed ? c.face : "？"}</span>
              <span className="death-name">{death.revealed ? c.name : "？？？"}</span>
              <span className="death-status">
                {!death.revealed ? "？" : dead ? "☠ 已死亡" : "存活"}
              </span>
            </button>
          );
        })}
      </div>
      {!death.revealed ? (
        <div className="death-detail pending">
          一具尸体尚未确认身份。做出行动后，名单将结算出具体死者。
        </div>
      ) : focusedChar ? (
        isVictim(focusedChar.id) ? (
          <div className="death-detail">
            <strong style={{ color: "var(--red)" }}>☠ {focusedChar.name}</strong>
            <span style={{ color: "var(--text-dim)" }}> · {death.cause}</span>
            <span className="death-epitaph">「{death.epitaph}」</span>
          </div>
        ) : (
          <div className="death-detail">
            <strong>{focusedChar.name}</strong>
            <span style={{ color: "var(--text-dim)" }}> · 存活</span>
          </div>
        )
      ) : (
        <div className="death-detail pending">点击角色查看状态。</div>
      )}
    </div>
  );
}
