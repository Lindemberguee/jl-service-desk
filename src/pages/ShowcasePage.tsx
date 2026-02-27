import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ClipboardList, BarChart3, Bell, Package,
  Shield, Users, Zap, Clock, Star, CheckCircle2, ArrowRight, Play, Pause,
  Maximize2, Minimize2, Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.jpg';
import screenshotWorkorders from '@/assets/showcase/screenshot-workorders.jpg';
import screenshotStock from '@/assets/showcase/screenshot-stock.jpg';

/* ------------------------------------------------------------------ */
/*  Slide data                                                         */
/* ------------------------------------------------------------------ */

interface Slide {
  id: string;
  content: React.ReactNode;
  bg?: string;
}

function HeroSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-violet-500/8 blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <Badge className="mb-6 text-sm px-4 py-1.5 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15">
          🚀 Plataforma CMMS Completa
        </Badge>
      </motion.div>

      <motion.h1
        className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent max-w-5xl leading-[1.1]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
         OrdFy
      </motion.h1>

      <motion.p
        className="mt-6 text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        Gestão inteligente de manutenção, ordens de serviço, estoque e equipes — tudo em tempo real, numa única plataforma.
      </motion.p>

      <motion.div
        className="mt-10 flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45 }}
      >
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 text-lg h-14 rounded-xl">
          Começar agora <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 text-lg h-14 rounded-xl">
          Ver demonstração
        </Button>
      </motion.div>

      <motion.div
        className="mt-16 flex items-center gap-8 text-sm text-slate-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Setup em minutos</span>
        <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Multi-departamento</span>
        <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Tempo real</span>
      </motion.div>
    </div>
  );
}

const features = [
  { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Criação, atribuição e acompanhamento completo de OS com SLA, prioridades e fluxo de status inteligente.', color: 'text-blue-400' },
  { icon: Package, title: 'Controle de Estoque', desc: 'Gestão de itens, movimentações, alertas de nível mínimo e integração automática com OS.', color: 'text-amber-400' },
  { icon: Bell, title: 'Notificações em Tempo Real', desc: 'Alertas instantâneos por mudança de status, atribuição e estoque crítico — com som e toast.', color: 'text-violet-400' },
  { icon: Users, title: 'Multi-tenant & Perfis', desc: 'Departamentos isolados, 7 perfis de acesso (admin, técnico, solicitante...) e permissões granulares.', color: 'text-emerald-400' },
  { icon: BarChart3, title: 'Dashboard & Relatórios', desc: 'Métricas em tempo real, gráficos interativos e indicadores de performance (SLA, custos, produtividade).', color: 'text-cyan-400' },
  { icon: Shield, title: 'Segurança & Auditoria', desc: 'RLS por departamento, logs de auditoria completos, controle de sessão e rastreabilidade total.', color: 'text-rose-400' },
];

function FeaturesSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12">
      <motion.h2
        className="text-4xl md:text-5xl font-bold text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Tudo que você precisa
      </motion.h2>
      <motion.p
        className="text-lg text-slate-400 mb-12 max-w-xl text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Uma plataforma completa para gestão de manutenção e facilities
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800/80 hover:border-slate-600/50 transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
          >
            <f.icon className={cn('h-8 w-8 mb-4', f.color)} />
            <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const screenshots = [
  { src: screenshotDashboard, label: 'Dashboard Operacional', desc: 'Visão geral com KPIs, gráficos e status das ordens de serviço.' },
  { src: screenshotWorkorders, label: 'Lista de Ordens de Serviço', desc: 'Filtros avançados, busca, status e atribuição em um só lugar.' },
  { src: screenshotStock, label: 'Gestão de Estoque', desc: 'Controle de itens, níveis de estoque e alertas de reposição.' },
];

function ScreenshotsSlide() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center h-full px-12">
      <motion.h2
        className="text-4xl md:text-5xl font-bold text-white mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Veja na prática
      </motion.h2>
      <motion.p className="text-lg text-slate-400 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Interface moderna, intuitiva e responsiva
      </motion.p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {screenshots.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setActive(i)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              active === i ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Screenshot */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="relative max-w-5xl w-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-black/40"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35 }}
        >
          <img src={screenshots[active].src} alt={screenshots[active].label} className="w-full h-auto" />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
            <h3 className="text-xl font-semibold text-white">{screenshots[active].label}</h3>
            <p className="text-sm text-slate-300 mt-1">{screenshots[active].desc}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const plans = [
  {
    name: 'Free',
    price: 'Grátis',
    period: '',
    desc: 'Para equipes pequenas começarem',
    features: ['Até 3 usuários', '50 OS/mês', 'Dashboard básico', 'Notificações por email', '1 departamento'],
    cta: 'Começar grátis',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'R$ 149',
    period: '/mês',
    desc: 'Para operações em crescimento',
    features: ['Até 25 usuários', 'OS ilimitadas', 'Dashboard completo + relatórios', 'Notificações em tempo real', 'Multi-departamento', 'SLA & controle de custos', 'Gestão de estoque', 'Auditoria completa'],
    cta: 'Começar teste grátis',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    desc: 'Para grandes operações',
    features: ['Usuários ilimitados', 'Tudo do Pro', 'API & integrações', 'SSO / SAML', 'SLA de suporte dedicado', 'Onboarding personalizado', 'Ambiente dedicado'],
    cta: 'Falar com vendas',
    popular: false,
  },
];

function PricingSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12">
      <motion.h2 className="text-4xl md:text-5xl font-bold text-white mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Planos & Preços
      </motion.h2>
      <motion.p className="text-lg text-slate-400 mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Escolha o plano ideal para sua operação
      </motion.p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {plans.map((p, i) => (
          <motion.div
            key={p.name}
            className={cn(
              'relative rounded-2xl p-6 flex flex-col',
              p.popular
                ? 'bg-gradient-to-b from-blue-600/20 to-slate-800/80 border-2 border-blue-500/40 scale-105'
                : 'bg-slate-800/50 border border-slate-700/50'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            {p.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white border-0">
                Mais popular
              </Badge>
            )}
            <h3 className="text-xl font-bold text-white">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{p.price}</span>
              {p.period && <span className="text-slate-400 text-sm">{p.period}</span>}
            </div>
            <p className="text-sm text-slate-400 mt-2">{p.desc}</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {p.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className={cn(
                'mt-6 w-full rounded-xl h-11',
                p.popular ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
              )}
            >
              {p.cta}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const testimonials = [
   { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', avatar: '👨‍🔧', stars: 5, text: 'O OrdFy revolucionou nossa gestão de manutenção. Reduzimos o tempo de resposta em 60% e temos visibilidade total das operações.' },
   { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', avatar: '👩‍⚕️', stars: 5, text: 'A melhor plataforma que já usei. O sistema de notificações em tempo real e o controle de estoque são incríveis.' },
   { name: 'Roberto Farias', role: 'Diretor de Operações', company: 'Grupo TechPark', avatar: '👨‍💼', stars: 5, text: 'Multi-departamento e permissões granulares foram decisivos. Gerenciamos 5 unidades com uma única plataforma.' },
];

const stats = [
  { value: '98%', label: 'Satisfação' },
  { value: '2.5k+', label: 'OS/mês processadas' },
  { value: '60%', label: 'Redução no tempo de resposta' },
  { value: '150+', label: 'Empresas ativas' },
];

function TestimonialsSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12">
      <motion.h2 className="text-4xl md:text-5xl font-bold text-white mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Quem usa, aprova
      </motion.h2>

      {/* Stats */}
      <motion.div
        className="flex gap-10 mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold text-blue-400">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Testimonials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.avatar}</span>
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role} — {t.company}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CtaSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <Zap className="h-16 w-16 text-blue-400 mx-auto mb-6" />
      </motion.div>

      <motion.h2
        className="text-4xl md:text-6xl font-bold text-white max-w-3xl leading-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Pronto para transformar sua manutenção?
      </motion.h2>

      <motion.p
        className="mt-6 text-xl text-slate-400 max-w-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Comece grátis e veja resultados em poucos dias. Sem cartão de crédito.
      </motion.p>

      <motion.div
        className="mt-10 flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 text-lg h-14 rounded-xl">
          Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>

      <motion.p
        className="mt-8 text-sm text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        ✉️ contato@ordfy.com.br &nbsp;·&nbsp; 📞 (11) 9 1234-5678
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main showcase component                                            */
/* ------------------------------------------------------------------ */

const slides: Slide[] = [
  { id: 'hero', content: <HeroSlide /> },
  { id: 'features', content: <FeaturesSlide /> },
  { id: 'screenshots', content: <ScreenshotsSlide /> },
  { id: 'pricing', content: <PricingSlide /> },
  { id: 'testimonials', content: <TestimonialsSlide /> },
  { id: 'cta', content: <CtaSlide /> },
];

export default function ShowcasePage() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  const goTo = useCallback((idx: number) => {
    setCurrent(Math.max(0, Math.min(slides.length - 1, idx)));
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen?.();
      }
      if (e.key === 'f' || e.key === 'F5') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, isFullscreen]);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [autoplay]);

  // Fullscreen change listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col select-none">
      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            {slides[current].content}
          </motion.div>
        </AnimatePresence>

        {/* Side navigation arrows */}
        {current > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-white/60 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {current < slides.length - 1 && (
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/80 text-white/60 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div className="h-14 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/50">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === current ? 'w-8 bg-blue-500' : 'w-2 bg-slate-600 hover:bg-slate-500'
              )}
            />
          ))}
          <span className="ml-3 text-xs text-slate-500 font-mono">
            {current + 1} / {slides.length}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoplay(!autoplay)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title={autoplay ? 'Pausar autoplay' : 'Iniciar autoplay'}
          >
            {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Tela cheia (F)"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <a
            href="/login"
            className="ml-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all"
          >
            Acessar sistema
          </a>
        </div>
      </div>
    </div>
  );
}
