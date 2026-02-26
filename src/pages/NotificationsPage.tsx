import { useState } from 'react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bell, Check, CheckCheck, Trash2, Search, Filter, X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const typeLabels: Record<string, string> = {
  all: 'Todas',
  work_order: 'Ordens de Serviço',
  reminder: 'Lembretes',
  stock: 'Estoque',
  system: 'Sistema',
};

const typeIcons: Record<string, string> = {
  work_order: '📋',
  reminder: '🔔',
  stock: '📦',
  system: '⚙️',
};

const typeBadgeColors: Record<string, string> = {
  work_order: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  reminder: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  stock: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  system: 'bg-muted text-muted-foreground border-border',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, deleteNotification, deleteAll } = useNotifications();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filtered = notifications.filter((n) => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (readFilter === 'unread' && n.is_read) return false;
    if (readFilter === 'read' && !n.is_read) return false;
    if (search) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `Você tem ${unreadCount} notificação${unreadCount !== 1 ? 'ões' : ''} não lida${unreadCount !== 1 ? 's' : ''}`
              : 'Todas as notificações foram lidas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => deleteAll()}>
              <Trash2 className="h-3.5 w-3.5" /> Limpar tudo
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notificações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearch('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(typeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={(v) => setReadFilter(v as any)}>
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <SelectItem value="read">Lidas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {notifications.length === 0 ? 'Nenhuma notificação ainda' : 'Nenhuma notificação encontrada'}
          </p>
          <p className="text-xs mt-1">
            {notifications.length === 0 
              ? 'Quando houver novidades, elas aparecerão aqui'
              : 'Tente ajustar os filtros de busca'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {filtered.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={cn(
                    'flex gap-3 p-4 rounded-xl border transition-all group cursor-pointer',
                    n.is_read
                      ? 'bg-card opacity-70 hover:opacity-90 border-border'
                      : 'bg-primary/[0.03] border-primary/20 hover:border-primary/40 shadow-sm'
                  )}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <span className="text-xl mt-0.5 shrink-0">{typeIcons[n.type] || '📌'}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className={cn('text-[10px] px-2 py-0 h-5 font-medium', typeBadgeColors[n.type])}>
                        {typeLabels[n.type] || n.type}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
                        {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
