import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  statusLabels,
  priorityLabels,
  priorityColors,
  statusColors,
} from "@/lib/permissions";
import { WorkOrderSlaBadge } from "./WorkOrderSlaBadge";
import { WorkOrder } from "../../types/workOrder.types";

interface ProfileLike {
  id: string;
  name?: string | null;
  avatar_url?: string | null;
}

interface UnitLike {
  id: string;
  name?: string | null;
}

interface Props {
  data: WorkOrder[];
  profiles?: ProfileLike[];
  units?: UnitLike[];
  onRowClick?: (wo: WorkOrder) => void;
}

function getInitials(name?: string | null) {
  if (!name) return "—";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function WorkOrdersProductTable({
  data,
  profiles = [],
  units = [],
  onRowClick,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="grid grid-cols-[140px_minmax(320px,1.4fr)_180px_160px_170px_130px] gap-3 border-b border-border/70 bg-muted/30 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <span>Código</span>
        <span>Chamado</span>
        <span>SLA</span>
        <span>Status</span>
        <span>Responsável</span>
        <span>Prioridade</span>
      </div>

      <div>
        {data.map((wo) => {
          const assignedProfile = profiles.find(
            (profile) => profile.id === wo.assigned_to_id
          );
          const unit = units.find((item) => item.id === wo.unit_id);

          return (
            <button
              key={wo.id}
              type="button"
              onClick={() => onRowClick?.(wo)}
              className="grid w-full grid-cols-[140px_minmax(320px,1.4fr)_180px_160px_170px_130px] gap-3 border-b border-border/50 px-4 py-4 text-left transition-all hover:bg-muted/35 last:border-b-0"
            >
              <div className="space-y-1">
                <div className="font-mono text-[12px] font-semibold text-foreground">
                  {wo.code}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Criada em {new Date(wo.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {wo.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Atualizado:{" "}
                    {new Date(wo.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                  {unit?.name ? (
                    <span className="rounded-md bg-muted px-1.5 py-0.5">
                      {unit.name}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center">
                <WorkOrderSlaBadge workOrder={wo} />
              </div>

              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className={`h-6 text-[11px] font-semibold ${
                    statusColors[wo.status] || ""
                  }`}
                >
                  {statusLabels[wo.status] || wo.status}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 border border-border/60">
                  <AvatarImage
                    src={assignedProfile?.avatar_url || undefined}
                    alt={assignedProfile?.name || "Responsável"}
                  />
                  <AvatarFallback className="text-[10px] font-semibold">
                    {getInitials(assignedProfile?.name || null)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {assignedProfile?.name || "Não atribuído"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {assignedProfile
                      ? "Responsável atual"
                      : "Aguardando atribuição"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-start">
                <Badge
                  variant="outline"
                  className={`h-6 text-[11px] font-semibold ${
                    priorityColors[wo.priority] || ""
                  }`}
                >
                  {priorityLabels[wo.priority] || wo.priority}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
