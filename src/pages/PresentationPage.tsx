import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, BarChart3, Package, Shield, Users, Wrench, Bell,
  Building2, FileText, Settings, Layers, UserCheck, Target, Workflow,
  StickyNote, AlarmClock, Boxes, History, MonitorSmartphone, Palette,
  Network, Key, AlertTriangle, BookOpen, ListChecks, Lock, Eye,
  Code2, Monitor, ChevronLeft, ChevronRight, Maximize, Minimize,
  Sparkles, Zap, ArrowRight, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.jpg';
import screenshotWorkorders from '@/assets/showcase/screenshot-workorders.jpg';
import screenshotStock from '@/assets/showcase/screenshot-stock.jpg';

/* ------------------------------------------------------------------ */
/*  Slide Data                                                         */
/* ------------------------------------------------------------------ */

// Slides are simple components with no props

const modules: { icon: LucideIcon; title: string; gradient: string }[] = [
  { icon: ClipboardList, title: 'Ordens de Serviço', gradient: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3, title: 'Dashboard', gradient: 'from-cyan-500 to-teal-500' },
  { icon: Package, title: 'Estoque', gradient: 'from-amber-500 to-orange-500' },
  { icon: Boxes, title: 'Ativos', gradient: 'from-lime-500 to-green-500' },
  { icon: Target, title: 'KPIs & OKRs', gradient: 'from-indigo-500 to-violet-500' },
  { icon: Wrench, title: 'Manutenção', gradient: 'from-teal-500 to-green-500' },
  { icon: Bell, title: 'Notificações', gradient: 'from-violet-500 to-purple-500' },
  { icon: Workflow, title: 'Canvas', gradient: 'from-purple-500 to-fuchsia-500' },
  { icon: StickyNote, title: 'Anotações', gradient: 'from-yellow-500 to-amber-500' },
  { icon: Shield, title: 'RBAC', gradient: 'from-rose-500 to-pink-500' },
  { icon: Building2, title: 'Multi-tenant', gradient: 'from-indigo-500 to-blue-500' },
  { icon: History, title: 'Auditoria', gradient: 'from-emerald-500 to-teal-500' },
  { icon: MonitorSmartphone, title: 'Painel Técnico', gradient: 'from-teal-500 to-cyan-500' },
  { icon: UserCheck, title: 'Portal Solicitante', gradient: 'from-sky-500 to-blue-500' },
  { icon: BarChart3, title: 'Relatórios', gradient: 'from-pink-500 to-rose-500' },
  { icon: AlarmClock, title: 'Lembretes', gradient: 'from-green-500 to-emerald-500' },
  { icon: FileText, title: 'Documentos', gradient: 'from-blue-500 to-indigo-500' },
  { icon: AlertTriangle, title: 'Descartes', gradient: 'from-red-500 to-orange-500' },
  { icon: Lock, title: 'Cofre Digital', gradient: 'from-slate-500 to-zinc-500' },
  { icon: BookOpen, title: 'Base de Conhecimento', gradient: 'from-emerald-500 to-green-500' },
  { icon: ListChecks, title: 'Checklists', gradient: 'from-cyan-500 to-sky-500' },
  { icon: Palette, title: 'Temas', gradient: 'from-fuchsia-500 to-pink-500' },
  { icon: Network, title: 'API REST', gradient: 'from-violet-500 to-indigo-500' },
  { icon: Settings, title: 'Admin', gradient: 'from-gray-500 to-slate-500' },
];

const roles = [
  { role: 'Super Admin', icon: Key, color: 'from-red-500 to-rose-500', desc: 'Acesso total e gestão global da plataforma' },
  { role: 'Administrador', icon: Settings, color: 'from-orange-500 to-amber-500', desc: 'Gestão completa do departamento' },
  { role: 'Coordenador', icon: Workflow, color: 'from-yellow-500 to-amber-400', desc: 'Workflow de OS, equipes e cadastros' },
  { role: 'Técnico', icon: Wrench, color: 'from-green-500 to-emerald-500', desc: 'Execução via painel mobile-first' },
  { role: 'Analista', icon: BarChart3, color: 'from-cyan-500 to-blue-500', desc: 'Estoque, relatórios e KPIs' },
  { role: 'Solicitante', icon: UserCheck, color: 'from-blue-500 to-indigo-500', desc: 'Portal simplificado de chamados' },
  { role: 'Leitura', icon: Eye, color: 'from-slate-500 to-gray-500', desc: 'Visualização sem edição' },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard Operacional' },
  { src: screenshotWorkorders, title: 'Ordens de Serviço' },
  { src: screenshotStock, title: 'Controle de Estoque' },
];

/* ------------------------------------------------------------------ */
/*  Slides                                                             */
/* ------------------------------------------------------------------ */

