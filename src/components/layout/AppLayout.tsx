import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';
import { useRealtimeWorkOrders } from '@/hooks/useRealtimeWorkOrders';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export function AppLayout() {
  useRealtimeWorkOrders();
  useTenantBranding(); // Apply tenant theme colors globally
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <TopBar />
          <main className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
