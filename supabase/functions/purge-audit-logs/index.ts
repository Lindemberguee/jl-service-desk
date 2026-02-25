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

    // Get audit settings
    const { data: settings, error: settingsErr } = await supabase
      .from("audit_settings")
      .select("retention_days")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();

    if (settingsErr || !settings) {
      return new Response(JSON.stringify({ error: "No audit settings found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const retentionDays = settings.retention_days;
    if (retentionDays <= 0) {
      return new Response(JSON.stringify({ message: "Retention disabled (0 days), no purge" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { data: deleted, error: deleteErr } = await supabase
      .from("audit_logs")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select("id");

    if (deleteErr) {
      console.error("Purge error:", deleteErr);
      return new Response(JSON.stringify({ error: deleteErr.message }), {
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
