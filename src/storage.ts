/* 存档/读档：localStorage 持久化，按故事分档。
   档位：slot 0 = 自动存档；slot 1..MAX_SLOTS = 手动存档位。 */
import type { Session } from "./engine/types";

const PREFIX = "nocturne:";
const VERSION = 1;
export const AUTO_SLOT = 0;
export const MAX_SLOTS = 3; // 手动档位数量（1..3）

export interface SaveMeta {
  slot: number;
  savedAt: number;
  stepCount: number;
  nodeId: string;
  nodeTitle: string;
  preview: string;
}

export interface StoredSave extends SaveMeta {
  v: number;
  session: Session;
}

export interface SaveMetaInput {
  nodeTitle?: string;
  preview?: string;
}

function key(storyId: string, slot: number): string {
  return slot === AUTO_SLOT
    ? `${PREFIX}save:${storyId}`
    : `${PREFIX}save:${storyId}:${slot}`;
}

function read(storyId: string, slot: number): StoredSave | null {
  try {
    const raw = localStorage.getItem(key(storyId, slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredSave;
    if (data.v !== VERSION || !data.session || typeof data.session.nodeId !== "string") {
      return null;
    }
    // 兼容旧版（无 stepCount/nodeTitle/preview）字段
    return {
      ...data,
      stepCount: data.stepCount ?? data.session.history?.length ?? 0,
      nodeId: data.nodeId ?? data.session.nodeId,
      nodeTitle: data.nodeTitle ?? data.session.nodeId,
      preview: data.preview ?? "",
    };
  } catch {
    return null;
  }
}

function write(storyId: string, slot: number, session: Session, meta?: SaveMetaInput): void {
  try {
    const data: StoredSave = {
      v: VERSION,
      slot,
      savedAt: Date.now(),
      stepCount: session.history.length,
      nodeId: session.nodeId,
      nodeTitle: meta?.nodeTitle ?? session.nodeId,
      preview: meta?.preview ?? "",
      session,
    };
    localStorage.setItem(key(storyId, slot), JSON.stringify(data));
  } catch {
    /* 忽略隐私模式 / 配额错误 */
  }
}

export function loadSave(storyId: string, slot: number = AUTO_SLOT): Session | null {
  return read(storyId, slot)?.session ?? null;
}

/** 自动存档（slot 0）——每一步选择时调用。 */
export function writeSave(storyId: string, session: Session, meta?: SaveMetaInput): void {
  write(storyId, AUTO_SLOT, session, meta);
}

/** 手动存档到指定档位（1..MAX_SLOTS）。 */
export function saveToSlot(storyId: string, slot: number, session: Session, meta?: SaveMetaInput): void {
  write(storyId, slot, session, meta);
}

export function deleteSave(storyId: string, slot: number = AUTO_SLOT): void {
  try {
    localStorage.removeItem(key(storyId, slot));
  } catch {
    /* 忽略 */
  }
}

export function hasSave(storyId: string, slot: number = AUTO_SLOT): boolean {
  try {
    return localStorage.getItem(key(storyId, slot)) !== null;
  } catch {
    return false;
  }
}

export function lastSavedAt(storyId: string, slot: number = AUTO_SLOT): number | null {
  return read(storyId, slot)?.savedAt ?? null;
}

/* —— 阅读位置记忆（按故事 + 节点记住滚动位置，离开播放器时保存、重进时恢复）—— */
function posKey(storyId: string, nodeId: string): string {
  return `${PREFIX}pos:${storyId}:${nodeId}`;
}

export function writeScrollPos(storyId: string, nodeId: string, y: number): void {
  try {
    localStorage.setItem(posKey(storyId, nodeId), String(Math.max(0, Math.round(y))));
  } catch {
    /* 忽略 */
  }
}

export function readScrollPos(storyId: string, nodeId: string): number {
  try {
    const raw = localStorage.getItem(posKey(storyId, nodeId));
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

/** 列出全部档位（自动 + 手动），空档为 null。 */
export function listSaves(storyId: string): Array<SaveMeta | null> {
  const slots: Array<SaveMeta | null> = [];
  for (let slot = AUTO_SLOT; slot <= MAX_SLOTS; slot++) {
    const s = read(storyId, slot);
    slots.push(
      s
        ? { slot, savedAt: s.savedAt, stepCount: s.stepCount, nodeId: s.nodeId, nodeTitle: s.nodeTitle, preview: s.preview }
        : null,
    );
  }
  return slots;
}
