# Work Orders Module Refactor

This module is the new foundation for the OS (work orders) domain.

Goals:
- isolate domain types
- centralize filters and list behavior
- prepare UI modernization without breaking current routes
- enable incremental migration from `src/pages/WorkOrders.tsx`

Planned structure:
- `types/workOrder.types.ts`
- `constants/workOrder.constants.ts`
- `utils/workOrder.helpers.ts`
- `hooks/useWorkOrderFilters.ts`
- `components/filters/WorkOrderFilters.tsx`
- `components/list/WorkOrdersTable.tsx`
- `components/list/WorkOrderMobileCard.tsx`
- `components/list/WorkOrdersBulkBar.tsx`
