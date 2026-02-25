import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequesterLayout } from "@/components/layout/RequesterLayout";
import { PermissionGuard } from "@/components/PermissionGuard";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderCreate from "@/pages/WorkOrderCreate";
import MyWorkOrders from "@/pages/MyWorkOrders";
import MyWorkOrderDetail from "@/pages/MyWorkOrderDetail";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import Cadastros from "@/pages/Cadastros";
import Assets from "@/pages/Assets";
import Stock from "@/pages/Stock";
import MaterialControl from "@/pages/MaterialControl";
import Reports from "@/pages/Reports";
import UsersPage from "@/pages/UsersPage";
import Ferramentas from "@/pages/Ferramentas";
import CanvasPage from "@/pages/CanvasPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminSystemHealth from "@/pages/admin/AdminSystemHealth";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/NotFound";
import PortalHome from "@/pages/portal/PortalHome";
import PortalNewRequest from "@/pages/portal/PortalNewRequest";
import PortalWorkOrderDetail from "@/pages/portal/PortalWorkOrderDetail";
import PortalProfile from "@/pages/portal/PortalProfile";
import { TechLayout } from "@/components/layout/TechLayout";
import TechDashboard from "@/pages/tech/TechDashboard";
import TechWorkOrders from "@/pages/tech/TechWorkOrders";
import TechWorkOrderDetail from "@/pages/tech/TechWorkOrderDetail";
import TechProfile from "@/pages/tech/TechProfile";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading, currentRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Solicitante and leitura roles get the simplified portal
  if (currentRole === 'solicitante' || currentRole === 'leitura') {
    return <Navigate to="/portal" replace />;
  }

  // Technician gets the tech panel
  if (currentRole === 'tecnico') {
    return <Navigate to="/tech" replace />;
  }

  // All other roles (admin, coordenador, analista, super_admin) use AppLayout
  return <AppLayout />;
}

function ProtectedPortalRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <RequesterLayout />;
}

function ProtectedTechRoutes() {
  const { user, loading, currentRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <TechLayout />;
}

function AuthGate() {
  const { user, loading, currentRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    if (currentRole === 'solicitante' || currentRole === 'leitura') {
      return <Navigate to="/portal" replace />;
    }
    if (currentRole === 'tecnico') {
      return <Navigate to="/tech" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <Login />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthGate />} />

            {/* Requester Portal */}
            <Route path="/portal" element={<ProtectedPortalRoutes />}>
              <Route index element={<PortalHome />} />
              <Route path="nova" element={<PortalNewRequest />} />
              <Route path="os/:id" element={<PortalWorkOrderDetail />} />
              <Route path="perfil" element={<PortalProfile />} />
            </Route>

            {/* Technician Panel */}
            <Route path="/tech" element={<ProtectedTechRoutes />}>
              <Route index element={<TechDashboard />} />
              <Route path="os" element={<TechWorkOrders />} />
              <Route path="os/:id" element={<TechWorkOrderDetail />} />
              <Route path="perfil" element={<TechProfile />} />
            </Route>

            {/* Admin/Operational Layout */}
            <Route path="/" element={<ProtectedRoutes />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<PermissionGuard permission="dashboard:read"><Dashboard /></PermissionGuard>} />
              <Route path="os" element={<PermissionGuard permission="os:read"><WorkOrders /></PermissionGuard>} />
              <Route path="os/nova" element={<PermissionGuard permission="os:create"><WorkOrderCreate /></PermissionGuard>} />
              <Route path="os/:id" element={<PermissionGuard permission="os:read"><WorkOrderDetail /></PermissionGuard>} />
              <Route path="minhas-os" element={<PermissionGuard permission="my_os:read"><MyWorkOrders /></PermissionGuard>} />
              <Route path="minhas-os/:id" element={<PermissionGuard permission="my_os:read"><MyWorkOrderDetail /></PermissionGuard>} />
              <Route path="cadastros" element={<PermissionGuard permission="cadastros:read"><Cadastros /></PermissionGuard>} />
              <Route path="ativos" element={<PermissionGuard permission="assets:read"><Assets /></PermissionGuard>} />
              <Route path="estoque" element={<PermissionGuard permission="stock:read"><Stock /></PermissionGuard>} />
              <Route path="materiais" element={<PermissionGuard permission="materiais:read"><MaterialControl /></PermissionGuard>} />
              <Route path="relatorios" element={<PermissionGuard permission="reports:read"><Reports /></PermissionGuard>} />
              <Route path="usuarios" element={<PermissionGuard permission="users:read"><UsersPage /></PermissionGuard>} />
              <Route path="ferramentas" element={<PermissionGuard permission="tools:read"><Ferramentas /></PermissionGuard>} />
              <Route path="ferramentas/canvas" element={<PermissionGuard permission="tools:read"><CanvasPage /></PermissionGuard>} />
              <Route path="perfil" element={<ProfilePage />} />
              {/* Admin routes */}
              <Route path="admin" element={<PermissionGuard permission="settings:manage"><AdminDashboard /></PermissionGuard>} />
              <Route path="admin/departamentos" element={<PermissionGuard permission="settings:manage"><AdminDepartments /></PermissionGuard>} />
              <Route path="admin/usuarios" element={<PermissionGuard permission="settings:manage"><AdminUsers /></PermissionGuard>} />
              <Route path="admin/configuracoes" element={<PermissionGuard permission="settings:manage"><AdminSettings /></PermissionGuard>} />
              <Route path="admin/auditoria" element={<PermissionGuard permission="settings:manage"><AdminAuditLogs /></PermissionGuard>} />
              <Route path="admin/saude" element={<PermissionGuard permission="settings:manage"><AdminSystemHealth /></PermissionGuard>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;