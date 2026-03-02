import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Shield, BookOpen } from 'lucide-react';
import { DocumentsLibrary } from '@/components/docs/DocumentsLibrary';
import { VaultManager } from '@/components/docs/VaultManager';
import { KnowledgeBaseManager } from '@/components/docs/KnowledgeBaseManager';

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentos & Cofre</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Biblioteca de documentos, cofre de senhas seguro e base de conhecimento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="library" className="gap-2">
            <FileText className="h-4 w-4" />
            Biblioteca
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-2">
            <Shield className="h-4 w-4" />
            Cofre de Senhas
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Base de Conhecimento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-6">
          <DocumentsLibrary />
        </TabsContent>
        <TabsContent value="vault" className="mt-6">
          <VaultManager />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeBaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
