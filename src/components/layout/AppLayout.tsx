import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { Outlet } from 'react-router-dom';
import { useRealtimeWorkOrders } from '@/hooks/useRealtimeWorkOrders';
import { usePersonalTheme } from '@/hooks/usePersonalTheme';
import { useAuth } from '@/contexts/AuthContext';
import SubscriptionBlockedPage from '@/pages/SubscriptionBlockedPage';

export function AppLayout() {
  useRealtimeWorkOrders();
  usePersonalTheme();

  const { isSubscriptionActive, currentRole, subscription } = useAuth();
  const isSuperAdmin = currentRole === 'super_admin';
  const blocked = !isSuperAdmin && subscription && !isSubscriptionActive();

  if (blocked) {
    return <SubscriptionBlockedPage />;
  }

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
