import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = { sla_warnings: 0, maintenance_alerts: 0 };

    // ── 1) Check SLA warnings ──────────────────────────────────
    // Find open work orders with SLA deadlines approaching (>80% consumed)
    const { data: openWos } = await adminClient
      .from('work_orders')
      .select('id, code, title, tenant_id, assigned_to_id, sla_response_deadline, sla_solution_deadline, first_response_at, status')
      .in('status', ['aberta', 'triagem', 'em_execucao', 'aguardando_peca', 'aguardando_solicitante', 'aguardando_terceiro', 'reaberta'])
      .not('sla_solution_deadline', 'is', null);

    if (openWos && openWos.length > 0) {
      const now = Date.now();
      for (const wo of openWos) {
        // Check solution SLA
        if (wo.sla_solution_deadline) {
          const deadline = new Date(wo.sla_solution_deadline).getTime();
          const createdApprox = deadline - (24 * 60 * 60 * 1000); // approximate
          const total = deadline - createdApprox;
          const elapsed = now - createdApprox;
          const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;

          if (pct >= 80 && pct < 110) {
            // Check if we already sent this warning recently
            const { data: existing } = await adminClient
              .from('notifications')
              .select('id')
              .eq('tenant_id', wo.tenant_id)
              .eq('type', 'sla_warning')
              .contains('metadata', { work_order_id: wo.id, sla_type: 'solution' })
              .gte('created_at', new Date(now - 4 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existing || existing.length === 0) {
              // Notify assigned tech
              if (wo.assigned_to_id) {
                await adminClient.from('notifications').insert({
                  user_id: wo.assigned_to_id,
                  tenant_id: wo.tenant_id,
                  type: 'sla_warning',
                  title: `⏰ SLA em risco: ${wo.code}`,
                  body: `A OS ${wo.code} está com ${pct}% do prazo de solução consumido.`,
                  icon: '⏰',
                  link: `/os/${wo.id}`,
                  metadata: { action: 'sla_warning', work_order_id: wo.id, sla_type: 'solution', pct_used: pct },
                });
              }

              // Send email & teams
              await adminClient.rpc('send_smtp_email_async', {
                _tenant_id: wo.tenant_id, _type: 'sla_warning',
                _to_email: '', // will use tech email from trigger
                _extra: { work_order_code: wo.code, work_order_title: wo.title, sla_type: 'solution', pct_used: pct },
              }).catch(() => {});

              await adminClient.rpc('send_teams_notification_async', {
                _tenant_id: wo.tenant_id, _type: 'sla_warning',
                _extra: { work_order_code: wo.code, work_order_title: wo.title, sla_type: 'solution', pct_used: pct },
              }).catch(() => {});

              results.sla_warnings++;
            }
          }
        }

        // Check response SLA
        if (wo.sla_response_deadline && !wo.first_response_at) {
          const deadline = new Date(wo.sla_response_deadline).getTime();
          const remaining = deadline - now;
          const totalApprox = 4 * 60 * 60 * 1000; // approximate 4h
          const pct = Math.round(((totalApprox - remaining) / totalApprox) * 100);

          if (pct >= 80 && pct < 110) {
            const { data: existing } = await adminClient
              .from('notifications')
              .select('id')
              .eq('tenant_id', wo.tenant_id)
              .eq('type', 'sla_warning')
              .contains('metadata', { work_order_id: wo.id, sla_type: 'response' })
              .gte('created_at', new Date(now - 2 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existing || existing.length === 0) {
              if (wo.assigned_to_id) {
                await adminClient.from('notifications').insert({
                  user_id: wo.assigned_to_id,
                  tenant_id: wo.tenant_id,
                  type: 'sla_warning',
                  title: `⏰ SLA Resposta em risco: ${wo.code}`,
                  body: `A OS ${wo.code} está com ${pct}% do prazo de resposta consumido.`,
                  icon: '⏰',
                  link: `/os/${wo.id}`,
                  metadata: { action: 'sla_warning', work_order_id: wo.id, sla_type: 'response', pct_used: pct },
                });
              }

              await adminClient.rpc('send_teams_notification_async', {
                _tenant_id: wo.tenant_id, _type: 'sla_warning',
                _extra: { work_order_code: wo.code, work_order_title: wo.title, sla_type: 'response', pct_used: pct },
              }).catch(() => {});

              results.sla_warnings++;
            }
          }
        }
      }
    }

    // ── 2) Check upcoming maintenance ──────────────────────────
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data: upcoming } = await adminClient
      .from('asset_maintenance_records')
      .select('id, title, asset_id, tenant_id, scheduled_at, technician_id, assets!inner(name)')
      .eq('status', 'agendada')
      .lte('scheduled_at', threeDaysFromNow)
      .gte('scheduled_at', new Date().toISOString());

    if (upcoming && upcoming.length > 0) {
      for (const maint of upcoming) {
        const assetName = (maint as any).assets?.name || 'Ativo';
        const scheduledDate = new Date(maint.scheduled_at!).toLocaleDateString('pt-BR');

        // Check if already notified
        const { data: existing } = await adminClient
          .from('notifications')
          .select('id')
          .eq('tenant_id', maint.tenant_id)
          .eq('type', 'maintenance')
          .contains('metadata', { maintenance_id: maint.id })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Notify admins + assigned technician
        const { data: admins } = await adminClient
          .from('user_memberships')
          .select('user_id')
          .eq('tenant_id', maint.tenant_id)
          .eq('is_active', true)
          .in('role', ['super_admin', 'admin', 'coordenador']);

        const notifyUserIds = new Set<string>();
        if (admins) admins.forEach(a => notifyUserIds.add(a.user_id));
        if (maint.technician_id) notifyUserIds.add(maint.technician_id);

        for (const userId of notifyUserIds) {
          await adminClient.from('notifications').insert({
            user_id: userId,
            tenant_id: maint.tenant_id,
            type: 'maintenance',
            title: `🔧 Manutenção próxima: ${assetName}`,
            body: `"${maint.title}" programada para ${scheduledDate}.`,
            icon: '🔧',
            link: '/manutencao',
            metadata: { action: 'maintenance_approaching', maintenance_id: maint.id, asset_name: assetName },
          });

          const { data: profile } = await adminClient.from('profiles').select('email').eq('id', userId).single();
          if (profile?.email) {
            await adminClient.rpc('send_smtp_email_async', {
              _tenant_id: maint.tenant_id, _type: 'maintenance', _to_email: profile.email,
              _extra: { asset_name: assetName, maintenance_title: maint.title, scheduled_at: scheduledDate },
            }).catch(() => {});
          }
        }

        await adminClient.rpc('send_teams_notification_async', {
          _tenant_id: maint.tenant_id, _type: 'maintenance',
          _extra: { asset_name: assetName, maintenance_title: maint.title, scheduled_at: scheduledDate },
        }).catch(() => {});

        results.maintenance_alerts++;
      }
    }

    console.log('SLA/Maintenance check completed:', results);
    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Check SLA/Maintenance error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
