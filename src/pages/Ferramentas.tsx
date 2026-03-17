import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Workflow, StickyNote, Bell, CalendarDays, LayoutGrid,
  ArrowRight, Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ToolCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  available: boolean;
  gradient: string;
  iconColor: string;
}

const tools: ToolCard[] = [
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Crie mapas mentais, fluxogramas e organize ideias visualmente com nós e conexões.',
    icon: Workflow,
    route: '/ferramentas/canvas',
    available: true,
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-500',
  },
  {
    id: 'notes',
    name: 'Anotações',
    description: 'Bloco de notas rápido para registrar informações e procedimentos importantes.',
    icon: StickyNote,
    route: '/ferramentas/anotacoes',
    available: true,
    gradient: 'from-amber-500/20 to-yellow-500/10',
    iconColor: 'text-amber-500',
  },
  {
    id: 'reminders',
    name: 'Lembretes',
    description: 'Configure alertas e lembretes para tarefas, manutenções e prazos críticos.',
    icon: Bell,
    route: '/ferramentas/lembretes',
    available: true,
    gradient: 'from-violet-500/20 to-purple-500/10',
    iconColor: 'text-violet-500',
  },
  {
    id: 'calendar',
    name: 'Calendário',
    description: 'Visualize e planeje agendamentos, escalas de equipe e cronogramas de manutenção.',
    icon: CalendarDays,
    available: false,
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-500',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Ferramentas() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Ferramentas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ferramentas de produtividade para sua equipe de manutenção.
        </p>
      </div>

      {/* Tools Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              variants={cardVariants}
              whileHover={tool.available ? { y: -4, transition: { duration: 0.2 } } : {}}
              onClick={() => tool.available && tool.route && navigate(tool.route)}
              className={`
                relative group rounded-xl border bg-card p-5 transition-all
                ${tool.available
                  ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
                  : 'opacity-60 cursor-default'
                }
              `}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative z-10">
                {/* Icon + Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${tool.gradient} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${tool.iconColor}`} />
                  </div>
                  {tool.available ? (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/40 text-primary">
                      Beta
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                      Em breve
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <h3 className="font-semibold text-sm mb-1.5">{tool.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {tool.description}
                </p>

                {/* Action */}
                {tool.available && (
                  <div className="mt-4 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
