import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Users, Sparkles } from 'lucide-react';
import type { RemoteUser } from '@/hooks/useCanvasRealtime';

interface CanvasPresenceBarProps {
  remoteUsers: RemoteUser[];
  currentUserName: string;
}

function CanvasPresenceBarInner({ remoteUsers, currentUserName }: CanvasPresenceBarProps) {
  const total = remoteUsers.length + 1;
  const activeEditors = remoteUsers.filter((user) => (user.selectedIds?.length || 0) > 0).length;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 pr-2 border-r border-border/70">
        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Colaboração</p>
          <p className="text-xs font-semibold">{total} pessoa{total > 1 ? 's' : ''} no board</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-7 w-7 border-2 border-primary ring-2 ring-primary/20">
              <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">
                {currentUserName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {currentUserName} (você)
          </TooltipContent>
        </Tooltip>

        <div className="flex -space-x-2">
          {remoteUsers.slice(0, 6).map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar className="h-7 w-7 border-2 border-card hover:scale-110 transition-transform cursor-default shadow-sm">
                  {user.avatar ? <AvatarImage src={user.avatar} /> : null}
                  <AvatarFallback className="text-[9px] font-bold text-white" style={{ backgroundColor: user.color }}>
                    {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div>{user.name}</div>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-muted-foreground">online</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remoteUsers.length > 6 && (
            <Avatar className="h-7 w-7 border-2 border-card">
              <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
                +{remoteUsers.length - 6}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>

      <div className="ml-1 flex items-center gap-1.5">
        <Badge variant="outline" className="rounded-full text-[10px] gap-1.5 bg-background/70">
          <Sparkles className="h-3 w-3" /> {activeEditors} editando agora
        </Badge>
      </div>
    </div>
  );
}

export default memo(CanvasPresenceBarInner);
