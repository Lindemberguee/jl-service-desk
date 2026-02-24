import { Card, CardContent } from '@/components/ui/card';
import { Hammer, Construction } from 'lucide-react';

export default function Ferramentas() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Ferramentas</h1>
        <p className="text-xs text-muted-foreground">Utilitários e ferramentas avançadas para gestão operacional.</p>
      </div>

      <Card className="border-dashed border-2 border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Construction className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-base font-semibold mb-1">Em desenvolvimento</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Este módulo está sendo preparado. Em breve você terá acesso a ferramentas avançadas
            como importação em massa, automações e integrações.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
