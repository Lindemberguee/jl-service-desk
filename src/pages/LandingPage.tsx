import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import {
  ClipboardList, BarChart3, Bell, Package, Shield, Users, Zap, Clock,
  Star, CheckCircle2, ArrowRight, ChevronDown, Wrench, Gauge, Eye,
  Smartphone, Globe, Lock, TrendingUp, Award, Headphones,
  Palette, StickyNote, AlarmClock, Calendar, Layout, UserCheck,
  Building2, MapPin, FileText, ListChecks, Timer, Settings, Activity,
  ShieldCheck, Layers, MonitorSmartphone, Share2,
  Maximize, Bookmark, FolderOpen, Tag,
  BellRing, History, Cpu, Database, Key, CircleDot, Network,
  BarChart, PieChart, Workflow, ClipboardCheck, Boxes, AlertTriangle,
  Bot, Target, Sparkles, Play, ChevronRight, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import heroBg from '@/assets/landing/hero-bg.jpg';
import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.jpg';
import screenshotWorkorders from '@/assets/showcase/screenshot-workorders.jpg';
import screenshotStock from '@/assets/showcase/screenshot-stock.jpg';

/* ------------------------------------------------------------------ */
/*  AnimatedCounter                                                    */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Particles                                                          */
/* ------------------------------------------------------------------ */
function ParticlesOverlay() {
  const particles = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 3,
      size: Math.random() > 0.7 ? 'w-1.5 h-1.5' : 'w-1 h-1',
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={cn("absolute rounded-full bg-blue-400/20", p.size)}
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -40, 0], opacity: [0.1, 0.5, 0.1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section with parallax                                              */
/* ------------------------------------------------------------------ */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={cn('relative py-24 md:py-32', className)}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  GlowCard                                                           */
/* ------------------------------------------------------------------ */
function GlowCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative group rounded-2xl bg-slate-900/80 border border-slate-700/50 p-6 overflow-hidden',
        'hover:border-blue-500/30 transition-all duration-500',
        className
      )}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature card                                                       */
