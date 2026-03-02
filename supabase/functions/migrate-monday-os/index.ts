import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MondayRecord {
  name: string;
  email: string;
  location: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  service_type: string;
  department: string;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  // Handle "Apr 25, 2025 12:22 PM" format
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch { }
  return null;
}

function mapStatus(s: string): string {
  const lower = (s || '').toLowerCase().trim();
  if (lower === 'feito') return 'concluida';
  if (lower === 'não iniciado' || lower === 'nao iniciado') return 'aberta';
  if (lower === 'em andamento' || lower === 'trabalhando nisso') return 'em_execucao';
  if (lower === 'parado') return 'aguardando_peca';
  return 'aberta';
}

function mapPriority(p: string): string {
  const lower = (p || '').toLowerCase().trim();
  if (lower === 'alta') return 'alta';
  if (lower === 'média' || lower === 'media') return 'media';
  if (lower === 'baixa') return 'baixa';
  if (lower === 'crítica' || lower === 'critica') return 'critica';
  return 'media';
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const TENANT_ID = '0d0bb413-0134-4b53-a894-33b06aa9a420';
    
    const { records } = await req.json() as { records: MondayRecord[] };

    let inserted = 0;
    let errors: string[] = [];

    // Process in batches of 50
    for (let i = 0; i < records.length; i += 50) {
      const batch = records.slice(i, i + 50);
      const rows = batch.map(r => {
        const createdAt = parseDate(r.created_at) || new Date().toISOString();
        const status = mapStatus(r.status);
        const tags: string[] = [];
        if (r.service_type && r.service_type.trim()) tags.push(r.service_type.trim());
        if (r.department && r.department.trim()) tags.push(r.department.trim());

        const requesterContact: any = {};
        if (r.name) requesterContact.name = r.name.trim();
        if (r.email) requesterContact.email = r.email.trim().replace(/\\/g, '');

        const title = r.description
          ? r.description.replace(/<br\/?>/gi, ' ').replace(/<[^>]+>/g, '').substring(0, 120).trim()
          : r.name || 'Sem título';

        const description = [
          r.location ? `**Local:** ${r.location}` : '',
          r.description ? r.description.replace(/<br\/?>/gi, '\n').replace(/<[^>]+>/g, '') : '',
          r.email ? `**Solicitante:** ${r.name} (${r.email.replace(/\\/g, '')})` : (r.name ? `**Solicitante:** ${r.name}` : ''),
        ].filter(Boolean).join('\n\n');

        return {
          tenant_id: TENANT_ID,
          title: title || 'Sem título',
          description,
          priority: mapPriority(r.priority),
          status,
          tags,
          requester_contact: requesterContact,
          created_at: createdAt,
          updated_at: createdAt,
          resolved_at: status === 'concluida' ? createdAt : null,
          visibility: 'internal',
        };
      });

      const { data, error } = await supabase
        .from('work_orders')
        .insert(rows)
        .select('id');

      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
      } else {
        inserted += (data?.length || 0);
      }
    }

    return new Response(
      JSON.stringify({ success: true, inserted, total: records.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
