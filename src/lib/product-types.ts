export type ProductInfo = {
  name: string;
  brand?: string | null;
  category?: string | null;
  netWeight?: string | null;
  mrp?: number | null;
  description?: string | null;
  ingredients?: string | null;
  nutrition?: string | null;
  usageTips?: string | null;
  barcode?: string | null;
  healthScore?: number | null;
  healthGrade?: "A" | "B" | "C" | "D" | "E" | null;
  ecoScore?: string | null;
  allergens?: string[] | null;
  origin?: string | null;
  highlights?: string[] | null;
  alternatives?: Array<{
    name: string;
    brand: string;
    price?: string;
    reason: string;
  }> | null;
  fssaiStatus?: string | null;
  classification?: "Edible / Food & Beverage" | "Groceries & Kitchen" | "Personal Care & Hygiene" | "Household & Stationery" | "Tobacco / Restricted" | string | null;
  legalMetrologyRules?: string | null;
  healthRiskAlerts?: string[] | null;
  fssaiVerifiedFormat?: boolean | null;
  microplasticRisk?: "Low" | "Medium" | "High" | null;
  recyclingBin?: "Dry Waste (Blue)" | "Wet Waste (Green)" | "E-Waste" | null;
  source: "catalog" | "openfoodfacts" | "ai" | "image_analysis";
  confidence?: string | null;
};

export type LookupResult = {
  product: ProductInfo | null;
  message?: string | null;
};
