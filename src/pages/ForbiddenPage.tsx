import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, ArrowLeft, ShieldAlert } from "lucide-react";

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md w-full"
      >
        <div className="relative mx-auto mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="text-[10rem] font-black leading-none text-destructive/10 select-none"
          >
            403
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4, type: "spring" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="rounded-full bg-destructive/10 p-5">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Acesso negado</h1>
        <p className="text-muted-foreground mb-8">
          Você não tem permissão para acessar esta página. Entre em contato com o administrador caso precise de acesso.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2 w-full sm:w-auto">
            <Home className="h-4 w-4" /> Ir para o início
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ForbiddenPage;
