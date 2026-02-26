import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useSpring } from 'framer-motion';
import {
  ClipboardList, BarChart3, Bell, Package, Shield, Users, Zap, Clock,
  Star, CheckCircle2, ArrowRight, ChevronDown, Wrench, Gauge, Eye,
  Smartphone, Globe, Lock, TrendingUp, Award, Headphones
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
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  { icon: ClipboardList, title: 'Ordens de Serviço', desc: 'Crie, atribua e acompanhe OS com fluxo completo de status, SLA e prioridades inteligentes.', color: 'from-blue-500 to-cyan-500' },
  { icon: Package, title: 'Controle de Estoque', desc: 'Gestão de materiais com alertas automáticos de nível mínimo e rastreabilidade por OS.', color: 'from-amber-500 to-orange-500' },
  { icon: Bell, title: 'Notificações Real-time', desc: 'Alertas instantâneos com som, push e toast para cada mudança relevante no sistema.', color: 'from-violet-500 to-purple-500' },
  { icon: Users, title: 'Multi-departamento', desc: '7 perfis de acesso com permissões granulares e isolamento total entre departamentos.', color: 'from-emerald-500 to-green-500' },
  { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'KPIs em tempo real, gráficos interativos e indicadores de SLA, custo e produtividade.', color: 'from-cyan-500 to-blue-500' },
  { icon: Shield, title: 'Segurança Total', desc: 'RLS por tenant, auditoria completa, logs detalhados e controle de sessão robusto.', color: 'from-rose-500 to-pink-500' },
];

const screenshots = [
  { src: screenshotDashboard, title: 'Dashboard Operacional', desc: 'Visão 360° com KPIs, gráficos e ordens recentes' },
  { src: screenshotWorkorders, title: 'Gestão de OS', desc: 'Lista completa com filtros, busca e status em tempo real' },
  { src: screenshotStock, title: 'Controle de Estoque', desc: 'Inventário inteligente com alertas de reposição' },
];

const plans = [
  { name: 'Starter', price: 'Grátis', period: '', desc: 'Para começar', features: ['3 usuários', '50 OS/mês', 'Dashboard básico', '1 departamento'], popular: false },
  { name: 'Professional', price: 'R$ 149', period: '/mês', desc: 'Para crescer', features: ['25 usuários', 'OS ilimitadas', 'Relatórios completos', 'Multi-departamento', 'SLA + Custos', 'Estoque integrado', 'Auditoria'], popular: true },
  { name: 'Enterprise', price: 'Sob medida', period: '', desc: 'Para escalar', features: ['Ilimitado', 'Tudo do Pro', 'API + Integrações', 'SSO / SAML', 'Suporte dedicado', 'SLA premium'], popular: false },
];

const testimonials = [
  { name: 'Carlos Mendes', role: 'Gerente de Manutenção', company: 'Indústria Nova', text: 'Reduzimos o tempo de resposta em 60%. A visibilidade das operações mudou completamente.', rating: 5 },
  { name: 'Ana Lucia Silva', role: 'Coord. Facilities', company: 'Hospital São Lucas', text: 'O melhor sistema que já usei. Notificações em tempo real e estoque integrado são incríveis.', rating: 5 },
  { name: 'Roberto Farias', role: 'Diretor de Operações', company: 'Grupo TechPark', text: 'Gerenciamos 5 unidades com uma única plataforma. O ROI foi imediato.', rating: 5 },
];

const advantages = [
  { icon: Zap, title: 'Setup em 5 minutos', desc: 'Sem instalação. Acesse pelo navegador.' },
  { icon: Smartphone, title: '100% Responsivo', desc: 'Funciona em qualquer dispositivo.' },
  { icon: Globe, title: 'Cloud nativo', desc: 'Infraestrutura escalável e segura.' },
  { icon: Lock, title: 'Dados protegidos', desc: 'Criptografia e RLS por departamento.' },
  { icon: TrendingUp, title: 'Atualizações contínuas', desc: 'Novas funcionalidades todo mês.' },
  { icon: Headphones, title: 'Suporte humano', desc: 'Time dedicado para sua operação.' },
];

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const springProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  // Auto-rotate screenshots
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
            <span className="font-bold text-lg">ServiceOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#screenshots" className="hover:text-white transition-colors">Sistema</a>
            <a href="#pricing" className="hover:text-white transition-colors">Planos</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Depoimentos</a>
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
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/80 to-slate-950" />
        </div>

        <ParticlesOverlay />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <Badge className="mb-8 text-sm px-5 py-2 bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15 backdrop-blur-sm">
              🚀 A plataforma #1 de gestão de manutenção
            </Badge>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight leading-[1.05]"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
              Manutenção
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
              do futuro.
            </span>
          </motion.h1>

          <motion.p
            className="mt-8 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Ordens de serviço, estoque, equipes e relatórios — tudo em tempo real,
            com notificações instantâneas e segurança enterprise.
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

          {/* Stats row */}
          <motion.div
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            {[
              { value: 150, suffix: '+', label: 'Empresas' },
              { value: 98, suffix: '%', label: 'Satisfação' },
              { value: 2500, suffix: '+', label: 'OS/mês' },
              { value: 60, suffix: '%', label: 'Mais rápido' },
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

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-slate-500" />
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                     */}
      {/* ============================================================ */}
      <Section id="features" className="bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-500/10 text-blue-400 border-blue-500/20">Funcionalidades</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mt-4">
              Tudo que sua operação{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">precisa</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">
              Uma plataforma completa, do chamado à conclusão, com automação inteligente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <GlowCard key={f.title} delay={i * 0.08}>
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4', f.color)}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </GlowCard>
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

          {/* Screenshot tabs */}
          <div className="flex justify-center gap-3 mb-8">
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

          {/* Screenshot display */}
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
                  app.serviceos.com.br
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
              <img
                src={screenshots[activeScreenshot].src}
                alt={screenshots[activeScreenshot].title}
                className="w-full h-auto"
              />
            </motion.div>

            {/* Caption */}
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

            {/* Ambient glow behind screenshot */}
            <div className="absolute -inset-10 bg-blue-500/5 blur-[80px] rounded-full -z-10 pointer-events-none" />
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  ADVANTAGES STRIP                                             */}
      {/* ============================================================ */}
      <Section className="py-16 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {advantages.map((a, i) => (
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
                <ul className="mt-6 space-y-3 flex-1">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              Pronto para acelerar sua{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                manutenção?
              </span>
            </h2>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto">
              Crie sua conta em segundos. Sem cartão de crédito. Sem complicação.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-10 text-lg h-14 rounded-xl shadow-lg shadow-blue-500/25">
                  Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" />
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
              <span className="font-bold">ServiceOS</span>
              <span className="text-slate-600 text-sm ml-2">© 2026</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Suporte</a>
              <a href="#" className="hover:text-white transition-colors">contato@serviceos.com.br</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
