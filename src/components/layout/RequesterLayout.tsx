import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/hooks/useDarkMode';
import { ClipboardList, Plus, User, LogOut, Sun, Moon, Wrench } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeWorkOrders } from '@/hooks/useRealtimeWorkOrders';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
  { label: 'Minhas OS', icon: ClipboardList, path: '/portal' },
  { label: 'Nova OS', icon: Plus, path: '/portal/nova' },
  { label: 'Perfil', icon: User, path: '/portal/perfil' },
];

export function RequesterLayout() {
  const { profile, signOut, memberships, currentTenantId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggle } = useDarkMode();
  useRealtimeWorkOrders();

  const { data: tenant } = useQuery({
    queryKey: ['tenant_branding', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return null;
      const { data } = await supabase.from('tenants').select('name, logo_url, primary_color, accent_color').eq('id', currentTenantId).single();
      return data;
    },
    enabled: !!currentTenantId,
  });

  const isActive = (path: string) => {
    if (path === '/portal') return location.pathname === '/portal';
    return location.pathname.startsWith(path);
  };

  const initials = profile?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top header — glassmorphism */}
      <header className="h-14 border-b border-border/50 bg-card/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/portal')}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-9 w-9 rounded-xl object-cover ring-2 ring-primary/10" />
          ) : (
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${tenant?.primary_color || 'hsl(var(--primary))'}, ${tenant?.accent_color || 'hsl(var(--primary))'})`,
              }}
            >
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
          )}
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none tracking-tight">{tenant?.name || 'OrdFy'}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Portal do Solicitante</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 ml-6">
          {navItems.map(item => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 text-xs gap-1.5 relative transition-all duration-200 ${
                isActive(item.path) ? 'shadow-md' : 'hover:bg-accent/80'
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggle}>
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isDark ? 'Tema claro' : 'Tema escuro'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sair</TooltipContent>
          </Tooltip>

          <Avatar className="h-8 w-8 ring-2 ring-primary/20 cursor-pointer" onClick={() => navigate('/portal/perfil')}>
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Mobile bottom nav — modern pill style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mx-3 mb-3 rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl shadow-2xl shadow-black/10">
          <div className="flex items-center justify-around py-1.5 px-2">
            {navItems.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200"
                  onClick={() => navigate(item.path)}
                >
                  {active && (
                    <motion.div
                      layoutId="portal-nav-pill"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon className={`h-5 w-5 relative z-10 transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content area with page transitions */}
      <main className="flex-1 pb-24 md:pb-6 max-w-4xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-4 md:p-6"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
