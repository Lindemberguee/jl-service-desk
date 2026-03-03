import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Building2, BarChart3, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/master', label: 'Dashboard', icon: BarChart3 },
];

export function MasterLayout() {
  const { signOut, profile } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/master" className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <span className="font-bold text-sm">OrdFy Master</span>
            </Link>
            <nav className="flex items-center gap-1 ml-4">
              {navItems.map(item => (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-8 text-xs gap-1.5',
                      pathname === item.href && 'bg-muted'
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Sistema
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground">{profile?.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
