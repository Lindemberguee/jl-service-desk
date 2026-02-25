export type AppRole = 'super_admin' | 'admin' | 'coordenador' | 'tecnico' | 'analista' | 'solicitante' | 'leitura';

export type Permission =
  | 'dashboard:read'
  | 'os:read' | 'os:create' | 'os:update' | 'os:assign' | 'os:close' | 'os:manage' | 'os:comment'
  | 'my_os:read'
  | 'assets:read' | 'assets:manage'
  | 'stock:read' | 'stock:manage'
  | 'materiais:read' | 'materiais:manage'
  | 'users:read' | 'users:manage'
  | 'reports:read' | 'settings:manage'
  | 'cadastros:read' | 'cadastros:manage'
  | 'tools:read' | 'tools:canvas' | 'tools:notes' | 'tools:reminders' | 'tools:calendar';

// Hardcoded fallback defaults (DB takes priority when loaded)
const rolePermissions: Record<AppRole, Permission[]> = {
  super_admin: [
    'dashboard:read', 'my_os:read',
    'os:read', 'os:create', 'os:update', 'os:assign', 'os:close', 'os:manage', 'os:comment',
    'assets:read', 'assets:manage', 'stock:read', 'stock:manage',
    'materiais:read', 'materiais:manage',
    'users:read', 'users:manage', 'reports:read', 'settings:manage',
    'cadastros:read', 'cadastros:manage', 'tools:read',
    'tools:canvas', 'tools:notes', 'tools:reminders', 'tools:calendar',
  ],
  admin: [
    'dashboard:read', 'my_os:read',
    'os:read', 'os:create', 'os:update', 'os:assign', 'os:close', 'os:manage', 'os:comment',
    'assets:read', 'assets:manage', 'stock:read', 'stock:manage',
    'materiais:read', 'materiais:manage',
    'users:read', 'users:manage', 'reports:read', 'settings:manage',
    'cadastros:read', 'cadastros:manage', 'tools:read',
    'tools:canvas', 'tools:notes', 'tools:reminders', 'tools:calendar',
  ],
  coordenador: [
    'dashboard:read', 'my_os:read',
    'os:read', 'os:create', 'os:update', 'os:assign', 'os:close', 'os:comment',
    'assets:read', 'assets:manage', 'stock:read', 'stock:manage',
    'materiais:read', 'materiais:manage',
    'reports:read', 'cadastros:read', 'cadastros:manage', 'users:read', 'tools:read',
    'tools:canvas', 'tools:notes', 'tools:reminders', 'tools:calendar',
  ],
  tecnico: ['dashboard:read', 'my_os:read', 'os:read', 'os:create', 'os:update', 'os:comment', 'stock:read', 'stock:manage', 'materiais:read', 'tools:read', 'tools:canvas', 'tools:notes', 'tools:reminders', 'tools:calendar'],
  analista: ['dashboard:read', 'my_os:read', 'os:read', 'os:create', 'os:comment', 'assets:read', 'stock:read', 'stock:manage', 'materiais:read', 'reports:read', 'cadastros:read', 'tools:read', 'tools:canvas', 'tools:notes', 'tools:reminders', 'tools:calendar'],
  solicitante: ['os:read', 'os:create', 'os:comment'],
  leitura: ['os:read', 'dashboard:read'],
};

export function getPermissionsForRole(role: AppRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Check permission using DB-loaded map first, then fallback to hardcoded defaults.
 * @param rolePermMap - Map of "role:permission" -> boolean from AuthContext
 */
export function hasPermission(
  role: AppRole,
  permission: Permission,
  overrides?: string[],
  rolePermMap?: Record<string, boolean>,
): boolean {
  if (overrides?.includes(permission)) return true;
  const key = `${role}:${permission}`;
  if (rolePermMap && key in rolePermMap) {
    return rolePermMap[key];
  }
  return getPermissionsForRole(role).includes(permission);
}

export const roleLabels: Record<AppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  coordenador: 'Coordenador',
  tecnico: 'Técnico',
  analista: 'Analista',
  solicitante: 'Solicitante',
  leitura: 'Somente Leitura',
};

export const roleDescriptions: Record<AppRole, string> = {
  super_admin: 'Acesso total ao sistema e administração global',
  admin: 'Gestão completa do departamento',
  coordenador: 'Coordenação operacional e cadastros',
  tecnico: 'Execução de ordens de serviço',
  analista: 'Visualização e criação de OS, relatórios e estoque',
  solicitante: 'Abertura e acompanhamento de solicitações',
  leitura: 'Apenas visualização de ordens de serviço',
};

export const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  alta: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  critica: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const statusLabels: Record<string, string> = {
  aberta: 'Aberta',
  triagem: 'Triagem',
  em_execucao: 'Em Execução',
  aguardando_peca: 'Aguard. Peça',
  aguardando_solicitante: 'Aguard. Solicitante',
  aguardando_terceiro: 'Aguard. Terceiro',
  concluida: 'Concluída',
  aprovada: 'Aprovada',
  encerrada: 'Encerrada',
  reaberta: 'Reaberta',
};

export const statusColors: Record<string, string> = {
  aberta: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  triagem: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  em_execucao: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  aguardando_peca: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  aguardando_solicitante: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  aguardando_terceiro: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  concluida: 'bg-green-500/10 text-green-500 border-green-500/20',
  aprovada: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  encerrada: 'bg-muted text-muted-foreground',
  reaberta: 'bg-red-500/10 text-red-500 border-red-500/20',
};
