import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Home, RotateCcw, ServerCrash } from "lucide-react";

const ServerErrorPage = () => {
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
            className="text-[10rem] font-black leading-none text-orange-500/10 select-none"
          >
            500
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4, type: "spring" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="rounded-full bg-orange-500/10 p-5">
              <ServerCrash className="h-10 w-10 text-orange-500" />
            </div>
          </motion.div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Erro interno do servidor</h1>
        <p className="text-muted-foreground mb-8">
          Algo deu errado do nosso lado. Tente novamente em alguns instantes. Se o problema persistir, entre em contato com o suporte.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="gap-2 w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" /> Tentar novamente
          </Button>
          <Button onClick={() => navigate("/")} className="gap-2 w-full sm:w-auto">
            <Home className="h-4 w-4" /> Ir para o início
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServerErrorPage;
