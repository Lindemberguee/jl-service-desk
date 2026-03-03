import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring, AnimatePresence } from 'framer-motion';
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
  Bot, Target, Sparkles, Play, ChevronRight, Menu, X, HelpCircle, Plus, Minus,
  ArrowUpRight, Hexagon, CircuitBoard, Fingerprint, Radar, Crosshair,
  type LucideIcon, BookOpen
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
/*  Gradient mesh background                                           */
/* ------------------------------------------------------------------ */
function GradientMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.12)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute -bottom-1/2 -right-1/4 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      <div className="absolute top-1/3 right-1/3 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,transparent_70%)] animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Noise overlay                                                      */
/* ------------------------------------------------------------------ */
function NoiseOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.025] mix-blend-overlay"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Grid pattern                                                       */
/* ------------------------------------------------------------------ */
function GridPattern() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Floating particles                                                 */
/* ------------------------------------------------------------------ */
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: 4 + Math.random() * 8,
      delay: Math.random() * 5,
      size: Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-blue-400/30"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
          animate={{ y: [0, -60, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.section
      ref={ref} id={id}
      className={cn('relative py-28 md:py-36', className)}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  );
}

/* ------------------------------------------------------------------ */
/*  Glass card                                                         */
/* ------------------------------------------------------------------ */
function GlassCard({ children, className, delay = 0, hover = true, onClick }: {
  children: React.ReactNode; className?: string; delay?: number; hover?: boolean; onClick?: () => void;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      className={cn(
        'relative group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden',
        hover && 'hover:border-blue-500/20 hover:bg-white/[0.04] transition-all duration-500',
        className
      )}
      initial={{ opacity: 0, y: 25 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {hover && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] via-transparent to-violet-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Module card — clean hover reveal                                    */
/* ------------------------------------------------------------------ */
function ModuleCard({ icon: Icon, title, desc, features, gradient, delay = 0 }: {
  icon: LucideIcon; title: string; desc: string; features: string[]; gradient: string; delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className="group relative rounded-2xl p-[1px] overflow-hidden"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {/* Animated border gradient */}
      <div className={cn(
        'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700',
        'bg-gradient-to-br', gradient
      )} />
      <div className="absolute inset-[1px] rounded-2xl bg-slate-950" />

      {/* Content */}
      <div className="relative z-10 p-6 border border-white/[0.06] rounded-2xl group-hover:border-transparent transition-colors duration-500 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', gradient)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="text-[13px] text-slate-500 leading-relaxed mt-1">{desc}</p>
          </div>
        </div>

        <ul className="mt-auto pt-4 border-t border-white/[0.04] space-y-1.5">
          {features.slice(0, 4).map(f => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-slate-600 group-hover:text-slate-400 transition-colors">
              <CheckCircle2 className="h-3 w-3 text-emerald-500/50 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
          {features.length > 4 && (
            <li className="text-[11px] text-slate-700 pl-5">+{features.length - 4} mais</li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const allModules = [
  {
    icon: ClipboardList, title: 'Ordens de Serviço', gradient: 'from-blue-500 to-cyan-500',
    desc: 'Ciclo completo de chamados com workflow, SLA e cronômetro em tempo real.',
    features: ['Workflow: Abrir → Triagem → Execução → Concluir → Encerrar', 'Cronômetro em tempo real', 'SLA inteligente com prazos', 'Checklists dinâmicos por categoria', 'Custos integrados e exportação CSV', 'Tags, filtros avançados e paginação', 'Avaliação de qualidade pelo solicitante'],
  },
  {
    icon: BarChart3, title: 'Dashboard Operacional', gradient: 'from-cyan-500 to-teal-500',
    desc: 'Visão 360° com KPIs, gráficos interativos e indicadores em tempo real.',
    features: ['KPIs: Total, Abertas, Em Execução, Concluídas', 'Gráficos interativos Recharts', 'Indicadores de SLA e tempo médio', 'Custos consolidados', 'OS recentes com acesso rápido'],
  },
  {
    icon: Package, title: 'Controle de Estoque', gradient: 'from-amber-500 to-orange-500',
    desc: 'Inventário inteligente com rastreabilidade por OS e alertas automáticos.',
    features: ['CRUD com SKU, marca, modelo e unidade', 'Alertas visuais de nível mínimo', 'Movimentações: Entrada, Saída e Ajuste', 'Vinculação automática com OS', 'Importação/Exportação CSV'],
  },
  {
    icon: Target, title: 'KPIs & OKRs', gradient: 'from-indigo-500 to-violet-500',
    desc: 'Indicadores de performance e objetivos estratégicos orientados por dados.',
    features: ['Dashboard com gráficos e metas', 'Ciclos de OKR trimestrais e anuais', 'Key Results com check-ins', 'Indicadores de confiança visual', 'Vinculação KPIs ↔ resultados-chave'],
  },
  {
    icon: Wrench, title: 'Gestão de Manutenção', gradient: 'from-teal-500 to-green-500',
    desc: 'Manutenção preventiva, corretiva e preditiva com controle total.',
    features: ['Tipos: Preventiva, Corretiva, Preditiva', 'Status: Agendada, Em andamento, Concluída', 'Vinculação com ativos e OS', 'Registro de custo e peças', 'Agendamento e técnico responsável'],
  },
  {
    icon: Bell, title: 'Notificações Real-time', gradient: 'from-violet-500 to-purple-500',
    desc: 'Alertas instantâneos via Realtime com som e sincronização multi-device.',
    features: ['Push com toast e som', 'Badge de não lidas', 'Sincronização multi-dispositivo', 'Alertas de atribuição e status', 'Marcação individual e em massa'],
  },
  {
    icon: Boxes, title: 'Gestão de Ativos', gradient: 'from-lime-500 to-green-500',
    desc: 'Controle de patrimônio com componentes e histórico de manutenções.',
    features: ['Nº de série e código patrimonial', 'Status: Ativo, Inativo, Em Manutenção', 'Componentes vinculados ao estoque', 'Histórico de manutenções', 'Metadados flexíveis JSON'],
  },
  {
    icon: Palette, title: 'Canvas Colaborativo', gradient: 'from-purple-500 to-fuchsia-500',
    desc: 'Diagramação avançada com 15+ nós e colaboração em tempo real.',
    features: ['15+ tipos de nós com 8 handles', 'Setas: reto, curva, angulado', 'Efeitos neon e labels editáveis', 'Colaboração real-time com presença', 'Undo/Redo e exportação PNG', 'Compartilhamento público com token'],
  },
  {
    icon: StickyNote, title: 'Anotações Enterprise', gradient: 'from-yellow-500 to-amber-500',
    desc: 'Editor profissional Rich Text + Markdown com sincronização robusta.',
    features: ['Editor híbrido: Rich Text + Markdown', 'Sincronização com fila e retry', 'Proteção contra perda de dados', 'Pastas e tags personalizadas', 'Compartilhamento com permissões'],
  },
  {
    icon: Shield, title: 'RBAC com 7 Cargos', gradient: 'from-rose-500 to-pink-500',
    desc: 'Sistema robusto de permissões com isolamento multi-tenant.',
    features: ['7 cargos: Super Admin → Leitura', 'Matriz visual com toggles', 'Permissões granulares por módulo', 'PermissionGuard em todas as rotas', 'Controle de nota técnica'],
  },
  {
    icon: Building2, title: 'Multi-departamento', gradient: 'from-indigo-500 to-blue-500',
    desc: 'Arquitetura multi-tenant com Row Level Security nativo.',
    features: ['Isolamento completo por tenant', 'RLS nativo em todas as tabelas', 'Múltiplos departamentos por usuário', 'Super Admin com bypass global', 'Configurações independentes'],
  },
  {
    icon: History, title: 'Auditoria Global', gradient: 'from-emerald-500 to-teal-500',
    desc: 'Rastreamento completo de ações com metadados e retenção configurável.',
    features: ['Log de todas as operações', 'IP, navegador, SO e dispositivo', 'Gráfico de tendências', 'Paginação server-side', 'Retenção configurável'],
  },
  {
    icon: MonitorSmartphone, title: 'Painel do Técnico', gradient: 'from-teal-500 to-cyan-500',
    desc: 'Interface mobile-first exclusiva com glassmorphism e cronômetro.',
    features: ['Navegação inferior estilo app', 'Hero card para tarefa em execução', 'Cronômetro de mão de obra', 'Checklists e materiais', 'Workflow: Iniciar → Resolver'],
  },
  {
    icon: UserCheck, title: 'Portal do Solicitante', gradient: 'from-sky-500 to-blue-500',
    desc: 'Portal simplificado para abertura e acompanhamento de chamados.',
    features: ['Interface limpa e intuitiva', 'Abertura com prioridade', 'Acompanhamento em tempo real', 'Avaliação de qualidade', 'Perfil pessoal'],
  },
  {
    icon: BarChart, title: 'Relatórios Avançados', gradient: 'from-pink-500 to-rose-500',
    desc: 'Relatórios operacionais com envelhecimento de backlog e tendências.',
    features: ['Relatórios por status e período', 'Métricas de SLA e produtividade', 'Envelhecimento de backlog', 'Tendência de resolução', 'Satisfação por técnico'],
  },
  {
    icon: AlarmClock, title: 'Lembretes Inteligentes', gradient: 'from-green-500 to-emerald-500',
    desc: 'Lembretes com recorrência, categorias e prioridades.',
    features: ['Prioridades: Baixa, Média, Alta', 'Recorrência: diária, semanal, mensal', 'Categorias e tags', 'Conclusão com timestamp', 'Filtros e busca'],
  },
  {
    icon: Settings, title: 'Painel Administrativo', gradient: 'from-gray-500 to-slate-500',
    desc: 'Gestão centralizada de departamentos, usuários e sistema.',
    features: ['Gestão de departamentos e usuários', 'Reset de senhas', 'Saúde do Sistema', 'Sem self-signup público', 'Identidade Visual por tenant'],
  },
  {
    icon: FileText, title: 'Dados Mestres (CRUD)', gradient: 'from-orange-500 to-red-500',
    desc: 'CRUD completo de unidades, locais, categorias e colaboradores.',
    features: ['Unidades, Locais, Categorias', 'Solicitantes com conta de acesso', 'Colaboradores com matrícula', 'Campos personalizados', 'Ativação/desativação'],
  },
  {
    icon: FolderOpen, title: 'Documentos & Biblioteca', gradient: 'from-blue-500 to-indigo-500',
    desc: 'Gestão documental com versionamento, pastas e vinculação a OS e ativos.',
    features: ['Upload com versionamento automático', 'Organização por pastas e categorias', 'Vinculação a OS e ativos', 'Controle de permissões por perfil', 'Busca e filtros avançados'],
  },
  {
    icon: AlertTriangle, title: 'Gestão de Descartes', gradient: 'from-red-500 to-orange-500',
    desc: 'Controle de descarte de materiais e ativos com workflow de aprovação.',
    features: ['Fluxo: Pendente → Aprovado/Rejeitado', 'Origem: Estoque ou Ativos', 'Motivos: Defeito, Vencido, Obsoleto, etc.', 'Anexos e valor residual', 'Aprovação por gestor com registro'],
  },
  {
    icon: Lock, title: 'Cofre Digital', gradient: 'from-slate-500 to-zinc-500',
    desc: 'Armazenamento seguro de senhas, credenciais e informações sensíveis.',
    features: ['Criptografia de dados sensíveis', 'Organização por categorias', 'Acesso restrito por permissão', 'Histórico de alterações', 'Busca rápida e segura'],
  },
  {
    icon: BookOpen, title: 'Base de Conhecimento', gradient: 'from-emerald-500 to-green-500',
    desc: 'Wiki interna com artigos técnicos, tutoriais e documentação operacional.',
    features: ['Editor rich text completo', 'Categorias e tags', 'Controle de publicação', 'Contador de visualizações', 'Busca por título e conteúdo'],
  },
  {
    icon: ListChecks, title: 'Templates de Checklist', gradient: 'from-cyan-500 to-sky-500',
    desc: 'Modelos reutilizáveis de checklists vinculados a categorias de OS.',
    features: ['Criação de templates flexíveis', 'Vinculação por categoria de OS', 'Itens ordenáveis', 'Aplicação automática na OS', 'Gestão centralizada'],
  },
  {
    icon: Sparkles, title: 'Tema Personalizado', gradient: 'from-fuchsia-500 to-pink-500',
    desc: 'Personalização visual individual com cores e temas por usuário.',
    features: ['Temas prontos (8+ opções)', 'Cor primária customizável', 'Fundo do menu personalizável', 'Dark mode nativo', 'Preview em tempo real'],
  },
  {
    icon: Network, title: 'API & Integrações', gradient: 'from-violet-500 to-indigo-500',
    desc: 'API RESTful documentada com chaves de acesso e logs de requisição.',
    features: ['Documentação interativa', 'Chaves de API por tenant', 'Logs de requisição com latência', 'Rate limiting configurável', 'Endpoints para OS, estoque e mais'],
  },
];

const moduleCategories = [
  { label: 'Todos', filter: null },
  { label: 'Operacional', filter: ['Ordens de Serviço', 'Dashboard Operacional', 'Controle de Estoque', 'Gestão de Manutenção', 'Gestão de Ativos', 'Relatórios Avançados', 'Gestão de Descartes'] },
  { label: 'Estratégico', filter: ['KPIs & OKRs', 'Canvas Colaborativo', 'Anotações Enterprise', 'Lembretes Inteligentes'] },
  { label: 'Conhecimento', filter: ['Documentos & Biblioteca', 'Base de Conhecimento', 'Templates de Checklist'] },
  { label: 'Segurança', filter: ['RBAC com 7 Cargos', 'Multi-departamento', 'Auditoria Global', 'Cofre Digital'] },
  { label: 'Interfaces', filter: ['Painel do Técnico', 'Portal do Solicitante', 'Painel Administrativo', 'Dados Mestres (CRUD)'] },
  { label: 'Plataforma', filter: ['Notificações Real-time', 'Tema Personalizado', 'API & Integrações'] },
];

const roleDetails = [
  { role: 'Super Admin', desc: 'Acesso total. Gerencia departamentos, usuários e configurações globais.', color: 'from-red-500 to-rose-500', icon: Key },
  { role: 'Administrador', desc: 'Gestão completa do departamento, cria usuários e define permissões.', color: 'from-orange-500 to-amber-500', icon: Settings },
  { role: 'Coordenador', desc: 'Gerencia workflow de OS, cadastros e equipe do departamento.', color: 'from-yellow-500 to-amber-400', icon: Workflow },
  { role: 'Técnico', desc: 'Executa OS com cronômetro, checklists e materiais via painel mobile.', color: 'from-green-500 to-emerald-500', icon: Wrench },
  { role: 'Analista', desc: 'Gestão de estoque, materiais, relatórios e KPIs.', color: 'from-cyan-500 to-blue-500', icon: BarChart },
  { role: 'Solicitante', desc: 'Abre chamados pelo portal simplificado e acompanha o status.', color: 'from-blue-500 to-indigo-500', icon: UserCheck },
  { role: 'Leitura', desc: 'Visualização completa sem edição. Ideal para supervisão.', color: 'from-slate-500 to-gray-500', icon: Eye },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard Operacional', desc: 'Visão 360° com KPIs, gráficos interativos e ordens recentes em tempo real' },
  { src: screenshotWorkorders, title: 'Gestão de OS', desc: 'Lista completa com filtros avançados, busca, status e paginação' },
  { src: screenshotStock, title: 'Controle de Estoque', desc: 'Inventário inteligente com cards informativos, alertas e movimentações' },
];

const techStack = [
  { icon: Zap, title: 'Tempo Real', desc: 'Comunicação instantânea' },
  { icon: Database, title: 'PostgreSQL', desc: 'Banco robusto com RLS' },
  { icon: Lock, title: 'RLS Nativo', desc: 'Isolamento por tenant' },
  { icon: Smartphone, title: 'Responsivo', desc: 'Desktop, tablet e mobile' },
  { icon: Globe, title: 'Cloud Nativo', desc: 'Infraestrutura escalável' },
  { icon: ShieldCheck, title: 'Auditoria', desc: 'Cada ação rastreada' },
];

const faqItems = [
  { q: 'O que é o OrdFy?', a: 'O OrdFy é uma plataforma completa de gestão de manutenção e facilities com 25+ módulos integrados, 7 perfis de acesso, multi-departamento e tudo em tempo real.' },
  { q: 'Preciso instalar alguma coisa?', a: 'Não! É 100% web. Funciona em qualquer navegador moderno — computador, tablet ou celular.' },
  { q: 'Quantos usuários posso ter?', a: 'Depende do plano contratado. Podemos personalizar de acordo com sua operação. Fale conosco pelo WhatsApp.' },
  { q: 'Como funciona o controle de acesso?', a: '7 perfis (Super Admin, Admin, Coordenador, Técnico, Analista, Solicitante e Leitura) com matriz de permissões granulares e isolamento total por departamento.' },
  { q: 'Posso usar em múltiplos departamentos?', a: 'Sim! Arquitetura multi-tenant com isolamento total de dados via Row Level Security.' },
  { q: 'Meus dados estão seguros?', a: 'PostgreSQL com RLS nativo, auditoria global, HTTPS e infraestrutura cloud de alta disponibilidade.' },
  { q: 'Existe período de teste?', a: 'Sim! Oferecemos avaliação gratuita. Fale conosco pelo WhatsApp para começar.' },
  { q: 'Integra com outros sistemas?', a: 'Sim, via API e importação/exportação CSV. Para integrações personalizadas, entre em contato.' },
];

/* ------------------------------------------------------------------ */
/*  FAQ Accordion                                                      */
/* ------------------------------------------------------------------ */
function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {faqItems.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <motion.div
            key={i}
            className={cn(
              'rounded-xl border overflow-hidden transition-all duration-300',
              isOpen ? 'border-blue-500/20 bg-white/[0.03]' : 'border-white/[0.06] bg-transparent hover:border-white/[0.1]'
            )}
          >
            <button onClick={() => setOpenIndex(isOpen ? null : i)} className="w-full flex items-center justify-between px-6 py-5 text-left">
              <span className={cn('text-sm font-medium transition-colors', isOpen ? 'text-white' : 'text-slate-400')}>
                {item.q}
              </span>
              <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <Plus className={cn('h-4 w-4 shrink-0', isOpen ? 'text-blue-400' : 'text-slate-600')} />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const headerBg = useTransform(scrollYProgress, [0, 0.02], [0, 1]);
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const heroRef = useRef(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(heroProgress, [0, 1], ['0%', '30%']);

  useEffect(() => {
    const timer = setInterval(() => setActiveScreenshot(p => (p + 1) % screenshots.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredModules = useMemo(() => {
    const cat = moduleCategories[activeCategory];
    if (!cat.filter) return allModules;
    return allModules.filter(m => cat.filter!.includes(m.title));
  }, [activeCategory]);

  const navLinks = [
    { href: '#modules', label: 'Módulos' },
    { href: '#screenshots', label: 'Sistema' },
    { href: '#roles', label: 'Perfis' },
    { href: '#pricing', label: 'Planos' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <div className="min-h-screen bg-[#06080f] text-white overflow-x-hidden selection:bg-blue-500/30">
      {/* Progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-500 z-50 origin-left"
        style={{ scaleX: springProgress }}
      />

      {/* Header */}
      <motion.header className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.04]"
        style={{ backgroundColor: useTransform(headerBg, v => `rgba(6,8,15,${v * 0.9})`) as any, backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/ordfy-logo.png" alt="OrdFy" className="h-7 w-7 rounded-lg" />
            <span className="font-bold text-lg tracking-tight">
              Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-500">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="hover:text-white transition-colors duration-300">{l.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href="/login" className="hidden md:block">
              <Button className="bg-white text-slate-900 hover:bg-slate-200 rounded-full px-6 h-9 text-sm font-medium shadow-lg shadow-white/5">
                Acessar <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </a>
            <button className="md:hidden text-slate-400" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenu && (
            <motion.div
              className="md:hidden bg-[#06080f]/95 backdrop-blur-xl border-t border-white/[0.04] px-6 py-4 space-y-3"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            >
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setMobileMenu(false)} className="block text-sm text-slate-400 hover:text-white py-2">{l.label}</a>
              ))}
              <a href="/login"><Button className="w-full mt-2 bg-white text-slate-900 rounded-full">Acessar</Button></a>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section ref={heroRef} className="relative min-h-[105vh] flex items-center justify-center overflow-hidden">
        <GradientMesh />
        <GridPattern />
        <FloatingParticles />
        <NoiseOverlay />

        <motion.div className="relative z-10 max-w-5xl mx-auto px-6 text-center" style={{ opacity: heroOpacity, y: heroY }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <Badge className="mb-8 text-xs px-4 py-2 bg-white/[0.04] text-slate-400 border-white/[0.08] hover:bg-white/[0.06] rounded-full backdrop-blur-sm font-medium">
              <CircuitBoard className="h-3.5 w-3.5 mr-2 text-blue-400" />
              Plataforma de gestão de manutenção e facilities
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-[-0.03em] leading-[1.05]"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="text-white">Gestão inteligente</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              em tempo real
            </span>
          </motion.h1>

          <motion.p
            className="mt-8 text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            25+ módulos integrados para ordens de serviço, estoque, ativos, manutenção,
            KPIs, canvas colaborativo, auditoria e muito mais.
          </motion.p>

          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <a href="/login">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 text-sm h-12 rounded-full shadow-xl shadow-white/10 font-medium">
                Começar agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a href="/showcase">
              <Button size="lg" variant="outline" className="border-white/10 text-slate-400 hover:bg-white/[0.04] hover:text-white px-8 text-sm h-12 rounded-full backdrop-blur-sm">
                <Play className="mr-2 h-4 w-4" /> Ver apresentação
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { value: 25, suffix: '+', label: 'Módulos' },
              { value: 7, suffix: '', label: 'Perfis de Acesso' },
              { value: 10, suffix: '+', label: 'Status de OS' },
              { value: 100, suffix: '%', label: 'Tempo Real' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-[11px] text-slate-600 mt-1.5 uppercase tracking-[0.15em]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <ChevronDown className="h-5 w-5 text-slate-700" />
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  MODULES                                                      */}
      {/* ============================================================ */}
      <Section id="modules">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <Badge className="mb-4 bg-blue-500/[0.08] text-blue-400 border-blue-500/20 rounded-full text-xs px-4 py-1.5">
                25+ Módulos Integrados
              </Badge>
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Tudo que sua operação{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">precisa</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm">
              Clique em qualquer módulo para ver as funcionalidades detalhadas
            </p>
          </div>

          {/* Category filter pills */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {moduleCategories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(i)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-medium transition-all duration-300',
                  activeCategory === i
                    ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                    : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 border border-white/[0.06]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Module grid */}
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredModules.map((m, i) => (
                <ModuleCard key={m.title} {...m} delay={i * 0.04} />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  SCREENSHOTS                                                  */}
      {/* ============================================================ */}
      <Section id="screenshots" className="overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-violet-500/[0.08] text-violet-400 border-violet-500/20 rounded-full text-xs px-4 py-1.5">Interface</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Veja o sistema{' '}
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">em ação</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm">
              Interfaces modernas, responsivas e construídas para produtividade máxima
            </p>
          </div>

          {/* Featured screenshot */}
          <div className="relative max-w-5xl mx-auto mb-12">
            <div className="flex justify-center gap-2 mb-8 flex-wrap">
              {screenshots.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setActiveScreenshot(i)}
                  className={cn(
                    'px-5 py-2.5 rounded-full text-xs font-medium transition-all duration-300',
                    activeScreenshot === i
                      ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                      : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] border border-white/[0.06]'
                  )}
                >
                  {s.title}
                </button>
              ))}
            </div>

            {/* Browser chrome */}
            <div className="bg-white/[0.03] rounded-t-2xl border border-white/[0.06] border-b-0 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-white/[0.04] rounded-lg px-4 py-1.5 text-[11px] text-slate-600 max-w-sm mx-auto text-center font-mono">
                  ordfy.app/{screenshots[activeScreenshot].title.toLowerCase().replace(/ /g, '-')}
                </div>
              </div>
            </div>

            <motion.div
              key={activeScreenshot}
              className="rounded-b-2xl overflow-hidden border border-white/[0.06] border-t-0 shadow-2xl shadow-black/50"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <img src={screenshots[activeScreenshot].src} alt={screenshots[activeScreenshot].title} className="w-full h-auto" />
            </motion.div>

            <div className="text-center mt-6">
              <h3 className="text-lg font-semibold text-white">{screenshots[activeScreenshot].title}</h3>
              <p className="text-sm text-slate-500 mt-1">{screenshots[activeScreenshot].desc}</p>
            </div>

            <div className="absolute -inset-20 bg-blue-500/[0.03] blur-[100px] rounded-full -z-10 pointer-events-none" />
          </div>

          {/* All screenshots grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {screenshots.map((s, i) => (
              <GlassCard key={s.title} delay={i * 0.1} className="overflow-hidden cursor-pointer" onClick={() => setActiveScreenshot(i)}>
                <div className="aspect-video overflow-hidden">
                  <img src={s.src} alt={s.title} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-4">
                  <h4 className="text-sm font-semibold text-white">{s.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-1">{s.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ROLES                                                        */}
      {/* ============================================================ */}
      <Section id="roles">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-cyan-500/[0.08] text-cyan-400 border-cyan-500/20 rounded-full text-xs px-4 py-1.5">Perfis de Acesso</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4">
              7 perfis,{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">um para cada necessidade</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {roleDetails.map((r, i) => (
              <GlassCard key={r.role} delay={i * 0.05} className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center', r.color)}>
                    <r.icon className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="font-semibold text-sm text-white">{r.role}</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{r.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  TECH STACK                                                    */}
      {/* ============================================================ */}
      <Section id="tech" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-white/[0.04] text-slate-400 border-white/[0.06] rounded-full text-xs px-4 py-1.5">Tecnologia</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-4">
              Construído com{' '}
              <span className="text-white">tecnologia de ponta</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {techStack.map((a, i) => (
              <GlassCard key={a.title} delay={i * 0.04} className="text-center p-5">
                <a.icon className="h-6 w-6 text-blue-400/70 mx-auto mb-3" />
                <h4 className="text-xs font-semibold text-white mb-0.5">{a.title}</h4>
                <p className="text-[11px] text-slate-600">{a.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  PRICING                                                      */}
      {/* ============================================================ */}
      <Section id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20 rounded-full text-xs px-4 py-1.5">Planos</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Escolha o plano{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">ideal</span>
            </h2>
            <p className="text-slate-500 mt-4 max-w-xl mx-auto text-sm">
              Planos flexíveis para cada tamanho de operação. Todos incluem suporte e atualizações.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {/* Starter */}
            <GlassCard delay={0} className="p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">Para equipes pequenas que estão começando</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">R$ 299</span>
                  <span className="text-sm text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">até 5 usuários</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Ordens de Serviço completas', 'Dashboard Operacional', 'Gestão de Ativos', 'Controle de Estoque', 'Portal do Solicitante', 'Notificações em tempo real', 'Suporte por e-mail'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500/70 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/5512996543522?text=Olá!%20Tenho%20interesse%20no%20plano%20Starter%20do%20OrdFy." target="_blank" rel="noopener noreferrer">
                <Button className="w-full rounded-full h-11 bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                  Começar agora
                </Button>
              </a>
            </GlassCard>

            {/* Professional — featured */}
            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-blue-500 via-violet-500 to-cyan-500 opacity-60" />
              <div className="absolute inset-0 rounded-2xl bg-[#06080f]" />
              <div className="relative z-10 p-8 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">Professional</h3>
                    <p className="text-xs text-slate-400 mt-1">Para operações em crescimento</p>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-3 py-1">Popular</Badge>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-white">R$ 799</span>
                    <span className="text-sm text-slate-400">/mês</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">até 20 usuários</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {['Tudo do Starter +', 'KPIs & OKRs', 'Gestão de Manutenção', 'Relatórios Avançados', 'Documentos & Biblioteca', 'Base de Conhecimento', 'Templates de Checklist', 'API & Integrações', 'Painel do Técnico', 'Suporte prioritário'].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="https://wa.me/5512996543522?text=Olá!%20Tenho%20interesse%20no%20plano%20Professional%20do%20OrdFy." target="_blank" rel="noopener noreferrer">
                  <Button className="w-full rounded-full h-11 bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium shadow-lg shadow-white/10">
                    Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Enterprise */}
            <GlassCard delay={0.1} className="p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-500 mt-1">Para grandes operações e multi-departamento</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">R$ 1.999</span>
                  <span className="text-sm text-slate-500">/mês</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">usuários ilimitados</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Tudo do Professional +', 'Canvas Colaborativo', 'Anotações Enterprise', 'Cofre Digital', 'Auditoria Global', 'Lembretes Inteligentes', 'Gestão de Descartes', 'Branding por departamento', 'Multi-departamento ilimitado', 'Suporte dedicado'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-400">
                    <CheckCircle2 className="h-4 w-4 text-violet-400/70 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a href="https://wa.me/5512996543522?text=Olá!%20Tenho%20interesse%20no%20plano%20Enterprise%20do%20OrdFy." target="_blank" rel="noopener noreferrer">
                <Button className="w-full rounded-full h-11 bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] text-sm font-medium">
                  Falar com vendas
                </Button>
              </a>
            </GlassCard>
          </div>

          <div className="text-center mt-10">
            <p className="text-xs text-slate-600">
              Todos os planos incluem SSL, backups diários e 99.9% de uptime. Precisa de algo customizado?{' '}
              <a href="https://wa.me/5512996543522?text=Olá!%20Preciso%20de%20um%20plano%20customizado%20do%20OrdFy." target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                Fale conosco
              </a>
            </p>
          </div>
        </div>
      </Section>
      {/* ============================================================ */}
      {/*  CTA                                                          */}
      {/* ============================================================ */}
      <Section className="py-36">
        <div className="max-w-3xl mx-auto px-6 text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/[0.06] via-violet-500/[0.06] to-cyan-500/[0.06] blur-[120px] pointer-events-none rounded-full" />
          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Pronto para transformar sua{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                operação?
              </span>
            </h2>
            <p className="mt-6 text-base text-slate-500 max-w-lg mx-auto">
              25+ módulos, 7 perfis de acesso, SLA inteligente, auditoria global e muito mais. Comece agora.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 px-8 text-sm h-12 rounded-full shadow-xl shadow-white/10 font-medium">
                  Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="/showcase">
                <Button size="lg" variant="outline" className="border-white/10 text-slate-400 hover:bg-white/[0.04] px-8 text-sm h-12 rounded-full">
                  <Play className="mr-2 h-4 w-4" /> Apresentação interativa
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FAQ                                                           */}
      {/* ============================================================ */}
      <Section id="faq">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-sky-500/[0.08] text-sky-400 border-sky-500/20 rounded-full text-xs px-4 py-1.5">FAQ</Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mt-4">
              Perguntas{' '}
              <span className="bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">frequentes</span>
            </h2>
          </div>
          <FaqAccordion />
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-white/[0.04] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <img src="/ordfy-logo.png" alt="OrdFy" className="h-6 w-6 rounded-lg" />
            <span className="font-bold text-sm">
              Ord<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
            </span>
            <span className="text-slate-700 text-xs ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Suporte</a>
          </div>
        </div>
      </footer>

      {/* WhatsApp */}
      <motion.a
        href="https://wa.me/5512996543522?text=Olá!%20Tenho%20interesse%20no%20OrdFy%20e%20gostaria%20de%20saber%20mais."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white pl-5 pr-6 py-3.5 rounded-full shadow-2xl shadow-emerald-500/25 transition-all duration-300 group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="text-sm font-medium hidden sm:inline">Fale conosco</span>
      </motion.a>
    </div>
  );
}
