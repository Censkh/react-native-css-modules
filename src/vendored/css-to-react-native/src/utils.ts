import {Node} from "postcss-value-parser";

export const extractVarFromNodes = (nodes: Node[]): string | undefined => {
  const varNode: any = nodes.find(node => node.type === "function" && node.value === "var");
  if (!varNode) {
    return undefined;
  }

  const wordNode = varNode.nodes?.[0];
  if (!wordNode) {
    return undefined;
  }

  return wordNode.type === "word" ? wordNode.value.substring(2) : undefined;
}