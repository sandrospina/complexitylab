import type { CallNode } from '../engine/calltree';

export interface PlacedNode {
  /** Path from the root, e.g. "0.1.0": the same call in two runs gets the same key. */
  key: string;
  parentKey?: string;
  node: CallNode;
  /** Leaf slots from the left; parents sit midway between their first and last child. */
  x: number;
  y: number;
  leaf: boolean;
}

/** Node-link layout of a call tree whose nodes come in call order (as buildCallTree returns them). */
export function layoutCallTree(nodes: CallNode[]): { placed: PlacedNode[]; leaves: number; depth: number } {
  const keyOf = new Map<number, string>();
  const children = new Map<number, CallNode[]>();
  for (const node of nodes) {
    if (node.parent === undefined) continue;
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node);
    children.set(node.parent, siblings);
  }
  const x = new Map<number, number>();
  let leaves = 0;
  let depth = 0;
  // Post-order over an explicit stack: call trees can be deeper than is safe to recurse.
  const stack: [CallNode, boolean][] = nodes.filter((n) => n.parent === undefined).reverse().map((n) => [n, false]);
  while (stack.length > 0) {
    const [node, expanded] = stack.pop()!;
    const kids = children.get(node.id) ?? [];
    if (!expanded && kids.length > 0) {
      stack.push([node, true]);
      for (let i = kids.length - 1; i >= 0; i--) stack.push([kids[i]!, false]);
      continue;
    }
    x.set(node.id, kids.length === 0 ? leaves++ : (x.get(kids[0]!.id)! + x.get(kids.at(-1)!.id)!) / 2);
    depth = Math.max(depth, node.depth + 1);
  }
  const placed = nodes.map((node) => {
    const parentKey = node.parent === undefined ? undefined : keyOf.get(node.parent);
    const index = node.parent === undefined ? 0 : children.get(node.parent)!.indexOf(node);
    const key = parentKey === undefined ? `${index}` : `${parentKey}.${index}`;
    keyOf.set(node.id, key);
    return { key, parentKey, node, x: x.get(node.id)!, y: node.depth, leaf: !children.has(node.id) };
  });
  return { placed, leaves, depth };
}
