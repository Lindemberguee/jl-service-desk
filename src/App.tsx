import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RequesterLayout } from "@/components/layout/RequesterLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import WorkOrders from "@/pages/WorkOrders";
import WorkOrderCreate from "@/pages/WorkOrderCreate";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import Cadastros from "@/pages/Cadastros";
import Assets from "@/pages/Assets";
import Stock from "@/pages/Stock";
import Reports from "@/pages/Reports";
import UsersPage from "@/pages/UsersPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="os" element={<WorkOrders />} />
              <Route path="os/nova" element={<WorkOrderCreate />} />
              <Route path="os/:id" element={<WorkOrderDetail />} />
              <Route path="cadastros" element={<Cadastros />} />
              <Route path="ativos" element={<Assets />} />
              <Route path="estoque" element={<Stock />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="usuarios" element={<UsersPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              {/* Admin routes */}
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/departamentos" element={<AdminDepartments />} />
              <Route path="admin/usuarios" element={<AdminUsers />} />
              <Route path="admin/configuracoes" element={<AdminSettings />} />
              <Route path="admin/auditoria" element={<AdminAuditLogs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;