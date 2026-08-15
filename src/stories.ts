/* 书架注册表：新增一个故事 = 新建 stories/<id>/ 目录并在此加一行 import。
   （story.ts 需默认导出 StoryDefinition） */
import type { StoryDefinition } from "./engine/types";
import charon from "../stories/charon/story";

const ALL: StoryDefinition[] = [charon];

export const STORIES: StoryDefinition[] = [...ALL].sort((a, b) => a.order - b.order);

export function getStory(id: string): StoryDefinition | undefined {
  return STORIES.find((s) => s.id === id);
}
