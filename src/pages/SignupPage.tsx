import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Building2, User, Mail, Lock, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (formData.admin_password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-service-signup', {
        body: formData,
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      // Auto-login after signup
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: formData.admin_email,
        password: formData.admin_password,
      });

      if (loginErr) {
        toast.success('Conta criada! Faça login com suas credenciais.');
        navigate('/login');
      } else {
        toast.success('Bem-vindo ao Ordfy! Sua conta foi criada com sucesso.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const trialFeatures = [
    'Ordens de serviço ilimitadas',
    'Gestão de ativos e estoque',
    'Portal do solicitante',
    'Até 5 usuários',
    '14 dias grátis',
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(217 91% 42%), hsl(222 47% 11%))' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-md"
          >
            <img src="/ordfy-logo.png" alt="Ordfy" className="h-16 mx-auto mb-8 brightness-0 invert" />
            <h1 className="text-3xl font-bold mb-4">Comece seu teste grátis</h1>
            <p className="text-lg opacity-90 mb-10">
              Gerencie ordens de serviço, ativos e equipes com eficiência profissional.
            </p>

            <div className="text-left space-y-3">
              {trialFeatures.map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
                  <span className="opacity-90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Criar conta gratuita</h2>
            <p className="text-muted-foreground mt-1">
              Teste grátis por 14 dias. Sem cartão de crédito.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-sm font-medium">Nome da empresa</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company_name"
                  placeholder="Minha Empresa LTDA"
                  className="pl-10"
                  value={formData.company_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_name" className="text-sm font-medium">Seu nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin_name"
                  placeholder="João da Silva"
                  className="pl-10"
                  value={formData.admin_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_name: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_email" className="text-sm font-medium">E-mail corporativo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin_email"
                  type="email"
                  placeholder="joao@empresa.com"
                  className="pl-10"
                  value={formData.admin_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="admin_password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10"
                  value={formData.admin_password}
                  onChange={(e) => setFormData(prev => ({ ...prev, admin_password: e.target.value }))}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando conta...
                </>
              ) : (
                'Começar teste grátis'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ao criar sua conta, você concorda com nossos Termos de Uso e Política de Privacidade.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
