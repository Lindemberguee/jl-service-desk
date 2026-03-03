import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, type Permission } from '@/lib/permissions';
import { Navigate } from 'react-router-dom';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallbackPath?: string;
}

// Map permissions to module keys for subscription gating
const permissionModuleMap: Record<string, string> = {
  'assets:read': 'assets', 'assets:manage': 'assets',
  'stock:read': 'stock', 'stock:manage': 'stock',
  'materiais:read': 'stock', 'materiais:manage': 'stock',
  'manutencao:read': 'manutencao', 'manutencao:manage': 'manutencao',
  'disposal:read': 'disposal', 'disposal:manage': 'disposal',
  'kpis:read': 'kpis', 'kpis:manage': 'kpis',
  'reports:read': 'reports',
  'docs:read': 'docs', 'docs:manage': 'docs',
  'vault:read': 'docs', 'vault:manage': 'docs',
  'kb:read': 'knowledge', 'kb:manage': 'knowledge',
  'tools:canvas': 'canvas', 'tools:notes': 'notes', 'tools:reminders': 'reminders',
  'api:manage': 'api',
};

export function PermissionGuard({ permission, children, fallbackPath }: PermissionGuardProps) {
  const { currentRole, rolePermissions, isModuleEnabled } = useAuth();

  if (!currentRole) return <Navigate to="/login" replace />;

  const allowed = hasPermission(currentRole, permission, undefined, rolePermissions);
  if (!allowed) {
    const redirect = fallbackPath || getFallbackPath(currentRole, rolePermissions);
    return <Navigate to={redirect} replace />;
  }

  // Check module gating from subscription
  const moduleKey = permissionModuleMap[permission];
  if (moduleKey && !isModuleEnabled(moduleKey)) {
    const redirect = fallbackPath || getFallbackPath(currentRole, rolePermissions);
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}

function getFallbackPath(role: string, rolePermMap: Record<string, boolean>): string {
  const candidates: { perm: Permission; path: string }[] = [
    { perm: 'dashboard:read', path: '/dashboard' },
    { perm: 'my_os:read', path: '/minhas-os' },
    { perm: 'os:read', path: '/os' },
    { perm: 'manutencao:read', path: '/manutencao' },
    { perm: 'stock:read', path: '/estoque' },
    { perm: 'reports:read', path: '/relatorios' },
    { perm: 'cadastros:read', path: '/cadastros' },
    { perm: 'assets:read', path: '/ativos' },
  ];

  for (const c of candidates) {
    if (hasPermission(role as any, c.perm, undefined, rolePermMap)) {
      return c.path;
    }
  }
  return '/os';
}
