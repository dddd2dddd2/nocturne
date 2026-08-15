import { useEffect, useState } from "react";
import { AUTO_SLOT, MAX_SLOTS, listSaves, type SaveMeta } from "../storage";

interface Props {
  mode: "save" | "load";
  storyId: string;
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
  onClose: () => void;
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function SaveDialog({ mode, storyId, onSave, onLoad, onDelete, onClose }: Props) {
  const [saves, setSaves] = useState<Array<SaveMeta | null>>(() => listSaves(storyId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refresh = () => setSaves(listSaves(storyId));

  const label = (slot: number) => (slot === AUTO_SLOT ? "自动存档" : `存档位 ${slot}`);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{mode === "save" ? "存档" : "读档"}</span>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {mode === "save" ? (
          <p className="modal-hint">
            选择手动存档位保存当前进度（自动存档位每步都会更新，无需手动覆盖）。
          </p>
        ) : (
          <p className="modal-hint">选择一个档位读取进度。</p>
        )}

        <div className="slot-list">
          {saves.map((meta, i) => {
            const slot = i; // 与 listSaves 顺序一致：0 = 自动，1..MAX_SLOTS
            if (mode === "save" && slot === AUTO_SLOT) return null; // 存档模式不显示自动位
            return (
              <div className="slot-row" key={slot}>
                <div className="slot-info">
                  <div className="slot-name">{label(slot)}</div>
                  {meta ? (
                    <div className="slot-meta">
                      {meta.nodeTitle} · 第 {meta.stepCount} 步 · {fmtTime(meta.savedAt)}
                      {meta.preview && <span className="slot-preview">　{meta.preview}</span>}
                    </div>
                  ) : (
                    <div className="slot-empty">— 空档 —</div>
                  )}
                </div>
                <div className="slot-actions">
                  {mode === "save" && (
                    <button
                      className="btn small"
                      onClick={() => {
                        onSave(slot);
                        refresh();
                      }}
                    >
                      存到此位
                    </button>
                  )}
                  {mode === "load" && meta && (
                    <>
                      <button
                        className="btn small primary"
                        onClick={() => {
                          onLoad(slot);
                          onClose();
                        }}
                      >
                        读取
                      </button>
                      {slot !== AUTO_SLOT && (
                        <button
                          className="btn small danger"
                          onClick={() => {
                            onDelete(slot);
                            refresh();
                          }}
                        >
                          删除
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
