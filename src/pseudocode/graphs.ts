import type { Pseudocode } from './types';

const ADJACENCY =
  'The graph is stored as adjacency lists, so "for each v in Adj[u]" costs one step per neighbour: summed over all vertices that is one step per edge end, 2E for an undirected graph.';

export const BFS: Pseudocode = {
  title: 'BFS(G, s)',
  idea: 'Explore in waves: first s, then everything one edge away, then two, and so on. A FIFO queue holds the frontier, the vertices discovered but not yet explored.',
  lines: [
    { code: 'visited[1..V] ← false; visited[s] ← true', depth: 0, cost: 'c_1', times: '1', note: 'V cells of memory, the same for BFS and DFS.' },
    { code: 'Q ← ⟨s⟩', depth: 0, cost: 'c_2', times: '1', note: 'The frontier starts as just s.' },
    { code: 'while Q ≠ ∅', depth: 0, cost: 'c_3', times: 'V + 1', note: 'Each reachable vertex enters the queue exactly once, so V iterations (on a connected graph), plus the final test.' },
    { code: 'u ← DEQUEUE(Q)', depth: 1, cost: 'c_4', times: 'V', note: 'The oldest discovered vertex.' },
    { code: 'for each v in Adj[u]', depth: 1, cost: 'c_5', times: '2E', note: ADJACENCY },
    { code: 'if not visited[v]', depth: 2, cost: 'c_6', times: '2E', note: 'The counted check, once per edge end.' },
    { code: 'visited[v] ← true; ENQUEUE(Q, v)', depth: 3, cost: 'c_7', times: 'V - 1', note: 'Mark on enqueue, so no vertex is queued twice. Every vertex but s is discovered once.' },
  ],
  dominant: [5, 6],
  bound: 'n',
  derivation: [
    {
      label: 'Time, any connected graph',
      tex: 'T = c_3(V+1) + c_4 V + (c_5 + c_6)\\,2E + c_7(V - 1) + \\Theta(1) = \\Theta(V + E)',
      text: 'Each vertex is dequeued once and each edge is looked at from both ends: linear in the size of the graph. On a graph with E = Θ(V) edges that is Θ(V); on a dense graph with E = Θ(V²), Θ(V²): exactly what the scaling plot measures for each family.',
    },
    {
      label: 'Space: the frontier is a whole level',
      tex: 'S = \\underbrace{V}_{\\text{visited}} + \\underbrace{\\max_{\\text{time}} |Q|}_{\\text{frontier}}, \\qquad \\max|Q| \\approx V/2 \\text{ on a binary tree},\\; 1 \\text{ on a path}',
      text: 'The queue can hold an entire level of the graph at once: on a wide tree that is half the vertices. Compare DFS, whose frontier is a single path.',
    },
  ],
  sources: ['graph/bfs.ts'],
};

export const DFS: Pseudocode = {
  title: 'DFS(G, s)',
  idea: 'Go as deep as possible before backing up: visit a neighbour, then its neighbour, and so on, returning only at dead ends. The call stack holds the frontier: the path from s to the current vertex.',
  lines: [
    { code: 'visited[1..V] ← false', depth: 0, cost: 'c_1', times: '1', note: 'V cells, as for BFS.' },
    { code: 'DFS-VISIT(s)', depth: 0, cost: 'T_{\\text{visit}}', times: '1', note: '' },
    { code: 'visited[u] ← true', depth: 0, section: 'DFS-VISIT(u)', cost: 'c_3', times: 'V', note: 'Once per reachable vertex: each call marks its vertex first, so it is never called twice.' },
    { code: 'for each v in Adj[u]', depth: 0, cost: 'c_4', times: '2E', note: ADJACENCY },
    { code: 'if not visited[v]', depth: 1, cost: 'c_5', times: '2E', note: 'The counted check, once per edge end.' },
    { code: 'DFS-VISIT(v)', depth: 2, cost: 'T_{\\text{visit}}(v)', times: 'V - 1', note: 'Recurse: one stack frame per vertex on the current path. (Simulated here with an explicit stack.)' },
  ],
  dominant: [4, 5],
  bound: 'n',
  derivation: [
    {
      label: 'Time, any connected graph',
      tex: 'T = c_3 V + (c_4 + c_5)\\,2E + \\Theta(V) = \\Theta(V + E)',
      text: 'Exactly the same work as BFS: every vertex once, every edge from both ends. The two searches differ only in the order of exploration, and so in memory.',
    },
    {
      label: 'Space: the frontier is one path',
      tex: 'S = V + \\max_{\\text{time}}(\\text{stack depth}), \\qquad \\text{depth} = \\log_2 V + 1 \\text{ on a binary tree},\\; V \\text{ on a path}',
      text: 'The stack holds the current root-to-vertex path: short on a wide, bushy graph, as long as the graph on a deep one. That is the mirror image of BFS.',
    },
  ],
  sources: ['graph/dfs.ts'],
};

const DIJKSTRA_IDEA =
  'Grow a set of settled vertices whose shortest distance from s is final. Each round settles the unsettled vertex with the smallest tentative distance, then relaxes its edges: if going through u is shorter, the neighbour’s tentative distance drops.';

