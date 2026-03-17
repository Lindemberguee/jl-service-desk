import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Mail, MessageSquare, Webhook, ArrowRight, Plug, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  route?: string;
  available: boolean;
  gradient: string;
  iconColor: string;
  badgeLabel?: string;
}

const integrations: IntegrationCard[] = [
  {
    id: 'smtp',
    name: 'E-mail SMTP',
    description: 'Envie notificações automáticas por e-mail configurando seu servidor SMTP.',
    icon: Mail,
    route: '/integracoes/smtp',
    available: true,
    gradient: 'from-blue-500/20 to-cyan-500/10',
    iconColor: 'text-blue-500',
    badgeLabel: 'Disponível',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Envie alertas de OS, status, estoque, SLA e manutenção para canais do Teams.',
    icon: MessageSquare,
    route: '/integracoes/teams',
    available: true,
    gradient: 'from-indigo-500/20 to-blue-500/10',
    iconColor: 'text-indigo-500',
    badgeLabel: 'Disponível',
  },
  {
    id: 'metrics',
    name: 'Métricas',
    description: 'Dashboard com estatísticas de envios, falhas, taxa de sucesso e gráficos.',
    icon: BarChart3,
    route: '/integracoes/metricas',
    available: true,
    gradient: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-500',
    badgeLabel: 'Disponível',
  },
  {
    id: 'calendar',
    name: 'Microsoft Calendar',
    description: 'Sincronize calendários do Outlook via URL iCal para visualizar eventos e agendamentos.',
    icon: CalendarDays,
    route: '/integracoes/calendario',
    available: true,
    gradient: 'from-sky-500/20 to-blue-500/10',
    iconColor: 'text-sky-500',
    badgeLabel: 'Disponível',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receba alertas de OS, estoque e manutenção diretamente em canais do Slack.',
    icon: MessageSquare,
    available: false,
    gradient: 'from-purple-500/20 to-fuchsia-500/10',
    iconColor: 'text-purple-500',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Envie notificações de OS e alertas críticos via WhatsApp.',
    icon: MessageSquare,
    available: false,
    gradient: 'from-emerald-500/20 to-green-500/10',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Conecte eventos do sistema a qualquer aplicação externa via webhooks HTTP.',
    icon: Webhook,
    available: false,
    gradient: 'from-amber-500/20 to-orange-500/10',
    iconColor: 'text-amber-500',
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

export default function IntegrationsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          Integrações
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Conecte seu sistema a serviços externos para notificações e automações.
        </p>
      </div>

      {/* Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {integrations.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              variants={cardVariants}
              whileHover={item.available ? { y: -4, transition: { duration: 0.2 } } : {}}
              onClick={() => item.available && item.route && navigate(item.route)}
              className={`
                relative group rounded-xl border bg-card p-5 transition-all
                ${item.available
                  ? 'cursor-pointer hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'
                  : 'opacity-60 cursor-default'
                }
              `}
            >
              {/* Gradient background */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative z-10">
                {/* Icon + Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-11 w-11 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  {item.available ? (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium border-primary/40 text-primary">
                      {item.badgeLabel || 'Ativo'}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
                      Em breve
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <h3 className="font-semibold text-sm mb-1.5">{item.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Action */}
                {item.available && (
                  <div className="mt-4 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Configurar <ArrowRight className="h-3 w-3 ml-1" />
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
