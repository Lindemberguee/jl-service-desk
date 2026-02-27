import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ClipboardList, BarChart3, Bell, Package,
  Shield, Users, Zap, Clock, Star, CheckCircle2, ArrowRight, Play, Pause,
  Maximize2, Minimize2, Monitor, Workflow, StickyNote, CalendarDays,
  Wrench, Target, Lock, FileText, Settings, Gauge, Layers, UserCheck,
  Building2, TrendingUp, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.jpg';
import screenshotWorkorders from '@/assets/showcase/screenshot-workorders.jpg';
import screenshotStock from '@/assets/showcase/screenshot-stock.jpg';

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const springVal = useSpring(0, { duration: 2000 });
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) { started.current = true; springVal.set(value); }
  }, [value, springVal]);

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`;
    });
    return unsub;
  }, [springVal, suffix]);

  return <span ref={ref}>0</span>;
}

/* ------------------------------------------------------------------ */
/*  Particles background                                               */
/* ------------------------------------------------------------------ */
function Particles() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `hsl(${210 + Math.random() * 50}, 80%, ${50 + Math.random() * 30}%)`,
          }}
          animate={{
            y: [0, -30 - Math.random() * 50, 0],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 4, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glow orbs                                                          */
/* ------------------------------------------------------------------ */
function GlowOrb({ color, size, top, left, delay = 0 }: {
  color: string; size: number; top: string; left: string; delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[120px]"
      style={{ width: size, height: size, top, left, background: color }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Slide components                                                   */
/* ------------------------------------------------------------------ */

function HeroSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 relative overflow-hidden">
      <GlowOrb color="rgba(59,130,246,0.2)" size={800} top="-10%" left="25%" />
      <GlowOrb color="rgba(139,92,246,0.15)" size={600} top="60%" left="65%" delay={2} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <Badge className="mb-8 text-sm px-5 py-2 bg-blue-500/10 text-blue-300 border-blue-500/20 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 mr-2" /> Plataforma CMMS de Nova Geração
        </Badge>
      </motion.div>

      <motion.h1
        className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">Ord</span>
        <span className="bg-gradient-to-b from-blue-400 to-violet-500 bg-clip-text text-transparent">Fy</span>
      </motion.h1>

      <motion.p
        className="mt-8 text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
      >
        Gestão inteligente de manutenção, ordens de serviço, estoque e equipes — tudo em tempo real.
      </motion.p>

      <motion.div
        className="mt-12 flex gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45 }}
      >
        <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-2xl shadow-lg shadow-blue-500/20">
          Começar agora <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-8 text-lg h-14 rounded-2xl backdrop-blur-sm">
          Ver demonstração
        </Button>
      </motion.div>

      <motion.div
        className="mt-16 flex items-center gap-8 text-sm text-slate-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.6 }}
      >
        {['Setup em minutos', 'Multi-departamento', 'Tempo real', 'Segurança total'].map(t => (
          <span key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}</span>
        ))}
      </motion.div>
    </div>
  );
}

const featuresPage1 = [
  { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Criação, atribuição, SLA, prioridades e fluxo de status inteligente com timeline.', color: 'from-blue-600 to-blue-700' },
  { icon: Package, title: 'Gestão de Estoque', desc: 'Controle de itens, movimentações, alertas de nível mínimo e integração com OS.', color: 'from-amber-600 to-amber-700' },
  { icon: Bell, title: 'Notificações Real-time', desc: 'Alertas instantâneos por mudança de status, atribuição e estoque crítico.', color: 'from-violet-600 to-violet-700' },
  { icon: Users, title: 'Multi-tenant & RBAC', desc: '7 perfis de acesso com permissões granulares. Isolamento entre departamentos.', color: 'from-emerald-600 to-emerald-700' },
  { icon: BarChart3, title: 'Dashboard & KPIs', desc: 'Métricas em tempo real, gráficos interativos e relatórios exportáveis.', color: 'from-cyan-600 to-cyan-700' },
  { icon: Shield, title: 'Auditoria & Segurança', desc: 'RLS por departamento, logs de auditoria completos e rastreabilidade total.', color: 'from-rose-600 to-rose-700' },
];

const featuresPage2 = [
  { icon: Target, title: 'OKRs & Plano de Ação', desc: 'Objetivos estratégicos com Key Results, check-ins e vínculo automático a KPIs.', color: 'from-orange-600 to-orange-700' },
  { icon: Workflow, title: 'Canvas Colaborativo', desc: 'Mapas mentais, fluxogramas e diagramas com nós e compartilhamento real-time.', color: 'from-sky-600 to-sky-700' },
  { icon: StickyNote, title: 'Notas Enterprise', desc: 'Editor rico, Markdown, pastas, tags, pins e compartilhamento entre usuários.', color: 'from-yellow-600 to-yellow-700' },
  { icon: Wrench, title: 'Manutenção Preventiva', desc: 'Agendamento automático, planos de manutenção e histórico por ativo.', color: 'from-indigo-600 to-indigo-700' },
  { icon: Building2, title: 'Gestão de Ativos', desc: 'Cadastro completo de equipamentos, componentes, patrimônio e QR codes.', color: 'from-teal-600 to-teal-700' },
  { icon: UserCheck, title: 'Portal do Solicitante', desc: 'Interface simplificada para abertura de chamados e acompanhamento.', color: 'from-pink-600 to-pink-700' },
];

const featuresPage3 = [
  { icon: Gauge, title: 'Painel do Técnico', desc: 'Visão dedicada com OS do técnico, checklists, anexos e status.', color: 'from-lime-600 to-lime-700' },
  { icon: Lock, title: 'Controle de Acesso', desc: 'Matriz de permissões editável: super admin, coordenador, analista, técnico...', color: 'from-red-600 to-red-700' },
  { icon: FileText, title: 'Relatórios & Exportação', desc: 'Excel, relatórios por período, filtros avançados e impressão de guias.', color: 'from-fuchsia-600 to-fuchsia-700' },
  { icon: CalendarDays, title: 'Lembretes & Alertas', desc: 'Recorrência, categorias, prioridades e notificações automáticas.', color: 'from-purple-600 to-purple-700' },
  { icon: Settings, title: 'Admin Completo', desc: 'Saúde do sistema, departamentos, branding e configurações avançadas.', color: 'from-gray-600 to-gray-700' },
  { icon: TrendingUp, title: 'Custos & Materiais', desc: 'Custos por OS com mão de obra, peças e relatório financeiro integrado.', color: 'from-emerald-700 to-green-700' },
];

function FeaturesSlide({ features, title, subtitle }: { features: typeof featuresPage1; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 relative">
      <GlowOrb color="rgba(59,130,246,0.08)" size={500} top="10%" left="5%" />
      <GlowOrb color="rgba(139,92,246,0.06)" size={400} top="70%" left="85%" delay={2} />

      <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 text-xs px-4 py-1.5 bg-violet-500/10 text-violet-300 border-violet-500/20">
          <Layers className="h-3 w-3 mr-1.5" /> {subtitle}
        </Badge>
        <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{title}</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl w-full">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.15)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br', f.color)}>
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const screenshots = [
  { src: screenshotDashboard, label: 'Dashboard Operacional', desc: 'Visão geral com KPIs, gráficos e status em tempo real.' },
  { src: screenshotWorkorders, label: 'Ordens de Serviço', desc: 'Filtros avançados, busca, status e atribuição.' },
  { src: screenshotStock, label: 'Gestão de Estoque', desc: 'Controle de níveis, movimentações e alertas.' },
];

function ScreenshotsSlide() {
  const [active, setActive] = useState(0);
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 relative">
      <GlowOrb color="rgba(6,182,212,0.1)" size={600} top="30%" left="50%" />
      <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Badge className="mb-3 text-xs px-4 py-1.5 bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
          <Monitor className="h-3 w-3 mr-1.5" /> Interface
        </Badge>
        <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Veja na prática</h2>
      </motion.div>

      <div className="flex gap-2 mb-6">
        {screenshots.map((s, i) => (
          <button key={s.label} onClick={() => setActive(i)} className={cn(
            'px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300',
            active === i ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60 border border-slate-800/50'
          )}>
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          className="relative max-w-5xl w-full rounded-2xl overflow-hidden border border-slate-700/40 shadow-2xl shadow-blue-500/5"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35 }}
        >
          <div className="bg-slate-900/90 border-b border-slate-800/50 px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="flex-1 mx-8">
              <div className="bg-slate-800/60 rounded-lg h-6 flex items-center px-3 text-xs text-slate-500 max-w-sm mx-auto">app.ordfy.com.br</div>
            </div>
          </div>
          <img src={screenshots[active].src} alt={screenshots[active].label} className="w-full h-auto" />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#050a18] via-[#050a18]/60 to-transparent p-6">
            <h3 className="text-xl font-bold text-white">{screenshots[active].label}</h3>
            <p className="text-sm text-slate-400 mt-1">{screenshots[active].desc}</p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatsSlide() {
  const stats = [
    { value: 98, suffix: '%', label: 'Satisfação' },
    { value: 2500, suffix: '+', label: 'OS/mês processadas' },
    { value: 60, suffix: '%', label: 'Redução no tempo' },
    { value: 150, suffix: '+', label: 'Empresas ativas' },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 relative">
      <GlowOrb color="rgba(59,130,246,0.15)" size={700} top="30%" left="40%" />
      <motion.h2
        className="text-4xl md:text-6xl font-black mb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Números que</span>
        <br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">falam por si</span>
      </motion.h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl w-full">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="text-center p-8 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            <div className="text-5xl md:text-6xl font-black bg-gradient-to-b from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              <Counter value={s.value} suffix={s.suffix} />
            </div>
            <div className="text-sm text-slate-500 mt-3">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const plans = [
  { name: 'Free', price: 'Grátis', period: '', desc: 'Equipes pequenas', features: ['Até 3 usuários', '50 OS/mês', 'Dashboard básico', 'Notificações email', '1 departamento'], popular: false },
  { name: 'Pro', price: 'R$ 149', period: '/mês', desc: 'Operações em crescimento', features: ['Até 25 usuários', 'OS ilimitadas', 'Dashboard completo', 'Tempo real', 'Multi-departamento', 'SLA & custos', 'Estoque', 'Auditoria'], popular: true },
  { name: 'Enterprise', price: 'Sob consulta', period: '', desc: 'Grandes operações', features: ['Usuários ilimitados', 'Tudo do Pro', 'API & integrações', 'SSO / SAML', 'Suporte dedicado', 'Onboarding', 'Ambiente dedicado'], popular: false },
];

function PricingSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 relative">
      <GlowOrb color="rgba(59,130,246,0.1)" size={600} top="40%" left="50%" delay={1} />
      <motion.h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Planos & Preços
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {plans.map((p, i) => (
          <motion.div
            key={p.name}
            className={cn(
              'relative rounded-2xl p-6 flex flex-col backdrop-blur-sm',
              p.popular ? 'bg-gradient-to-b from-blue-600/15 to-slate-900/80 border-2 border-blue-500/30 scale-105 shadow-xl shadow-blue-500/10' : 'bg-slate-900/50 border border-slate-800/50'
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
          >
            {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 shadow-lg">Mais popular</Badge>}
            <h3 className="text-xl font-bold text-white">{p.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">{p.price}</span>
              {p.period && <span className="text-slate-500 text-sm">{p.period}</span>}
            </div>
            <p className="text-sm text-slate-500 mt-2">{p.desc}</p>
            <ul className="mt-5 space-y-2.5 flex-1">
              {p.features.map(f => <li key={f} className="flex items-start gap-2 text-sm text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{f}</li>)}
            </ul>
            <Button className={cn('mt-6 w-full rounded-xl h-11', p.popular ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white')}>
              {p.name === 'Enterprise' ? 'Falar com vendas' : 'Começar agora'}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const testimonials = [
  { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', avatar: '👨‍🔧', text: 'O OrdFy revolucionou nossa gestão. Reduzimos o tempo de resposta em 60%.' },
  { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', avatar: '👩‍⚕️', text: 'A melhor plataforma que já usei. Notificações real-time e estoque incríveis.' },
  { name: 'Roberto Farias', role: 'Diretor de Operações', company: 'Grupo TechPark', avatar: '👨‍💼', text: 'Multi-departamento e permissões granulares foram decisivos para 5 unidades.' },
];

function TestimonialsSlide() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-12 relative">
      <GlowOrb color="rgba(139,92,246,0.1)" size={500} top="20%" left="70%" delay={1} />
      <motion.h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        Quem usa, aprova
      </motion.h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mb-5">"{t.text}"</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{t.avatar}</span>
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-slate-500">{t.role} · {t.company}</div>
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
      <GlowOrb color="rgba(59,130,246,0.2)" size={800} top="25%" left="35%" />
      <GlowOrb color="rgba(139,92,246,0.15)" size={600} top="55%" left="60%" delay={2} />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <Zap className="h-16 w-16 text-blue-400 mx-auto mb-8" />
      </motion.div>
      <motion.h2
        className="text-4xl md:text-7xl font-black max-w-4xl leading-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Pronto para transformar</span>
        <br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">sua manutenção?</span>
      </motion.h2>
      <motion.p className="mt-6 text-xl text-slate-500 max-w-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Comece grátis e veja resultados em poucos dias. Sem cartão de crédito.
      </motion.p>
      <motion.div className="mt-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
        <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-12 text-lg h-16 rounded-2xl shadow-xl shadow-blue-500/20">
          Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
      <motion.p className="mt-10 text-sm text-slate-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        ✉️ contato@ordfy.com.br &nbsp;·&nbsp; 📞 (11) 9 1234-5678
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide deck                                                         */
/* ------------------------------------------------------------------ */
interface Slide { id: string; content: React.ReactNode }

const slides: Slide[] = [
  { id: 'hero', content: <HeroSlide /> },
  { id: 'features-1', content: <FeaturesSlide features={featuresPage1} title="Módulos Operacionais" subtitle="Core · 6 módulos" /> },
  { id: 'features-2', content: <FeaturesSlide features={featuresPage2} title="Ferramentas Estratégicas" subtitle="Produtividade · 6 módulos" /> },
  { id: 'features-3', content: <FeaturesSlide features={featuresPage3} title="Administração & Controle" subtitle="Gestão · 6 módulos" /> },
  { id: 'screenshots', content: <ScreenshotsSlide /> },
  { id: 'stats', content: <StatsSlide /> },
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

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'f') toggleFullscreen();
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, isFullscreen]);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setCurrent(c => (c < slides.length - 1 ? c + 1 : 0));
    }, 8000);
    return () => clearInterval(id);
  }, [autoplay]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050a18] text-white relative select-none">
      <Particles />

      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-slate-900 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"
          animate={{ width: `${((current + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {slides[current].content}
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-3 z-50">
        <Button size="icon" variant="ghost" onClick={prev} disabled={current === 0} className="h-10 w-10 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/60 disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Dots */}
        <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                current === i ? 'w-6 h-2 bg-gradient-to-r from-blue-500 to-violet-500' : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
              )}
            />
          ))}
        </div>

        <Button size="icon" variant="ghost" onClick={next} disabled={current === slides.length - 1} className="h-10 w-10 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/60 disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Top-right controls */}
      <div className="absolute top-5 right-5 flex gap-2 z-50">
        <Button size="icon" variant="ghost" onClick={() => setAutoplay(!autoplay)} className="h-9 w-9 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/60">
          {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="h-9 w-9 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/60">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Slide number */}
      <div className="absolute top-5 left-5 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 backdrop-blur-sm border border-slate-800/50">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OrdFy</span>
        </div>
        <span className="text-xs text-slate-600 font-mono">{current + 1}/{slides.length}</span>
      </div>
    </div>
  );
}
