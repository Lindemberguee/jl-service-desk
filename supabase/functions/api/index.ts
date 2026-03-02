import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const per_page = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") || "20")));
  const offset = (page - 1) * per_page;
  return { page, per_page, offset };
}

/* ------------------------------------------------------------------ */
/*  Auth: validate API key                                             */
/* ------------------------------------------------------------------ */
async function authenticateApiKey(req: Request, supabase: any) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return null;

  // Hash the key for lookup (simple SHA-256)
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  const { data: keyData, error: keyError } = await supabase
    .from("tenant_api_keys")
    .select("id, tenant_id, permissions, is_active, expires_at")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (keyError || !keyData) return null;

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) return null;

  // Update last_used_at
  await supabase.from("tenant_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyData.id);

  return { apiKeyId: keyData.id, tenantId: keyData.tenant_id, permissions: keyData.permissions as string[] };
}

/* ------------------------------------------------------------------ */
/*  Route matching                                                     */
/* ------------------------------------------------------------------ */
type RouteHandler = (params: {
  req: Request; url: URL; supabase: any;
  tenantId: string; permissions: string[];
  pathParams: Record<string, string>;
  apiKeyId: string;
}) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
  requiredPermission?: string;
}

function defineRoute(method: string, path: string, handler: RouteHandler, requiredPermission?: string): Route {
  const paramNames: string[] = [];
  const regexStr = path.replace(/:(\w+)/g, (_, name) => {
    paramNames.push(name);
    return "([^/]+)";
  });
  return { method, pattern: new RegExp(`^${regexStr}$`), paramNames, handler, requiredPermission };
}

/* ------------------------------------------------------------------ */
/*  Resource Handlers                                                  */
/* ------------------------------------------------------------------ */

