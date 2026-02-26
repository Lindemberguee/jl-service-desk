import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';
import type { RemoteUser } from '@/hooks/useCanvasRealtime';

interface CanvasPresenceBarProps {
  remoteUsers: RemoteUser[];
  currentUserName: string;
}

function CanvasPresenceBarInner({ remoteUsers, currentUserName }: CanvasPresenceBarProps) {
  const total = remoteUsers.length + 1; // +1 for self

  return (
    <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border rounded-xl px-3 py-1.5 shadow-xl">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{total}</span>
      </div>

      <div className="w-px h-4 bg-border" />

      {/* Self */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-6 w-6 border-2 border-primary ring-2 ring-primary/20">
            <AvatarFallback className="text-[9px] font-bold bg-primary text-primary-foreground">
              {currentUserName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {currentUserName} (você)
        </TooltipContent>
      </Tooltip>

      {/* Remote users */}
      <div className="flex -space-x-1.5">
        {remoteUsers.slice(0, 6).map(user => (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <Avatar className="h-6 w-6 border-2 border-card hover:scale-110 transition-transform cursor-default">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} />
                ) : null}
                <AvatarFallback
                  className="text-[9px] font-bold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div>{user.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-muted-foreground">online</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {remoteUsers.length > 6 && (
          <Avatar className="h-6 w-6 border-2 border-card">
            <AvatarFallback className="text-[9px] bg-muted text-muted-foreground">
              +{remoteUsers.length - 6}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

export default memo(CanvasPresenceBarInner);
