import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, type Permission } from '@/lib/permissions';
import { Navigate } from 'react-router-dom';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Wraps a route element. If the user's current role lacks the given
 * permission (checked against DB-loaded map first, then fallback),
 * the user is redirected to the first allowed page.
 */
export function PermissionGuard({ permission, children, fallbackPath }: PermissionGuardProps) {
  const { currentRole, rolePermissions } = useAuth();

  if (!currentRole) return <Navigate to="/login" replace />;

  const allowed = hasPermission(currentRole, permission, undefined, rolePermissions);

  if (!allowed) {
    // Find a sensible fallback
    const redirect = fallbackPath || getFallbackPath(currentRole, rolePermissions);
    return <Navigate to={redirect} replace />;
  }

  return <>{children}</>;
}

/** Determine the first accessible page for a role so we can redirect there. */
function getFallbackPath(role: string, rolePermMap: Record<string, boolean>): string {
  const candidates: { perm: Permission; path: string }[] = [
    { perm: 'dashboard:read', path: '/dashboard' },
    { perm: 'my_os:read', path: '/minhas-os' },
    { perm: 'os:read', path: '/os' },
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
  return '/os'; // ultimate fallback
}
