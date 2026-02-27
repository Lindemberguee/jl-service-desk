import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, BarChart3, Bell, Package, Shield, Users, Zap, Clock,
  Star, CheckCircle2, ArrowRight, Workflow, StickyNote, CalendarDays,
  Wrench, Monitor, Target, Eye, Lock, FileText, Settings, Gauge,
  Layers, GitBranch, UserCheck, Building2, AlertTriangle, TrendingUp,
  ChevronDown, Sparkles, Globe, Cpu, Database, BrainCircuit,
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
function Counter({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const springVal = useSpring(0, { duration: 2000 });

  useEffect(() => {
    if (isInView) springVal.set(value);
  }, [isInView, value, springVal]);

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${Math.round(v)}${suffix}`;
    });
    return unsub;
  }, [springVal, prefix, suffix]);

  return <span ref={ref}>0</span>;
}

/* ------------------------------------------------------------------ */
/*  Floating particles                                                 */
/* ------------------------------------------------------------------ */
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `hsl(${210 + Math.random() * 50}, 80%, ${50 + Math.random() * 30}%)`,
            opacity: 0.3 + Math.random() * 0.4,
          }}
          animate={{
            y: [0, -30 - Math.random() * 60, 0],
            x: [0, Math.random() * 30 - 15, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grid background                                                    */
/* ------------------------------------------------------------------ */
function GridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with parallax                                      */
/* ------------------------------------------------------------------ */
function ParallaxSection({ children, className, id, speed = 0.3 }: {
  children: React.ReactNode; className?: string; id?: string; speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [80 * speed, -80 * speed]);

  return (
    <section ref={ref} id={id} className={cn('relative', className)}>
      <motion.div style={{ y }}>{children}</motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Glow orb                                                           */
/* ------------------------------------------------------------------ */
function GlowOrb({ color, size, top, left, delay = 0 }: {
  color: string; size: number; top: string; left: string; delay?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[120px]"
      style={{ width: size, height: size, top, left, background: color }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */
function FeatureCard({ icon: Icon, title, desc, color, index }: {
  icon: React.ElementType; title: string; desc: string; color: string; index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      className="group relative bg-slate-900/60 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-500 hover:shadow-[0_0_40px_-12px_rgba(59,130,246,0.15)]"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const allFeatures = [
  { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Criação, atribuição, SLA, prioridades, checklists e fluxo de status inteligente com timeline completa.', color: 'from-blue-600 to-blue-700' },
  { icon: Package, title: 'Gestão de Estoque', desc: 'Controle de itens, movimentações automáticas, alertas de nível mínimo e integração direta com OS.', color: 'from-amber-600 to-amber-700' },
  { icon: Bell, title: 'Notificações Real-time', desc: 'Alertas instantâneos por mudança de status, atribuição e estoque crítico com som e toast.', color: 'from-violet-600 to-violet-700' },
  { icon: Users, title: 'Multi-tenant & RBAC', desc: '7 perfis de acesso com permissões granulares por módulo. Isolamento total entre departamentos.', color: 'from-emerald-600 to-emerald-700' },
  { icon: BarChart3, title: 'Dashboard & KPIs', desc: 'Métricas em tempo real, gráficos interativos, indicadores de performance e relatórios exportáveis.', color: 'from-cyan-600 to-cyan-700' },
  { icon: Shield, title: 'Auditoria & Segurança', desc: 'RLS por departamento, logs de auditoria completos, rastreabilidade total de ações.', color: 'from-rose-600 to-rose-700' },
  { icon: Target, title: 'OKRs & Plano de Ação', desc: 'Objetivos estratégicos com Key Results, check-ins, visão Kanban e tabela, com vínculo automático a KPIs.', color: 'from-orange-600 to-orange-700' },
  { icon: Workflow, title: 'Canvas Colaborativo', desc: 'Mapas mentais, fluxogramas e diagramas com nós, conexões e compartilhamento em tempo real.', color: 'from-sky-600 to-sky-700' },
  { icon: StickyNote, title: 'Notas Enterprise', desc: 'Bloco de notas com editor rico, Markdown, pastas, tags, pins e compartilhamento entre usuários.', color: 'from-yellow-600 to-yellow-700' },
  { icon: Wrench, title: 'Manutenção Preventiva', desc: 'Agendamento automático, planos de manutenção, histórico de intervenções e custos por ativo.', color: 'from-indigo-600 to-indigo-700' },
  { icon: Building2, title: 'Gestão de Ativos', desc: 'Cadastro completo de equipamentos, componentes, patrimônio, QR codes e histórico de manutenção.', color: 'from-teal-600 to-teal-700' },
  { icon: UserCheck, title: 'Portal do Solicitante', desc: 'Interface simplificada para abertura de chamados, acompanhamento e avaliação do atendimento.', color: 'from-pink-600 to-pink-700' },
  { icon: Gauge, title: 'Painel do Técnico', desc: 'Visão dedicada para técnicos com suas OS, checklists, anexos e atualização de status.', color: 'from-lime-600 to-lime-700' },
  { icon: Lock, title: 'Controle de Acesso', desc: 'Matriz de permissões editável, super admin, coordenador, analista, técnico, solicitante e leitura.', color: 'from-red-600 to-red-700' },
  { icon: FileText, title: 'Relatórios & Exportação', desc: 'Exportação em Excel, relatórios por período, filtros avançados e impressão de guias de OS.', color: 'from-fuchsia-600 to-fuchsia-700' },
  { icon: CalendarDays, title: 'Lembretes & Alertas', desc: 'Sistema de lembretes com recorrência, categorias, prioridades e notificações automáticas.', color: 'from-purple-600 to-purple-700' },
  { icon: Settings, title: 'Admin Completo', desc: 'Painel administrativo com saúde do sistema, gestão de departamentos, branding e configurações.', color: 'from-gray-600 to-gray-700' },
  { icon: TrendingUp, title: 'Custos & Materiais', desc: 'Controle de custos por OS com mão de obra, peças, e relatório financeiro integrado.', color: 'from-emerald-700 to-green-700' },
];

const stats = [
  { value: 98, suffix: '%', label: 'Satisfação dos clientes' },
  { value: 2500, suffix: '+', label: 'OS processadas/mês' },
  { value: 60, suffix: '%', label: 'Redução no tempo de resposta' },
  { value: 150, suffix: '+', label: 'Empresas ativas' },
];

const screenshots = [
  { src: screenshotDashboard, label: 'Dashboard Operacional', desc: 'Visão geral com KPIs, gráficos e status em tempo real.' },
  { src: screenshotWorkorders, label: 'Ordens de Serviço', desc: 'Filtros avançados, busca, status e atribuição.' },
  { src: screenshotStock, label: 'Gestão de Estoque', desc: 'Controle de níveis, movimentações e alertas.' },
];

const plans = [
  {
    name: 'Free', price: 'Grátis', period: '', desc: 'Para equipes pequenas',
    features: ['Até 3 usuários', '50 OS/mês', 'Dashboard básico', 'Notificações email', '1 departamento'],
    popular: false,
  },
  {
    name: 'Pro', price: 'R$ 149', period: '/mês', desc: 'Para operações em crescimento',
    features: ['Até 25 usuários', 'OS ilimitadas', 'Dashboard completo', 'Tempo real', 'Multi-departamento', 'SLA & custos', 'Estoque', 'Auditoria', 'OKRs & KPIs'],
    popular: true,
  },
  {
    name: 'Enterprise', price: 'Sob consulta', period: '', desc: 'Para grandes operações',
    features: ['Usuários ilimitados', 'Tudo do Pro', 'API & integrações', 'SSO / SAML', 'Suporte dedicado', 'Onboarding', 'Ambiente dedicado'],
    popular: false,
  },
];

const testimonials = [
  { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', avatar: '👨‍🔧', text: 'O OrdFy revolucionou nossa gestão. Reduzimos o tempo de resposta em 60%.' },
  { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', avatar: '👩‍⚕️', text: 'A melhor plataforma que já usei. Notificações real-time e estoque são incríveis.' },
  { name: 'Roberto Farias', role: 'Diretor de Operações', company: 'Grupo TechPark', avatar: '👨‍💼', text: 'Multi-departamento e permissões granulares foram decisivos para nossos 5 sites.' },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ShowcasePage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 80, damping: 30 });
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto overflow-x-hidden bg-[#050a18] text-white scroll-smooth">
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400 z-50 origin-left" style={{ scaleX }} />

      <Particles />
      <GridBg />

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl bg-[#050a18]/70 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">OrdFy</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#screenshots" className="hover:text-white transition-colors">Interface</a>
            <a href="#pricing" className="hover:text-white transition-colors">Preços</a>
            <a href="#social" className="hover:text-white transition-colors">Depoimentos</a>
          </div>
          <Button onClick={() => navigate('/login')} className="bg-blue-600 hover:bg-blue-700 rounded-xl text-sm px-5">
            Acessar plataforma
          </Button>
        </div>
      </nav>

      {/* ================ HERO ================ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <GlowOrb color="rgba(59,130,246,0.2)" size={800} top="-10%" left="30%" />
        <GlowOrb color="rgba(139,92,246,0.15)" size={600} top="50%" left="70%" delay={2} />
        <GlowOrb color="rgba(6,182,212,0.1)" size={500} top="70%" left="10%" delay={4} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge className="mb-8 text-sm px-5 py-2 bg-blue-500/10 text-blue-300 border-blue-500/20 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 mr-2" /> Plataforma CMMS de Nova Geração
            </Badge>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">Ord</span>
            <span className="bg-gradient-to-b from-blue-400 to-violet-500 bg-clip-text text-transparent">Fy</span>
          </motion.h1>

          <motion.p
            className="mt-8 text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Gestão inteligente de manutenção, ordens de serviço, estoque e equipes — tudo em tempo real, numa única plataforma.
          </motion.p>

          <motion.div
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <Button size="lg" onClick={() => navigate('/login')} className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-2xl shadow-lg shadow-blue-500/20">
              Começar agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-10 text-lg h-14 rounded-2xl backdrop-blur-sm">
              Ver demonstração
            </Button>
          </motion.div>

          <motion.div
            className="mt-20 flex flex-wrap justify-center gap-8 text-sm text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            {['Setup em minutos', 'Multi-departamento', 'Tempo real', 'Segurança total'].map(t => (
              <span key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-slate-600" />
        </motion.div>
      </section>

      {/* ================ STATS ================ */}
      <ParallaxSection className="py-24 relative z-10" speed={0.2}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="text-center p-6 rounded-2xl bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-b from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <Counter value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm text-slate-500 mt-2">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* ================ FEATURES ================ */}
      <ParallaxSection id="features" className="py-32 relative z-10" speed={0.15}>
        <GlowOrb color="rgba(59,130,246,0.1)" size={600} top="20%" left="5%" delay={1} />
        <GlowOrb color="rgba(139,92,246,0.08)" size={500} top="60%" left="80%" delay={3} />

        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 text-xs px-4 py-1.5 bg-violet-500/10 text-violet-300 border-violet-500/20">
              <Layers className="h-3 w-3 mr-1.5" /> 18 Módulos Integrados
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Tudo que você precisa.
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                Nada que você não precise.
              </span>
            </h2>
            <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto">
              Uma plataforma completa para gestão de manutenção, facilities e operações — do chamado ao relatório.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {allFeatures.map((f, i) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} color={f.color} index={i} />
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* ================ SCREENSHOTS ================ */}
      <ParallaxSection id="screenshots" className="py-32 relative z-10" speed={0.2}>
        <GlowOrb color="rgba(6,182,212,0.12)" size={700} top="30%" left="50%" />

        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-4 text-xs px-4 py-1.5 bg-cyan-500/10 text-cyan-300 border-cyan-500/20">
              <Monitor className="h-3 w-3 mr-1.5" /> Interface
            </Badge>
            <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Veja na prática
            </h2>
            <p className="mt-4 text-lg text-slate-500">Interface moderna, intuitiva e responsiva</p>
          </motion.div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-10">
            {screenshots.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setActiveScreenshot(i)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  activeScreenshot === i
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800/60 border border-slate-800/50'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          <motion.div
            key={activeScreenshot}
            className="relative rounded-2xl overflow-hidden border border-slate-700/40 shadow-2xl shadow-blue-500/5"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Browser chrome */}
            <div className="bg-slate-900/90 border-b border-slate-800/50 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-8">
                <div className="bg-slate-800/60 rounded-lg h-7 flex items-center px-3 text-xs text-slate-500 max-w-md mx-auto">
                  app.ordfy.com.br
                </div>
              </div>
            </div>
            <img src={screenshots[activeScreenshot].src} alt={screenshots[activeScreenshot].label} className="w-full h-auto" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#050a18] via-[#050a18]/60 to-transparent p-8">
              <h3 className="text-2xl font-bold text-white">{screenshots[activeScreenshot].label}</h3>
              <p className="text-slate-400 mt-1">{screenshots[activeScreenshot].desc}</p>
            </div>
          </motion.div>
        </div>
      </ParallaxSection>

      {/* ================ TECH STRIP ================ */}
      <ParallaxSection className="py-20 relative z-10 border-y border-slate-800/30" speed={0.1}>
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            className="flex flex-wrap justify-center gap-12 items-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {[
              { icon: Globe, label: 'Cloud-native' },
              { icon: Database, label: 'PostgreSQL' },
              { icon: Lock, label: 'RLS Security' },
              { icon: Cpu, label: 'Edge Functions' },
              { icon: BrainCircuit, label: 'Real-time' },
              { icon: GitBranch, label: 'Multi-tenant' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-2 text-slate-500 text-sm">
                <t.icon className="h-5 w-5 text-slate-600" />
                <span>{t.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </ParallaxSection>

      {/* ================ PRICING ================ */}
      <ParallaxSection id="pricing" className="py-32 relative z-10" speed={0.15}>
        <GlowOrb color="rgba(59,130,246,0.1)" size={600} top="40%" left="50%" delay={2} />

        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Planos & Preços
            </h2>
            <p className="mt-4 text-lg text-slate-500">Escolha o plano ideal para sua operação</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <motion.div
                key={p.name}
                className={cn(
                  'relative rounded-2xl p-7 flex flex-col backdrop-blur-sm',
                  p.popular
                    ? 'bg-gradient-to-b from-blue-600/15 to-slate-900/80 border-2 border-blue-500/30 md:scale-105 shadow-xl shadow-blue-500/10'
                    : 'bg-slate-900/50 border border-slate-800/50'
                )}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 shadow-lg">
                    Mais popular
                  </Badge>
                )}
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{p.price}</span>
                  {p.period && <span className="text-slate-500">{p.period}</span>}
                </div>
                <p className="text-sm text-slate-500 mt-2">{p.desc}</p>
                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className={cn(
                  'mt-8 w-full h-12 rounded-xl font-semibold',
                  p.popular
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                )}>
                  {p.name === 'Enterprise' ? 'Falar com vendas' : 'Começar agora'}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* ================ TESTIMONIALS ================ */}
      <ParallaxSection id="social" className="py-32 relative z-10" speed={0.15}>
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Quem usa, aprova
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-7 backdrop-blur-sm hover:border-slate-700/50 transition-all"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <div className="font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role} · {t.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      {/* ================ CTA ================ */}
      <section className="relative py-40 overflow-hidden">
        <GlowOrb color="rgba(59,130,246,0.2)" size={800} top="30%" left="40%" />
        <GlowOrb color="rgba(139,92,246,0.15)" size={600} top="50%" left="60%" delay={2} />

        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Zap className="h-16 w-16 text-blue-400 mx-auto mb-8" />
          </motion.div>

          <motion.h2
            className="text-4xl md:text-7xl font-black max-w-4xl mx-auto leading-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Pronto para transformar
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              sua manutenção?
            </span>
          </motion.h2>

          <motion.p
            className="mt-6 text-xl text-slate-500 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            Comece grátis e veja resultados em poucos dias. Sem cartão de crédito.
          </motion.p>

          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Button
              size="lg"
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-12 text-lg h-16 rounded-2xl shadow-xl shadow-blue-500/20"
            >
              Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.p
            className="mt-10 text-sm text-slate-600"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            ✉️ contato@ordfy.com.br &nbsp;·&nbsp; 📞 (11) 9 1234-5678
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-10 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-slate-400">OrdFy</span>
          </div>
          <p className="text-sm text-slate-600">© 2025 OrdFy. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
