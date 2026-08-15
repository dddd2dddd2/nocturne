import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Session } from "./engine/types";
import { Engine, clueTotal, initialState } from "./engine/engine";
import { getStory } from "./stories";
import { deleteSave, hasSave, loadSave, saveToSlot, writeSave, writeScrollPos } from "./storage";
import StoryLibrary from "./components/StoryLibrary";
import TitleScreen from "./components/TitleScreen";
import NodeMap from "./components/NodeMap";
import CharacterGraph from "./components/CharacterGraph";
import Player from "./components/Player";

type View = "library" | "title" | "map" | "characters" | "play";

// 视图导航顺序：index 增大视为「前进」（从右滑入），减小视为「后退」（从左滑入）
const VIEW_ORDER: Record<View, number> = {
  library: 0,
  title: 1,
  play: 2,
  map: 3,
  characters: 4,
};

export default function App() {
  const [storyId, setStoryId] = useState<string | null>(null);
  const [nav, setNav] = useState<{ view: View; dir: 1 | -1 }>({ view: "library", dir: 1 });
  const view = nav.view;
  const dir = nav.dir;
  const [session, setSession] = useState<Session | null>(null);
  // 读档后跳过紧接着的一次自动存档（避免覆盖自动档）
  const skipNextAutosave = useRef(false);

  // 统一导航入口：按新旧视图在导航流中的先后决定切入方向
  const navigate = useCallback((next: View) => {
    setNav((cur) => ({
      view: next,
      dir: VIEW_ORDER[next] >= VIEW_ORDER[cur.view] ? 1 : -1,
    }));
  }, []);

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
    navigate("title");
  }, [navigate]);

  // 页面切换时回到顶部（播放器由自身恢复阅读位置），配合切入动画
  useLayoutEffect(() => {
    if (view !== "play") window.scrollTo(0, 0);
  }, [view]);

  // 离开播放器前，先把当前节点的阅读位置写入本机（在视图切换/内容收缩前读 window.scrollY）
  const saveReadingPos = useCallback(() => {
    if (view === "play" && storyId && session) {
      writeScrollPos(storyId, session.nodeId, window.scrollY);
    }
  }, [view, storyId, session]);

  const goLibrary = useCallback(() => {
    saveReadingPos();
    setStoryId(null);
    setSession(null);
    navigate("library");
  }, [saveReadingPos, navigate]);

  const newGame = useCallback(() => {
    if (!story) return;
    setSession({
      nodeId: story.startNode,
      state: initialState(),
      visits: {},
      history: [{ nodeId: story.startNode, choice: null, outcome: null }],
    });
    navigate("play");
  }, [story, navigate]);

  const continueGame = useCallback(() => {
    if (session) navigate("play");
  }, [session, navigate]);

  const choose = useCallback(
    (text: string) => {
      saveReadingPos(); // 离开当前节点前，记住读到哪了
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
    [engine, saveReadingPos],
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
        navigate("play");
      }
    },
    [storyId, navigate],
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
              <button className={view === "play" ? "tab active" : "tab"} onClick={() => navigate("play")}>
                进入游戏
              </button>
              <button
                className={view === "map" ? "tab active" : "tab"}
                onClick={() => {
                  saveReadingPos();
                  navigate("map");
                }}
              >
                节点树
              </button>
              <button
                className={view === "characters" ? "tab active" : "tab"}
                onClick={() => {
                  saveReadingPos();
                  navigate("characters");
                }}
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
        <div key={view} className={dir === 1 ? "view view-fwd" : "view view-back"}>
          {view === "library" && <StoryLibrary onOpen={openStory} />}

          {view === "title" && story && (
            <TitleScreen
              story={story}
              hasSave={saved}
              stepCount={stepCount}
              onNew={newGame}
              onContinue={continueGame}
              onMap={() => navigate("map")}
              onChars={() => navigate("characters")}
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
                onOpenMap={() => navigate("map")}
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
        </div>
      </main>
    </div>
  );
}