export const DIJKSTRA_ARRAY: Pseudocode = {
  title: 'DIJKSTRA-ARRAY(G, w, s)',
  idea: `${DIJKSTRA_IDEA} Here the tentative distances sit in a plain array, so finding the smallest means scanning all of them.`,
  lines: [
    { code: 'dist[1..V] ← ∞; settled[1..V] ← false; dist[s] ← 0', depth: 0, cost: 'c_1', times: '1', note: '2V cells.' },
    { code: 'repeat V times', depth: 0, cost: 'c_2', times: 'V', note: 'One vertex settled per round.' },
    { code: 'u ← the unsettled vertex with the smallest dist (scan all V)', depth: 1, unit: 'compares', cost: 'c_3 \\text{ per vertex}', times: 'V^2', note: 'A linear scan of the array: V compares, every round. This is the array version’s whole cost.' },
    { code: 'if dist[u] = ∞ then stop', depth: 1, cost: 'c_4', times: 'V', note: 'The rest is unreachable.' },
    { code: 'settled[u] ← true', depth: 1, cost: 'c_5', times: 'V', note: 'dist[u] is now final.' },
    { code: 'for each v in Adj[u] with weight w', depth: 1, cost: 'c_6', times: '2E', note: 'Every edge end once, over all rounds.' },
    { code: 'if dist[u] + w < dist[v]', depth: 2, cost: 'c_7', times: '2E', note: 'Relax: is the route through u shorter?' },
    { code: 'dist[v] ← dist[u] + w', depth: 3, cost: 'c_8', times: '\\le 2E', note: 'An array write: Θ(1). (The heap version pays log V here instead.)' },
  ],
  dominant: [3, 7],
  bound: 'n2',
  derivation: [
    {
      label: 'Any graph',
      tex: 'T = c_3 V^2 + (c_6 + c_7 + c_8)\\,O(E) + \\Theta(V) = \\Theta(V^2 + E) = \\Theta(V^2) \\quad (E \\le V^2/2)',
      text: 'Line 3 scans all V entries in each of the V rounds, whatever the edges: V² compares even on a sparse graph. Relaxing is cheap, Θ(1) per edge end.',
    },
  ],
  sources: ['graph/dijkstra-array.ts'],
};

export const DIJKSTRA_HEAP: Pseudocode = {
  title: 'DIJKSTRA-HEAP(G, w, s)',
  idea: `${DIJKSTRA_IDEA} Here the tentative distances sit in a binary min-heap: the smallest is on top, but every improvement costs a heap insertion. Outdated entries are skipped when they surface ("lazy deletion").`,
  lines: [
    { code: 'dist[1..V] ← ∞; dist[s] ← 0; Q ← ⟨(0, s)⟩', depth: 0, cost: 'c_1', times: '1', note: 'Q holds (distance, vertex) pairs, smallest distance on top.' },
    { code: 'while Q ≠ ∅', depth: 0, cost: 'c_2', times: '\\le 2E + 2', note: 'One iteration per entry ever pushed.' },
    { code: '(d, u) ← EXTRACT-MIN(Q)', depth: 1, unit: 'heap compares and swaps', cost: 'O(\\log |Q|)', note: 'Move the last entry to the root and sift it down: at most 2 compares per level of the heap.' },
    { code: 'if d > dist[u] then continue', depth: 1, cost: 'c_4', times: '\\le 2E + 1', note: 'A stale entry: u was settled already, with a smaller distance.' },
    { code: 'for each v in Adj[u] with weight w', depth: 1, cost: 'c_5', times: '2E', note: 'Each vertex is settled once, so each edge end is relaxed once.' },
    { code: 'if d + w < dist[v]', depth: 2, cost: 'c_6', times: '2E', note: 'Relax.' },
    { code: 'dist[v] ← d + w', depth: 3, cost: 'c_7', times: '\\le 2E', note: 'An improvement.' },
    { code: 'INSERT(Q, (d + w, v))', depth: 3, unit: 'heap compares and swaps', cost: 'O(\\log |Q|)', note: 'Add the new entry at the bottom and sift it up. The old entry for v stays in the heap, now stale.' },
  ],
  dominant: [3, 6, 8],
  bound: 'nlogn',
  derivation: [
    {
      label: 'Any graph: every improvement costs a heap operation',
      tex: 'T = \\underbrace{O(E)}_{\\text{lines } 5\\text{–}7} + \\underbrace{O(E \\log E)}_{\\text{lines } 3, 8} = O((V + E)\\log V) \\quad (\\log E \\le 2\\log V)',
      text: 'Each successful relaxation pushes one entry and each entry is popped once, both O(log V). In the worst case every edge improves a distance, as on the benchmark graphs here.',
    },
    {
      label: 'Against the array version',
      tex: '(V + E)\\log V \\text{ vs } V^2: \\quad E = O(V) \\Rightarrow V\\log V \\ll V^2, \\qquad E = \\Theta(V^2) \\Rightarrow V^2 \\log V \\gg V^2',
      text: 'On sparse graphs the heap wins easily; on dense graphs its log factor on every edge loses to the array’s flat V² scan. The degree slider on this page moves the crossover between the two.',
    },
  ],
  sources: ['graph/dijkstra-heap.ts'],
};
