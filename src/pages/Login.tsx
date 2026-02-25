import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Loader2, ShieldAlert, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;
const ATTEMPT_WINDOW_MS = 300_000;

export default function Login() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const attemptsRef = useRef<number[]>([]);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const startLockoutTimer = useCallback((until: number) => {
    if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    const update = () => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutSeconds(0);
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      } else {
        setLockoutSeconds(remaining);
      }
    };
    update();
    lockoutTimerRef.current = setInterval(update, 1000);
  }, []);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    attemptsRef.current = attemptsRef.current.filter(t => now - t < ATTEMPT_WINDOW_MS);
    attemptsRef.current.push(now);
    if (attemptsRef.current.length >= MAX_ATTEMPTS) {
      const lockouts = Math.floor(attemptsRef.current.length / MAX_ATTEMPTS);
      const duration = LOCKOUT_DURATION_MS * Math.pow(2, lockouts - 1);
      const until = now + duration;
      setLockoutUntil(until);
      startLockoutTimer(until);
      return true;
    }
    return false;
  }, [startLockoutTimer]);

  const remainingAttempts = MAX_ATTEMPTS - attemptsRef.current.filter(t => Date.now() - t < ATTEMPT_WINDOW_MS).length;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) {
      toast({ title: 'Conta temporariamente bloqueada', description: `Aguarde ${lockoutSeconds}s antes de tentar novamente.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      const locked = recordAttempt();
      if (locked) {
        toast({ title: 'Muitas tentativas', description: 'Conta bloqueada temporariamente por segurança.', variant: 'destructive' });
      } else {
        toast({
          title: 'Erro ao entrar',
          description: remainingAttempts <= 2
            ? `Credenciais inválidas. ${remainingAttempts - 1} tentativa(s) restante(s).`
            : err.message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden bg-sidebar items-center justify-center p-12">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--sidebar-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--sidebar-foreground)) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-sidebar-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 rounded-full bg-sidebar-primary/5 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="h-14 w-14 rounded-2xl bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/25">
              <Wrench className="h-7 w-7 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-sidebar-foreground">ServiceOS</h1>
              <p className="text-sm text-sidebar-muted-foreground font-medium">Enterprise Service Management</p>
            </div>
          </div>

          <div className="space-y-6 text-sidebar-foreground/80">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-sidebar-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sidebar-foreground text-sm">Gestão Completa de OS</h3>
                <p className="text-xs text-sidebar-muted-foreground mt-0.5">Controle total sobre ordens de serviço, do início ao fechamento.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-sidebar-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sidebar-foreground text-sm">SLA & Relatórios</h3>
                <p className="text-xs text-sidebar-muted-foreground mt-0.5">Monitore indicadores e garanta o cumprimento de prazos.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="mt-1 h-8 w-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-sidebar-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sidebar-foreground text-sm">Multi-tenant & Seguro</h3>
                <p className="text-xs text-sidebar-muted-foreground mt-0.5">Isolamento por organização com controle de acesso granular.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-sidebar-border">
            <p className="text-xs text-sidebar-muted-foreground">
              © {new Date().getFullYear()} ServiceOS · Plataforma corporativa de gestão de serviços
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">ServiceOS</h1>
              <p className="text-xs text-muted-foreground">Enterprise Service Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais para acessar o sistema.</p>
          </div>

          <Card className="border-0 shadow-none sm:border sm:shadow-sm">
            <CardContent className="p-0 sm:p-6">
              {isLockedOut && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                >
                  <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Conta bloqueada temporariamente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Muitas tentativas de login. Tente novamente em <strong className="text-destructive">{lockoutSeconds}s</strong>.
                    </p>
                  </div>
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      disabled={isLockedOut}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={isLockedOut}
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading || isLockedOut}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLockedOut ? `Aguarde ${lockoutSeconds}s` : 'Entrar'}
                </Button>
              </form>

              <div className="flex items-center gap-2 mt-6 pt-5 border-t">
                <Lock className="h-3 w-3 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Acesso restrito. Solicite suas credenciais ao administrador.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
