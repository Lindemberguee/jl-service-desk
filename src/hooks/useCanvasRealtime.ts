import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Node, Edge } from '@xyflow/react';
import type { RealtimeChannel } from '@supabase/supabase-js';

const USER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return USER_COLORS[Math.abs(h) % USER_COLORS.length];
}

export interface RemoteUser {
  userId: string;
  name: string;
  color: string;
  avatar?: string;
  cursor?: { x: number; y: number };
  selectedIds?: string[];
}

export type CanvasOp =
  | { type: 'node:add'; node: Node }
  | { type: 'node:move'; nodeId: string; position: { x: number; y: number } }
  | { type: 'node:update'; nodeId: string; data: Record<string, unknown> }
  | { type: 'node:remove'; nodeId: string }
  | { type: 'edge:add'; edge: Edge }
  | { type: 'edge:remove'; edgeId: string }
  | { type: 'edge:update'; edgeId: string; data: Record<string, unknown>; markerEnd?: Edge['markerEnd'] }
  | { type: 'full:sync'; nodes: Node[]; edges: Edge[] };

interface UseCanvasRealtimeOpts {
  boardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  enabled: boolean;
  readOnly: boolean;
  onRemoteOp: (op: CanvasOp, senderId: string) => void;
}

export function useCanvasRealtime({ boardId, userId, userName, userAvatar, enabled, readOnly, onRemoteOp }: UseCanvasRealtimeOpts) {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [queuedOpsCount, setQueuedOpsCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const pendingOpsRef = useRef<CanvasOp[]>([]);
  const cursorThrottle = useRef<number>(0);
  const selectionThrottle = useRef<number>(0);
  const onRemoteOpRef = useRef(onRemoteOp);
  onRemoteOpRef.current = onRemoteOp;

  useEffect(() => {
    if (!enabled || !boardId || !userId) return;

    setConnectionState('connecting');
    const channelName = `board:${boardId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: RemoteUser[] = [];
      Object.entries(state).forEach(([key, presences]) => {
        if (key === userId) return;
        const p = (presences as any[])[0];
        if (p) {
          users.push({
            userId: key,
            name: p.name || 'Usuário',
            color: hashColor(key),
            avatar: p.avatar,
          });
        }
      });
      setRemoteUsers((prev) => users.map((u) => {
        const existing = prev.find((p) => p.userId === u.userId);
        return { ...u, cursor: existing?.cursor, selectedIds: existing?.selectedIds };
      }));
    });

    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId === userId) return;
      setRemoteUsers((prev) => prev.map((u) => u.userId === payload.userId ? { ...u, cursor: { x: payload.x, y: payload.y } } : u));
    });

    channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      if (payload.userId === userId) return;
      setRemoteUsers((prev) => prev.map((u) => u.userId === payload.userId ? { ...u, selectedIds: payload.selectedIds } : u));
    });

    channel.on('broadcast', { event: 'doc:op' }, ({ payload }) => {
      if (payload.senderId === userId) return;
      onRemoteOpRef.current(payload.op as CanvasOp, payload.senderId);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        setConnectionState('connected');
        await channel.track({ user_id: userId, name: userName, avatar: userAvatar, online_at: new Date().toISOString() });

        if (pendingOpsRef.current.length > 0) {
          const queued = [...pendingOpsRef.current];
          pendingOpsRef.current = [];
          setQueuedOpsCount(0);
          queued.forEach((op) => {
            channel.send({ type: 'broadcast', event: 'doc:op', payload: { senderId: userId, op } });
          });
        }
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        isSubscribedRef.current = false;
        setConnectionState('offline');
      }
    });

    channelRef.current = channel;
    return () => {
      isSubscribedRef.current = false;
      pendingOpsRef.current = [];
      setQueuedOpsCount(0);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnectionState('offline');
    };
  }, [boardId, userId, userName, userAvatar, enabled]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorThrottle.current < 50) return;
    cursorThrottle.current = now;
    if (!isSubscribedRef.current || !channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'cursor', payload: { userId, x, y } });
  }, [userId]);

  const broadcastSelection = useCallback((selectedIds: string[]) => {
    const now = Date.now();
    if (now - selectionThrottle.current < 100) return;
    selectionThrottle.current = now;
    if (!isSubscribedRef.current || !channelRef.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'selection', payload: { userId, selectedIds } });
  }, [userId]);

  const broadcastOp = useCallback((op: CanvasOp) => {
    if (readOnly || !channelRef.current) return;

    if (!isSubscribedRef.current) {
      pendingOpsRef.current.push(op);
      if (pendingOpsRef.current.length > 200) pendingOpsRef.current.shift();
      setQueuedOpsCount(pendingOpsRef.current.length);
      return;
    }

    channelRef.current.send({ type: 'broadcast', event: 'doc:op', payload: { senderId: userId, op } });
  }, [userId, readOnly]);

  return {
    remoteUsers,
    broadcastCursor,
    broadcastSelection,
    broadcastOp,
    connectionState,
    queuedOpsCount,
  };
}
