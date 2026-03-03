import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  ClipboardList, BarChart3, Package, Shield, Users, Wrench, Bell,
  Building2, FileText, Settings, Layers, UserCheck, Target, Workflow,
  StickyNote, AlarmClock, Boxes, History, MonitorSmartphone, Palette,
  Network, Key, AlertTriangle, BookOpen, ListChecks, Lock, Eye,
  Code2, Monitor, ChevronLeft, ChevronRight, Maximize, Minimize,
  Sparkles, Zap, CheckCircle2, Database, Globe, Cpu, Wifi, Timer,
  Gauge, ShieldCheck, Fingerprint, FolderLock, Activity, TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import screenshotDashboard from '@/assets/showcase/screenshot-dashboard.png';
import screenshotOS from '@/assets/showcase/screenshot-os.png';
import screenshotEstoque from '@/assets/showcase/screenshot-estoque.png';
import screenshotOkrs from '@/assets/showcase/screenshot-okrs.png';
import screenshotManutencao from '@/assets/showcase/screenshot-manutencao.png';
import screenshotDescarte from '@/assets/showcase/screenshot-descarte.png';
import screenshotMateriais from '@/assets/showcase/screenshot-materiais.png';

/* ------------------------------------------------------------------ */
/*  Shared animation helpers                                           */
/* ------------------------------------------------------------------ */

