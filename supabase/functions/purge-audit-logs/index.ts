import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const purgeAll = body.purge_all === true;

    if (purgeAll) {
      // Delete ALL audit logs
      const { data: deleted, error } = await supabase
        .from("audit_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000") // match all rows
        .select("id");

      if (error) {
        console.error("Purge all error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const count = deleted?.length || 0;
      console.log(`Purged ALL ${count} audit logs`);
      return new Response(
        JSON.stringify({ purged: count, mode: "all" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: purge by retention
    const { data: settings } = await supabase
      .from("audit_settings")
      .select("retention_days")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    const retentionDays = settings?.retention_days || 90;
    if (retentionDays <= 0) {
      return new Response(JSON.stringify({ message: "Retention disabled", purged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data: deleted, error } = await supabase
      .from("audit_logs")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (error) {
      console.error("Purge error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const count = deleted?.length || 0;
    console.log(`Purged ${count} audit logs older than ${retentionDays} days`);

    return new Response(
      JSON.stringify({ purged: count, retention_days: retentionDays, cutoff: cutoffDate.toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
