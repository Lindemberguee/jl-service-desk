import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { KpiDashboard } from '@/components/kpis/KpiDashboard';
import { KpiManager } from '@/components/kpis/KpiManager';
import { OkrBoard } from '@/components/kpis/OkrBoard';

export default function KpisOkrsPage() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KPIs & OKRs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe indicadores de performance e objetivos estratégicos
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="dashboard" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Painel
          </TabsTrigger>
          <TabsTrigger value="kpis" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="okrs" className="gap-2">
            <Target className="h-4 w-4" />
            OKRs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <KpiDashboard />
        </TabsContent>
        <TabsContent value="kpis" className="mt-6">
          <KpiManager />
        </TabsContent>
        <TabsContent value="okrs" className="mt-6">
          <OkrBoard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