function GlowOrb({ color, x, y, size = 400, delay = 0 }: { color: string; x: string; y: string; size?: number; delay?: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-[120px]"
      style={{ width: size, height: size, left: x, top: y, background: color }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.22, 0.12] }}
      transition={{ duration: 6, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function StaggerItem({ children, i, className }: { children: React.ReactNode; i: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 25, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function SlideTitle({ icon: Icon, iconColor, title, highlight, subtitle }: {
  icon: LucideIcon; iconColor: string; title: string; highlight: string; subtitle?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-10">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="inline-block mb-4"
      >
        <div className={cn('h-12 w-12 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br shadow-lg', iconColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </motion.div>
      <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
        {title}{' '}
        <span className={cn('bg-clip-text text-transparent bg-gradient-to-r', iconColor)}>{highlight}</span>
      </h2>
      {subtitle && <p className="text-slate-500 mt-3 text-sm md:text-base max-w-2xl mx-auto">{subtitle}</p>}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const modules: { icon: LucideIcon; title: string; gradient: string; desc: string }[] = [
  { icon: ClipboardList, title: 'Ordens de Serviço', gradient: 'from-blue-500 to-cyan-500', desc: 'SLA, workflow, custos' },
  { icon: BarChart3, title: 'Dashboard', gradient: 'from-cyan-500 to-teal-500', desc: 'KPIs em tempo real' },
  { icon: Package, title: 'Estoque', gradient: 'from-amber-500 to-orange-500', desc: 'Alertas e movimentações' },
  { icon: Boxes, title: 'Ativos', gradient: 'from-lime-500 to-green-500', desc: 'Patrimônio e componentes' },
  { icon: Target, title: 'KPIs & OKRs', gradient: 'from-indigo-500 to-violet-500', desc: 'Metas estratégicas' },
  { icon: Wrench, title: 'Manutenção', gradient: 'from-teal-500 to-green-500', desc: 'Preventiva e corretiva' },
  { icon: Bell, title: 'Notificações', gradient: 'from-violet-500 to-purple-500', desc: 'Real-time WebSocket' },
  { icon: Workflow, title: 'Canvas', gradient: 'from-purple-500 to-fuchsia-500', desc: 'Diagramas colaborativos' },
  { icon: StickyNote, title: 'Anotações', gradient: 'from-yellow-500 to-amber-500', desc: 'Editor Markdown' },
  { icon: Shield, title: 'RBAC', gradient: 'from-rose-500 to-pink-500', desc: '7 perfis granulares' },
  { icon: Building2, title: 'Multi-tenant', gradient: 'from-indigo-500 to-blue-500', desc: 'Isolamento total' },
  { icon: History, title: 'Auditoria', gradient: 'from-emerald-500 to-teal-500', desc: 'Rastreamento completo' },
  { icon: MonitorSmartphone, title: 'Painel Técnico', gradient: 'from-teal-500 to-cyan-500', desc: 'Mobile-first' },
  { icon: UserCheck, title: 'Portal Solicitante', gradient: 'from-sky-500 to-blue-500', desc: 'Chamados simplificados' },
  { icon: BarChart3, title: 'Relatórios', gradient: 'from-pink-500 to-rose-500', desc: 'Exportação e tendências' },
  { icon: AlarmClock, title: 'Lembretes', gradient: 'from-green-500 to-emerald-500', desc: 'Recorrência e tags' },
  { icon: FileText, title: 'Documentos', gradient: 'from-blue-500 to-indigo-500', desc: 'Versionamento' },
  { icon: AlertTriangle, title: 'Descartes', gradient: 'from-red-500 to-orange-500', desc: 'Aprovação e registro' },
  { icon: Lock, title: 'Cofre Digital', gradient: 'from-slate-500 to-zinc-500', desc: 'Criptografia AES' },
  { icon: BookOpen, title: 'Base de Conhecimento', gradient: 'from-emerald-500 to-green-500', desc: 'Wiki interna' },
  { icon: ListChecks, title: 'Checklists', gradient: 'from-cyan-500 to-sky-500', desc: 'Templates por categoria' },
  { icon: Palette, title: 'Temas', gradient: 'from-fuchsia-500 to-pink-500', desc: 'Personalização visual' },
  { icon: Network, title: 'API REST', gradient: 'from-violet-500 to-indigo-500', desc: 'Documentada com chaves' },
  { icon: Settings, title: 'Admin', gradient: 'from-gray-500 to-slate-500', desc: 'Configurações globais' },
];

const roles = [
  { role: 'Super Admin', icon: Key, color: 'from-red-500 to-rose-500', desc: 'Acesso total e gestão global da plataforma', permissions: ['Tudo'] },
  { role: 'Administrador', icon: Settings, color: 'from-orange-500 to-amber-500', desc: 'Gestão completa do departamento', permissions: ['OS', 'Estoque', 'Ativos', 'Usuários', 'Config'] },
  { role: 'Coordenador', icon: Workflow, color: 'from-yellow-500 to-amber-400', desc: 'Workflow de OS, equipes e cadastros', permissions: ['OS', 'Atribuição', 'Cadastros'] },
  { role: 'Técnico', icon: Wrench, color: 'from-green-500 to-emerald-500', desc: 'Execução via painel mobile-first', permissions: ['Minhas OS', 'Checklist', 'Custos'] },
  { role: 'Analista', icon: BarChart3, color: 'from-cyan-500 to-blue-500', desc: 'Estoque, relatórios e KPIs', permissions: ['Relatórios', 'KPIs', 'Estoque'] },
  { role: 'Solicitante', icon: UserCheck, color: 'from-blue-500 to-indigo-500', desc: 'Portal simplificado de chamados', permissions: ['Abrir OS', 'Acompanhar'] },
  { role: 'Leitura', icon: Eye, color: 'from-slate-500 to-gray-500', desc: 'Visualização sem edição', permissions: ['Visualizar'] },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard Operacional' },
  { src: screenshotOS, title: 'Ordens de Serviço' },
  { src: screenshotEstoque, title: 'Estoque' },
  { src: screenshotOkrs, title: 'KPIs & OKRs' },
  { src: screenshotManutencao, title: 'Manutenção' },
  { src: screenshotDescarte, title: 'Descarte' },
  { src: screenshotMateriais, title: 'Controle de Materiais' },
];

/* ------------------------------------------------------------------ */
/*  SLIDE 1 — Visão Geral                                             */
/* ------------------------------------------------------------------ */
function SlideOverview() {
  const items = [
    { icon: ClipboardList, title: 'Gestão de OS completa', desc: 'SLA com cronômetro, pausa automática, workflow configurável, checklist, custos e timeline', color: 'from-blue-500 to-cyan-500' },
    { icon: Boxes, title: 'Ativos & Manutenção', desc: 'Patrimônio, componentes instalados, preventiva, corretiva e vínculo com estoque', color: 'from-lime-500 to-green-500' },
    { icon: Package, title: 'Estoque inteligente', desc: 'Alertas de nível mínimo, movimentações automáticas, controle mensal de materiais', color: 'from-amber-500 to-orange-500' },
    { icon: Target, title: 'KPIs & OKRs', desc: 'Indicadores de performance com metas, check-ins, ciclos trimestrais e dashboard dedicado', color: 'from-indigo-500 to-violet-500' },
    { icon: Shield, title: 'Segurança enterprise', desc: 'RBAC com 7 perfis, RLS no banco, auditoria completa e cofre digital criptografado', color: 'from-rose-500 to-pink-500' },
    { icon: Building2, title: 'Multi-tenant nativo', desc: 'Isolamento total entre departamentos, branding por tenant e módulos configuráveis', color: 'from-indigo-500 to-blue-500' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(59,130,246,0.1)" x="10%" y="20%" size={500} />
      <SlideTitle icon={Sparkles} iconColor="from-blue-500 to-cyan-500" title="Visão" highlight="Geral" subtitle="Uma plataforma completa para gestão de operações de TI e manutenção" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl w-full">
        {items.map((item, i) => (
          <StaggerItem key={item.title} i={i} className="group">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 h-full hover:border-white/[0.15] transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/5">
              <div className={cn('h-9 w-9 rounded-xl mb-3 flex items-center justify-center bg-gradient-to-br', item.color)}>
                <item.icon className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 2 — 25+ Módulos                                             */
/* ------------------------------------------------------------------ */
function SlideModules() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(6,182,212,0.08)" x="60%" y="10%" size={500} />
      <GlowOrb color="rgba(139,92,246,0.06)" x="20%" y="70%" size={400} delay={2} />
      <SlideTitle icon={Layers} iconColor="from-cyan-500 to-blue-500" title="" highlight="25+ Módulos" subtitle="Cada módulo é independente e pode ser ativado por plano de assinatura" />
      <motion.div
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-w-5xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {modules.map((m, i) => (
          <motion.div
            key={m.title}
            className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 text-center group hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 cursor-default"
            initial={{ opacity: 0, scale: 0.7, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ delay: 0.08 + i * 0.025, type: 'spring', stiffness: 150 }}
            whileHover={{ scale: 1.08, y: -4 }}
          >
            <div className={cn('h-7 w-7 rounded-lg mx-auto mb-1.5 flex items-center justify-center bg-gradient-to-br shadow-sm', m.gradient)}>
              <m.icon className="h-3 w-3 text-white" />
            </div>
            <p className="text-[8px] text-slate-500 font-medium group-hover:text-white transition-colors leading-tight">{m.title}</p>
          </motion.div>
        ))}
      </motion.div>
      <motion.p
        className="mt-6 text-xs text-slate-600 text-center max-w-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        Todos os módulos compartilham dados em tempo real, com isolamento por RLS e auditoria automática
      </motion.p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 3 — Arquitetura Moderna                                      */
/* ------------------------------------------------------------------ */
function SlideArchitecture() {
  const layers = [
    {
      label: 'Frontend',
      icon: Monitor,
      items: ['React 18 + TypeScript', 'Tailwind CSS + shadcn/ui', 'Framer Motion + GSAP', 'React Query (cache)', 'React Flow (Canvas)'],
      color: 'from-blue-500 to-cyan-500',
      highlight: 'SPA com hot-reload',
    },
    {
      label: 'Backend',
      icon: Database,
      items: ['Edge Functions (Deno)', 'PostgreSQL + RLS', 'Realtime (WebSocket)', 'Storage (arquivos)', 'API REST documentada'],
      color: 'from-violet-500 to-purple-500',
      highlight: 'Serverless escalável',
    },
    {
      label: 'Segurança',
      icon: ShieldCheck,
      items: ['Row Level Security', 'RBAC com 7 perfis', 'Auditoria completa', 'Cofre AES-256', 'Logs de acesso'],
      color: 'from-rose-500 to-pink-500',
      highlight: 'Zero-trust',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(139,92,246,0.08)" x="50%" y="30%" size={600} />
      <SlideTitle icon={Code2} iconColor="from-violet-500 to-fuchsia-500" title="Arquitetura" highlight="Moderna" subtitle="Stack enterprise-grade com foco em performance, segurança e escalabilidade" />
      <div className="flex flex-col md:flex-row gap-5 max-w-5xl w-full">
        {layers.map((layer, i) => (
          <motion.div
            key={layer.label}
            className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group hover:border-white/[0.12] transition-all"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
          >
            {/* Subtle gradient overlay on hover */}
            <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity bg-gradient-to-br', layer.color)} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg', layer.color)}>
                  <layer.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{layer.label}</h3>
                  <span className="text-[10px] text-slate-600 uppercase tracking-wider">{layer.highlight}</span>
                </div>
              </div>
              <ul className="space-y-2">
                {layer.items.map((item, j) => (
                  <motion.li
                    key={item}
                    className="flex items-center gap-2 text-xs text-slate-400"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.15 + j * 0.05 }}
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400/70 shrink-0" />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 4 — Controle de Acesso (RBAC)                                */
/* ------------------------------------------------------------------ */
function SlideRoles() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(244,63,94,0.06)" x="30%" y="20%" size={500} />
      <GlowOrb color="rgba(139,92,246,0.05)" x="70%" y="60%" size={400} delay={1.5} />
      <SlideTitle
        icon={Shield}
        iconColor="from-rose-500 to-violet-500"
        title="Controle de"
        highlight="Acesso"
        subtitle="7 perfis com permissões 100% configuráveis por módulo e ação"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 max-w-5xl">
        {roles.map((r, i) => (
          <motion.div
            key={r.role}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center group hover:border-white/[0.15] transition-all duration-300"
            initial={{ opacity: 0, y: 30, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.12 + i * 0.07, type: 'spring', stiffness: 120 }}
            whileHover={{ y: -6, scale: 1.03 }}
          >
            <div className={cn('h-11 w-11 rounded-xl mx-auto mb-3 flex items-center justify-center bg-gradient-to-br shadow-md', r.color)}>
              <r.icon className="h-4.5 w-4.5 text-white" />
            </div>
            <h4 className="text-[11px] font-bold text-white mb-1">{r.role}</h4>
            <p className="text-[9px] text-slate-600 leading-relaxed mb-2">{r.desc}</p>
            <div className="flex flex-wrap gap-0.5 justify-center">
              {r.permissions.map(p => (
                <span key={p} className="text-[7px] bg-white/[0.05] text-slate-500 rounded px-1.5 py-0.5">{p}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-6 flex items-center gap-2 text-xs text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Fingerprint className="h-3.5 w-3.5" />
        Permissões aplicadas via Row Level Security — segurança no nível do banco de dados
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 5 — Multi-Tenant                                             */
/* ------------------------------------------------------------------ */
function SlideMultiTenant() {
  const features = [
    { title: 'Isolamento por RLS', desc: 'Cada departamento só acessa seus dados. Segurança no nível do PostgreSQL, impossível de contornar.', icon: FolderLock },
    { title: 'Branding por Tenant', desc: 'Logo, cores, nome e identidade visual completamente personalizados por departamento.', icon: Palette },
    { title: 'Painel Master (SaaS)', desc: 'Dashboard consolidado com MRR, controle de planos, assinaturas, onboarding e saúde do sistema.', icon: Activity },
    { title: 'Módulos por Plano', desc: 'Cada plano de assinatura define quais módulos estão disponíveis. Upgrade instantâneo.', icon: Settings },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(99,102,241,0.08)" x="40%" y="25%" size={500} />
      <SlideTitle icon={Building2} iconColor="from-indigo-500 to-blue-500" title="" highlight="Multi-Tenant" subtitle="Arquitetura SaaS nativa com isolamento total entre organizações" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl w-full">
        {features.map((item, i) => (
          <motion.div
            key={item.title}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 flex gap-4 group hover:border-indigo-500/20 transition-all duration-300"
            initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
          >
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Visual tenant diagram */}
      <motion.div
        className="mt-8 flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {['Depto A', 'Depto B', 'Depto C'].map((name, i) => (
          <div key={name} className="flex items-center gap-2">
            <div className={cn('h-8 px-3 rounded-lg flex items-center gap-1.5 text-[10px] font-medium text-white border',
              i === 0 ? 'bg-blue-500/10 border-blue-500/20' : i === 1 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
            )}>
              <Building2 className="h-3 w-3" /> {name}
            </div>
            {i < 2 && <div className="w-4 h-px bg-white/10" />}
          </div>
        ))}
        <div className="ml-2 text-[10px] text-slate-600">← dados 100% isolados</div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 6 — Portais Dedicados                                        */
/* ------------------------------------------------------------------ */
function SlidePortals() {
  const portals = [
    {
      title: 'Portal do Solicitante',
      desc: 'Abertura de chamados simplificada, acompanhamento em tempo real, comunicação direta com o técnico e histórico completo.',
      icon: UserCheck,
      gradient: 'from-blue-500 to-indigo-500',
      features: ['Abertura de OS', 'Acompanhamento', 'Avaliação', 'Histórico'],
    },
    {
      title: 'Painel do Técnico',
      desc: 'Interface mobile-first com cronômetro de atendimento, checklist, registro de custos, peças utilizadas e timeline completa.',
      icon: MonitorSmartphone,
      gradient: 'from-green-500 to-emerald-500',
      features: ['Cronômetro', 'Checklist', 'Custos', 'Timeline'],
    },
    {
      title: 'Painel Administrativo',
      desc: 'Dashboard consolidado, gestão de departamentos, permissões, auditoria, saúde do sistema e configurações avançadas.',
      icon: Settings,
      gradient: 'from-orange-500 to-amber-500',
      features: ['Dashboard', 'Usuários', 'Auditoria', 'Config'],
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(16,185,129,0.06)" x="20%" y="30%" size={400} />
      <SlideTitle icon={Users} iconColor="from-emerald-500 to-cyan-500" title="Portais" highlight="Dedicados" subtitle="Cada tipo de usuário tem sua experiência otimizada" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full">
        {portals.map((item, i) => (
          <motion.div
            key={item.title}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 text-center group hover:border-white/[0.12] transition-all duration-300 relative overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.12, type: 'spring', stiffness: 100 }}
          >
            <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-[0.03] transition-opacity bg-gradient-to-br', item.gradient)} />
            <div className="relative z-10">
              <div className={cn('h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br shadow-lg', item.gradient)}>
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-4">{item.desc}</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {item.features.map(f => (
                  <span key={f} className="text-[9px] bg-white/[0.04] border border-white/[0.06] text-slate-400 rounded-full px-2.5 py-1">{f}</span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 7 — Interface Moderna (Screenshots)                          */
/* ------------------------------------------------------------------ */
function SlideScreenshots() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(p => (p + 1) % screenshots.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(6,182,212,0.06)" x="50%" y="15%" size={500} />
      <SlideTitle icon={Monitor} iconColor="from-cyan-500 to-blue-500" title="Interface" highlight="Moderna" subtitle="Design dark premium com responsividade total" />
      <div className="max-w-5xl w-full">
        <div className="flex justify-center gap-1.5 mb-4 flex-wrap">
          {screenshots.map((s, i) => (
            <motion.button
              key={s.title}
              onClick={() => setActive(i)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[10px] font-medium transition-all duration-300',
                active === i
                  ? 'bg-white text-slate-900 shadow-lg shadow-white/10'
                  : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] hover:border-white/[0.12]'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {s.title}
            </motion.button>
          ))}
        </div>
        <div className="relative rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/50 aspect-[16/9]">
          {/* Neon glow frame */}
          <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-blue-500/20 via-transparent to-violet-500/20 pointer-events-none z-10" />
          <AnimatePresence mode="popLayout">
            <motion.img
              key={active}
              src={screenshots[active].src}
              alt={screenshots[active].title}
              className="absolute inset-0 w-full h-full object-cover object-top"
              initial={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)' }}
              transition={{ duration: 0.5 }}
            />
          </AnimatePresence>
        </div>
        <motion.p
          className="text-center mt-3 text-xs text-slate-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {screenshots[active].title} — Tela real do sistema em produção
        </motion.p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 8 — Funcionalidades Avançadas                                */
/* ------------------------------------------------------------------ */
function SlideFeatures() {
  const featureGroups = [
    {
      title: 'Ordens de Serviço',
      icon: ClipboardList,
      color: 'text-blue-400',
      items: ['SLA com cronômetro e pausa', 'Workflow configurável', 'Custos (mão de obra + peças)', 'Checklist por categoria'],
    },
    {
      title: 'Comunicação',
      icon: Wifi,
      color: 'text-violet-400',
      items: ['Notificações real-time', 'WebSocket (push)', 'Alertas sonoros', 'Timeline de atividades'],
    },
    {
      title: 'Produtividade',
      icon: TrendingUp,
      color: 'text-emerald-400',
      items: ['Canvas colaborativo', 'Anotações Markdown', 'Lembretes recorrentes', 'Base de Conhecimento'],
    },
    {
      title: 'Dados & Export',
      icon: Gauge,
      color: 'text-amber-400',
      items: ['Exportação Excel (XLSX)', 'Relatórios avançados', 'API REST com chaves', 'Dashboard interativo'],
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(245,158,11,0.06)" x="60%" y="25%" size={400} />
      <GlowOrb color="rgba(16,185,129,0.05)" x="20%" y="60%" size={350} delay={2} />
      <SlideTitle icon={Zap} iconColor="from-amber-500 to-orange-500" title="Funcionalidades" highlight="Avançadas" subtitle="Recursos que transformam a operação do dia-a-dia" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full">
        {featureGroups.map((group, gi) => (
          <motion.div
            key={group.title}
            className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + gi * 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <group.icon className={cn('h-5 w-5', group.color)} />
              <h3 className="text-xs font-bold text-white">{group.title}</h3>
            </div>
            <ul className="space-y-2.5">
              {group.items.map((item, j) => (
                <motion.li
                  key={item}
                  className="flex items-start gap-2 text-[11px] text-slate-400"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + gi * 0.1 + j * 0.05 }}
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-400/60 shrink-0 mt-0.5" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/*  SLIDE 9 — Por que OrdFy? (Diferenciais)                           */
/* ------------------------------------------------------------------ */
function SlideDiferenciais() {
  const diffs = [
    { title: 'Real-time nativo', desc: 'WebSocket em todos os módulos — dashboard, notificações, cronômetro de OS e canvas atualizam instantaneamente. Concorrentes usam polling ou refresh manual.', icon: Wifi, color: 'text-cyan-400' },
    { title: 'Multi-tenant por design', desc: 'Isolamento via Row Level Security no PostgreSQL, não por filtro de aplicação. Impossível acessar dados de outro departamento, mesmo com SQL injection.', icon: FolderLock, color: 'text-indigo-400' },
    { title: 'SLA inteligente', desc: 'Cronômetro com pausa automática por status, cálculo de atraso em tempo real e indicadores visuais integrados à listagem e ao dashboard.', icon: Timer, color: 'text-amber-400' },
    { title: 'Plataforma completa', desc: '25+ módulos integrados numa única plataforma — OS, estoque, ativos, manutenção, KPIs, OKRs, documentos, canvas, cofre e muito mais.', icon: Layers, color: 'text-violet-400' },
    { title: 'Auditoria total', desc: 'Cada ação é registrada com diff, IP, user-agent e timestamp. Retenção configurável e dashboard analítico para compliance.', icon: History, color: 'text-emerald-400' },
    { title: 'White-Label ready', desc: 'Branding por tenant, temas personalizáveis, logo e cores próprios. Pronto para licenciamento e revenda como produto próprio.', icon: Palette, color: 'text-pink-400' },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(6,182,212,0.06)" x="15%" y="20%" size={450} />
      <GlowOrb color="rgba(139,92,246,0.05)" x="75%" y="60%" size={400} delay={2} />
      <SlideTitle icon={Sparkles} iconColor="from-cyan-500 to-violet-500" title="Por que" highlight="OrdFy?" subtitle="Diferenciais técnicos que nos separam de soluções genéricas" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl w-full">
        {diffs.map((d, i) => (
          <StaggerItem key={d.title} i={i}>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 h-full hover:border-white/[0.12] transition-all duration-300 group">
              <d.icon className={cn('h-6 w-6 mb-3', d.color)} />
              <h3 className="text-sm font-bold text-white mb-1.5">{d.title}</h3>
              <p className="text-[10px] text-slate-500 leading-relaxed">{d.desc}</p>
            </div>
          </StaggerItem>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 10 — Fluxo de uma OS                                         */
/* ------------------------------------------------------------------ */
function SlideWorkflow() {
  const steps = [
    { label: 'Abertura', actor: 'Solicitante', desc: 'Via portal ou admin', color: 'from-blue-500 to-cyan-500', icon: ClipboardList },
    { label: 'Triagem', actor: 'Coordenador', desc: 'Prioridade e categoria', color: 'from-purple-500 to-violet-500', icon: Eye },
    { label: 'Atribuição', actor: 'Coordenador', desc: 'Técnico responsável', color: 'from-amber-500 to-orange-500', icon: UserCheck },
    { label: 'Execução', actor: 'Técnico', desc: 'Cronômetro + checklist', color: 'from-green-500 to-emerald-500', icon: Wrench },
    { label: 'Conclusão', actor: 'Técnico', desc: 'Custos e observações', color: 'from-teal-500 to-cyan-500', icon: CheckCircle2 },
    { label: 'Encerramento', actor: 'Coordenador', desc: 'Validação e SLA final', color: 'from-rose-500 to-pink-500', icon: Shield },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(59,130,246,0.06)" x="50%" y="20%" size={500} />
      <SlideTitle icon={Workflow} iconColor="from-blue-500 to-violet-500" title="Ciclo de uma" highlight="Ordem de Serviço" subtitle="Do chamado à conclusão — cada etapa com o ator responsável" />
      <div className="flex flex-col md:flex-row items-center gap-2 max-w-5xl w-full justify-center">
        {steps.map((step, i) => (
          <motion.div
            key={step.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 120 }}
          >
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-center min-w-[130px] hover:border-white/[0.15] transition-all group">
              <div className={cn('h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br shadow-md', step.color)}>
                <step.icon className="h-4 w-4 text-white" />
              </div>
              <h4 className="text-[11px] font-bold text-white mb-0.5">{step.label}</h4>
              <p className="text-[9px] text-slate-600">{step.actor}</p>
              <p className="text-[8px] text-slate-700 mt-1">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                className="hidden md:block"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <ChevronRight className="h-4 w-4 text-slate-700" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-8 grid grid-cols-3 gap-6 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {[
          { icon: Timer, label: 'SLA ativo em todas as etapas' },
          { icon: Bell, label: 'Notificações automáticas' },
          { icon: History, label: 'Auditoria a cada transição' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2 text-[9px] text-slate-600">
            <item.icon className="h-3 w-3 text-blue-400/60 shrink-0" />
            {item.label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SLIDE 11 — Roadmap                                                 */
/* ------------------------------------------------------------------ */
function SlideRoadmap() {
  const quarters = [
    {
      period: 'Q1 2026',
      status: 'done',
      items: ['25+ módulos core', 'Multi-tenant com RLS', 'KPIs & OKRs', 'Canvas colaborativo', 'Cofre digital'],
    },
    {
      period: 'Q2 2026',
      status: 'current',
      items: ['App mobile (PWA)', 'Integração com e-mail', 'Relatórios agendados', 'Dashboard customizável', 'Webhooks'],
    },
    {
      period: 'Q3 2026',
      status: 'planned',
      items: ['IA para triagem de OS', 'Manutenção preditiva', 'Chatbot integrado', 'Marketplace de integrações'],
    },
    {
      period: 'Q4 2026',
      status: 'planned',
      items: ['App nativo iOS/Android', 'SSO (SAML/OIDC)', 'Multi-idioma', 'Assinatura digital'],
    },
  ];

  const statusConfig = {
    done: { label: 'Concluído', color: 'bg-emerald-400', dotColor: 'bg-emerald-400', textColor: 'text-emerald-400' },
    current: { label: 'Em andamento', color: 'bg-blue-400', dotColor: 'bg-blue-400 animate-pulse', textColor: 'text-blue-400' },
    planned: { label: 'Planejado', color: 'bg-slate-600', dotColor: 'bg-slate-600', textColor: 'text-slate-500' },
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <GlowOrb color="rgba(16,185,129,0.06)" x="30%" y="25%" size={450} />
      <GlowOrb color="rgba(59,130,246,0.05)" x="70%" y="55%" size={400} delay={1.5} />
      <SlideTitle icon={TrendingUp} iconColor="from-emerald-500 to-cyan-500" title="" highlight="Roadmap" subtitle="Evolução contínua com entregas trimestrais" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl w-full">
        {quarters.map((q, i) => {
          const cfg = statusConfig[q.status as keyof typeof statusConfig];
          return (
            <motion.div
              key={q.period}
              className={cn(
                'bg-white/[0.02] border rounded-xl p-5 relative overflow-hidden',
                q.status === 'current' ? 'border-blue-500/20' : 'border-white/[0.06]'
              )}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, type: 'spring', stiffness: 100 }}
            >
              {q.status === 'current' && (
                <div className="absolute inset-0 bg-blue-500/[0.03]" />
              )}
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
                  <span className="text-xs font-bold text-white">{q.period}</span>
                </div>
                <span className={cn('text-[9px] font-medium uppercase tracking-wider', cfg.textColor)}>{cfg.label}</span>
                <ul className="mt-3 space-y-2">
                  {q.items.map((item, j) => (
                    <motion.li
                      key={item}
                      className="flex items-start gap-2 text-[10px] text-slate-400"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 + j * 0.04 }}
                    >
                      <CheckCircle2 className={cn('h-3 w-3 shrink-0 mt-0.5', q.status === 'done' ? 'text-emerald-400/70' : 'text-slate-700')} />
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slides array & labels                                              */
/* ------------------------------------------------------------------ */

const slides = [
  SlideOverview,
  SlideModules,
  SlideWorkflow,
  SlideArchitecture,
  SlideRoles,
  SlideMultiTenant,
  SlidePortals,
  SlideScreenshots,
  SlideFeatures,
  SlideDiferenciais,
  // SlideRoadmap, // desativado temporariamente — reativar quando houver roadmap definido
];

const slideLabels = [
  'Visão Geral', 'Módulos', 'Fluxo de OS', 'Arquitetura', 'Acesso',
  'Multi-Tenant', 'Portais', 'Interface', 'Funcionalidades', 'Diferenciais',
  // 'Roadmap',
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
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-500/[0.04] blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full bg-violet-500/[0.03] blur-[150px]" />
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            className="absolute inset-0"
            initial={{ opacity: 0, x: direction > 0 ? 100 : -100, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction > 0 ? -100 : 100, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
