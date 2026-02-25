import { ScrollText, Clock, Shield, User, LogIn, LogOut, KeyRound, AlertTriangle } from 'lucide-react';

export const actionLabels: Record<string, string> = {
  'user.created': 'Usuário criado', 'user.password_changed': 'Senha alterada',
  'user.self_password_changed': 'Senha alterada (própria)',
  'user.deactivated': 'Conta desativada', 'user.reactivated': 'Conta reativada',
  'work_order.created': 'OS criada', 'work_order.status_changed': 'Status OS alterado',
  'work_order.assigned': 'OS atribuída', 'work_order.comment': 'Comentário na OS',
  'work_order.deleted': 'OS excluída',
  'membership.created': 'Acesso adicionado', 'membership.updated': 'Acesso atualizado', 'membership.deleted': 'Acesso removido',
  'auth.login': 'Login realizado', 'auth.logout': 'Logout realizado', 'auth.signup': 'Cadastro realizado',
  'auth.token_refreshed': 'Sessão renovada', 'auth.password_recovery': 'Recuperação de senha',
  'auth.password_reset': 'Senha redefinida',
  'stock.created': 'Item criado', 'stock.updated': 'Item atualizado', 'stock.deleted': 'Item excluído',
  'stock.movement': 'Movimentação de estoque',
  'asset.created': 'Ativo criado', 'asset.updated': 'Ativo atualizado', 'asset.deleted': 'Ativo excluído',
  'customer.created': 'Solicitante criado', 'customer.updated': 'Solicitante atualizado', 'customer.deleted': 'Solicitante excluído',
  'unit.created': 'Unidade criada', 'unit.updated': 'Unidade atualizada', 'unit.deleted': 'Unidade excluída',
  'location.created': 'Local criado', 'location.updated': 'Local atualizado', 'location.deleted': 'Local excluído',
  'category.created': 'Categoria criada', 'category.updated': 'Categoria atualizada', 'category.deleted': 'Categoria excluída',
  'tenant.created': 'Departamento criado', 'tenant.updated': 'Departamento atualizado',
  'sla_policy.created': 'SLA criado', 'sla_policy.updated': 'SLA atualizado', 'sla_policy.deleted': 'SLA excluído',
  'role_permissions.updated': 'Permissões alteradas',
};

export const actionColors: Record<string, string> = {
  'auth.login': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'auth.logout': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'auth.signup': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'auth.password_recovery': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'user.deactivated': 'bg-red-500/10 text-red-600 border-red-500/20',
  'user.reactivated': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'user.password_changed': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'work_order.deleted': 'bg-red-500/10 text-red-600 border-red-500/20',
};

export const entityLabels: Record<string, string> = {
  user: 'Usuário', work_order: 'Ordem de Serviço', membership: 'Acesso',
  asset: 'Ativo', stock: 'Estoque', auth: 'Autenticação',
  customer: 'Solicitante', unit: 'Unidade', location: 'Local',
  category: 'Categoria', tenant: 'Departamento', sla_policy: 'SLA',
  role_permissions: 'Permissões',
};

export const entityIcons: Record<string, any> = {
  user: User, work_order: Clock, membership: Shield,
  asset: ScrollText, stock: ScrollText, auth: KeyRound,
  customer: User, unit: ScrollText, location: ScrollText,
  category: ScrollText, tenant: Shield, sla_policy: Clock,
  role_permissions: Shield,
};

export const actionIcons: Record<string, any> = {
  'auth.login': LogIn, 'auth.logout': LogOut, 'auth.signup': User,
  'auth.password_recovery': AlertTriangle, 'auth.password_reset': KeyRound,
};

export function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: '—', os: '—', device: '—' };
  let browser = 'Desconhecido', os = 'Desconhecido', device = 'Desktop';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device = 'Tablet';
  return { browser, os, device };
}

export type AuditLog = {
  id: string; entity: string; entity_id: string | null; action: string;
  actor_user_id: string | null; tenant_id: string | null; ip: string | null;
  user_agent: string | null; diff: Record<string, unknown> | null; created_at: string;
};
