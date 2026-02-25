import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PresenceUser {
  user_id: string;
  name: string;
  color: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

function getColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface CanvasPresenceProps {
  boardId: string;
}

export default function CanvasPresence({ boardId }: CanvasPresenceProps) {
  const { user } = useAuth();
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!user || !boardId) return;

    const channel = supabase.channel(`canvas-presence-${boardId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          if (key === user.id) return; // Don't show self
          const p = (presences as any[])[0];
          if (p) {
            users.push({
              user_id: key,
              name: p.name || 'Usuário',
              color: getColor(key),
            });
          }
        });
        setPresenceUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            name: user.user_metadata?.name || user.email || 'Usuário',
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user, boardId]);

  if (presenceUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground mr-1">Online:</span>
      <div className="flex -space-x-1.5">
        {presenceUsers.slice(0, 5).map((p) => (
          <Tooltip key={p.user_id}>
            <TooltipTrigger asChild>
              <Avatar className="h-6 w-6 border-2 border-card ring-2 ring-transparent hover:ring-primary/20 transition-all cursor-default">
                <AvatarFallback
                  className="text-[9px] font-bold text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {p.name}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">editando</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {presenceUsers.length > 5 && (
          <Avatar className="h-6 w-6 border-2 border-card">
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
              +{presenceUsers.length - 5}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
