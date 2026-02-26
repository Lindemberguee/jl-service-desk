import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import {
  ClipboardList, BarChart3, Bell, Package, Shield, Users, Zap, Clock,
  Star, CheckCircle2, ArrowRight, ChevronDown, Wrench, Gauge, Eye,
  Smartphone, Globe, Lock, TrendingUp, Award, Headphones,
  Palette, StickyNote, AlarmClock, Calendar, Layout, UserCheck,
  Building2, MapPin, FileText, ListChecks, Timer, Pause, Play,
  RotateCcw, Download, Upload, Search, Filter, Settings, Activity,
  ShieldCheck, Layers, MonitorSmartphone, Share2, Undo2, Redo2,
  Maximize, Image, PenTool, Bookmark, FolderOpen, Tag, Hash,
  BellRing, History, Cpu, Database, Key, CircleDot, Network,
  BarChart, PieChart, Workflow, ClipboardCheck, Boxes, AlertTriangle,
  Plug, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import heroBg from '@/assets/landing/hero-bg.jpg';
import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.jpg';
import screenshotWorkorders from '@/assets/showcase/screenshot-workorders.jpg';
import screenshotStock from '@/assets/showcase/screenshot-stock.jpg';

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
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
/*  Floating particles background                                     */
/* ------------------------------------------------------------------ */
function ParticlesOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with reveal animation                             */
/* ------------------------------------------------------------------ */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={cn('relative py-24 md:py-32', className)}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Glowing card component                                             */
/* ------------------------------------------------------------------ */
function GlowCard({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

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
/*  Feature detail card with sub-features                              */
/* ------------------------------------------------------------------ */
function FeatureDetailCard({ icon: Icon, title, desc, color, subFeatures, delay = 0 }: {
  icon: any; title: string; desc: string; color: string; subFeatures: string[]; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

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
      'Prioridades: Baixa, Média, Alta, Crítica',
      'Checklists dinâmicos com templates por categoria',
      'Anexos com storage privado e rastreabilidade',
      'Custos de mão de obra e materiais integrados',
      'Filtros avançados, ordenação e paginação server-side',
      'Ações em massa: alteração de status e atribuição em lote',
      'Exportação CSV completa',
      'Visibilidade: Interna ou para Solicitante',
      'Tags dinâmicas com atalhos de teclado',
    ]
  },
  {
    icon: Package, title: 'Controle de Estoque', color: 'from-amber-500 to-orange-500',
    desc: 'Inventário inteligente com rastreabilidade por OS e alertas automáticos.',
    subFeatures: [
      'CRUD completo de itens com SKU e unidade',
      'Alertas visuais de nível mínimo/crítico',
      'Movimentações: Entrada, Saída e Ajuste',
      'Vinculação direta com Ordens de Serviço',
      'Histórico detalhado de movimentações',
      'Importação/Exportação CSV (UTF-8 e Windows-1252)',
      'Download de modelo oficial para importação',
      'Seleção e exclusão em massa',
      'Busca com debounce e paginação',
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
      'Filtros por período e departamento',
    ]
  },
  {
    icon: Bell, title: 'Notificações em Tempo Real', color: 'from-violet-500 to-purple-500',
    desc: 'Sistema de alertas instantâneos via Supabase Realtime para toda a equipe.',
    subFeatures: [
      'Notificações push com toast e som',
      'Badge com contador de não lidas',
      'Sincronização entre múltiplos dispositivos',
      'Alertas de atribuição, mudança de status e comentários',
      'Marcação individual e em massa como lida',
      'Links diretos para os registros relevantes',
    ]
  },
];

const accessControl = [
  {
    icon: Shield, title: 'Controle de Acesso (RBAC)', color: 'from-rose-500 to-pink-500',
    desc: 'Sistema robusto de permissões baseado em 7 cargos com isolamento multi-tenant.',
    subFeatures: [
      '7 cargos: Super Admin, Admin, Coordenador, Técnico, Analista, Solicitante, Leitura',
      'Matriz visual de permissões com toggles dinâmicos',
      'Permissões granulares por módulo e ação (ler, criar, editar, excluir)',
      'Tabela role_permissions com prioridade sobre fallbacks estáticos',
      'PermissionGuard em todas as rotas protegidas',
      'Redirecionamento automático para destinos permitidos',
    ]
  },
  {
    icon: Building2, title: 'Multi-departamento (Multi-tenant)', color: 'from-indigo-500 to-blue-500',
    desc: 'Arquitetura de banco compartilhado com isolamento total via Row Level Security.',
    subFeatures: [
      'Isolamento completo de dados por departamento (tenant_id)',
      'RLS nativo do PostgreSQL em todas as tabelas',
      'Suporte a múltiplos departamentos por usuário',
      'Super Admin com bypass global para gestão total',
      'Coordenador restrito ao escopo do seu departamento',
      'Configurações independentes por tenant (cores, logo, dark mode)',
    ]
  },
  {
    icon: History, title: 'Auditoria Global', color: 'from-emerald-500 to-teal-500',
    desc: 'Rastreamento completo de todas as ações do sistema com retenção configurável.',
    subFeatures: [
      'Log de criação, edição e exclusão em todos os módulos',
      'Captura de: autor, tenant_id, diff de dados',
      'Metadados: IP público, Navegador, SO e Dispositivo',
      'Aba Global para ações de Super Admin sem tenant',
      'Gráfico de tendências (auth vs operações)',
      'Paginação server-side (50 registros) e retenção configurável',
    ]
  },
];

const toolsFeatures = [
  {
    icon: Palette, title: 'Canvas Colaborativo', color: 'from-purple-500 to-fuchsia-500',
    desc: 'Ferramenta de diagramação avançada com colaboração em tempo real entre equipes.',
    subFeatures: [
      '15 tipos de nós (retângulo, círculo, diamante, texto, etc.)',
      '8 handles direcionais com indicadores de entrada/saída',
      'Criação automática de blocos por arrasto de conexão',
      'Setas personalizáveis: reto, curva ou angulado',
      'Efeitos neon, labels editáveis e espessura variável',
      'Colaboração em tempo real via Supabase Realtime',
      'Compartilhamento com permissões (visualizar/editar)',
      'Histórico completo: Undo/Redo (Ctrl+Z / Ctrl+Y)',
      'Exportação PNG e modo tela cheia (F11/ESC)',
      'Salvamento automático com debounce de 1.5s',
    ]
  },
  {
    icon: StickyNote, title: 'Anotações Enterprise', color: 'from-yellow-500 to-amber-500',
    desc: 'Editor profissional com sincronização robusta e proteção contra perda de dados.',
    subFeatures: [
      'Editor híbrido: Rich Text (com cores) + Markdown (split-view)',
      'Motor de sincronização com fila, retry (3x) e flush em navegação',
      'Proteção via beforeunload contra perda de dados',
      'Indicador visual de estado de sincronização',
      'Organização por pastas e tags personalizadas',
      'Compartilhamento interno com permissões (leitura/edição)',
      'Fixar notas importantes no topo',
    ]
  },
  {
    icon: AlarmClock, title: 'Lembretes Inteligentes', color: 'from-green-500 to-emerald-500',
    desc: 'Sistema completo de lembretes com recorrência e categorização.',
    subFeatures: [
      'Prioridades: Baixa, Média, Alta',
      'Categorias e tags personalizadas',
      'Data e hora de vencimento',
      'Recorrência configurável (diária, semanal, mensal)',
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
      'Navegação inferior otimizada para mobile',
      'Visualização restrita às OS atribuídas ao técnico',
      'Cronômetro em tempo real para rastreio de mão de obra',
      'Preenchimento de checklists e lançamento de materiais',
      'Workflow completo: Iniciar, Pausar, Retomar, Resolver',
    ]
  },
  {
    icon: UserCheck, title: 'Portal do Solicitante', color: 'from-sky-500 to-blue-500',
    desc: 'Portal simplificado para abertura e acompanhamento de chamados.',
    subFeatures: [
      'Interface limpa e intuitiva sem elementos técnicos',
      'Abertura de novos chamados com descrição e prioridade',
      'Acompanhamento de status em tempo real',
      'Notificações de atualizações',
      'Perfil pessoal com dados de contato',
    ]
  },
  {
    icon: Settings, title: 'Painel Administrativo', color: 'from-gray-500 to-slate-500',
    desc: 'Gestão centralizada para Super Admins com controle total do ecossistema.',
    subFeatures: [
      'Gestão de departamentos (dados operacionais)',
      'Criação e gestão de usuários por departamento',
      'Redefinição administrativa de senhas',
      'Ativação/desativação de perfis',
      'Configurações globais do sistema',
      'Módulo de Saúde do Sistema (performance)',
      'Cadastro fechado: sem self-signup público',
    ]
  },
  {
    icon: FileText, title: 'Dados Mestres (Cadastros)', color: 'from-orange-500 to-red-500',
    desc: 'CRUD completo de todas as entidades base do sistema.',
    subFeatures: [
      'Unidades (Prédios/Campus)',
      'Locais (Salas/Espaços) — hierárquico por unidade',
      'Categorias de OS com subcategorias',
      'Solicitantes com criação de conta de acesso',
      'Campos: cargo, setor, documentos, observações',
      'Controle de ativação/desativação de acesso',
    ]
  },
  {
    icon: Boxes, title: 'Gestão de Ativos', color: 'from-lime-500 to-green-500',
    desc: 'Controle de patrimônio com vínculo direto às ordens de serviço.',
    subFeatures: [
      'Cadastro com número de série e código patrimonial',
      'Status: Ativo, Inativo, Em Manutenção, Descartado',
      'Vinculação a unidade, local e categoria',
      'Metadados flexíveis em JSON',
      'Histórico de manutenções via OS',
    ]
  },
  {
    icon: BarChart, title: 'Relatórios', color: 'from-pink-500 to-rose-500',
    desc: 'Relatórios operacionais com exportação e visualizações gráficas.',
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

const plans = [
  {
    name: 'Starter', price: 'Grátis', period: '', desc: 'Para começar', popular: false,
    features: ['3 usuários', '50 OS/mês', 'Dashboard básico', '1 departamento', 'Notificações básicas', 'Estoque (50 itens)'],
  },
  {
    name: 'Professional', price: 'R$ 149', period: '/mês', desc: 'Para crescer', popular: true,
    features: [
      '25 usuários', 'OS ilimitadas', 'Relatórios completos', 'Multi-departamento',
      'SLA + Custos integrados', 'Estoque ilimitado', 'Auditoria completa',
      'Canvas colaborativo', 'Anotações Enterprise', 'Lembretes', 'Portal do Solicitante',
      'Painel do Técnico mobile', 'Importação/Exportação CSV',
    ],
  },
  {
    name: 'Enterprise', price: 'Sob medida', period: '', desc: 'Para escalar', popular: false,
    features: [
      'Ilimitado em tudo', 'Tudo do Professional', 'API + Integrações',
      'SSO / SAML', 'Suporte dedicado 24/7', 'SLA premium contratual',
      'Ambiente dedicado', 'Personalização de marca', 'Treinamento incluso',
    ],
  },
];

const testimonials = [
  { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', text: 'Reduzimos o tempo de resposta em 60%. O canvas colaborativo revolucionou nosso planejamento de manutenção preventiva.', rating: 5 },
  { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', text: 'O controle de acesso multi-departamento é incrível. Cada equipe vê apenas seus dados, mas eu tenho visão total.', rating: 5 },
  { name: 'Roberto Farias', role: 'Diretor de Operações', company: 'Grupo TechPark', text: 'Gerenciamos 5 unidades com uma única plataforma. A auditoria e o SLA nos dão a confiança que precisamos.', rating: 5 },
  { name: 'Mariana Costa', role: 'Supervisora Técnica', company: 'Logística Express', text: 'O painel do técnico mobile é perfeito. Minha equipe em campo registra tudo em tempo real, sem papel.', rating: 5 },
];

const techStack = [
  { icon: Zap, title: 'Tempo real', desc: 'Supabase Realtime em toda a plataforma' },
  { icon: Database, title: 'PostgreSQL', desc: 'Banco robusto com RLS nativo' },
  { icon: Lock, title: 'RLS por tenant', desc: 'Isolamento total no nível do banco' },
  { icon: Smartphone, title: '100% Responsivo', desc: 'Desktop, tablet e mobile' },
  { icon: Globe, title: 'Cloud nativo', desc: 'Infraestrutura escalável e distribuída' },
  { icon: ShieldCheck, title: 'Auditoria total', desc: 'Cada ação é rastreada e registrada' },
  { icon: TrendingUp, title: 'Atualizações contínuas', desc: 'Novas funcionalidades todo mês' },
  { icon: Headphones, title: 'Suporte humano', desc: 'Time dedicado para sua operação' },
];

const roleDetails = [
  { role: 'Super Admin', desc: 'Acesso total ao ecossistema. Gerencia todos os departamentos, usuários e configurações globais.', color: 'text-red-400' },
  { role: 'Administrador', desc: 'Gestão completa do departamento. Cria usuários, define permissões e monitora operações.', color: 'text-orange-400' },
  { role: 'Coordenador', desc: 'Gerencia workflow de OS, cadastros setoriais e equipe técnica do seu departamento.', color: 'text-yellow-400' },
  { role: 'Técnico', desc: 'Executa OS atribuídas com cronômetro, checklists e lançamento de materiais via painel mobile.', color: 'text-green-400' },
  { role: 'Analista', desc: 'Permissões de gestão em estoque e materiais. Pode criar OS mas não atribuir responsáveis.', color: 'text-cyan-400' },
  { role: 'Solicitante', desc: 'Abre chamados pelo portal simplificado e acompanha o status em tempo real.', color: 'text-blue-400' },
  { role: 'Leitura', desc: 'Visualização completa do portal sem permissão de edição. Ideal para supervisão.', color: 'text-slate-400' },
];

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveScreenshot(p => (p + 1) % screenshots.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 z-50 origin-left"
        style={{ scaleX: springProgress }}
      />

      {/* Sticky header */}
      <motion.header
        className="fixed top-0 inset-x-0 z-40 backdrop-blur-xl border-b border-slate-800/50"
        style={{ opacity: headerOpacity, backgroundColor: 'rgba(2, 6, 23, 0.8)' }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg">JL Service Desk</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#modules" className="hover:text-white transition-colors">Módulos</a>
            <a href="#tools" className="hover:text-white transition-colors">Ferramentas</a>
            <a href="#access" className="hover:text-white transition-colors">Controle de Acesso</a>
            <a href="#screenshots" className="hover:text-white transition-colors">Sistema</a>
            <a href="#roles" className="hover:text-white transition-colors">Perfis</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
          </nav>
          <a href="/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6">
              Acessar
            </Button>
          </a>
        </div>
      </motion.header>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />
        </div>

        <ParticlesOverlay />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <Badge className="mb-8 text-sm px-5 py-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15 backdrop-blur-sm">
              🚀 Plataforma completa de gestão de manutenção e facilities
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05]"
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
            Ordens de serviço, estoque, equipes, canvas colaborativo, anotações, lembretes,
            auditoria e relatórios — tudo integrado com 7 perfis de acesso,
            multi-departamento e notificações instantâneas.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
          >
            <a href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-10 text-lg h-14 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                Começar grátis <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <a href="/showcase">
              <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-8 text-lg h-14 rounded-xl backdrop-blur-sm">
                <Eye className="mr-2 h-5 w-5" /> Ver apresentação
              </Button>
            </a>
          </motion.div>

          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { value: 7, suffix: '', label: 'Perfis de acesso' },
              { value: 15, suffix: '+', label: 'Tipos de nó no Canvas' },
              { value: 10, suffix: '+', label: 'Status de OS' },
              { value: 100, suffix: '%', label: 'Tempo real' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-slate-500" />
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
              Módulos integrados que cobrem todo o ciclo operacional, do chamado à conclusão
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreModules.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.1} />
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
              Canvas colaborativo, anotações enterprise e lembretes — ferramentas profissionais integradas ao seu fluxo
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
      {/*  ACCESS CONTROL & SECURITY                                    */}
      {/* ============================================================ */}
      <Section id="access" className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-rose-500/10 text-rose-400 border-rose-500/20">Segurança & Acesso</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Segurança{' '}
              <span className="bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">enterprise</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              RBAC com 7 cargos, isolamento multi-tenant via RLS e auditoria completa de todas as ações
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accessControl.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ROLES DETAIL                                                 */}
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
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Users className={cn('h-4 w-4', r.color)} />
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
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              Painéis dedicados para técnicos e solicitantes, gestão administrativa centralizada e cadastros completos
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationalFeatures.map((f, i) => (
              <FeatureDetailCard key={f.title} {...f} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SCREENSHOTS                                                  */}
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
            <div className="bg-slate-800/80 rounded-t-2xl border border-slate-700/50 border-b-0 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-slate-700/50 rounded-lg px-4 py-1.5 text-xs text-slate-400 max-w-md mx-auto text-center">
                  jl-service-desk.lovable.app
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
      {/*  TECH STACK / ADVANTAGES                                      */}
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
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <Section id="pricing" className="bg-gradient-to-b from-slate-950 to-slate-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Planos</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Preço justo para{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">cada operação</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p, i) => (
              <GlowCard
                key={p.name}
                delay={i * 0.1}
                className={cn(
                  'flex flex-col',
                  p.popular && 'border-blue-500/40 bg-gradient-to-b from-blue-500/10 to-slate-900/80 scale-[1.03]'
                )}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 shadow-lg">
                    ⭐ Mais popular
                  </Badge>
                )}
                <h3 className="text-xl font-bold text-white">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{p.price}</span>
                  {p.period && <span className="text-slate-400">{p.period}</span>}
                </div>
                <p className="text-sm text-slate-400 mt-2">{p.desc}</p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className={cn(
                    'mt-8 w-full h-12 rounded-xl font-semibold',
                    p.popular
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  )}
                >
                  Começar agora
                </Button>
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
            <Gauge className="h-14 w-14 text-blue-400 mx-auto mb-6" />
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              Pronto para transformar sua{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                operação?
              </span>
            </h2>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
              7 perfis de acesso, canvas colaborativo, auditoria global, SLA inteligente e muito mais.
              Comece agora, sem cartão de crédito.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-xl shadow-lg shadow-blue-500/25">
                  Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/showcase">
                <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800/50 px-8 text-lg h-14 rounded-xl">
                  <Eye className="mr-2 h-5 w-5" /> Ver apresentação interativa
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
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-500" />
              <span className="font-bold">JL Service Desk</span>
              <span className="text-slate-600 text-sm ml-2">© 2026</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
