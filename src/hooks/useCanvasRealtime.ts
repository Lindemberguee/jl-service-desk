import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Edge, Node } from '@xyflow/react';
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

export interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  updatedAt: string;
}

interface UseCanvasRealtimeOptions {
  boardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  enabled: boolean;
  onRemoteSnapshot: (snapshot: CanvasSnapshot, senderId: string) => void;
}

export function useCanvasRealtime({
  boardId,
  userId,
  userName,
  userAvatar,
  enabled,
  onRemoteSnapshot,
}: UseCanvasRealtimeOptions) {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const cursorThrottleRef = useRef(0);
  const selectionThrottleRef = useRef(0);
  const snapshotThrottleRef = useRef(0);
  const pendingSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const onRemoteSnapshotRef = useRef(onRemoteSnapshot);
  onRemoteSnapshotRef.current = onRemoteSnapshot;

  useEffect(() => {
    if (!enabled || !boardId || !userId) return;

    setConnectionState('connecting');

    const channel = supabase.channel(`canvas-board:${boardId}`, {
      config: { presence: { key: userId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: RemoteUser[] = [];

      Object.entries(state).forEach(([key, presences]) => {
        if (key === userId) return;
        const presence = (presences as any[])[0];
        if (!presence) return;

        users.push({
          userId: key,
          name: presence.name || 'Usuário',
          color: hashColor(key),
          avatar: presence.avatar,
          cursor: presence.cursor,
          selectedIds: presence.selectedIds || [],
        });
      });

      setRemoteUsers(users);
    });

    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (payload.userId === userId) return;
      setRemoteUsers((prev) => prev.map((item) => item.userId === payload.userId ? { ...item, cursor: { x: payload.x, y: payload.y } } : item));
    });

    channel.on('broadcast', { event: 'selection' }, ({ payload }) => {
      if (payload.userId === userId) return;
      setRemoteUsers((prev) => prev.map((item) => item.userId === payload.userId ? { ...item, selectedIds: payload.selectedIds || [] } : item));
    });

    channel.on('broadcast', { event: 'snapshot' }, ({ payload }) => {
      if (payload.senderId === userId) return;
      onRemoteSnapshotRef.current(payload.snapshot as CanvasSnapshot, payload.senderId);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        setConnectionState('connected');

        await channel.track({
          user_id: userId,
          name: userName,
          avatar: userAvatar,
          cursor: null,
          selectedIds: [],
          online_at: new Date().toISOString(),
        });

        if (pendingSnapshotRef.current) {
          const snapshot = pendingSnapshotRef.current;
          pendingSnapshotRef.current = null;
          channel.send({
            type: 'broadcast',
            event: 'snapshot',
            payload: { senderId: userId, snapshot },
          });
        }
      }

      if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        isSubscribedRef.current = false;
        setConnectionState('offline');
      }
    });

    channelRef.current = channel;

    return () => {
      isSubscribedRef.current = false;
      pendingSnapshotRef.current = null;
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setConnectionState('offline');
    };
  }, [boardId, enabled, userAvatar, userId, userName]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - cursorThrottleRef.current < 60) return;
    cursorThrottleRef.current = now;
    if (!channelRef.current || !isSubscribedRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId, x, y },
    });
  }, [userId]);

  const broadcastSelection = useCallback((selectedIds: string[]) => {
    const now = Date.now();
    if (now - selectionThrottleRef.current < 120) return;
    selectionThrottleRef.current = now;
    if (!channelRef.current || !isSubscribedRef.current) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'selection',
      payload: { userId, selectedIds },
    });
  }, [userId]);

  const broadcastSnapshot = useCallback((snapshot: CanvasSnapshot) => {
    const now = Date.now();
    if (now - snapshotThrottleRef.current < 120) {
      pendingSnapshotRef.current = snapshot;
      return;
    }

    snapshotThrottleRef.current = now;

    if (!channelRef.current || !isSubscribedRef.current) {
      pendingSnapshotRef.current = snapshot;
      return;
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'snapshot',
      payload: { senderId: userId, snapshot },
    });
  }, [userId]);

  return {
    remoteUsers,
    connectionState,
    broadcastCursor,
    broadcastSelection,
    broadcastSnapshot,
  };
}
