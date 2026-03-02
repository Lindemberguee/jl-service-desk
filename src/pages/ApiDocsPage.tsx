import { useState } from "react";
import { Copy, Check, ChevronRight, Globe, Key, Zap, BookOpen, Code2, Shield, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

const BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  permission: string;
  filters?: string[];
  body?: Record<string, string>;
  responseExample?: string;
}

const endpoints: Endpoint[] = [
  { method: "GET", path: "/work-orders", description: "Listar ordens de serviço com paginação e filtros", permission: "read", filters: ["status", "priority", "category_id"], responseExample: `{
  "data": [
    {
      "id": "uuid",
      "code": "OS-001",
      "title": "Instalação de rede",
      "status": "aberta",
      "priority": "alta",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 45,
    "total_pages": 3
  }
}` },
  { method: "GET", path: "/work-orders/:id", description: "Detalhes completos de uma OS (eventos, checklist, custos)", permission: "read" },
  { method: "POST", path: "/work-orders", description: "Criar nova ordem de serviço", permission: "write", body: { title: "string (obrigatório)", description: "string", priority: "baixa | media | alta | critica", status: "aberta | em_andamento | ...", category_id: "uuid", unit_id: "uuid", location_id: "uuid", asset_id: "uuid" } },
  { method: "PATCH", path: "/work-orders/:id", description: "Atualizar campos de uma OS existente", permission: "write", body: { title: "string", status: "string", priority: "string", assigned_to_id: "uuid" } },
  { method: "GET", path: "/assets", description: "Listar ativos do departamento", permission: "read", filters: ["status"] },
  { method: "GET", path: "/assets/:id", description: "Detalhes de um ativo (componentes e manutenções)", permission: "read" },
  { method: "GET", path: "/stock", description: "Listar itens de estoque", permission: "read" },
  { method: "GET", path: "/stock/:id", description: "Detalhes de um item (inclui movimentações)", permission: "read" },
  { method: "GET", path: "/categories", description: "Listar categorias", permission: "read" },
  { method: "GET", path: "/units", description: "Listar unidades", permission: "read" },
  { method: "GET", path: "/locations", description: "Listar locais", permission: "read" },
  { method: "GET", path: "/kpis", description: "Listar KPIs configurados", permission: "read" },
  { method: "GET", path: "/kpis/:id/entries", description: "Lançamentos históricos de um KPI", permission: "read" },
  { method: "GET", path: "/collaborators", description: "Listar colaboradores", permission: "read" },
  { method: "GET", path: "/customers", description: "Listar solicitantes", permission: "read" },
  { method: "GET", path: "/maintenance", description: "Listar registros de manutenção", permission: "read", filters: ["status", "type"] },
];

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PATCH: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded">
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative group rounded-lg bg-[hsl(222,47%,8%)] border border-[hsl(222,47%,18%)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[hsl(222,47%,18%)]">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-[hsl(213,31%,85%)] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [expanded, setExpanded] = useState(false);
  const curlExample = endpoint.method === "GET"
    ? `curl -H "X-API-Key: sua_chave_aqui" \\\n  "${BASE_URL}${endpoint.path.replace(/:(\w+)/g, '{$1}')}"`
    : `curl -X ${endpoint.method} \\\n  -H "X-API-Key: sua_chave_aqui" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(Object.fromEntries(Object.entries(endpoint.body || {}).map(([k]) => [k, "..."])), null, 2)}' \\\n  "${BASE_URL}${endpoint.path.replace(/:(\w+)/g, '{$1}')}"`;

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden hover:border-primary/30 transition-colors bg-card/50 backdrop-blur-sm">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
        <Badge variant="outline" className={`${methodColors[endpoint.method]} font-mono text-xs px-2.5 py-0.5 border`}>
          {endpoint.method}
        </Badge>
        <code className="text-sm font-mono text-foreground flex-1">{endpoint.path}</code>
        <span className="text-xs text-muted-foreground hidden sm:inline">{endpoint.description}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Permissão: {endpoint.permission}
            </Badge>
            {endpoint.filters?.map(f => (
              <Badge key={f} variant="outline" className="text-xs font-mono">?{f}=</Badge>
            ))}
          </div>

          {endpoint.body && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Body (JSON)</h4>
              <div className="bg-[hsl(222,47%,8%)] rounded-lg p-3 border border-[hsl(222,47%,18%)]">
                {Object.entries(endpoint.body).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-sm font-mono py-0.5">
                    <span className="text-blue-400">{key}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-emerald-400">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exemplo cURL</h4>
            <CodeBlock code={curlExample} />
          </div>

          {endpoint.responseExample && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resposta</h4>
              <CodeBlock code={endpoint.responseExample} language="json" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredEndpoints = endpoints.filter(e =>
    e.path.toLowerCase().includes(search.toLowerCase()) ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    e.method.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = {
    "Ordens de Serviço": filteredEndpoints.filter(e => e.path.startsWith("/work-orders")),
    "Ativos": filteredEndpoints.filter(e => e.path.startsWith("/assets")),
    "Estoque": filteredEndpoints.filter(e => e.path.startsWith("/stock")),
    "Cadastros": filteredEndpoints.filter(e => e.path.startsWith("/categories") || e.path.startsWith("/units") || e.path.startsWith("/locations")),
    "KPIs": filteredEndpoints.filter(e => e.path.startsWith("/kpis")),
    "Pessoas": filteredEndpoints.filter(e => e.path.startsWith("/collaborators") || e.path.startsWith("/customers")),
    "Manutenção": filteredEndpoints.filter(e => e.path.startsWith("/maintenance")),
  };

  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)] text-foreground">
      {/* Header */}
      <header className="border-b border-[hsl(222,47%,14%)] bg-[hsl(222,47%,7%)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">OrdFy API</h1>
                <p className="text-xs text-muted-foreground">v1.0 · REST</p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            Online
          </Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
            Documentação da API
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Integre seu sistema com o OrdFy através de nossa API REST. Gerencie ordens de serviço, ativos, estoque e muito mais de forma programática.
          </p>
        </div>

        {/* Quick Start Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <div className="rounded-xl border border-[hsl(222,47%,14%)] bg-[hsl(222,47%,8%)] p-5 space-y-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-white text-sm">Base URL</h3>
            <div className="flex items-center gap-2">
              <code className="text-xs text-muted-foreground font-mono break-all">{BASE_URL}</code>
              <CopyButton text={BASE_URL} />
            </div>
          </div>
          <div className="rounded-xl border border-[hsl(222,47%,14%)] bg-[hsl(222,47%,8%)] p-5 space-y-2">
            <Key className="h-5 w-5 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">Autenticação</h3>
            <p className="text-xs text-muted-foreground">Header <code className="text-amber-400">X-API-Key</code> em cada requisição</p>
          </div>
          <div className="rounded-xl border border-[hsl(222,47%,14%)] bg-[hsl(222,47%,8%)] p-5 space-y-2">
            <Zap className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Rate Limit</h3>
            <p className="text-xs text-muted-foreground">100 req/min por API Key</p>
          </div>
        </div>

        {/* Auth Guide */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold text-white">Início Rápido</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="text-sm text-white font-medium">Gere sua API Key</p>
                <p className="text-xs text-muted-foreground">Acesse Administração → Configurações → API Keys no painel do OrdFy</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="text-sm text-white font-medium">Faça sua primeira requisição</p>
                <CodeBlock code={`curl -H "X-API-Key: ordfy_abc123..." \\\n  "${BASE_URL}/work-orders?page=1&per_page=5"`} />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="text-sm text-white font-medium">Explore os endpoints</p>
                <p className="text-xs text-muted-foreground">Navegue pelos endpoints abaixo para ver exemplos e parâmetros disponíveis</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pagination Info */}
        <section className="mb-12 rounded-xl border border-[hsl(222,47%,14%)] bg-[hsl(222,47%,8%)] p-5">
          <h3 className="font-semibold text-white mb-3 text-sm">Paginação</h3>
          <p className="text-xs text-muted-foreground mb-3">Endpoints de listagem suportam os seguintes parâmetros de paginação:</p>
          <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex gap-2"><span className="text-blue-400">page</span><span className="text-muted-foreground">Número da página (default: 1)</span></div>
            <div className="flex gap-2"><span className="text-blue-400">per_page</span><span className="text-muted-foreground">Itens por página (default: 20, max: 100)</span></div>
          </div>
        </section>

        {/* Permissions */}
        <section className="mb-12 rounded-xl border border-[hsl(222,47%,14%)] bg-[hsl(222,47%,8%)] p-5">
          <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Permissões
          </h3>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">read</Badge>
              <p className="text-muted-foreground">Acesso de leitura a todos os GET</p>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-blue-400 border-blue-500/30">write</Badge>
              <p className="text-muted-foreground">Permite POST e PATCH</p>
            </div>
            <div className="space-y-1">
              <Badge variant="outline" className="text-red-400 border-red-500/30">delete</Badge>
              <p className="text-muted-foreground">Permite DELETE</p>
            </div>
          </div>
        </section>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar endpoints..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-[hsl(222,47%,8%)] border-[hsl(222,47%,18%)] text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Endpoints */}
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, eps]) => {
            if (eps.length === 0) return null;
            return (
              <section key={group}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h3>
                <div className="space-y-2">
                  {eps.map(ep => (
                    <EndpointCard key={`${ep.method}-${ep.path}`} endpoint={ep} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-[hsl(222,47%,14%)] text-center">
          <p className="text-xs text-muted-foreground">
            OrdFy API v1.0 · © {new Date().getFullYear()} OrdFy. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}