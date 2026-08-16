/* 名词表（glossary）工具：
   - termUnlocked：词条是否已随剧情进度解密（到达 firstSeen 节点 / 结局自动补全）
   - splitTermSegments：把正文切成「普通文本 + 词条」片段，供高亮渲染
   数据由故事包提供（story.terms / story.termCategories），这里只放通用逻辑。 */
import type { Session, TermCategoryInfo, TermDef } from "./types";

/** 分类缺省配色（故事包未提供 termCategories 时兜底，与卡戎站的一致）。 */
export const DEFAULT_TERM_CATEGORIES: Record<string, TermCategoryInfo> = {
  人物: { label: "人物", color: "#f6ad55" },
  地点: { label: "地点", color: "#4fd1c5" },
  组织: { label: "组织", color: "#a78bfa" },
  概念: { label: "概念", color: "#f472b6" },
  物件: { label: "物件", color: "#fb923c" },
  事件: { label: "事件", color: "#f87171" },
};

export function categoryInfo(
  categories: Record<string, TermCategoryInfo> | undefined,
  id: string,
): TermCategoryInfo {
  return categories?.[id] ?? DEFAULT_TERM_CATEGORIES[id] ?? { label: id, color: "#a3a3a3" };
}

/** 词条是否已解密：无 firstSeen 的始终公开；有则需「读到」其正文——
    玩家实际读过的段落（含变体分支的渲染文本）中出现该词条即录入。
    firstSeen 只作为未录入条目的去向提示（首次见于「X」），不再硬性门控。
    结局不解锁全部——未录入的条目会留在结算页，作为二周目线索。
    spoiler=true 时全部直接解密（剧透模式，供通读/校对）。 */
export function termUnlocked(t: TermDef, session: Session | null, spoiler = false): boolean {
  if (spoiler) return true;
  if (!session) return false;
  if (!t.firstSeen) return true;
  const read = session.read;
  if (!read) return false;
  for (const paras of Object.values(read)) {
    for (const p of paras) {
      if (p.includes(t.term)) return true;
    }
  }
  return false;
}

export interface TermSegment {
  text: string;
  term?: TermDef;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 把一段正文切成片段：命中的词条单独成段（带 TermDef），其余为普通文本。
    最长词条优先匹配（如「回声信号」优先于「回声」），避免子串误标。 */
export function splitTermSegments(text: string, terms: TermDef[]): TermSegment[] {
  if (!terms.length || !text) return text ? [{ text }] : [];
  const sorted = [...terms].sort((a, b) => b.term.length - a.term.length);
  const re = new RegExp(sorted.map((t) => escapeRegExp(t.term)).join("|"), "g");
  const out: TermSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index;
    if (idx > last) out.push({ text: text.slice(last, idx) });
    const hit = sorted.find((t) => t.term === m[0]);
    out.push({ text: m[0], term: hit });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
