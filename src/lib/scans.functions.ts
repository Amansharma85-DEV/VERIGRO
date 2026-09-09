import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const saveScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    mode: string;
    query?: string | null;
    productName?: string | null;
    brand?: string | null;
    source?: string | null;
  }) => ({
    mode: data?.mode === "image" ? "image" : "barcode",
    query: data?.query ? String(data.query).slice(0, 120) : null,
    productName: data?.productName ? String(data.productName).slice(0, 160) : null,
    brand: data?.brand ? String(data.brand).slice(0, 120) : null,
    source: data?.source ? String(data.source).slice(0, 40) : null,
  }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").insert({
      user_id: context.userId,
      mode: data.mode,
      query: data.query,
      product_name: data.productName,
      brand: data.brand,
      source: data.source,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("id, mode, query, product_name, brand, source, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return { scans: data ?? [] };
  });
