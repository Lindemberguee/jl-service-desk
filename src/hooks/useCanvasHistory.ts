import { useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export function useCanvasHistory() {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const push = useCallback((nodes: Node[], edges: Edge[]) => {
    past.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) });
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
  }, []);

  const undo = useCallback((currentNodes: Node[], currentEdges: Edge[]): Snapshot | null => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    return prev;
  }, []);

  const redo = useCallback((currentNodes: Node[], currentEdges: Edge[]): Snapshot | null => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push({ nodes: structuredClone(currentNodes), edges: structuredClone(currentEdges) });
    return next;
  }, []);

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { push, undo, redo, canUndo, canRedo };
}
