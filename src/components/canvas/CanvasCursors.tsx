import { memo } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { RemoteUser } from '@/hooks/useCanvasRealtime';
import { MousePointer2 } from 'lucide-react';

interface CanvasCursorsProps {
  remoteUsers: RemoteUser[];
}

function CanvasCursorsInner({ remoteUsers }: CanvasCursorsProps) {
  const { flowToScreenPosition } = useReactFlow();

  const usersWithCursors = remoteUsers.filter(u => u.cursor);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {usersWithCursors.map(user => {
        const screen = flowToScreenPosition({ x: user.cursor!.x, y: user.cursor!.y });
        return (
          <div
            key={user.userId}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: screen.x,
              top: screen.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor icon */}
            <MousePointer2
              className="h-5 w-5 drop-shadow-lg"
              style={{ color: user.color, fill: user.color, fillOpacity: 0.15 }}
            />
            {/* Name label */}
            <div
              className="absolute left-4 top-4 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-lg"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(CanvasCursorsInner);
