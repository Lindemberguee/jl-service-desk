import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ClipboardList, BarChart3, Bell, Package, Shield, Users, Zap, Clock,
  Star, CheckCircle2, ArrowRight, ChevronDown, Wrench, Gauge, Eye,
  Globe, Lock, TrendingUp, Play, ChevronRight,
  Building2, FileText, Settings, Layers, UserCheck,
  StickyNote, AlarmClock, Workflow, Target, Sparkles,
  Monitor, Boxes, History, MonitorSmartphone, Palette,
  Network, Key, AlertTriangle, BookOpen, ListChecks, Plug, Contact, Activity,
  Code2, ShoppingCart, Briefcase, ArrowUpRight, ChevronLeft as ChevronLeftIcon, MessageCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.png';
import screenshotOS from '@/assets/showcase/screenshot-os.png';
import screenshotEstoque from '@/assets/showcase/screenshot-estoque.png';
import screenshotOkrs from '@/assets/showcase/screenshot-okrs.png';
import screenshotManutencao from '@/assets/showcase/screenshot-manutencao.png';
import screenshotDescarte from '@/assets/showcase/screenshot-descarte.png';
import screenshotMateriais from '@/assets/showcase/screenshot-materiais.png';

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 125;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count}{suffix}</span>;
}

function GlowOrb({ color, size, top, left, delay = 0 }: {
  color: string; size: number; top: string; left: string; delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[140px]"
      style={{ width: size, height: size, top, left, background: color }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.12, 0.25, 0.12] }}
      transition={{ duration: 7, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: 5 + Math.random() * 8,
      delay: Math.random() * 5,
      size: Math.random() > 0.7 ? 3 : 1.5,
    }))
  , []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/20"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -50, 0], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}

