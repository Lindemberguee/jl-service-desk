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
import CollaboratorsPage from "@/pages/CollaboratorsPage";
import Stock from "@/pages/Stock";
import MaterialControl from "@/pages/MaterialControl";
import MaintenancePage from "@/pages/MaintenancePage";
import Reports from "@/pages/Reports";
import UsersPage from "@/pages/UsersPage";
import Ferramentas from "@/pages/Ferramentas";
import KpisOkrsPage from "@/pages/KpisOkrsPage";
import CanvasPage from "@/pages/CanvasPage";
import NotesPage from "@/pages/NotesPage";
import RemindersPage from "@/pages/RemindersPage";
import PlannerPage from "@/pages/PlannerPage";
import NotificationsPage from "@/pages/NotificationsPage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminDepartments from "@/pages/admin/AdminDepartments";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAuditLogs from "@/pages/admin/AdminAuditLogs";
import AdminSystemHealth from "@/pages/admin/AdminSystemHealth";
import ProfilePage from "@/pages/ProfilePage";
import NotFound from "@/pages/NotFound";
import ForbiddenPage from "@/pages/ForbiddenPage";
import ServerErrorPage from "@/pages/ServerErrorPage";
import ShowcasePage from "@/pages/ShowcasePage";

import PublicCanvasPage from "@/pages/PublicCanvasPage";
import ApiDocsPage from "@/pages/ApiDocsPage";
import PresentationPage from "@/pages/PresentationPage";
import DocumentsPage from "@/pages/DocumentsPage";
import DisposalPage from "@/pages/DisposalPage";
import SignupPage from "@/pages/SignupPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import SmtpSettingsPage from "@/pages/integrations/SmtpSettingsPage";
import TeamsSettingsPage from "@/pages/integrations/TeamsSettingsPage";
import NotificationMetricsPage from "@/pages/integrations/NotificationMetricsPage";
import CalendarSettingsPage from "@/pages/integrations/CalendarSettingsPage";
import CalendarPage from "@/pages/CalendarPage";
import PortalHome from "@/pages/portal/PortalHome";
import PortalNewRequest from "@/pages/portal/PortalNewRequest";
import PortalWorkOrderDetail from "@/pages/portal/PortalWorkOrderDetail";
import PortalProfile from "@/pages/portal/PortalProfile";
import { TechLayout } from "@/components/layout/TechLayout";
import TechDashboard from "@/pages/tech/TechDashboard";
import TechWorkOrders from "@/pages/tech/TechWorkOrders";
import TechWorkOrderDetail from "@/pages/tech/TechWorkOrderDetail";
import TechProfile from "@/pages/tech/TechProfile";
import { MasterLayout } from "@/components/layout/MasterLayout";
import MasterDashboard from "@/pages/master/MasterDashboard";
import MasterUsersPage from "@/pages/master/MasterUsersPage";
import MasterAuditPage from "@/pages/master/MasterAuditPage";
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

  if (!user) return <ShowcasePage />;

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

function ProtectedMasterRoutes() {
  const { user, loading, currentRole } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (currentRole !== 'super_admin') return <Navigate to="/403" replace />;

  return <MasterLayout />;
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

function HomeGate() {
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
  return <ShowcasePage />;
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
            <Route path="/showcase" element={<ShowcasePage />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/canvas/public" element={<PublicCanvasPage />} />
            <Route path="/api/docs" element={<ApiDocsPage />} />
            <Route path="/apresentacao" element={<PresentationPage />} />
            <Route path="/signup" element={<SignupPage />} />

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

            {/* Master Admin Panel — super_admin only */}
            <Route path="/master" element={<ProtectedMasterRoutes />}>
              <Route index element={<MasterDashboard />} />
              <Route path="usuarios" element={<MasterUsersPage />} />
              <Route path="auditoria" element={<MasterAuditPage />} />
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
              <Route path="colaboradores" element={<PermissionGuard permission="collaborators:read"><CollaboratorsPage /></PermissionGuard>} />
              <Route path="estoque" element={<PermissionGuard permission="stock:read"><Stock /></PermissionGuard>} />
              <Route path="manutencao" element={<PermissionGuard permission="manutencao:read"><MaintenancePage /></PermissionGuard>} />
              <Route path="materiais" element={<PermissionGuard permission="materiais:read"><MaterialControl /></PermissionGuard>} />
              <Route path="relatorios" element={<PermissionGuard permission="reports:read"><Reports /></PermissionGuard>} />
              <Route path="usuarios" element={<PermissionGuard permission="users:read"><UsersPage /></PermissionGuard>} />
              <Route path="ferramentas" element={<Navigate to="/ferramentas/canvas" replace />} />
              <Route path="kpis" element={<PermissionGuard permission="kpis:read"><KpisOkrsPage /></PermissionGuard>} />
              <Route path="documentos" element={<PermissionGuard permission="docs:read"><DocumentsPage /></PermissionGuard>} />
              <Route path="descarte" element={<PermissionGuard permission="disposal:read"><DisposalPage /></PermissionGuard>} />
              <Route path="integracoes" element={<PermissionGuard permission="integrations:manage"><IntegrationsPage /></PermissionGuard>} />
              <Route path="integracoes/smtp" element={<PermissionGuard permission="integrations:manage"><SmtpSettingsPage /></PermissionGuard>} />
              <Route path="integracoes/teams" element={<PermissionGuard permission="integrations:manage"><TeamsSettingsPage /></PermissionGuard>} />
              <Route path="integracoes/metricas" element={<PermissionGuard permission="integrations:manage"><NotificationMetricsPage /></PermissionGuard>} />
              <Route path="integracoes/calendario" element={<PermissionGuard permission="integrations:manage"><CalendarSettingsPage /></PermissionGuard>} />
              <Route path="ferramentas/calendario" element={<PermissionGuard permission="tools:calendar"><CalendarPage /></PermissionGuard>} />
              <Route path="ferramentas/canvas" element={<PermissionGuard permission="tools:canvas"><CanvasPage /></PermissionGuard>} />
              <Route path="ferramentas/anotacoes" element={<PermissionGuard permission="tools:notes"><NotesPage /></PermissionGuard>} />
              <Route path="ferramentas/lembretes" element={<PermissionGuard permission="tools:reminders"><RemindersPage /></PermissionGuard>} />
              <Route path="ferramentas/planner" element={<PermissionGuard permission="tools:planner"><PlannerPage /></PermissionGuard>} />
              <Route path="notificacoes" element={<NotificationsPage />} />
              <Route path="perfil" element={<ProfilePage />} />
              {/* Admin routes */}
              <Route path="admin" element={<PermissionGuard permission="settings:manage"><AdminDashboard /></PermissionGuard>} />
              <Route path="admin/departamentos" element={<PermissionGuard permission="settings:manage"><AdminDepartments /></PermissionGuard>} />
              <Route path="admin/usuarios" element={<PermissionGuard permission="settings:manage"><AdminUsers /></PermissionGuard>} />
              <Route path="admin/configuracoes" element={<PermissionGuard permission="settings:manage"><AdminSettings /></PermissionGuard>} />
              <Route path="admin/auditoria" element={<PermissionGuard permission="settings:manage"><AdminAuditLogs /></PermissionGuard>} />
              <Route path="admin/saude" element={<PermissionGuard permission="settings:manage"><AdminSystemHealth /></PermissionGuard>} />
            </Route>

            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/500" element={<ServerErrorPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;