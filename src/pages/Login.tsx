import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Loader2, ShieldAlert, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;
const ATTEMPT_WINDOW_MS = 300_000;

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient orbs with 3D-like depth */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }}
        animate={{ x: [0, 60, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ top: '10%', left: '-5%' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', filter: 'blur(50px)' }}
        animate={{ x: [0, -50, 40, 0], y: [0, 50, -20, 0], scale: [1, 0.85, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ bottom: '5%', right: '0%' }}
      />
      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
        animate={{ x: [0, 30, -50, 0], y: [0, -60, 20, 0], scale: [1, 1.2, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        initial={{ top: '50%', left: '30%' }}
      />
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ background: 'rgba(96,165,250,0.3)', left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
        />
      ))}
    </div>
  );
}

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
    <div
      className="min-h-screen flex relative"
      style={{ background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1529 40%, #101d35 100%)' }}
    >
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }} />

      <FloatingOrbs />

      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative z-10 max-w-md"
        >
          <motion.div
            className="flex items-center gap-4 mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 8px 32px rgba(59,130,246,0.35), 0 0 60px rgba(59,130,246,0.1)',
              }}
              whileHover={{ scale: 1.05, rotateY: 15, rotateX: -5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Wrench className="h-7 w-7 text-white" />
            </motion.div>
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-white">OrdFy</h1>
               <p className="text-sm text-slate-400 font-medium">Gestão Inteligente de Serviços</p>
            </div>
          </motion.div>

          <div className="space-y-6">
            {[
              { title: 'Gestão Completa de OS', desc: 'Controle total sobre ordens de serviço, do início ao fechamento.' },
              { title: 'SLA & Relatórios', desc: 'Monitore indicadores e garanta o cumprimento de prazos.' },
              { title: 'Multi-tenant & Seguro', desc: 'Isolamento por organização com controle de acesso granular.' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="flex items-start gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
              >
                <div className="mt-1 h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-white/90 text-sm">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-12 pt-8 space-y-1.5"
            style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} OrdFy · Plataforma moderna de gestão de serviços
            </p>
            <p className="text-[10px] text-slate-600">
              Desenvolvido por{' '}
              <a href="https://github.com/Lindemberguee" target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">
                José Lindembergue
              </a>
              {' · '}
              <a href="https://instagram.com/j.lindembergue" target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">
                @j.lindembergue
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
               <h1 className="text-xl font-bold tracking-tight text-white">OrdFy</h1>
               <p className="text-xs text-slate-400">Gestão Inteligente de Serviços</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">Bem-vindo de volta</h2>
            <p className="text-sm text-slate-400 mt-1">Entre com suas credenciais para acessar o sistema.</p>
          </div>

          <motion.div
            className="rounded-xl p-6 sm:p-8"
            style={{
              background: 'rgba(15,23,42,0.6)',
              border: '1px solid rgba(148,163,184,0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {isLockedOut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 p-3.5 rounded-lg flex items-start gap-3"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" style={{ color: '#ef4444' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: '#ef4444' }}>Conta bloqueada temporariamente</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Muitas tentativas de login. Tente novamente em <strong style={{ color: '#ef4444' }}>{lockoutSeconds}s</strong>.
                  </p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    disabled={isLockedOut}
                    className="w-full h-11 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.12)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={isLockedOut}
                    className="w-full h-11 pl-10 pr-10 rounded-lg text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-200 disabled:opacity-50"
                    style={{
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(148,163,184,0.12)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.12)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading || isLockedOut}
                className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 15px rgba(59,130,246,0.3), 0 1px 3px rgba(0,0,0,0.2)',
                }}
                whileHover={!loading && !isLockedOut ? { scale: 1.01, boxShadow: '0 6px 25px rgba(59,130,246,0.4)' } : {}}
                whileTap={!loading && !isLockedOut ? { scale: 0.98 } : {}}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLockedOut ? `Aguarde ${lockoutSeconds}s` : 'Entrar'}
              </motion.button>
            </form>

            <div className="flex items-center gap-2 mt-6 pt-5" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
              <Lock className="h-3 w-3 text-slate-600" />
              <p className="text-xs text-slate-500">
                Acesso restrito. Solicite suas credenciais ao administrador.
              </p>
            </div>
          </motion.div>

          {/* Mobile credits */}
          <div className="mt-6 text-center lg:hidden">
            <p className="text-[10px] text-slate-600">
              Desenvolvido por{' '}
              <a href="https://github.com/Lindemberguee" target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-400 transition-colors">
                José Lindembergue
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
