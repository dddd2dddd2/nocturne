/* 节点分幕/配色约定：Node_1_ / Node_2_ / Node_3_ / Node_End_。
   可传 story.actLabels 覆盖分幕文案（如《高太公战纪》的“高老庄/地府/反天”）。 */

export function actOf(id: string, labels?: Partial<Record<number, string>>): string {
  const act = id.startsWith("Node_End")
    ? 9
    : id.startsWith("Node_1")
      ? 1
      : id.startsWith("Node_2")
        ? 2
        : id.startsWith("Node_3")
          ? 3
          : 0;
  if (act !== 0 && labels?.[act]) return labels[act] as string;
  if (act === 9) return "结局";
  if (act === 1) return "第一幕 · Day 1";
  if (act === 2) return "第二幕 · Day 2";
  if (act === 3) return "第三幕 · Day 3";
  return "节点";
}

export function nodeColorOf(id: string): string {
  if (id.startsWith("Node_End")) return "#6b2a2a";
  if (id.startsWith("Node_1")) return "#2a6b64";
  if (id.startsWith("Node_2")) return "#6b5226";
  if (id.startsWith("Node_3")) return "#4c3a78";
  return "#1c2a3d";
}

export function isEnding(id: string): boolean {
  return id.startsWith("Node_End");
}