function SlideIntro() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <img src="/ordfy-logo.png" alt="OrdFy" className="h-20 w-20 rounded-2xl mx-auto mb-8 shadow-2xl shadow-blue-500/20" />
      </motion.div>
      <motion.h1
        className="text-6xl md:text-8xl font-black tracking-[-0.04em] leading-[0.95]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">Ord</span>
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Fy</span>
      </motion.h1>
      <motion.p
        className="mt-6 text-xl md:text-2xl text-slate-400 max-w-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Plataforma CMMS de Nova Geração
      </motion.p>
      <motion.div
        className="mt-10 flex items-center gap-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[
          { value: '25+', label: 'Módulos' },
          { value: '7', label: 'Perfis' },
          { value: '100%', label: 'Real-time' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-extrabold text-white">{s.value}</div>
            <div className="text-[11px] text-slate-600 uppercase tracking-[0.15em] mt-1">{s.label}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function SlideOverview() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Sparkles className="h-8 w-8 text-blue-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
          Visão <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Geral</span>
        </h2>
      </motion.div>
      <motion.div
        className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { icon: ClipboardList, title: 'Gestão de OS completa', desc: 'SLA, cronômetro, workflow, checklist e custos' },
          { icon: Boxes, title: 'Ativos & Manutenção', desc: 'Patrimônio, componentes, preventiva e corretiva' },
          { icon: Package, title: 'Estoque inteligente', desc: 'Alertas automáticos, movimentações e controle' },
          { icon: Target, title: 'KPIs & OKRs', desc: 'Indicadores estratégicos com metas e check-ins' },
          { icon: Shield, title: 'Segurança enterprise', desc: 'RBAC, RLS, auditoria e cofre digital' },
          { icon: Building2, title: 'Multi-tenant', desc: 'Isolamento total entre departamentos' },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <item.icon className="h-6 w-6 text-blue-400 mb-3" />
            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function SlideModules() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <Layers className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">25+ Módulos</span> Integrados
        </h2>
      </motion.div>
      <motion.div
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 max-w-5xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {modules.map((m, i) => (
          <motion.div
            key={m.title}
            className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-center group hover:border-white/[0.12] transition-all"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.02 }}
          >
            <div className={cn('h-8 w-8 rounded-lg mx-auto mb-2 flex items-center justify-center bg-gradient-to-br', m.gradient)}>
              <m.icon className="h-3.5 w-3.5 text-white" />
            </div>
            <p className="text-[9px] text-slate-500 font-medium group-hover:text-slate-300 transition-colors leading-tight">{m.title}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function SlideArchitecture() {
  const layers = [
    { label: 'Frontend', items: ['React 18 + TypeScript', 'Tailwind CSS + shadcn/ui', 'Framer Motion + GSAP', 'React Query (cache)'], color: 'from-blue-500 to-cyan-500' },
    { label: 'Backend', items: ['Edge Functions (Deno)', 'PostgreSQL + RLS', 'Realtime (WebSocket)', 'Storage (arquivos)'], color: 'from-violet-500 to-purple-500' },
    { label: 'Segurança', items: ['Row Level Security', 'RBAC com 7 perfis', 'Auditoria completa', 'Cofre criptografado'], color: 'from-rose-500 to-pink-500' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Code2 className="h-8 w-8 text-violet-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          Arquitetura <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Moderna</span>
        </h2>
      </motion.div>
      <div className="flex flex-col md:flex-row gap-6 max-w-5xl w-full">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.15 }}
          >
            <div className={cn('h-10 w-10 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br', layer.color)}>
              <span className="text-white font-bold text-sm">{i + 1}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-3">{layer.label}</h3>
            <ul className="space-y-2">
              {layer.items.map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/60 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideRoles() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Shield className="h-8 w-8 text-rose-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          Controle de <span className="bg-gradient-to-r from-rose-400 to-violet-400 bg-clip-text text-transparent">Acesso</span>
        </h2>
        <p className="text-slate-500 mt-3 text-sm">7 perfis com permissões 100% configuráveis</p>
      </motion.div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 max-w-5xl">
        {roles.map((r, i) => (
          <motion.div
            key={r.role}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center hover:border-white/[0.12] transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
          >
            <div className={cn('h-10 w-10 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br', r.color)}>
              <r.icon className="h-4 w-4 text-white" />
            </div>
            <h4 className="text-xs font-semibold text-white mb-1">{r.role}</h4>
            <p className="text-[10px] text-slate-600 leading-relaxed">{r.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideMultiTenant() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Building2 className="h-8 w-8 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">Multi-Tenant</span> Nativo
        </h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {[
          { title: 'Isolamento por RLS', desc: 'Cada departamento só acessa seus próprios dados. Segurança no nível do banco de dados.', icon: Lock },
          { title: 'Branding por Tenant', desc: 'Logo, nome e identidade visual personalizados por departamento.', icon: Palette },
          { title: 'Gestão SaaS', desc: 'Painel Master com MRR, controle de planos, assinaturas e onboarding.', icon: Monitor },
          { title: 'Módulos Configuráveis', desc: 'Cada plano define quais módulos estão disponíveis para o tenant.', icon: Settings },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 flex gap-4"
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideScreenshots() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % screenshots.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <Monitor className="h-8 w-8 text-cyan-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          Interface <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Moderna</span>
        </h2>
      </motion.div>
      <div className="max-w-4xl w-full">
        <div className="flex justify-center gap-2 mb-4">
          {screenshots.map((s, i) => (
            <button key={s.title} onClick={() => setActive(i)} className={cn(
              'px-4 py-2 rounded-full text-xs font-medium transition-all',
              active === i ? 'bg-white text-slate-900' : 'bg-white/[0.04] text-slate-500 border border-white/[0.06]'
            )}>
              {s.title}
            </button>
          ))}
        </div>
        <div className="relative rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl shadow-black/40 aspect-[16/9]">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={active}
              src={screenshots[active].src}
              alt={screenshots[active].title}
              className="absolute inset-0 w-full h-full object-cover object-top"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function SlidePortals() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Users className="h-8 w-8 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          Portais <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Dedicados</span>
        </h2>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {[
          { title: 'Portal do Solicitante', desc: 'Abertura de chamados simplificada, acompanhamento em tempo real, comunicação direta com o técnico.', icon: UserCheck, gradient: 'from-blue-500 to-indigo-500' },
          { title: 'Painel do Técnico', desc: 'Interface mobile-first com cronômetro, checklist, custos de mão-de-obra e peças, timeline completa.', icon: MonitorSmartphone, gradient: 'from-green-500 to-emerald-500' },
          { title: 'Painel Administrativo', desc: 'Dashboard consolidado, departamentos, permissões, auditoria, saúde do sistema e configurações.', icon: Settings, gradient: 'from-orange-500 to-amber-500' },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.12 }}
          >
            <div className={cn('h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br', item.gradient)}>
              <item.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideFeatures() {
  const features = [
    'SLA com cronômetro e pausa automática',
    'Notificações real-time com WebSocket',
    'Controle de custos (mão de obra + peças)',
    'Histórico completo com timeline',
    'Exportação para Excel (XLSX)',
    'Temas personalizáveis por usuário',
    'API REST documentada com chaves',
    'Canvas colaborativo (React Flow)',
    'Anotações com Markdown',
    'Lembretes com recorrência',
    'Base de Conhecimento (Wiki)',
    'Cofre Digital criptografado',
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
        <Zap className="h-8 w-8 text-amber-400 mx-auto mb-4" />
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
          Funcionalidades <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Avançadas</span>
        </h2>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl w-full">
        {features.map((f, i) => (
          <motion.div
            key={f}
            className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400/60 shrink-0" />
            <span className="text-xs text-slate-300">{f}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SlideEnd() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <img src="/ordfy-logo.png" alt="OrdFy" className="h-16 w-16 rounded-2xl mx-auto mb-8 shadow-2xl shadow-blue-500/20" />
      </motion.div>
      <motion.h2
        className="text-5xl md:text-7xl font-black tracking-tight"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
          Obrigado!
        </span>
      </motion.h2>
      <motion.p
        className="mt-6 text-lg text-slate-400 max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Dúvidas? Vamos conversar sobre como o OrdFy pode transformar sua operação.
      </motion.p>
      <motion.div
        className="mt-10 flex gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="text-xs text-slate-600">contato@ordfy.com.br</div>
        <div className="text-xs text-slate-700">·</div>
        <div className="text-xs text-slate-600">(12) 99654-3522</div>
      </motion.div>
    </div>
  );
}

const slides = [
  SlideIntro,
  SlideOverview,
  SlideModules,
  SlideArchitecture,
  SlideRoles,
  SlideMultiTenant,
  SlidePortals,
  SlideScreenshots,
  SlideFeatures,
  SlideEnd,
];

const slideLabels = [
  'Início', 'Visão Geral', 'Módulos', 'Arquitetura', 'Acesso',
  'Multi-Tenant', 'Portais', 'Interface', 'Funcionalidades', 'Fim',
];

/* ------------------------------------------------------------------ */
/*  MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */
export default function PresentationPage() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current]);

  const next = useCallback(() => {
    if (current < slides.length - 1) goTo(current + 1);
  }, [current, goTo]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'Escape' && isFullscreen) document.exitFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [next, prev, toggleFullscreen, isFullscreen]);

  const CurrentSlide = slides[current];

  return (
    <div className="h-screen w-screen bg-[#050a18] text-white overflow-hidden flex flex-col select-none">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-500/[0.06] blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[150px]" />
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <CurrentSlide />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-3 border-t border-white/[0.04] bg-[#050a18]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <img src="/ordfy-logo.png" alt="OrdFy" className="h-5 w-5 rounded" />
          <span className="text-[11px] text-slate-600 font-medium">
            {slideLabels[current]} · {current + 1}/{slides.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'rounded-full transition-all duration-300',
                i === current ? 'w-6 h-1.5 bg-blue-400' : 'w-1.5 h-1.5 bg-white/10 hover:bg-white/25'
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={prev} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={next} disabled={current === slides.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
