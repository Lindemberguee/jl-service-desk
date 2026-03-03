import { ShieldOff, MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

const statusMessages: Record<string, { title: string; description: string }> = {
  expired: {
    title: 'Assinatura Expirada',
    description: 'Seu plano expirou e o acesso ao sistema foi temporariamente suspenso. Entre em contato para renovar.',
  },
  suspended: {
    title: 'Assinatura Suspensa',
    description: 'Sua assinatura foi suspensa. Entre em contato com o suporte para regularizar a situação.',
  },
  cancelled: {
    title: 'Assinatura Cancelada',
    description: 'Sua assinatura foi cancelada. Para reativar o acesso, entre em contato com nossa equipe.',
  },
};

export default function SubscriptionBlockedPage() {
  const { subscription, signOut } = useAuth();
  const status = subscription?.status || 'expired';
  const msg = statusMessages[status] || statusMessages.expired;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="mx-auto w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-12 w-12 text-destructive" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">{msg.title}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">{msg.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="gap-2">
            <a
              href="https://wa.me/5512996543522?text=Olá! Preciso de ajuda com minha assinatura."
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4" />
              Fale Conosco via WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="lg" className="gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sair da Conta
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground/50">
          Se acredita que isso é um erro, entre em contato com o administrador do sistema.
        </p>
      </motion.div>
    </div>
  );
}
