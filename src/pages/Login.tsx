import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Loader2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000; // 1 minute
const ATTEMPT_WINDOW_MS = 300_000; // 5 minutes

export default function Login() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      // Progressive lockout: 1min, 2min, 4min...
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ServiceOS</h1>
            <p className="text-sm text-muted-foreground">Sistema de Ordens de Serviço</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLockedOut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2"
              >
                <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Conta bloqueada temporariamente</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Muitas tentativas de login. Tente novamente em <strong>{lockoutSeconds}s</strong>.
                  </p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" disabled={isLockedOut} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLockedOut} />
              </div>
              <Button type="submit" className="w-full" disabled={loading || isLockedOut}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLockedOut ? `Aguarde ${lockoutSeconds}s` : 'Entrar'}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Acesso restrito. Solicite suas credenciais ao administrador.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