/* ------------------------------------------------------------------ */
function FeatureDetailCard({ icon: Icon, title, desc, color, subFeatures, delay = 0 }: {
  icon: any; title: string; desc: string; color: string; subFeatures: string[]; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className="relative group rounded-2xl bg-slate-900/80 border border-slate-700/50 p-7 overflow-hidden hover:border-blue-500/30 transition-all duration-500"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4">{desc}</p>
        <ul className="space-y-2">
          {subFeatures.map(sf => (
            <li key={sf} className="flex items-start gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{sf}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Parallax image section                                             */
/* ------------------------------------------------------------------ */
function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl">
      <motion.img src={src} alt={alt} className="w-full h-auto scale-110" style={{ y }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const coreModules = [
  {
    icon: ClipboardList, title: 'Ordens de Serviço', color: 'from-blue-500 to-cyan-500',
    desc: 'Gestão completa do ciclo de vida de chamados com workflow operacional avançado.',
    subFeatures: [
      'Workflow: Abrir → Triagem → Execução → Concluir → Encerrar',
      'Cronômetro em tempo real (Iniciar, Pausar, Retomar)',
      'SLA inteligente com prazos de resposta e resolução',
      'Checklists dinâmicos com templates por categoria',
      'Custos de mão de obra e materiais integrados',
      'Ações em massa e exportação CSV completa',
      'Tags dinâmicas, filtros avançados e paginação',
      'Nota técnica com controle de visibilidade por permissão',
      'Avaliação de qualidade e tempo pelo solicitante',
    ]
  },
  {
    icon: Package, title: 'Controle de Estoque', color: 'from-amber-500 to-orange-500',
    desc: 'Inventário inteligente com rastreabilidade por OS e alertas automáticos.',
    subFeatures: [
      'CRUD completo com SKU, marca, modelo e unidade',
      'Alertas visuais de nível mínimo e crítico',
      'Movimentações: Entrada, Saída e Ajuste',
      'Vinculação automática com Ordens de Serviço',
      'Importação/Exportação CSV (UTF-8 e Windows-1252)',
      'Download de modelo oficial para importação',
    ]
  },
  {
    icon: BarChart3, title: 'Dashboard Operacional', color: 'from-cyan-500 to-blue-500',
    desc: 'Visão 360° da operação com KPIs, gráficos e indicadores em tempo real.',
    subFeatures: [
      'KPIs: Total, Abertas, Em Execução, Concluídas',
      'Gráficos interativos com Recharts',
      'Indicadores de SLA e tempo médio de resolução',
      'Custos consolidados (mão de obra + materiais)',
      'OS recentes com acesso rápido',
    ]
  },
  {
    icon: Bell, title: 'Notificações em Tempo Real', color: 'from-violet-500 to-purple-500',
    desc: 'Sistema de alertas instantâneos via Realtime para toda a equipe.',
    subFeatures: [
      'Notificações push com toast e som',
      'Badge com contador de não lidas',
      'Sincronização entre múltiplos dispositivos',
      'Alertas de atribuição, status e comentários',
      'Marcação individual e em massa como lida',
    ]
  },
  {
    icon: Target, title: 'KPIs & OKRs', color: 'from-indigo-500 to-violet-500',
    desc: 'Indicadores de performance e objetivos estratégicos para gestão orientada por dados.',
    subFeatures: [
      'Dashboard de KPIs com gráficos e metas',
      'Ciclos de OKR (trimestral, semestral, anual)',
      'Key Results com check-ins periódicos',
      'Indicadores de confiança e progresso visual',
      'Vinculação entre KPIs e resultados-chave',
    ]
  },
  {
    icon: Wrench, title: 'Gestão de Manutenção', color: 'from-teal-500 to-green-500',
    desc: 'Manutenção preventiva, corretiva e preditiva com controle total do ciclo.',
    subFeatures: [
      'Tipos: Preventiva, Corretiva, Preditiva, Instalação',
      'Status: Agendada, Em andamento, Concluída, Atrasada',
      'Vinculação com ativos e ordens de serviço',
      'Registro de custo, peças utilizadas e observações',
      'Agendamento e rastreio de técnico responsável',
    ]
  },
];

const accessControl = [
  {
    icon: Shield, title: 'RBAC com 7 Cargos', color: 'from-rose-500 to-pink-500',
    desc: 'Sistema robusto de permissões com isolamento multi-tenant.',
    subFeatures: [
      '7 cargos: Super Admin, Admin, Coordenador, Técnico, Analista, Solicitante, Leitura',
      'Matriz visual de permissões com toggles dinâmicos',
      'Permissões granulares por módulo e ação',
      'PermissionGuard em todas as rotas protegidas',
      'Controle de visibilidade de nota técnica',
    ]
  },
  {
    icon: Building2, title: 'Multi-departamento', color: 'from-indigo-500 to-blue-500',
    desc: 'Arquitetura multi-tenant com isolamento total via Row Level Security.',
    subFeatures: [
      'Isolamento completo de dados por departamento',
      'RLS nativo em todas as tabelas',
      'Suporte a múltiplos departamentos por usuário',
      'Super Admin com bypass global',
      'Configurações independentes por tenant',
    ]
  },
  {
    icon: History, title: 'Auditoria Global', color: 'from-emerald-500 to-teal-500',
    desc: 'Rastreamento completo de todas as ações com retenção configurável.',
    subFeatures: [
      'Log de criação, edição e exclusão em todos os módulos',
      'Metadados: IP, navegador, SO e dispositivo',
      'Gráfico de tendências (auth vs operações)',
      'Paginação server-side e retenção configurável',
      'Aba Global para ações de Super Admin',
    ]
  },
];

const toolsFeatures = [
  {
    icon: Palette, title: 'Canvas Colaborativo', color: 'from-purple-500 to-fuchsia-500',
    desc: 'Diagramação avançada com colaboração em tempo real.',
    subFeatures: [
      '15+ tipos de nós com 8 handles direcionais',
      'Setas personalizáveis: reto, curva ou angulado',
      'Efeitos neon, labels editáveis e espessura variável',
      'Colaboração em tempo real com presença',
      'Undo/Redo, exportação PNG e modo tela cheia',
      'Compartilhamento público com token seguro',
    ]
  },
  {
    icon: StickyNote, title: 'Anotações Enterprise', color: 'from-yellow-500 to-amber-500',
    desc: 'Editor profissional com sincronização robusta.',
    subFeatures: [
      'Editor híbrido: Rich Text + Markdown (split-view)',
      'Motor de sincronização com fila e retry automático',
      'Proteção contra perda de dados (beforeunload)',
      'Organização por pastas e tags personalizadas',
      'Compartilhamento interno com permissões',
    ]
  },
  {
    icon: AlarmClock, title: 'Lembretes Inteligentes', color: 'from-green-500 to-emerald-500',
    desc: 'Lembretes com recorrência e categorização completa.',
    subFeatures: [
      'Prioridades: Baixa, Média, Alta',
      'Recorrência: diária, semanal, mensal',
      'Categorias e tags personalizadas',
      'Marcação de conclusão com timestamp',
      'Filtros e busca avançada',
    ]
  },
];

const operationalFeatures = [
  {
    icon: MonitorSmartphone, title: 'Painel do Técnico', color: 'from-teal-500 to-cyan-500',
    desc: 'Interface mobile-first exclusiva para técnicos em campo.',
    subFeatures: [
      'Navegação inferior estilo app com glassmorphism',
      'Hero card para tarefa em execução',
      'Cronômetro em tempo real para mão de obra',
      'Checklists e lançamento de materiais',
      'Workflow: Iniciar, Pausar, Retomar, Resolver',
    ]
  },
  {
    icon: UserCheck, title: 'Portal do Solicitante', color: 'from-sky-500 to-blue-500',
    desc: 'Portal simplificado para abertura e acompanhamento.',
    subFeatures: [
      'Interface limpa sem elementos técnicos',
      'Abertura de chamados com prioridade',
      'Acompanhamento de status em tempo real',
      'Avaliação de qualidade e tempo',
      'Perfil pessoal com dados de contato',
    ]
  },
  {
    icon: Settings, title: 'Painel Administrativo', color: 'from-gray-500 to-slate-500',
    desc: 'Gestão centralizada para Super Admins.',
    subFeatures: [
      'Gestão de departamentos e usuários',
      'Redefinição administrativa de senhas',
      'Módulo de Saúde do Sistema',
      'Cadastro fechado: sem self-signup público',
      'Identidade Visual personalizada por tenant',
    ]
  },
  {
    icon: FileText, title: 'Dados Mestres', color: 'from-orange-500 to-red-500',
    desc: 'CRUD completo de todas as entidades base.',
    subFeatures: [
      'Unidades, Locais, Categorias e Subcategorias',
      'Solicitantes com criação de conta de acesso',
      'Colaboradores com matrícula e departamento',
      'Campos: cargo, setor, documentos, observações',
      'Controle de ativação/desativação',
    ]
  },
  {
    icon: Boxes, title: 'Gestão de Ativos', color: 'from-lime-500 to-green-500',
    desc: 'Controle de patrimônio vinculado às OS.',
    subFeatures: [
      'Nº de série e código patrimonial',
      'Status: Ativo, Inativo, Em Manutenção, Descartado',
      'Componentes com vínculo ao estoque',
      'Histórico completo de manutenções',
      'Metadados flexíveis em JSON',
    ]
  },
  {
    icon: BarChart, title: 'Relatórios', color: 'from-pink-500 to-rose-500',
    desc: 'Relatórios operacionais com gráficos.',
    subFeatures: [
      'Relatórios por status, prioridade e período',
      'Métricas de SLA e produtividade',
      'Custos consolidados por OS e equipe',
      'Exportação em CSV',
      'Filtros por departamento e responsável',
    ]
  },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard Operacional', desc: 'Visão 360° com KPIs, gráficos e ordens recentes' },
  { src: screenshotWorkorders, title: 'Gestão de OS', desc: 'Lista completa com filtros, busca e status em tempo real' },
  { src: screenshotStock, title: 'Controle de Estoque', desc: 'Inventário inteligente com alertas de reposição' },
];


const testimonials = [
  { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', text: 'Reduzimos o tempo de resposta em 60%. O canvas colaborativo revolucionou nosso planejamento de manutenção preventiva.', rating: 5 },
  { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', text: 'O controle de acesso multi-departamento é incrível. Cada equipe vê apenas seus dados, mas eu tenho visão total.', rating: 5 },
  { name: 'Roberto Farias', role: 'Dir. Operações', company: 'Grupo TechPark', text: 'Gerenciamos 5 unidades com uma única plataforma. A auditoria e o SLA nos dão a confiança que precisamos.', rating: 5 },
  { name: 'Mariana Costa', role: 'Supervisora Técnica', company: 'Logística Express', text: 'O painel do técnico mobile é perfeito. Minha equipe em campo registra tudo em tempo real, sem papel.', rating: 5 },
];

const techStack = [
  { icon: Zap, title: 'Tempo real', desc: 'Comunicação instantânea em toda a plataforma' },
  { icon: Database, title: 'PostgreSQL', desc: 'Banco robusto com RLS nativo' },
  { icon: Lock, title: 'RLS por tenant', desc: 'Isolamento total no nível do banco' },
  { icon: Smartphone, title: '100% Responsivo', desc: 'Desktop, tablet e mobile' },
  { icon: Globe, title: 'Cloud nativo', desc: 'Infraestrutura escalável e distribuída' },
  { icon: ShieldCheck, title: 'Auditoria total', desc: 'Cada ação é rastreada' },
  { icon: TrendingUp, title: 'Atualizações contínuas', desc: 'Novas funcionalidades todo mês' },
  { icon: Headphones, title: 'Suporte humano', desc: 'Time dedicado para sua operação' },
];

const roleDetails = [
  { role: 'Super Admin', desc: 'Acesso total. Gerencia departamentos, usuários e configurações globais.', color: 'text-red-400', icon: Key },
  { role: 'Administrador', desc: 'Gestão completa do departamento, cria usuários e define permissões.', color: 'text-orange-400', icon: Settings },
  { role: 'Coordenador', desc: 'Gerencia workflow de OS, cadastros e equipe do departamento.', color: 'text-yellow-400', icon: Workflow },
  { role: 'Técnico', desc: 'Executa OS com cronômetro, checklists e materiais via painel mobile.', color: 'text-green-400', icon: Wrench },
  { role: 'Analista', desc: 'Gestão de estoque, materiais, relatórios e KPIs.', color: 'text-cyan-400', icon: BarChart },
  { role: 'Solicitante', desc: 'Abre chamados pelo portal simplificado e acompanha o status.', color: 'text-blue-400', icon: UserCheck },
  { role: 'Leitura', desc: 'Visualização completa sem edição. Ideal para supervisão.', color: 'text-slate-400', icon: Eye },
];

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Hero parallax
  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(heroProgress, [0, 1], ['0%', '40%']);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    const timer = setInterval(() => setActiveScreenshot(p => (p + 1) % screenshots.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { href: '#modules', label: 'Módulos' },
    { href: '#tools', label: 'Ferramentas' },
    { href: '#access', label: 'Segurança' },
    { href: '#screenshots', label: 'Sistema' },
    { href: '#roles', label: 'Perfis' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 z-50 origin-left"
        style={{ scaleX: springProgress }}
      />

      {/* Sticky header */}
      <motion.header
        className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl border-b border-slate-800/50"
        style={{ opacity: headerOpacity, backgroundColor: 'rgba(2, 6, 23, 0.85)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">O</span>
            </div>
            <span className="font-bold text-lg tracking-tight">
              Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden md:block">
              <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-xl px-6 shadow-lg shadow-blue-500/20">
                Acessar
              </Button>
            </a>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <motion.div
            className="md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 px-6 py-4 space-y-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileMenu(false)} className="block text-sm text-slate-300 hover:text-white py-2">{l.label}</a>
            ))}
            <a href="/login"><Button className="w-full mt-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl">Acessar</Button></a>
          </motion.div>
        )}
      </motion.header>

      {/* ============================================================ */}
      {/*  HERO with Parallax                                           */}
      {/* ============================================================ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY, scale: heroScale }}>
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950" />
        
        <ParticlesOverlay />

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div className="relative z-10 max-w-6xl mx-auto px-6 text-center" style={{ opacity: heroOpacity }}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge className="mb-8 text-sm px-5 py-2.5 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Plataforma completa de gestão de manutenção e facilities
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              Gestão inteligente
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              em tempo real.
            </span>
          </motion.h1>

          <motion.p
            className="mt-8 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Ordens de serviço, estoque, ativos, manutenção, equipes, canvas colaborativo,
            KPIs, anotações, auditoria e relatórios — tudo integrado com 7 perfis de acesso,
            multi-departamento e notificações instantâneas.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <a href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="/showcase">
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-8 text-lg h-14 rounded-xl backdrop-blur-sm">
                <Play className="mr-2 h-5 w-5" /> Ver apresentação
              </Button>
            </a>
          </motion.div>

          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { value: 18, suffix: '+', label: 'Módulos integrados' },
              { value: 7, suffix: '', label: 'Perfis de acesso' },
              { value: 10, suffix: '+', label: 'Status de OS' },
              { value: 100, suffix: '%', label: 'Tempo real' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 mt-2 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-7 w-7 text-slate-500" />
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  CORE MODULES                                                 */}
      {/* ============================================================ */}
      <Section id="modules" className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">Módulos Principais</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              O coração da{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">operação</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              Módulos integrados que cobrem todo o ciclo operacional
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coreModules.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TOOLS                                                        */}
      {/* ============================================================ */}
      <Section id="tools" className="bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/10 text-purple-400 border-purple-500/20">Ferramentas</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Produtividade{' '}
              <span className="bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent">além das OS</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              Canvas colaborativo, anotações enterprise e lembretes integrados ao seu fluxo
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {toolsFeatures.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ACCESS CONTROL                                               */}
      {/* ============================================================ */}
      <Section id="access" className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-rose-500/10 text-rose-400 border-rose-500/20">Segurança & Acesso</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Segurança{' '}
              <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">enterprise</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accessControl.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ROLES                                                        */}
      {/* ============================================================ */}
      <Section id="roles" className="bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">Perfis de Acesso</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              7 perfis,{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">um para cada necessidade</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {roleDetails.map((r, i) => (
              <GlowCard key={r.role} delay={i * 0.06} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                    <r.icon className={cn('h-4 w-4', r.color)} />
                  </div>
                  <h4 className={cn('font-bold text-sm', r.color)}>{r.role}</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  OPERATIONAL FEATURES                                         */}
      {/* ============================================================ */}
      <Section className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-teal-500/10 text-teal-400 border-teal-500/20">Módulos Operacionais</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Cada perfil,{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">sua interface</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationalFeatures.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SCREENSHOTS with Parallax                                    */}
      {/* ============================================================ */}
      <Section id="screenshots" className="bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-violet-500/10 text-violet-400 border-violet-500/20">Interface</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Veja o sistema{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">em ação</span>
            </h2>
          </div>

          <div className="flex justify-center gap-3 mb-8 flex-wrap">
            {screenshots.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setActiveScreenshot(i)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                  activeScreenshot === i
                    ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>

          <div className="relative max-w-6xl mx-auto">
            {/* Browser chrome */}
            <div className="bg-slate-800/80 rounded-t-2xl border border-slate-700/50 border-b-0 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-slate-700/50 rounded-lg px-4 py-1.5 text-xs text-slate-400 max-w-md mx-auto text-center">
                  ordfy.app/{screenshots[activeScreenshot].title.toLowerCase().replace(/ /g, '-')}
                </div>
              </div>
            </div>

            <motion.div
              key={activeScreenshot}
              className="rounded-b-2xl overflow-hidden border border-slate-700/50 border-t-0 shadow-2xl shadow-black/50"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <img src={screenshots[activeScreenshot].src} alt={screenshots[activeScreenshot].title} className="w-full h-auto" />
            </motion.div>

            <motion.div
              key={`cap-${activeScreenshot}`}
              className="text-center mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold text-white">{screenshots[activeScreenshot].title}</h3>
              <p className="text-sm text-slate-400 mt-1">{screenshots[activeScreenshot].desc}</p>
            </motion.div>

            <div className="absolute -inset-10 bg-blue-500/5 blur-[80px] rounded-full -z-10 pointer-events-none" />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TECH STACK                                                    */}
      {/* ============================================================ */}
      <Section className="py-16 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-slate-500/10 text-slate-400 border-slate-500/20">Tecnologia</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mt-4">
              Construído com{' '}
              <span className="bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">tecnologia de ponta</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((a, i) => (
              <GlowCard key={a.title} delay={i * 0.05} className="text-center p-5">
                <a.icon className="h-7 w-7 text-blue-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-white mb-1">{a.title}</h4>
                <p className="text-xs text-slate-500">{a.desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS                                                 */}
      {/* ============================================================ */}
      <Section id="testimonials" className="bg-slate-950">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20">Depoimentos</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Quem usa,{' '}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">aprova</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <GlowCard key={t.name} delay={i * 0.1}>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role} · {t.company}</div>
                  </div>
                </div>
              </GlowCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <Section className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-violet-500/10 to-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center mx-auto mb-6">
              <span className="text-white font-extrabold text-2xl">O</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Pronto para transformar sua{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                operação?
              </span>
            </h2>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
              18+ módulos integrados, 7 perfis de acesso, SLA inteligente, auditoria global
              e muito mais. Comece agora, sem cartão de crédito.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-xl shadow-lg shadow-blue-500/25">
                  Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/showcase">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-8 text-lg h-14 rounded-xl">
                  <Play className="mr-2 h-5 w-5" /> Apresentação interativa
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-slate-800/50 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                <span className="text-white font-extrabold text-xs">O</span>
              </div>
              <span className="font-bold">
                Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
              </span>
              <span className="text-slate-600 text-sm ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/*  FLOATING WHATSAPP BUTTON                                     */}
      {/* ============================================================ */}
      <motion.a
        href="https://wa.me/5500000000000?text=Olá!%20Tenho%20interesse%20no%20OrdFy%20e%20gostaria%20de%20saber%20mais."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white pl-5 pr-6 py-3.5 rounded-full shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="text-sm font-semibold hidden sm:inline">Fale conosco</span>
      </motion.a>
    </div>
  );
}
