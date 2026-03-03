import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/master', label: 'Dashboard', exact: true },
  { href: '/master/usuarios', label: 'Usuários' },
  { href: '/master/auditoria', label: 'Auditoria' },
];

export function MasterLayout() {
  const { signOut, profile } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/master" className="font-semibold text-sm tracking-tight">
              OrdFy <span className="text-muted-foreground font-normal">Master</span>
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <nav className="flex items-center gap-0.5">
              {navItems.map(item => {
                const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} to={item.href}>
                    <button
                      className={cn(
                        'text-xs px-3 py-1.5 rounded-md transition-colors font-medium',
                        active
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-3 w-3" /> Sistema
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-xs text-muted-foreground">{profile?.name}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => signOut()}>
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
