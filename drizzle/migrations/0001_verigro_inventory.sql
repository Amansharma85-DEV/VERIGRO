-- Store Inventory Records Table (Scoped to store_id)
CREATE TABLE IF NOT EXISTS public.store_inventory (
  inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  sku TEXT,
  batch_number TEXT NOT NULL DEFAULT 'DEFAULT-BATCH',
  mfg_date TEXT,
  expiry_date TEXT,
  days_remaining INTEGER,
  expiry_status TEXT NOT NULL DEFAULT 'SAFE',
  mrp NUMERIC(10,2),
  selling_price NUMERIC(10,2),
  net_quantity TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  reorder_level INTEGER NOT NULL DEFAULT 10,
  fssai_number TEXT,
  supplier TEXT,
  last_scanned TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_store_barcode_batch UNIQUE (store_id, barcode, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_store_inventory_store ON public.store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_barcode ON public.store_inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_store_inventory_expiry ON public.store_inventory(expiry_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_inventory TO authenticated;
GRANT ALL ON public.store_inventory TO service_role;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own store inventory select" ON public.store_inventory FOR SELECT TO authenticated
  USING (store_id = ('store_' || auth.uid()::text));
CREATE POLICY "own store inventory insert" ON public.store_inventory FOR INSERT TO authenticated
  WITH CHECK (store_id = ('store_' || auth.uid()::text));
CREATE POLICY "own store inventory update" ON public.store_inventory FOR UPDATE TO authenticated
  USING (store_id = ('store_' || auth.uid()::text));
CREATE POLICY "own store inventory delete" ON public.store_inventory FOR DELETE TO authenticated
  USING (store_id = ('store_' || auth.uid()::text));

-- Inventory Activity Stream
CREATE TABLE IF NOT EXISTS public.inventory_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL,
  type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  batch_number TEXT,
  quantity_delta INTEGER DEFAULT 0,
  user_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.inventory_activities TO authenticated;
GRANT ALL ON public.inventory_activities TO service_role;
ALTER TABLE public.inventory_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own store activities select" ON public.inventory_activities FOR SELECT TO authenticated
  USING (store_id = ('store_' || auth.uid()::text));
CREATE POLICY "own store activities insert" ON public.inventory_activities FOR INSERT TO authenticated
  WITH CHECK (store_id = ('store_' || auth.uid()::text));
