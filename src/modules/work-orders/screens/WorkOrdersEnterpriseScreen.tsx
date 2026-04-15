import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useAllTenantsQuery } from "@/hooks/useAllTenantsQuery";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import { supabase } from "@/integrations/supabase/client";
import { calculateSlaStatus } from "@/lib/sla";
import { hasPermission } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportWorkOrdersDialog } from "@/components/ExportWorkOrdersDialog";
import { PrintWorkOrderGuide } from "@/components/PrintWorkOrderGuide";
import { WorkOrderFilters } from "../components/filters/WorkOrderFilters";
import { WorkOrdersHeader } from "../components/layout/WorkOrdersHeader";
import { WorkOrdersKpiStrip } from "../components/overview/WorkOrdersKpiStrip";
import { WorkOrdersProductTable } from "../components/list/WorkOrdersProductTable";
import { useWorkOrderFilters } from "../hooks/useWorkOrderFilters";
import { WorkOrder } from "../types/workOrder.types";
import {
  OPEN_STATUSES,
  IN_PROGRESS_STATUSES,
  CLOSED_STATUSES,
} from "../constants/workOrder.constants";

type TabFilter = "all" | "open" | "in_progress" | "overdue" | "closed";
const PAGE_SIZES = [10, 25, 50, 100];

export default function WorkOrdersEnterpriseScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { currentRole, memberships } = useAuth();
  const { tenantName, primaryColor } = useTenantBranding();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintGuide, setShowPrintGuide] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data: workOrders = [], isLoading } = useAllTenantsQuery<any>(
    "work_orders_all",
    "work_orders"
  );
  const { data: units = [] } = useAllTenantsQuery<any>("units_all", "units");
  const { data: locations = [] } = useAllTenantsQuery<any>(
    "locations_all",
    "locations"
  );
  const { data: customers = [] } = useAllTenantsQuery<any>(
    "customers_all",
    "customers"
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url");
      return data || [];
    },
  });

  const canCreate = !!(currentRole && hasPermission(currentRole, "os:create"));
  const allActive = useMemo(
    () => workOrders.filter((wo: any) => !wo.deleted_at),
    [workOrders]
  );

  const tabCounts = useMemo(
    () => ({
      all: allActive.length,
      open: allActive.filter((wo: any) => OPEN_STATUSES.includes(wo.status))
        .length,
      in_progress: allActive.filter((wo: any) =>
        IN_PROGRESS_STATUSES.includes(wo.status)
      ).length,
      overdue: allActive.filter((wo: any) => {
        const sla = calculateSlaStatus(wo);
        return sla.responseOverdue || sla.resolveOverdue;
      }).length,
      closed: allActive.filter((wo: any) => CLOSED_STATUSES.includes(wo.status))
        .length,
    }),
    [allActive]
  );

  const tabFiltered = useMemo(() => {
    return allActive.filter((wo: any) => {
      if (activeTab === "open") return OPEN_STATUSES.includes(wo.status);
      if (activeTab === "in_progress")
        return IN_PROGRESS_STATUSES.includes(wo.status);
      if (activeTab === "closed") return CLOSED_STATUSES.includes(wo.status);
      if (activeTab === "overdue") {
        const sla = calculateSlaStatus(wo);
        return sla.responseOverdue || sla.resolveOverdue;
      }
      return true;
    });
  }, [allActive, activeTab]);

  const {
    search,
    setSearch,
    status,
    setStatus,
    priority,
    setPriority,
    filtered,
  } = useWorkOrderFilters(tabFiltered as WorkOrder[]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  useMemo(() => { setPage(1); }, [activeTab, search, status, priority]);

  const overdueCount = useMemo(() => {
    return allActive.filter((wo: any) => {
      const sla = calculateSlaStatus(wo);
      return sla.responseOverdue || sla.resolveOverdue;
    }).length;
  }, [allActive]);

  const withinSlaRate = useMemo(() => {
    if (!allActive.length) return 100;
    const healthy = allActive.filter((wo: any) => {
      const sla = calculateSlaStatus(wo);
      return !sla.responseOverdue && !sla.resolveOverdue;
    }).length;
    return Math.round((healthy / allActive.length) * 100);
  }, [allActive]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: tabCounts.all },
    { key: "open", label: "Abertas", count: tabCounts.open },
    {
      key: "in_progress",
      label: "Em andamento",
      count: tabCounts.in_progress,
    },
    { key: "overdue", label: "Atrasadas", count: tabCounts.overdue },
    { key: "closed", label: "Concluídas", count: tabCounts.closed },
  ];

  const tenantMap = Object.fromEntries(
    memberships.map((m) => [m.tenant_id, m.tenant_name || m.tenant_slug || ""])
  );

  return (
    <div className="space-y-5">
      <WorkOrdersHeader
        onCreate={canCreate ? () => navigate("/os/nova") : undefined}
        onExport={() => setShowExportDialog(true)}
        onPrint={() => setShowPrintGuide(true)}
        onRefresh={() => {
          qc.invalidateQueries({ queryKey: ["work_orders_all"] });
          qc.invalidateQueries({ queryKey: ["profiles_list"] });
        }}
      />

      <WorkOrdersKpiStrip
        items={[
          {
            label: "Total de OS",
            value: tabCounts.all,
            helper: "Volume operacional atual",
            tone: "default",
          },
          {
            label: "Em andamento",
            value: tabCounts.in_progress,
            helper: "Atendimentos em execução",
            tone: "warning",
          },
          {
            label: "Atrasadas",
            value: overdueCount,
            helper: "Demandas fora do SLA",
            tone: overdueCount > 0 ? "danger" : "success",
          },
          {
            label: "SLA dentro do prazo",
            value: `${withinSlaRate}%`,
            helper: "Saúde operacional consolidada",
            tone:
              withinSlaRate >= 90
                ? "success"
                : withinSlaRate >= 75
                ? "warning"
                : "danger",
          },
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  activeTab === tab.key
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <WorkOrderFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        priority={priority}
        onPriorityChange={setPriority}
      />

      {isLoading ? (
        <div className="space-y-2 rounded-xl border border-border bg-card p-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
          <Filter className="mx-auto mb-3 h-8 w-8 opacity-20" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="mt-1 text-xs">
            Ajuste os filtros para localizar resultados.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <WorkOrdersProductTable
            data={filtered}
            profiles={profiles}
            units={units}
            onRowClick={(wo) => navigate(`/os/${wo.id}`)}
          />
        </div>
      )}

      <ExportWorkOrdersDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        workOrders={filtered}
        profiles={profiles}
        customers={customers}
        locations={locations}
        units={units}
        tenantMap={tenantMap}
        tenantName={tenantName}
        primaryColor={primaryColor}
      />

      <PrintWorkOrderGuide
        open={showPrintGuide}
        onOpenChange={setShowPrintGuide}
        workOrders={filtered}
        profiles={profiles}
        customers={customers}
        locations={locations}
        units={units}
        tenantName={tenantName}
        primaryColor={primaryColor}
      />
    </div>
  );
}
