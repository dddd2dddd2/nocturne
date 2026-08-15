import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "./engine/types";
import { Engine, clueTotal, initialState } from "./engine/engine";
import { getStory } from "./stories";
import { deleteSave, hasSave, loadSave, saveToSlot, writeSave } from "./storage";
import StoryLibrary from "./components/StoryLibrary";
import TitleScreen from "./components/TitleScreen";
import NodeMap from "./components/NodeMap";
import CharacterGraph from "./components/CharacterGraph";
import Player from "./components/Player";

type View = "library" | "title" | "map" | "characters" | "play";

export default function App() {
  const [storyId, setStoryId] = useState<string | null>(null);
  const [view, setView] = useState<View>("library");
  const [session, setSession] = useState<Session | null>(null);
  // 读档后跳过紧接着的一次自动存档（避免覆盖自动档）
  const skipNextAutosave = useRef(false);

  const story = storyId ? (getStory(storyId) ?? null) : null;
  const engine = useMemo(() => (story ? new Engine(story.nodes) : null), [story]);

  // 存档元信息（节点名 + 状态摘要），供自动/手动存档展示。
  const metaFor = useCallback(
    (sess: Session) => ({
      nodeTitle: story ? (story.nodeTitles[sess.nodeId] ?? sess.nodeId) : sess.nodeId,
      preview: `SAN ${sess.state.sanity} · 线索 ${clueTotal(sess.state)}`,
    }),
    [story],
  );

  // 自动存档：会话每次变化（每步选择 / 重启 / 继续）都写入本机。
  // 读档触发的会话变化通过一次性跳过标记跳过，避免覆盖自动档。
  useEffect(() => {
    if (!storyId || !session) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    writeSave(storyId, session, metaFor(session));
  }, [storyId, session, metaFor]);

  const openStory = useCallback((id: string) => {
    setStoryId(id);
    setSession(loadSave(id)); // 有存档则预载，供「继续游戏」
    setView("title");
  }, []);

  const goLibrary = useCallback(() => {
    setStoryId(null);
    setSession(null);
    setView("library");
  }, []);

  const newGame = useCallback(() => {
    if (!story) return;
    setSession({
      nodeId: story.startNode,
      state: initialState(),
      visits: {},
      history: [{ nodeId: story.startNode, choice: null, outcome: null }],
    });
    setView("play");
  }, [story]);

  const continueGame = useCallback(() => {
    if (session) setView("play");
  }, [session]);

  const choose = useCallback(
    (text: string) => {
      setSession((sess) => {
        if (!sess || !engine) return sess;
        const res = engine.choose(sess.nodeId, text, sess.state, sess.visits);
        return {
          nodeId: res.nextNode,
          state: res.state,
          visits: { ...sess.visits },
          history: [...sess.history, { nodeId: res.nextNode, choice: text, outcome: res.outcome }],
        };
      });
    },
    [engine],
  );

  const clearAutoSave = useCallback(() => {
    if (!storyId) return;
    deleteSave(storyId); // 删除自动存档位（slot 0）
    setSession(null);
  }, [storyId]);

  const handleSave = useCallback(
    (slot: number) => {
      if (!storyId || !session) return;
      saveToSlot(storyId, slot, session, metaFor(session));
    },
    [storyId, session, metaFor],
  );

  const handleLoad = useCallback(
    (slot: number) => {
      if (!storyId) return;
      const s = loadSave(storyId, slot);
      if (s) {
        skipNextAutosave.current = true;
        setSession(s);
        setView("play");
      }
    },
    [storyId],
  );

  const handleDelete = useCallback(
    (slot: number) => {
      if (!storyId) return;
      deleteSave(storyId, slot);
    },
    [storyId],
  );

  const saved = storyId ? hasSave(storyId) : false;
  const stepCount = session ? session.history.length : 0;

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goLibrary}>
          ◈ 互动小说<span className="brand-sub">INTERACTIVE</span>
        </button>
        {story && (
          <span className="story-indicator">
            {story.title} <span className="story-indicator-sub">{story.subtitle}</span>
          </span>
        )}
        <nav className="tabs">
          {story && (
            <>
              <button className={view === "play" ? "tab active" : "tab"} onClick={() => setView("play")}>
                进入游戏
              </button>
              <button className={view === "map" ? "tab active" : "tab"} onClick={() => setView("map")}>
                节点树
              </button>
              <button
                className={view === "characters" ? "tab active" : "tab"}
                onClick={() => setView("characters")}
              >
                人物图谱
              </button>
              <button className="tab" onClick={goLibrary}>
                ← 书架
              </button>
            </>
          )}
        </nav>
      </header>

      <main className="stage">
        {view === "library" && <StoryLibrary onOpen={openStory} />}

        {view === "title" && story && (
          <TitleScreen
            story={story}
            hasSave={saved}
            stepCount={stepCount}
            onNew={newGame}
            onContinue={continueGame}
            onMap={() => setView("map")}
            onChars={() => setView("characters")}
            onDeleteSave={clearAutoSave}
          />
        )}

        {view === "map" && story && engine && (
          <NodeMap story={story} engine={engine} session={session} />
        )}

        {view === "characters" && story && (
          <CharacterGraph story={story} session={session} />
        )}

        {view === "play" && story && engine && (
          session ? (
            <Player
              story={story}
              engine={engine}
              session={session}
              onChoose={choose}
              onRestart={newGame}
              onOpenMap={() => setView("map")}
              onSave={handleSave}
              onLoad={handleLoad}
              onDelete={handleDelete}
            />
          ) : (
            <div className="empty">
              <p>还没有进行中的游戏。</p>
              <button className="btn primary" onClick={newGame}>
                开始游戏
              </button>
            </div>
          )
        )}
      </main>
    </div>
  );
}
