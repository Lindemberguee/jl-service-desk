import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Download, Printer, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAllTenantsQuery } from '@/hooks/useAllTenantsQuery';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { supabase } from '@/integrations/supabase/client';
import { calculateSlaStatus } from '@/lib/sla';
import { hasPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportWorkOrdersDialog } from '@/components/ExportWorkOrdersDialog';
import { PrintWorkOrderGuide } from '@/components/PrintWorkOrderGuide';
import { WorkOrderFilters } from '../components/filters/WorkOrderFilters';
import { WorkOrdersTable } from '../components/list/WorkOrdersTable';
import { useWorkOrderFilters } from '../hooks/useWorkOrderFilters';
import { WorkOrder } from '../types/workOrder.types';
import { OPEN_STATUSES, IN_PROGRESS_STATUSES, CLOSED_STATUSES } from '../constants/workOrder.constants';

type TabFilter = 'all' | 'open' | 'in_progress' | 'overdue' | 'closed';

export default function WorkOrdersScreen() {
  const navigate = useNavigate();
  const { currentRole, memberships } = useAuth();
  const { tenantName, primaryColor } = useTenantBranding();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPrintGuide, setShowPrintGuide] = useState(false);

  const { data: workOrders = [], isLoading } = useAllTenantsQuery<any>('work_orders_all', 'work_orders');
  const { data: units = [] } = useAllTenantsQuery<any>('units_all', 'units');
  const { data: locations = [] } = useAllTenantsQuery<any>('locations_all', 'locations');
  const { data: customers = [] } = useAllTenantsQuery<any>('customers_all', 'customers');
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles_list'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, name, email, avatar_url');
      return data || [];
    },
  });

  const canCreate = currentRole && hasPermission(currentRole, 'os:create');

  const allActive = useMemo(() => workOrders.filter((wo: any) => !wo.deleted_at), [workOrders]);

  const tabCounts = useMemo(() => ({
    all: allActive.length,
    open: allActive.filter((wo: any) => OPEN_STATUSES.includes(wo.status)).length,
    in_progress: allActive.filter((wo: any) => IN_PROGRESS_STATUSES.includes(wo.status)).length,
    overdue: allActive.filter((wo: any) => {
      const sla = calculateSlaStatus(wo);
      return sla.responseOverdue || sla.resolveOverdue;
    }).length,
    closed: allActive.filter((wo: any) => CLOSED_STATUSES.includes(wo.status)).length,
  }), [allActive]);

  const tabFiltered = useMemo(() => {
    return allActive.filter((wo: any) => {
      if (activeTab === 'open') return OPEN_STATUSES.includes(wo.status);
      if (activeTab === 'in_progress') return IN_PROGRESS_STATUSES.includes(wo.status);
      if (activeTab === 'closed') return CLOSED_STATUSES.includes(wo.status);
      if (activeTab === 'overdue') {
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

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: tabCounts.all },
    { key: 'open', label: 'Abertas', count: tabCounts.open },
    { key: 'in_progress', label: 'Em andamento', count: tabCounts.in_progress },
    { key: 'overdue', label: 'Atrasadas', count: tabCounts.overdue },
    { key: 'closed', label: 'Concluídas', count: tabCounts.closed },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className="rounded bg-background px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setShowPrintGuide(true)}>
            <Printer className="h-4 w-4" />
            Guia
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setShowExportDialog(true)}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          {canCreate && (
            <Button size="sm" className="h-9 gap-1.5" onClick={() => navigate('/os/nova')}>
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          )}
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
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
          <Filter className="mx-auto mb-3 h-8 w-8 opacity-20" />
          <p className="text-sm font-medium">Nenhuma OS encontrada</p>
          <p className="mt-1 text-xs">Ajuste os filtros para localizar resultados.</p>
        </div>
      ) : (
        <WorkOrdersTable
          data={filtered}
          onRowClick={(wo) => navigate(`/os/${wo.id}`)}
        />
      )}

      <ExportWorkOrdersDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        workOrders={filtered}
        profiles={profiles}
        customers={customers}
        locations={locations}
        units={units}
        tenantMap={Object.fromEntries(memberships.map((m) => [m.tenant_id, m.tenant_name || m.tenant_slug || '']))}
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