// ─── Work Orders ────────────────────────────────────────────────────
const listWorkOrders: RouteHandler = async ({ url, supabase, tenantId }) => {
  const { page, per_page, offset } = parsePagination(url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const category_id = url.searchParams.get("category_id");

  let query = supabase.from("work_orders")
    .select("id, code, title, description, priority, status, category_id, unit_id, location_id, asset_id, assigned_to_id, created_at, updated_at, started_at, resolved_at, closed_at, response_due_at, resolve_due_at, labor_cost, parts_cost, total_cost", { count: "exact" })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (category_id) query = query.eq("category_id", category_id);

  const { data, error: qErr, count } = await query;
  if (qErr) return error(qErr.message, 500);

  return json({ data, pagination: { page, per_page, total: count, total_pages: Math.ceil((count || 0) / per_page) } });
};

const getWorkOrder: RouteHandler = async ({ supabase, tenantId, pathParams }) => {
  const { data, error: qErr } = await supabase.from("work_orders")
    .select("*, work_order_events(id, type, payload, created_at, actor_user_id), work_order_checklist_items(id, label, is_checked, sort_order, observation), work_order_labor_items(id, description, hours, rate_per_hour, total), work_order_part_items(id, description, qty, unit_price, total)")
    .eq("tenant_id", tenantId)
    .eq("id", pathParams.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (qErr) return error(qErr.message, 500);
  if (!data) return error("Work order not found", 404);
  return json({ data });
};

const createWorkOrder: RouteHandler = async ({ req, supabase, tenantId }) => {
  const body = await req.json();
  const { title, description, priority, status, category_id, unit_id, location_id, asset_id } = body;
  if (!title) return error("title is required");

  const { data, error: qErr } = await supabase.from("work_orders")
    .insert({
      tenant_id: tenantId, title, description: description || null,
      priority: priority || "media", status: status || "aberta",
      category_id: category_id || null, unit_id: unit_id || null,
      location_id: location_id || null, asset_id: asset_id || null,
    })
    .select("id, code, title, status, priority, created_at")
    .single();

  if (qErr) return error(qErr.message, 500);
  return json({ data }, 201);
};

const updateWorkOrder: RouteHandler = async ({ req, supabase, tenantId, pathParams }) => {
  const body = await req.json();
  const allowed = ["title", "description", "priority", "status", "category_id", "unit_id", "location_id", "asset_id", "assigned_to_id"];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) return error("No valid fields to update");

  const { data, error: qErr } = await supabase.from("work_orders")
    .update(updates)
    .eq("id", pathParams.id)
    .eq("tenant_id", tenantId)
    .select("id, code, title, status, priority, updated_at")
    .single();

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

// ─── Assets ─────────────────────────────────────────────────────────
const listAssets: RouteHandler = async ({ url, supabase, tenantId }) => {
  const { page, per_page, offset } = parsePagination(url);
  const status = url.searchParams.get("status");

  let query = supabase.from("assets")
    .select("id, name, patrimony_code, serial_number, status, category_id, unit_id, location_id, metadata, created_at, updated_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (status) query = query.eq("status", status);

  const { data, error: qErr, count } = await query;
  if (qErr) return error(qErr.message, 500);
  return json({ data, pagination: { page, per_page, total: count, total_pages: Math.ceil((count || 0) / per_page) } });
};

const getAsset: RouteHandler = async ({ supabase, tenantId, pathParams }) => {
  const { data, error: qErr } = await supabase.from("assets")
    .select("*, asset_components(id, component_type, brand, model, serial_number, status), asset_maintenance_records(id, title, type, status, scheduled_at, completed_at, cost)")
    .eq("tenant_id", tenantId)
    .eq("id", pathParams.id)
    .maybeSingle();

  if (qErr) return error(qErr.message, 500);
  if (!data) return error("Asset not found", 404);
  return json({ data });
};

// ─── Stock ──────────────────────────────────────────────────────────
const listStock: RouteHandler = async ({ url, supabase, tenantId }) => {
  const { page, per_page, offset } = parsePagination(url);

  const { data, error: qErr, count } = await supabase.from("stock_items")
    .select("id, name, sku, brand, model, current_level, min_level, unit, description, component_type, created_at, updated_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })
    .range(offset, offset + per_page - 1);

  if (qErr) return error(qErr.message, 500);
  return json({ data, pagination: { page, per_page, total: count, total_pages: Math.ceil((count || 0) / per_page) } });
};

const getStockItem: RouteHandler = async ({ supabase, tenantId, pathParams }) => {
  const { data, error: qErr } = await supabase.from("stock_items")
    .select("*, stock_movements(id, type, qty, reference, created_at)")
    .eq("tenant_id", tenantId)
    .eq("id", pathParams.id)
    .maybeSingle();

  if (qErr) return error(qErr.message, 500);
  if (!data) return error("Stock item not found", 404);
  return json({ data });
};

// ─── Categories ─────────────────────────────────────────────────────
const listCategories: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("categories")
    .select("id, name, parent_id, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

// ─── Units & Locations ──────────────────────────────────────────────
const listUnits: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("units")
    .select("id, name, address, city, state, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

const listLocations: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("locations")
    .select("id, name, description, unit_id, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

// ─── KPIs ───────────────────────────────────────────────────────────
const listKpis: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("kpis")
    .select("id, name, description, unit, target_value, direction, category, color, icon, warning_threshold, critical_threshold, is_active, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

const listKpiEntries: RouteHandler = async ({ url, supabase, tenantId, pathParams }) => {
  const { page, per_page, offset } = parsePagination(url);

  const { data, error: qErr, count } = await supabase.from("kpi_entries")
    .select("id, value, period_start, period_end, notes, created_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .eq("kpi_id", pathParams.id)
    .order("period_start", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (qErr) return error(qErr.message, 500);
  return json({ data, pagination: { page, per_page, total: count, total_pages: Math.ceil((count || 0) / per_page) } });
};

// ─── Collaborators ──────────────────────────────────────────────────
const listCollaborators: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("collaborators")
    .select("id, full_name, email, phone, department, matricula, is_active, created_at")
    .eq("tenant_id", tenantId)
    .order("full_name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

// ─── Customers (Solicitantes) ───────────────────────────────────────
const listCustomers: RouteHandler = async ({ supabase, tenantId }) => {
  const { data, error: qErr } = await supabase.from("customers")
    .select("id, name, email, phone, sector, position, type, is_active:updated_at, created_at")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (qErr) return error(qErr.message, 500);
  return json({ data });
};

// ─── Maintenance Records ────────────────────────────────────────────
const listMaintenance: RouteHandler = async ({ url, supabase, tenantId }) => {
  const { page, per_page, offset } = parsePagination(url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");

  let query = supabase.from("asset_maintenance_records")
    .select("id, asset_id, title, type, status, description, cost, scheduled_at, started_at, completed_at, created_at", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + per_page - 1);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, error: qErr, count } = await query;
  if (qErr) return error(qErr.message, 500);
  return json({ data, pagination: { page, per_page, total: count, total_pages: Math.ceil((count || 0) / per_page) } });
};

/* ------------------------------------------------------------------ */
/*  API Docs endpoint                                                  */
/* ------------------------------------------------------------------ */
const getApiDocs: RouteHandler = async () => {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, "Location": "https://www.ordfy.com.br/api/docs" },
  });
};

/* ------------------------------------------------------------------ */
/*  Route Table                                                        */
/* ------------------------------------------------------------------ */
const routes: Route[] = [
  defineRoute("GET", "/docs", getApiDocs),
  // Work Orders
  defineRoute("GET", "/work-orders", listWorkOrders, "read"),
  defineRoute("GET", "/work-orders/:id", getWorkOrder, "read"),
  defineRoute("POST", "/work-orders", createWorkOrder, "write"),
  defineRoute("PATCH", "/work-orders/:id", updateWorkOrder, "write"),
  // Assets
  defineRoute("GET", "/assets", listAssets, "read"),
  defineRoute("GET", "/assets/:id", getAsset, "read"),
  // Stock
  defineRoute("GET", "/stock", listStock, "read"),
  defineRoute("GET", "/stock/:id", getStockItem, "read"),
  // Categories, Units, Locations
  defineRoute("GET", "/categories", listCategories, "read"),
  defineRoute("GET", "/units", listUnits, "read"),
  defineRoute("GET", "/locations", listLocations, "read"),
  // KPIs
  defineRoute("GET", "/kpis", listKpis, "read"),
  defineRoute("GET", "/kpis/:id/entries", listKpiEntries, "read"),
  // People
  defineRoute("GET", "/collaborators", listCollaborators, "read"),
  defineRoute("GET", "/customers", listCustomers, "read"),
  // Maintenance
  defineRoute("GET", "/maintenance", listMaintenance, "read"),
];

/* ------------------------------------------------------------------ */
/*  Main Handler                                                       */
/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const url = new URL(req.url);
    // Extract path after /api (the function name)
    const fullPath = url.pathname;
    const fnPrefix = fullPath.indexOf("/api");
    const path = fnPrefix >= 0 ? fullPath.substring(fnPrefix + 4) : fullPath;
    const cleanPath = path || "/docs";

    // Public endpoints (no auth required)
    if (cleanPath === "/docs" && req.method === "GET") {
      return getApiDocs({ req, url, supabase, tenantId: "", permissions: [], pathParams: {}, apiKeyId: "" });
    }

    // Authenticate
    const auth = await authenticateApiKey(req, supabase);
    if (!auth) {
      return error("Invalid or missing API key. Include your key in the X-API-Key header.", 401);
    }

    // Find matching route
    for (const route of routes) {
      if (route.method !== req.method) continue;
      const match = cleanPath.match(route.pattern);
      if (!match) continue;

      // Check permission
      if (route.requiredPermission && !auth.permissions.includes(route.requiredPermission)) {
        return error(`Insufficient permissions. Required: ${route.requiredPermission}`, 403);
      }

      // Extract path params
      const pathParams: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        pathParams[name] = match[i + 1];
      });

      const response = await route.handler({
        req, url, supabase,
        tenantId: auth.tenantId,
        permissions: auth.permissions,
        pathParams,
        apiKeyId: auth.apiKeyId,
      });

      // Log request (fire and forget)
      const elapsed = Date.now() - startTime;
      supabase.from("api_request_logs").insert({
        tenant_id: auth.tenantId,
        api_key_id: auth.apiKeyId,
        method: req.method,
        path: cleanPath,
        status_code: response.status,
        response_time_ms: elapsed,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
        user_agent: req.headers.get("user-agent") || null,
      }).then(() => {});

      return response;
    }

    return error(`Route not found: ${req.method} ${cleanPath}. Visit /docs for available endpoints.`, 404);

  } catch (err: any) {
    return error(err.message || "Internal server error", 500);
  }
});
