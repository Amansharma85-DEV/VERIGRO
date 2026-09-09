-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  dob DATE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, dob, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'dob', '')::date,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products catalog (public reference data)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  net_weight TEXT,
  mrp NUMERIC(10,2),
  description TEXT,
  ingredients TEXT,
  nutrition TEXT,
  usage_tips TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products are public" ON public.products FOR SELECT USING (true);

-- Scan history per user
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'barcode',
  query TEXT,
  product_name TEXT,
  brand TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.scans TO authenticated;
GRANT ALL ON public.scans TO service_role;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own scans select" ON public.scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own scans insert" ON public.scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own scans delete" ON public.scans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX products_keywords_idx ON public.products USING GIN (keywords);

-- Seed daily-use Indian products
INSERT INTO public.products (barcode, name, brand, category, net_weight, mrp, description, ingredients, nutrition, usage_tips, keywords) VALUES
('8901058000474','Maggi 2-Minute Masala Noodles','Nestle','Instant Food','70 g',14.00,'India ka sabse popular instant noodles pack with masala tastemaker.','Refined wheat flour, palm oil, salt, mixed spices, onion powder, garlic powder','Energy 313 kcal / 70g, Protein 6.9 g, Carbs 41 g, Fat 12.6 g','2 minute boil karein, extra sabzi daalne se nutrition badhta hai.','{maggi,noodles,instant,masala,nestle}'),
('8901491101837','Lay''s India''s Magic Masala Chips','Lay''s (PepsiCo)','Snacks','52 g',20.00,'Crispy potato chips with tangy Indian masala seasoning.','Potatoes, edible vegetable oil, magic masala seasoning, salt','Energy 280 kcal / 52g, Fat 17 g, Carbs 29 g','Sealed pack thanda aur sukha rakhein.','{lays,chips,potato,snack,masala}'),
('8901030865278','Dove Cream Beauty Bathing Bar','Dove (HUL)','Personal Care','100 g',65.00,'Moisturising bathing bar with 1/4 cleansing cream.','Sodium lauroyl isethionate, stearic acid, lauric acid, glycerin, fragrance','Not applicable','Roz nahane ke liye, dry skin par extra effective.','{dove,soap,bathing,bar,skin}'),
('8901063013612','Parle-G Original Glucose Biscuits','Parle','Biscuits','79 g',10.00,'Classic glucose biscuit, chai ke saath India ka favourite.','Wheat flour, sugar, edible vegetable oil, invert sugar syrup, milk solids','Energy 411 kcal / 100g, Protein 7 g, Carbs 76 g, Fat 9 g','Air-tight dabbe me rakhein taki crisp rahe.','{parle,parleg,biscuit,glucose,chai}'),
('8901314010016','Colgate Strong Teeth Toothpaste','Colgate-Palmolive','Oral Care','100 g',60.00,'Calcium boost toothpaste for stronger teeth and cavity protection.','Sorbitol, calcium carbonate, sodium monofluorophosphate, silica','Not applicable','Din me do baar 2 minute brush karein.','{colgate,toothpaste,dental,teeth}'),
('8901396371054','Tata Salt Iodised','Tata Consumer','Grocery','1 kg',28.00,'Vacuum evaporated iodised salt, desh ka namak.','Iodised salt (free flow)','Iodine 30 ppm at packing','Sukhe container me store karein.','{tata,salt,namak,iodised,grocery}'),
('8901719110018','Amul Butter Pasteurised','Amul','Dairy','100 g',58.00,'Utterly butterly delicious table butter made from fresh cream.','Pasteurised cream, edible common salt','Energy 720 kcal / 100g, Fat 80 g','Fridge me 0-4°C par rakhein.','{amul,butter,makhan,dairy}'),
('8901138825485','Surf Excel Easy Wash Detergent Powder','Surf Excel (HUL)','Home Care','1 kg',115.00,'Tough stain removal detergent powder for hand and machine wash.','Anionic surfactants, sodium carbonate, enzymes, perfume','Not applicable','Bacchon ki pahunch se door rakhein.','{surf,excel,detergent,washing,powder}'),
('8904004400013','Bisleri Packaged Drinking Water','Bisleri','Beverages','1 L',20.00,'Multi-stage purified packaged drinking water.','Purified water with added minerals','TDS approx 120 mg/L','Dhoop se door rakhein, kholne ke baad jaldi use karein.','{bisleri,water,pani,bottle}'),
('8901725121112','Head & Shoulders Anti-Dandruff Shampoo','Head & Shoulders (P&G)','Personal Care','340 ml',360.00,'Anti-dandruff shampoo with zinc pyrithione for clean scalp.','Water, sodium laureth sulfate, zinc pyrithione, fragrance','Not applicable','Hafte me 2-3 baar use karein.','{shampoo,dandruff,head,shoulders,hair}'),
('8901058851298','Nescafe Classic Instant Coffee','Nescafe','Beverages','50 g',180.00,'100% pure instant coffee powder, strong aroma.','Instant coffee powder','Energy 100 kcal / 100g','Air-tight jar band rakhein.','{nescafe,coffee,instant,nestle}'),
('8901052001098','Britannia Good Day Cashew Cookies','Britannia','Biscuits','75 g',20.00,'Buttery cookies loaded with cashew pieces.','Wheat flour, sugar, butter, cashew, milk solids','Energy 490 kcal / 100g, Fat 22 g','Bachche ke tiffin ke liye best.','{britannia,goodday,cookies,cashew,biscuit}');
