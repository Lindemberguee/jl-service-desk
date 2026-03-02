import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AES-256-GCM encryption using Web Crypto API
const VAULT_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // Derive key from service role

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(VAULT_KEY).slice(0, 32),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: encoder.encode("ordfy-vault-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return "";
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedB64: string): Promise<string> {
  if (!encryptedB64) return "";
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    // --- CREATE ---
    if (action === "create") {
      const { tenant_id, title, service_name, url, username, password, notes, category, tags } = body;

      const [username_encrypted, password_encrypted, notes_encrypted] = await Promise.all([
        encrypt(username || ""),
        encrypt(password || ""),
        encrypt(notes || ""),
      ]);

      const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error } = await adminClient.from("vault_entries").insert({
        tenant_id,
        created_by: user.id,
        title,
        service_name: service_name || "",
        url: url || "",
        username_encrypted,
        password_encrypted,
        notes_encrypted,
        category: category || "Geral",
        tags: tags || [],
      }).select("id, title, service_name, url, category, tags, created_at, updated_at").single();

      if (error) throw error;

      // Log creation
      await adminClient.from("vault_access_logs").insert({
        tenant_id,
        vault_entry_id: data.id,
        user_id: user.id,
        action: "create",
      });

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- READ (decrypt) ---
    if (action === "read") {
      const { entry_id, tenant_id } = body;

      const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: entry, error } = await adminClient.from("vault_entries")
        .select("*")
        .eq("id", entry_id)
        .eq("tenant_id", tenant_id)
        .single();

      if (error || !entry) {
        return new Response(JSON.stringify({ error: "Entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check membership via RLS-aware client
      const { data: membership } = await supabase.from("user_memberships")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant_id)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const [username, password, notes] = await Promise.all([
        decrypt(entry.username_encrypted || ""),
        decrypt(entry.password_encrypted || ""),
        decrypt(entry.notes_encrypted || ""),
      ]);

      // Log access
      await adminClient.from("vault_access_logs").insert({
        tenant_id,
        vault_entry_id: entry_id,
        user_id: user.id,
        action: "view",
      });

      return new Response(JSON.stringify({
        ...entry,
        username,
        password,
        notes,
        username_encrypted: undefined,
        password_encrypted: undefined,
        notes_encrypted: undefined,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- UPDATE ---
    if (action === "update") {
      const { entry_id, tenant_id, title, service_name, url, username, password, notes, category, tags } = body;

      const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const updateData: Record<string, any> = {};
      if (title !== undefined) updateData.title = title;
      if (service_name !== undefined) updateData.service_name = service_name;
      if (url !== undefined) updateData.url = url;
      if (category !== undefined) updateData.category = category;
      if (tags !== undefined) updateData.tags = tags;
      if (username !== undefined) updateData.username_encrypted = await encrypt(username);
      if (password !== undefined) {
        updateData.password_encrypted = await encrypt(password);
        updateData.last_rotated_at = new Date().toISOString();
      }
      if (notes !== undefined) updateData.notes_encrypted = await encrypt(notes);

      const { data, error } = await adminClient.from("vault_entries")
        .update(updateData)
        .eq("id", entry_id)
        .eq("tenant_id", tenant_id)
        .select("id, title, service_name, url, category, tags, created_at, updated_at")
        .single();

      if (error) throw error;

      await adminClient.from("vault_access_logs").insert({
        tenant_id,
        vault_entry_id: entry_id,
        user_id: user.id,
        action: "update",
      });

      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { entry_id, tenant_id } = body;

      const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await adminClient.from("vault_access_logs").insert({
        tenant_id,
        vault_entry_id: entry_id,
        user_id: user.id,
        action: "delete",
      });

      const { error } = await adminClient.from("vault_entries")
        .delete()
        .eq("id", entry_id)
        .eq("tenant_id", tenant_id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- LIST (without decryption, metadata only) ---
    if (action === "list") {
      const { tenant_id } = body;

      const { data, error } = await supabase.from("vault_entries")
        .select("id, title, service_name, url, category, tags, created_by, last_rotated_at, created_at, updated_at")
        .eq("tenant_id", tenant_id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data || []), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("vault-crypto error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
