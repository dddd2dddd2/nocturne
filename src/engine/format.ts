/* 节点分幕/配色约定：Node_1_ / Node_2_ / Node_3_ / Node_End_。 */

export function actOf(id: string): string {
  if (id.startsWith("Node_End")) return "结局";
  if (id.startsWith("Node_1")) return "第一幕 · Day 1";
  if (id.startsWith("Node_2")) return "第二幕 · Day 2";
  if (id.startsWith("Node_3")) return "第三幕 · Day 3";
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