function SectionSnap({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref} id={id}
      className={cn('relative flex items-center py-16 md:py-20 overflow-hidden', className)}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const modules: { icon: LucideIcon; title: string; gradient: string; desc: string }[] = [
  { icon: ClipboardList, title: 'Ordens de Serviço', gradient: 'from-blue-500 to-cyan-500', desc: 'Ciclo completo com SLA, cronômetro e workflow' },
  { icon: BarChart3, title: 'Dashboard', gradient: 'from-cyan-500 to-teal-500', desc: 'KPIs em tempo real com gráficos interativos' },
  { icon: Package, title: 'Estoque', gradient: 'from-amber-500 to-orange-500', desc: 'Controle de níveis, movimentações e alertas' },
  { icon: Boxes, title: 'Ativos', gradient: 'from-lime-500 to-green-500', desc: 'Patrimônio, componentes e histórico' },
  { icon: Target, title: 'KPIs & OKRs', gradient: 'from-indigo-500 to-violet-500', desc: 'Objetivos estratégicos com check-ins' },
  { icon: Wrench, title: 'Manutenção', gradient: 'from-teal-500 to-green-500', desc: 'Preventiva, corretiva e preditiva' },
  { icon: Bell, title: 'Notificações', gradient: 'from-violet-500 to-purple-500', desc: 'Real-time com som e multi-device' },
  { icon: Workflow, title: 'Canvas', gradient: 'from-purple-500 to-fuchsia-500', desc: 'Diagramas colaborativos em tempo real' },
  { icon: StickyNote, title: 'Anotações', gradient: 'from-yellow-500 to-amber-500', desc: 'Editor rico + Markdown com sync' },
  { icon: Shield, title: 'RBAC', gradient: 'from-rose-500 to-pink-500', desc: '7 perfis com permissões granulares' },
  { icon: Building2, title: 'Multi-tenant', gradient: 'from-indigo-500 to-blue-500', desc: 'Isolamento total por departamento' },
  { icon: History, title: 'Auditoria', gradient: 'from-emerald-500 to-teal-500', desc: 'Rastreamento completo de ações' },
  { icon: MonitorSmartphone, title: 'Painel Técnico', gradient: 'from-teal-500 to-cyan-500', desc: 'Interface mobile-first com cronômetro' },
  { icon: UserCheck, title: 'Portal Solicitante', gradient: 'from-sky-500 to-blue-500', desc: 'Abertura e acompanhamento simplificado' },
  { icon: BarChart3, title: 'Relatórios', gradient: 'from-pink-500 to-rose-500', desc: 'Exportação, tendências e backlog' },
  { icon: AlarmClock, title: 'Lembretes', gradient: 'from-green-500 to-emerald-500', desc: 'Recorrência e prioridades' },
  { icon: Settings, title: 'Admin', gradient: 'from-gray-500 to-slate-500', desc: 'Departamentos, branding e sistema' },
  { icon: FileText, title: 'Documentos', gradient: 'from-blue-500 to-indigo-500', desc: 'Versionamento e vinculação a OS' },
  { icon: AlertTriangle, title: 'Descartes', gradient: 'from-red-500 to-orange-500', desc: 'Workflow de aprovação e registro' },
  { icon: Lock, title: 'Cofre Digital', gradient: 'from-slate-500 to-zinc-500', desc: 'Credenciais criptografadas' },
  { icon: BookOpen, title: 'Base de Conhecimento', gradient: 'from-emerald-500 to-green-500', desc: 'Wiki interna com artigos técnicos' },
  { icon: ListChecks, title: 'Checklists', gradient: 'from-cyan-500 to-sky-500', desc: 'Templates reutilizáveis por categoria' },
  { icon: Palette, title: 'Temas', gradient: 'from-fuchsia-500 to-pink-500', desc: 'Personalização visual por usuário' },
  { icon: Network, title: 'API', gradient: 'from-violet-500 to-indigo-500', desc: 'REST documentada com chaves e logs' },
  { icon: Plug, title: 'Integrações', gradient: 'from-sky-500 to-blue-500', desc: 'Teams, E-mail e SMTP configurável' },
  { icon: Activity, title: 'Métricas', gradient: 'from-orange-500 to-red-500', desc: 'Logs de envios e analytics' },
  { icon: Contact, title: 'Colaboradores', gradient: 'from-pink-500 to-rose-500', desc: 'Cadastro e vínculo a ativos' },
  { icon: ClipboardList, title: 'Materiais', gradient: 'from-teal-500 to-emerald-500', desc: 'Controle mensal de entradas e saídas' },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard', desc: 'KPIs, gráficos e status em tempo real' },
  { src: screenshotOS, title: 'Ordens de Serviço', desc: 'Filtros avançados, busca e workflow' },
  { src: screenshotEstoque, title: 'Estoque', desc: 'Inventário, alertas e movimentações' },
  { src: screenshotOkrs, title: 'KPIs & OKRs', desc: 'Objetivos estratégicos e check-ins' },
  { src: screenshotManutencao, title: 'Manutenção', desc: 'Preventiva, corretiva e componentes' },
  { src: screenshotDescarte, title: 'Descarte', desc: 'Gestão de itens depreciados' },
  { src: screenshotMateriais, title: 'Materiais', desc: 'Entradas, saídas e saldo mensal' },
];

const plans = [
  {
    name: 'Starter', price: 'R$ 299', period: '/mês', users: '5 usuários', popular: false,
    features: ['Ordens de Serviço', 'Dashboard', 'Ativos & Estoque', 'Portal Solicitante', 'Notificações real-time', 'Suporte por e-mail'],
  },
  {
    name: 'Professional', price: 'R$ 799', period: '/mês', users: '20 usuários', popular: true,
    features: ['Tudo do Starter +', 'KPIs & OKRs', 'Manutenção preventiva', 'Relatórios avançados', 'Documentos & Biblioteca', 'Base de Conhecimento', 'Checklists', 'API & Integrações', 'Painel do Técnico', 'Suporte prioritário'],
  },
  {
    name: 'Enterprise', price: 'R$ 1.999', period: '/mês', users: 'Ilimitado', popular: false,
    features: ['Tudo do Professional +', 'Canvas Colaborativo', 'Anotações Enterprise', 'Cofre Digital', 'Auditoria Global', 'Lembretes', 'Descartes', 'Multi-departamento ilimitado', 'Branding personalizado', 'Suporte dedicado'],
  },
];

const roles = [
  { role: 'Super Admin', icon: Key, color: 'from-red-500 to-rose-500', desc: 'Acesso total e gestão global' },
  { role: 'Administrador', icon: Settings, color: 'from-orange-500 to-amber-500', desc: 'Gestão completa do departamento' },
  { role: 'Coordenador', icon: Workflow, color: 'from-yellow-500 to-amber-400', desc: 'Workflow de OS e equipes' },
  { role: 'Técnico', icon: Wrench, color: 'from-green-500 to-emerald-500', desc: 'Execução via painel mobile' },
  { role: 'Analista', icon: BarChart3, color: 'from-cyan-500 to-blue-500', desc: 'Estoque, relatórios e KPIs' },
  { role: 'Solicitante', icon: UserCheck, color: 'from-blue-500 to-indigo-500', desc: 'Portal simplificado de chamados' },
  { role: 'Leitura', icon: Eye, color: 'from-slate-500 to-gray-500', desc: 'Visualização sem edição' },
];

const whatsappLink = (msg: string) =>
  `https://wa.me/5512996543522?text=${encodeURIComponent(msg)}`;

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function ShowcasePage() {
  const { scrollYProgress } = useScroll();
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);

  // Register GSAP ScrollTrigger
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Animate all section headings with a reveal effect
      gsap.utils.toArray<HTMLElement>('.gsap-heading').forEach((el) => {
        gsap.fromTo(el,
          { opacity: 0, y: 40, filter: 'blur(8px)' },
          {
            opacity: 1, y: 0, filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          }
        );
      });

      // Parallax glow orbs
      gsap.utils.toArray<HTMLElement>('.gsap-parallax').forEach((el) => {
        gsap.to(el, {
          y: -80,
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.5 },
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setSlideDirection(1);
      setActiveScreenshot(p => (p + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen bg-[#050a18] text-white overflow-x-hidden selection:bg-blue-500/30">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 z-50 origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Fixed header */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.04] bg-[#050a18]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/ordfy-logo.png" alt="OrdFy" className="h-6 w-6 rounded-lg" />
            <span className="font-bold text-base tracking-tight">
              Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-slate-500">
            {['#modules', '#sistema', '#roles', '#pricing', '#licenciamento'].map(h => (
              <a key={h} href={h} className="hover:text-white transition-colors capitalize">
                {h.replace('#', '')}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login">
              <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-200 rounded-full px-5 h-8 text-xs font-medium">
                Acessar <ArrowUpRight className="ml-1 h-3 w-3" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <SectionSnap className="min-h-[90vh] pt-14">
        <GlowOrb color="rgba(59,130,246,0.15)" size={900} top="-15%" left="20%" />
        <GlowOrb color="rgba(139,92,246,0.1)" size={700} top="55%" left="65%" delay={2} />
        <FloatingParticles />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Badge className="mb-5 text-xs px-5 py-2.5 bg-white/[0.04] text-slate-400 border-white/[0.08] rounded-full backdrop-blur-sm font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-2 text-blue-400" />
              Plataforma CMMS de Nova Geração
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[-0.04em] leading-[0.95]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">
              Gestão inteligente
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              em tempo real
            </span>
          </motion.h1>

          <motion.p
            className="mt-5 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            30+ módulos integrados para ordens de serviço, manutenção, estoque, ativos,
            KPIs, integrações Teams/E-mail, auditoria e muito mais.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <a href={whatsappLink('Olá! Tenho interesse no OrdFy e gostaria de uma demonstração.')} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 text-sm h-12 rounded-full shadow-xl shadow-white/10 font-medium">
                Solicitar demonstração <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="#modules">
              <Button size="lg" variant="outline" className="border-white/10 text-slate-400 hover:bg-white/[0.04] px-8 text-sm h-12 rounded-full">
                <Play className="mr-2 h-4 w-4" /> Explorar módulos
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { value: 30, suffix: '+', label: 'Módulos' },
              { value: 7, suffix: '', label: 'Perfis de Acesso' },
              { value: 100, suffix: '%', label: 'Tempo Real' },
              { value: 99, suffix: '.9%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[11px] text-slate-600 mt-1.5 uppercase tracking-[0.15em]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <ChevronDown className="h-5 w-5 text-slate-700" />
        </motion.div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  MODULES GRID                                                 */}
      {/* ============================================================ */}
      <SectionSnap id="modules">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-blue-500/[0.08] text-blue-400 border-blue-500/20 rounded-full text-xs px-4 py-1.5">
              <Layers className="h-3 w-3 mr-1.5" /> 30+ Módulos
            </Badge>
            <h2 className="gsap-heading text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Tudo que sua operação{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">precisa</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {modules.map((m, i) => {
              // Extract neon color from gradient class
              const neonColor = m.gradient.includes('blue') ? 'rgba(59,130,246,0.15)'
                : m.gradient.includes('violet') ? 'rgba(139,92,246,0.15)'
                : m.gradient.includes('emerald') ? 'rgba(16,185,129,0.15)'
                : m.gradient.includes('amber') ? 'rgba(245,158,11,0.15)'
                : m.gradient.includes('rose') ? 'rgba(244,63,94,0.15)'
                : m.gradient.includes('cyan') ? 'rgba(6,182,212,0.15)'
                : m.gradient.includes('purple') ? 'rgba(168,85,247,0.15)'
                : m.gradient.includes('teal') ? 'rgba(20,184,166,0.15)'
                : 'rgba(59,130,246,0.1)';
              return (
              <motion.div
                key={m.title}
                className="group relative bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all duration-500"
                style={{ '--neon': neonColor } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.03, duration: 0.4 }}
                whileHover={{ scale: 1.03 }}
              >
                {/* Neon glow on hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ boxShadow: `0 0 20px 2px var(--neon), inset 0 0 20px 1px var(--neon)` }}
                />
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center mb-3 bg-gradient-to-br', m.gradient)}>
                  <m.icon className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-xs font-semibold text-white mb-1">{m.title}</h3>
                <p className="text-[10px] text-slate-600 leading-relaxed group-hover:text-slate-400 transition-colors">{m.desc}</p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  SCREENSHOTS                                                  */}
      {/* ============================================================ */}
      <SectionSnap id="sistema">
        <GlowOrb color="rgba(6,182,212,0.08)" size={700} top="30%" left="50%" />
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-cyan-500/[0.08] text-cyan-400 border-cyan-500/20 rounded-full text-xs px-4 py-1.5">
              <Monitor className="h-3 w-3 mr-1.5" /> Interface
            </Badge>
            <h2 className="gsap-heading text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Veja na{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">prática</span>
            </h2>
          </div>

          {/* Tab selector */}
          <div className="flex justify-center gap-2 mb-8">
            {screenshots.map((s, i) => (
              <button key={s.title} onClick={() => setActiveScreenshot(i)} className={cn(
                'px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-300',
                activeScreenshot === i
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                  : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] border border-white/[0.06]'
              )}>
                {s.title}
              </button>
            ))}
          </div>

          {/* Carousel with slide animation */}
          <div className="relative max-w-5xl mx-auto">
            {/* Browser chrome */}
            <div className="rounded-t-xl bg-slate-900/80 border border-white/[0.06] border-b-0 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-white/[0.04] rounded-lg px-4 py-1.5 text-[11px] text-slate-600 max-w-xs mx-auto text-center font-mono">
                  app.ordfy.com.br
                </div>
              </div>
            </div>

            {/* Image viewport - fixed aspect ratio to prevent layout shift */}
            <div className="relative overflow-hidden rounded-b-xl border border-white/[0.06] border-t-0 shadow-2xl shadow-black/40 aspect-[16/9]">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.img
                  key={activeScreenshot}
                  src={screenshots[activeScreenshot].src}
                  alt={screenshots[activeScreenshot].title}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  initial={{ x: slideDirection > 0 ? '100%' : '-100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: slideDirection > 0 ? '-100%' : '100%', opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </AnimatePresence>
            </div>

            {/* Nav arrows */}
            <button
              onClick={() => { setSlideDirection(-1); setActiveScreenshot(p => (p - 1 + screenshots.length) % screenshots.length); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => { setSlideDirection(1); setActiveScreenshot(p => (p + 1) % screenshots.length); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setSlideDirection(i > activeScreenshot ? 1 : -1); setActiveScreenshot(i); }}
                  className={cn(
                    'rounded-full transition-all duration-300',
                    activeScreenshot === i ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Caption below */}
          <div className="text-center mt-6 max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-white">{screenshots[activeScreenshot].title}</h3>
            <p className="text-sm text-slate-500 mt-1">{screenshots[activeScreenshot].desc}</p>
          </div>
        </div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  ROLES                                                        */}
      {/* ============================================================ */}
      <SectionSnap id="roles">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-rose-500/[0.08] text-rose-400 border-rose-500/20 rounded-full text-xs px-4 py-1.5">
              <Shield className="h-3 w-3 mr-1.5" /> Controle de Acesso
            </Badge>
            <h2 className="gsap-heading text-3xl md:text-5xl font-bold tracking-tight mt-4">
              7 perfis,{' '}
              <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">permissões granulares</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {roles.map((r, i) => {
              const neonColor = r.color.includes('red') ? 'rgba(239,68,68,0.12)'
                : r.color.includes('orange') ? 'rgba(249,115,22,0.12)'
                : r.color.includes('yellow') ? 'rgba(234,179,8,0.12)'
                : r.color.includes('green') ? 'rgba(34,197,94,0.12)'
                : r.color.includes('cyan') ? 'rgba(6,182,212,0.12)'
                : r.color.includes('blue') ? 'rgba(59,130,246,0.12)'
                : 'rgba(148,163,184,0.1)';
              return (
              <motion.div
                key={r.role}
                className="group relative bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center hover:border-white/[0.12] transition-all duration-500"
                style={{ '--neon': neonColor } as React.CSSProperties}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{ boxShadow: `0 0 18px 1px var(--neon), inset 0 0 15px 1px var(--neon)` }}
                />
                <div className={cn('h-10 w-10 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br', r.color)}>
                  <r.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">{r.role}</h4>
                <p className="text-[10px] text-slate-600 leading-relaxed group-hover:text-slate-400 transition-colors">{r.desc}</p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <SectionSnap id="pricing">
        <GlowOrb color="rgba(59,130,246,0.08)" size={600} top="40%" left="50%" />
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20 rounded-full text-xs px-4 py-1.5">
              <TrendingUp className="h-3 w-3 mr-1.5" /> Planos SaaS
            </Badge>
            <h2 className="gsap-heading text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Escolha o plano{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">ideal</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm">
              Use como serviço (SaaS) com suporte, atualizações e infraestrutura inclusos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                className={cn(
                  'relative rounded-2xl flex flex-col overflow-hidden',
                  p.popular
                    ? 'bg-gradient-to-b from-blue-600/10 to-transparent border-2 border-blue-500/20 shadow-xl shadow-blue-500/5'
                    : 'bg-white/[0.02] border border-white/[0.06]'
                )}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {p.popular && (
                  <Badge className="absolute top-4 right-4 bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">Popular</Badge>
                )}
                <div className="p-7 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-white">{p.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{p.price}</span>
                    <span className="text-sm text-slate-500">{p.period}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{p.users}</p>

                  <ul className="mt-6 space-y-2.5 flex-1">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-slate-400">
                        <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', p.popular ? 'text-blue-400' : 'text-emerald-500/60')} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={whatsappLink(`Olá! Tenho interesse no plano ${p.name} do OrdFy.`)}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-6 block"
                  >
                    <Button className={cn(
                      'w-full rounded-full h-11 text-sm font-medium',
                      p.popular
                        ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10'
                        : 'bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12]'
                    )}>
                      {p.name === 'Enterprise' ? 'Falar com vendas' : 'Começar agora'}
                    </Button>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  LICENCIAMENTO — venda do código-fonte                        */}
      {/* ============================================================ */}
      <SectionSnap id="licenciamento">
        <GlowOrb color="rgba(139,92,246,0.12)" size={800} top="20%" left="30%" />
        <GlowOrb color="rgba(59,130,246,0.08)" size={500} top="70%" left="70%" delay={3} />
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-violet-500/[0.08] text-violet-400 border-violet-500/20 rounded-full text-xs px-4 py-1.5">
              <Code2 className="h-3 w-3 mr-1.5" /> White-Label
            </Badge>
            <h2 className="gsap-heading text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Adquira o{' '}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">código-fonte</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-2xl mx-auto text-sm">
              Licencie o OrdFy completo para usar na sua infraestrutura, com sua marca.
              Ideal para empresas de tecnologia, revendedores e operações que exigem controle total.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Licença Código */}
            <motion.div
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
                <Code2 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Licença do Código</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                Código-fonte completo (frontend + backend + edge functions), documentação técnica e direito de uso comercial ilimitado.
              </p>
              <a href={whatsappLink('Olá! Tenho interesse na licença do código-fonte do OrdFy.')} target="_blank" rel="noopener noreferrer" className="mt-5">
                <Button className="w-full rounded-full h-10 bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] text-xs font-medium gap-2">
                  <MessageCircle className="h-3.5 w-3.5" /> Entre em contato
                </Button>
              </a>
            </motion.div>

            {/* Código + Suporte */}
            <motion.div
              className="relative bg-gradient-to-b from-violet-600/10 to-transparent border-2 border-violet-500/20 rounded-2xl p-7 flex flex-col shadow-xl shadow-violet-500/5"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Badge className="absolute top-4 right-4 bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">Recomendado</Badge>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-4">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Código + Suporte</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                Tudo da licença básica + 6 meses de suporte técnico, treinamento da equipe, customizações sob demanda e consultoria de implantação.
              </p>
              <a href={whatsappLink('Olá! Tenho interesse no pacote Código + Suporte do OrdFy.')} target="_blank" rel="noopener noreferrer" className="mt-5">
                <Button className="w-full rounded-full h-10 bg-white text-slate-900 hover:bg-slate-100 text-xs font-medium shadow-lg shadow-white/10 gap-2">
                  <MessageCircle className="h-3.5 w-3.5" /> Entre em contato
                </Button>
              </a>
            </motion.div>

            {/* Full Solution */}
            <motion.div
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center mb-4">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white">Solução Completa</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed flex-1">
                Código + marca própria + setup de infraestrutura + 12 meses de suporte + atualizações. Pronto para operar como seu SaaS.
              </p>
              <a href={whatsappLink('Olá! Tenho interesse na Solução Completa do OrdFy (white-label).')} target="_blank" rel="noopener noreferrer" className="mt-5">
                <Button className="w-full rounded-full h-10 bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] text-xs font-medium gap-2">
                  <MessageCircle className="h-3.5 w-3.5" /> Entre em contato
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Incluso na licença */}
          <motion.div
            className="mt-8 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h4 className="text-sm font-semibold text-white mb-5">O que está incluso no código-fonte</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                '30+ módulos frontend',
                'Edge Functions backend',
                'Multi-tenancy completo',
                'RBAC com 7 perfis',
                'Banco PostgreSQL + RLS',
                'API REST documentada',
                'Temas personalizáveis',
                'Auditoria global',
                'Real-time (WebSocket)',
                'Painel Master Admin',
                'Portal do Solicitante',
                'Canvas colaborativo',
              ].map(item => (
                <div key={item} className="flex items-start gap-2 text-[12px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-violet-400/60 shrink-0 mt-0.5" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="text-center mt-10">
            <a href={whatsappLink('Olá! Tenho interesse em adquirir a licença do código-fonte do OrdFy.')} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white px-10 text-sm h-12 rounded-full shadow-xl shadow-violet-500/15 font-medium">
                Solicitar proposta comercial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </SectionSnap>

      {/* ============================================================ */}
      {/*  CTA FINAL                                                    */}
      {/* ============================================================ */}
      <SectionSnap className="min-h-[50vh]">
        <div className="max-w-4xl mx-auto px-6 text-center w-full relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.05] via-violet-500/[0.05] to-cyan-500/[0.05] blur-[120px] pointer-events-none rounded-full" />
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Zap className="h-14 w-14 text-blue-400/70 mx-auto mb-8" />
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Pronto para transformar sua{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                operação?
              </span>
            </h2>
            <p className="mt-6 text-base text-slate-500 max-w-lg mx-auto">
              Seja como SaaS ou licenciamento white-label — o OrdFy se adapta à sua necessidade.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={whatsappLink('Olá! Gostaria de saber mais sobre o OrdFy.')} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 text-sm h-12 rounded-full shadow-xl shadow-white/10 font-medium">
                  Falar com vendas <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="/login">
                <Button size="lg" variant="outline" className="border-white/10 text-slate-400 hover:bg-white/[0.04] px-8 text-sm h-12 rounded-full">
                  Acessar plataforma
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </SectionSnap>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/ordfy-logo.png" alt="OrdFy" className="h-5 w-5 rounded-lg" />
            <span className="font-bold text-sm">
              Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
            </span>
            <span className="text-slate-700 text-xs ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <span>contato@ordfy.com.br</span>
            <span>·</span>
            <span>(12) 99654-3522</span>
          </div>
        </div>
      </footer>

      {/* WhatsApp floating */}
      <motion.a
        href={whatsappLink('Olá! Gostaria de saber mais sobre o OrdFy.')}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-emerald-500/25 transition-all group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.638l4.702-1.376A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.31-.726-5.993-1.957l-.418-.313-2.795.818.867-2.72-.344-.548A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
        </svg>
        <span className="text-sm font-medium">WhatsApp</span>
      </motion.a>
    </div>
  );
}
