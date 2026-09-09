import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRightLeft,
  Award,
  Barcode,
  Camera,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Globe,
  Globe2,
  Info,
  Leaf,
  PlayCircle,
  RefreshCw,
  Scale,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { listProducts, searchProducts } from "@/lib/products.functions";
import type { ProductInfo } from "@/lib/product-types";
import scanHero from "@/assets/scan-hero.jpg";
import productsGrid from "@/assets/products-grid.jpg";
import nirikshanLogo from "@/assets/nirikshan-logo.png";
import nirikshanHero from "@/assets/nirikshan-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NIRIKSHAN — Next-Gen Indian Consumer Product Intelligence & Scanner" },
      {
        name: "description",
        content:
          "Scan barcodes or packaging photos. Real-time FSSAI license check, Legal Metrology 2011 Rule 6 audit, health scores & healthier swaps.",
      },
      { property: "og:title", content: "NIRIKSHAN — Next-Gen Consumer Product Lens" },
      {
        property: "og:description",
        content: "Scan product barcodes & packaging for FSSAI status, MRP, Legal Metrology compliance & health score.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const runList = useServerFn(listProducts);
  const runSearch = useServerFn(searchProducts);

  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [lang, setLang] = useState<"hi" | "en">("hi");

  // Over-MRP Calculator State
  const [mrpInput, setMrpInput] = useState<string>("50");
  const [chargedInput, setChargedInput] = useState<string>("60");
  const [previewProduct, setPreviewProduct] = useState<ProductInfo | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    runList()
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]));

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("nirikshan_demo_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUserEmail(parsed.email || parsed.name || null);
          } catch {}
        }
      }
    });
  }, [runList]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await runSearch({ data: { q: query.trim() } });
      setSearchResults(res.products);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  const filteredProducts =
    activeTab === "all"
      ? products
      : products.filter((p) => {
          if (activeTab === "edible") return p.classification?.includes("Edible");
          if (activeTab === "personal") return p.classification?.includes("Personal Care");
          if (activeTab === "stationery") return p.classification?.includes("Stationery");
          return true;
        });

  const mrpVal = Number(mrpInput) || 0;
  const chargedVal = Number(chargedInput) || 0;
  const overcharge = chargedVal > mrpVal ? chargedVal - mrpVal : 0;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Real-time Ticker Bar */}
      <div className="border-b border-primary/30 bg-primary/10 py-1.5 overflow-hidden text-xs text-primary font-mono font-medium">
        <div className="flex animate-pulse items-center justify-center gap-6 px-4 text-center">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3 text-accent" /> LIVE TICKER:
          </span>
          <span>🟢 Bisleri Water: BIS IS 14543 Verified • TDS ~120 ppm</span>
          <span className="hidden md:inline">🛡️ Dove Soap: FSSAI Exempt • BIS IS 4199 Quality Certified</span>
          <span className="hidden lg:inline">📜 Maggi Noodles: FSSAI Lic. 10012011000168 • Rule 6 Compliant</span>
          <span>⚡ 10,000+ Indian Products Pre-Indexed</span>
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 p-0.5 border border-primary/40 shadow-beam overflow-hidden">
              <img src={nirikshanLogo} alt="NIRIKSHAN Logo" className="size-full object-cover rounded-lg" />
            </div>
            <div>
              <span className="font-display text-xl font-bold tracking-[0.2em]">NIRIKSHAN</span>
              <span className="ml-2 hidden text-[10px] font-semibold text-primary sm:inline-block">
                {lang === "hi" ? "निरीक्षण 2.0 AI" : "v2.0 AI Lens"}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={() => setLang(lang === "hi" ? "en" : "hi")}
              className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-secondary/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary"
            >
              <Globe className="size-3.5 text-primary" />
              {lang === "hi" ? "English" : "हिन्दी"}
            </button>

            {userEmail ? (
              <Link to="/scan">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-primary font-semibold">
                  👤 <span className="max-w-[130px] truncate">{userEmail}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  {lang === "hi" ? "लॉगिन" : "Login"}
                </Button>
              </Link>
            )}

            <Link to="/scan">
              <Button size="sm" className="bg-beam shadow-beam text-primary-foreground font-semibold">
                <Camera className="mr-1.5 size-4" /> {lang === "hi" ? "स्कैनर खोलें" : "Launch Scanner"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-beam">
                <img src={nirikshanLogo} alt="Logo" className="size-5 rounded-full object-cover" />
                {lang === "hi" ? "भारत का सबसे एडवांस्ड कंज्यूमर स्कैनर" : "India's Next-Gen Consumer Scanner"}
              </div>

              <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                {lang === "hi" ? (
                  <>
                    हर Product का <span className="text-beam">Govt Rules & Health Sach</span> जानिए.
                  </>
                ) : (
                  <>
                    Decode Every Product with <span className="text-beam">Govt Laws & Health Facts</span>.
                  </>
                )}
              </h1>

              <p className="mt-4 text-base text-muted-foreground sm:text-lg leading-relaxed">
                {lang === "hi"
                  ? "Barcode scan कीजिए या photo upload कीजिए — FSSAI License, Legal Metrology 2011 Rule 6 (MRP & Net Qty), BIS Quality Standards, aur Health Grade A-E instant dekhein."
                  : "Scan barcode or upload package photos — Instant audit of FSSAI Lic, Legal Metrology 2011 Rules, MRP, Net Qty, BIS Quality Standards & Health Grade A-E."}
              </p>

              {/* Quick Search Input */}
              <form onSubmit={handleSearch} className="mt-8 flex max-w-md gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={lang === "hi" ? "Bisleri, Dove Soap, Maggi, Pilot Pen..." : "Search Bisleri, Dove Soap, Maggi..."}
                  className="rounded-xl surface-glass"
                />
                <Button type="submit" disabled={isSearching} className="rounded-xl shadow-beam">
                  <Search className="size-4" />
                </Button>
              </form>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/scan">
                  <Button size="lg" className="rounded-2xl bg-beam px-7 text-primary-foreground shadow-beam font-bold">
                    <Barcode className="mr-2 size-5" />
                    {lang === "hi" ? "लाइव AI स्कैनर खोलें" : "Launch AI Scanner"}
                  </Button>
                </Link>
                <a href="#how-to-use">
                  <Button size="lg" variant="outline" className="rounded-2xl border-primary/40 surface-glass text-primary font-semibold hover:bg-primary/10">
                    <PlayCircle className="mr-2 size-5 text-accent animate-pulse" />
                    {lang === "hi" ? "वीडियो ट्यूटोरियल देखें" : "Watch Video Tutorial"}
                  </Button>
                </a>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="rounded-2xl border-border/80 surface-glass">
                    {lang === "hi" ? "अकाउंट बनाएं" : "Create Account"} <ChevronRight className="ml-1.5 size-4" />
                  </Button>
                </Link>
              </div>

              {/* Badges */}
              <div className="mt-10 flex flex-wrap gap-5 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" /> FSSAI Act 2006 Compliant
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-indigo-400" /> Legal Metrology 2011 Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" /> Dual Hindi & English
                </span>
              </div>
            </div>

            {/* Next-Gen Holographic Laser Scanner Card */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="scan-line overflow-hidden rounded-3xl border border-primary/50 surface-glass shadow-card relative">
                <img
                  src={nirikshanHero}
                  alt="NIRIKSHAN Futuristic Product Inspection Scanner"
                  className="h-80 w-full object-cover sm:h-96 opacity-95 transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <span className="rounded-full bg-black/70 backdrop-blur border border-primary/40 px-3 py-1 text-[11px] font-mono text-primary flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping" /> AI TARGET LOCK ACTIVE
                  </span>
                  <span className="rounded-full bg-black/70 backdrop-blur border border-accent/40 px-3 py-1 text-[11px] font-mono text-accent">
                    NIRIKSHAN 2.0 HUD
                  </span>
                </div>

                <div className="p-6 bg-gradient-to-t from-background via-background/95 to-transparent">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5">
                      <Sparkles className="size-3.5" /> Realtime Inspection HUD
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-2.5 py-0.5 text-xs text-primary font-bold">
                      <Zap className="size-3" /> FSSAI Live
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold">AI Optical & Barcode Decoder</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Instant verification of ingredient lists, hidden preservatives, net weight compliance, and health ratings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY USE NIRIKSHAN - Features Grid */}
      <section className="border-t border-border/40 bg-secondary/20 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">
              {lang === "hi" ? "NIRIKSHAN ऐप का इस्तेमाल क्यों करें?" : "Why Use NIRIKSHAN?"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {lang === "hi"
                ? "बाजार में बिकने वाले हर प्रोडक्ट के पीछे की सच्चाई जानें। क्या आप जो खा रहे हैं वो सुरक्षित है? क्या आप सही दाम दे रहे हैं? निरीक्षण आपको हर जानकारी एक स्कैन में देता है।"
                : "Uncover the hidden truth behind everyday consumer products. Ensure food safety, legal compliance, and protect yourself from deceptive packaging with a single scan."}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-500/30 bg-card p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="rounded-full bg-emerald-500/10 w-14 h-14 flex items-center justify-center mb-5">
                <ShieldCheck className="size-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold">FSSAI & Govt Compliance</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Instantly verify if a food product is legally registered under the Food Safety and Standards Authority of India (FSSAI) Act, 2006.
              </p>
            </div>
            <div className="rounded-3xl border border-red-500/30 bg-card p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-red-500/10">
              <div className="rounded-full bg-red-500/10 w-14 h-14 flex items-center justify-center mb-5">
                <AlertTriangle className="size-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold">Hidden Health Risks</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Our AI engine calculates a precise Health Score, exposing high sodium, dangerous sugar levels, and harmful preservatives in seconds.
              </p>
            </div>
            <div className="rounded-3xl border border-indigo-500/30 bg-card p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/10">
              <div className="rounded-full bg-indigo-500/10 w-14 h-14 flex items-center justify-center mb-5">
                <Scale className="size-7 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold">Fight Overpricing (MRP)</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Are you paying more than the printed MRP? Check Legal Metrology Rules 2011 compliance to enforce consumer rights and fight overpricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VIDEO TUTORIAL & HOW TO USE MID-SECTION */}
      <section id="how-to-use" className="border-t border-primary/30 bg-gradient-to-b from-secondary/50 via-background to-secondary/30 py-20 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none animate-pulse" />

        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary shadow-beam">
              <PlayCircle className="size-4 text-accent animate-pulse" />
              {lang === "hi" ? "वीडियो ट्यूटोरियल & गाइड • HOW TO USE" : "Live Video Tutorial • How To Use"}
            </span>
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl lg:text-5xl">
              {lang === "hi" ? (
                <>
                  NIRIKSHAN Scanner का <span className="text-beam">इस्तेमाल कैसे करें?</span>
                </>
              ) : (
                <>
                  How to Use <span className="text-beam">NIRIKSHAN Scanner</span>
                </>
              )}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              {lang === "hi"
                ? "निरीक्षण ऐप का उपयोग करना सीखें। नीचे दी गई लाइव वीडियो गाइड देखें और समझें कि Barcode Scan या Photo Upload करके FSSAI License, Legal Metrology MRP Rules, Health Rating और Healthy Indian Alternatives कैसे तुरंत चेक करें।"
                : "Watch our official step-by-step video guide below to learn how to scan product barcodes, verify FSSAI licenses, audit Legal Metrology MRP rules, and find healthy Indian swaps."}
            </p>
          </div>

          {/* Video Container + 4-Step Interactive Guide */}
          <div className="mt-12 grid gap-8 lg:grid-cols-12 items-center">
            {/* Embedded Widescreen Video Frame (7 Cols) */}
            <div className="lg:col-span-7 relative group">
              <div className="relative overflow-hidden rounded-3xl border border-primary/50 surface-glass shadow-2xl transition-all duration-500 group-hover:border-primary group-hover:shadow-beam">
                {/* Top Player HUD Header */}
                <div className="flex items-center justify-between border-b border-primary/30 bg-black/80 px-4 py-3 backdrop-blur z-10">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-mono text-xs text-primary font-semibold tracking-wider flex items-center gap-1.5">
                      <Video className="size-3.5" /> NIRIKSHAN_TUTORIAL_DEMO.MP4
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" /> Full HD Stream
                  </span>
                </div>

                {/* Google Drive Video Embedded Iframe */}
                <div className="relative aspect-video w-full bg-black/90 flex items-center justify-center min-h-[280px] sm:min-h-[360px]">
                  <iframe
                    src="https://drive.google.com/file/d/1U5gHXWA2b8XvLMfcN0mQMrvSvDUYk-sz/preview"
                    title="NIRIKSHAN Scanner Video Tutorial"
                    className="w-full h-full border-0 rounded-b-3xl"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>

                {/* Bottom HUD Control Footer */}
                <div className="p-4 bg-gradient-to-t from-background via-background/95 to-transparent flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Sparkles className="size-4 text-primary shrink-0" />
                    <span>
                      {lang === "hi"
                        ? "लाइव डेमो: AI Barcode Scan & Packaging OCR Guide"
                        : "Live Demo: AI Barcode Scan & Packaging OCR Guide"}
                    </span>
                  </div>
                  <a
                    href="https://drive.google.com/file/d/1U5gHXWA2b8XvLMfcN0mQMrvSvDUYk-sz/view?usp=drivesdk"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 font-semibold text-primary hover:bg-primary/20 transition-colors shrink-0"
                  >
                    <ExternalLink className="size-3.5" />
                    {lang === "hi" ? "गूगल ड्राइव में खोलें" : "Open in Drive"}
                  </a>
                </div>
              </div>
            </div>

            {/* 4 Step Tutorial Cards (5 Cols) */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="rounded-2xl border border-primary/30 surface-glass p-4 transition-all hover:border-primary hover:scale-[1.01]">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-beam text-primary-foreground font-bold text-xs shadow-beam">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Camera className="size-4 text-primary" />
                      {lang === "hi" ? "1. Barcode Scan करें या Label Photo डालें" : "1. Point Barcode or Upload Label"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {lang === "hi"
                        ? "ऐप में Barcode का 8-13 digit का नंबर दर्ज करें या पैक के लेबल की फोटो अपलोड करें।"
                        : "Enter 8-13 digit product barcode or upload a packaging photo."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 surface-glass p-4 transition-all hover:border-amber-500 hover:scale-[1.01]">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <ShieldCheck className="size-4 text-amber-400" />
                      {lang === "hi" ? "2. FSSAI License & Legal Rules Check" : "2. Instant FSSAI & Legal Audit"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {lang === "hi"
                        ? "FSSAI 14-digit license, Green/Brown veg symbol, aur Legal Metrology Rule 6 MRP compliance dekhein."
                        : "Verify FSSAI 14-digit license, Veg/Non-Veg dot & Legal Metrology 2011 MRP rules."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-red-500/30 surface-glass p-4 transition-all hover:border-red-500 hover:scale-[1.01]">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-red-400 font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <AlertTriangle className="size-4 text-red-400" />
                      {lang === "hi" ? "3. Health Grade (A-E) & Risks" : "3. Health Grade (A-E) & Chemical Warnings"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {lang === "hi"
                        ? "High palm oil, excess added sugar, sodium level aur हानिकारक Preservatives की जानकारी पाएं।"
                        : "Expose hidden palm oil, dangerous added sugar spikes, high sodium and preservatives."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 surface-glass p-4 transition-all hover:border-emerald-500 hover:scale-[1.01]">
                <div className="flex items-start gap-3.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <ArrowRightLeft className="size-4 text-emerald-400" />
                      {lang === "hi" ? "4. Healthy Swaps & Alternatives" : "4. Healthy Indian Swaps & Organic Items"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {lang === "hi"
                        ? "Unhealthy snacks के बदले 100% healthy Indian millet snacks और natural drinks देखें।"
                        : "Discover 100% natural, high-protein Indian alternatives for smart daily choices."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link to="/scan">
                  <Button size="lg" className="w-full rounded-2xl bg-beam text-primary-foreground font-bold shadow-beam">
                    <Camera className="mr-2 size-5" />
                    {lang === "hi" ? "अभी लाइव AI स्कैनर खोलें" : "Launch AI Scanner Now"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW UNIQUE FEATURE 1: Interactive Over-MRP Fine Calculator (Legal Metrology Act 2009) */}
      <section className="border-t border-border/40 py-16 bg-gradient-to-b from-background via-secondary/30 to-background">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-400">
                <Scale className="size-3.5" /> Legal Metrology Act 2009 Penalty Tool
              </span>
              <h2 className="mt-3 text-3xl font-bold">
                {lang === "hi" ? "ओवर-MRP पेनल्टी कैलकुलेटर (Consumer Legal Law)" : "Illegal Over-MRP Fine Calculator"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Legal Metrology Rules 2011 ke anusar MRP se 1 rupaya bhi zyaada lena gair-kanooni apradh hai. Apne bill ka MRP aur dukandar dwara maange gaye daam check karein:
              </p>

              <div className="mt-6 rounded-2xl border border-indigo-500/30 surface-glass p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Printed MRP (₹)</label>
                    <Input
                      type="number"
                      value={mrpInput}
                      onChange={(e) => setMrpInput(e.target.value)}
                      className="surface-glass text-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Charged Price (₹)</label>
                    <Input
                      type="number"
                      value={chargedInput}
                      onChange={(e) => setChargedInput(e.target.value)}
                      className="surface-glass text-lg font-bold text-red-400"
                    />
                  </div>
                </div>

                {overcharge > 0 ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs">
                    <p className="font-bold text-red-400 text-sm flex items-center gap-1.5">
                      <AlertTriangle className="size-4" /> Illegal Overcharging Detected: ₹{overcharge} Extra!
                    </p>
                    <p className="mt-1 text-foreground/90 font-medium">
                      Legal Penalty under Section 36:
                    </p>
                    <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground list-disc pl-4">
                      <li>First Offense: Shopkeeper Fine up to <strong>₹25,000</strong></li>
                      <li>Second Offense: Fine up to <strong>₹50,000 + 1 Year Imprisonment</strong></li>
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0" /> Price is Legal & Fair within Printed MRP limit.
                  </div>
                )}

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span>National Consumer Helpline: <strong>1915</strong></span>
                  <a href="https://consumerhelpline.gov.in" target="_blank" rel="noreferrer" className="text-primary font-semibold hover:underline">
                    Report Offense &rarr;
                  </a>
                </div>
              </div>
            </div>

            {/* NEW UNIQUE FEATURE 2: Healthier Swap Matrix */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-400">
                <ArrowRightLeft className="size-3.5" /> Healthy Indian Swaps Matrix
              </span>
              <h2 className="mt-3 text-3xl font-bold">
                {lang === "hi" ? "स्मार्ट स्वैप: processed food से सेहतमंद विकल्प" : "Smart Health Swaps for Indian Consumers"}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Nirikshan aapko junk/processed food items ke badle 100% healthy Indian alternatives suggest karta hai:
              </p>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl border border-border/60 surface-glass p-4 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="rounded-md bg-red-500/20 text-red-400 px-2 py-0.5 text-[10px] font-bold">Grade D (Unhealthy)</span>
                    <p className="font-bold text-sm mt-1">Fried Potato Chips</p>
                    <p className="text-muted-foreground text-[11px]">High Palm Oil & High Sodium</p>
                  </div>
                  <ArrowRightLeft className="size-5 text-primary shrink-0" />
                  <div className="text-xs text-right">
                    <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Grade A (Swap)</span>
                    <p className="font-bold text-sm text-emerald-400 mt-1">Roasted Makhana</p>
                    <p className="text-muted-foreground text-[11px]">High Fiber & High Protein</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 surface-glass p-4 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="rounded-md bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold">Grade C (Processed)</span>
                    <p className="font-bold text-sm mt-1">Refined Maida Noodles</p>
                    <p className="text-muted-foreground text-[11px]">Low Fiber, High Sodium</p>
                  </div>
                  <ArrowRightLeft className="size-5 text-primary shrink-0" />
                  <div className="text-xs text-right">
                    <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Grade A (Swap)</span>
                    <p className="font-bold text-sm text-emerald-400 mt-1">Whole Grain Millet Noodles</p>
                    <p className="text-muted-foreground text-[11px]">100% Millets & Low GI</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 surface-glass p-4 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="rounded-md bg-orange-500/20 text-orange-400 px-2 py-0.5 text-[10px] font-bold">Grade D (High Sugar)</span>
                    <p className="font-bold text-sm mt-1">Carbonated Cola Drink</p>
                    <p className="text-muted-foreground text-[11px]">44 kcal / 100ml Added Sugar</p>
                  </div>
                  <ArrowRightLeft className="size-5 text-primary shrink-0" />
                  <div className="text-xs text-right">
                    <span className="rounded-md bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Grade A (Swap)</span>
                    <p className="font-bold text-sm text-emerald-400 mt-1">Fresh Coconut Water</p>
                    <p className="text-muted-foreground text-[11px]">Zero Added Sugar Hydration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Mission & How NIRIKSHAN Works */}
      <section className="border-t border-border/40 py-16 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Mission & Technology
            </span>
            <h2 className="mt-2 text-3xl font-bold">
              {lang === "hi" ? "NIRIKSHAN कैसे काम करता है?" : "How NIRIKSHAN Intelligence Works"}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              NIRIKSHAN (निरीक्षण) Bharat ka daily product intelligence scanner hai jo har Indian consumer ko packaged items ki complete transparency aur legal rules batata hai.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-primary/20 surface-glass p-6 transition-all hover:border-primary">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-beam text-primary-foreground shadow-beam">
                <Barcode className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">1. Optical & Barcode Scan</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Pack ke peeche ka 8-13 digit barcode scan karein ya camera se photo upload karein. Zero manual hassle.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-500/20 surface-glass p-6 transition-all hover:border-amber-500">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                <ShieldCheck className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">2. FSSAI License Check</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                FSSAI License No., Food Safety Standards Act 2006, Green/Brown veg-nonveg dot compliance check hoti hai.
              </p>
            </div>

            <div className="rounded-3xl border border-indigo-500/20 surface-glass p-6 transition-all hover:border-indigo-500">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                <Scale className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">3. Legal Metrology 2011</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Govt Legal Metrology Rules 2011 ke Rule 6 mandatory declarations (MRP, Net Qty, Expiry, Importer) audit hote hain.
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 surface-glass p-6 transition-all hover:border-emerald-500">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Award className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">4. Health Score & Alternatives</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Grade A to E health rating system, sugar/sodium warnings aur Indian market ke healthier alternatives.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Govt Rules & Regulatory Transparency Section */}
      <section className="border-t border-border/40 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <span className="rounded-full bg-primary/10 border border-primary/30 px-3.5 py-1 text-xs font-bold text-primary">
              🏛️ Indian Legal Framework & Regulatory Rights
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-bold">
              Bharatiya Govt Rules & Consumer Safety Standards
            </h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              NIRIKSHAN har product scan par Govt. ke 4 main regulatory laws aur compliance standards verify karta hai:
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* FSSAI Rules */}
            <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-surface-glass to-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-amber-400">FSSAI Rules (FSS Act, 2006)</h3>
                  <p className="text-xs text-muted-foreground">Food Safety and Standards Authority of India</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>14-Digit FSSAI License Number:</strong> Packaged edible food par FSSAI Lic No. aur FSSAI logo hona kanoonan anivarya hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Veg / Non-Veg Green/Brown Symbol:</strong> Pure vegetarian items par Green Dot aur Non-Veg par Brown Triangle mandatory hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Allergen Declarations:</strong> Gluten, Soy, Nuts, Milk Solids aur Crustaceans jaise allergens bold text me declare hone chahiye.</span>
                </li>
              </ul>
            </div>

            {/* Legal Metrology Rules 2011 */}
            <div className="rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-surface-glass to-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Scale className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-indigo-400">Legal Metrology (Packaged Commodities) Rules, 2011</h3>
                  <p className="text-xs text-muted-foreground">Rule 6 Mandatory Declarations for all Pre-Packaged Goods</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 6(1) MRP Inclusion:</strong> Maximum Retail Price (MRP) sabhi taxes ke saath clearly printed hona compulsory hai. Dual pricing illegal hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Net Quantity & Unit Price:</strong> Pack ka exact Net Weight/Volume aur per gram / per ml unit sale price printed hona mandatory hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Mfg Date & Best Before / Expiry:</strong> Product ki Manufacturing Month/Year aur Expiry / Use By date hona zaroori hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span><strong>Consumer Care Helpline:</strong> Manufacturer / Importer ka full address, email ID aur Toll-Free Helpline Number hona mandatory hai.</span>
                </li>
              </ul>
            </div>

            {/* BIS Quality Standards */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-surface-glass to-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Award className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-emerald-400">BIS Quality Standards (ISI Mark)</h3>
                  <p className="text-xs text-muted-foreground">Bureau of Indian Standards National Quality Codes</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Packaged Drinking Water (IS 14543):</strong> Bisleri/Aquafina jaise mineral water bottles ke liye mandatory BIS Quality Mark.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Bathing Bars & Soap (IS 4199):</strong> Skincare aur bathing soaps ke TFM (Total Fatty Matter) grade standards.</span>
                </li>
              </ul>
            </div>

            {/* COTPA 2003 Tobacco Regulations */}
            <div className="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-surface-glass to-background p-7">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                  <ShieldAlert className="size-5" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-red-400">COTPA Act, 2003 (Tobacco Regulations)</h3>
                  <p className="text-xs text-muted-foreground">Cigarettes and Other Tobacco Products Act Rules</p>
                </div>
              </div>
              <ul className="mt-5 space-y-2.5 text-xs text-foreground/90">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-red-400 shrink-0 mt-0.5" />
                  <span><strong>85% Statutory Graphic Warnings:</strong> Pack ke 85% surface par statutory pictorial health warnings hona kanoon hai.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-red-400 shrink-0 mt-0.5" />
                  <span><strong>18+ Age Restriction & Quit Helpline:</strong> 18 saal se kam umr ko bechna apradh hai. National Quitline (1800-11-2356) listed hoti hai.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* NIRIKSHAN Health Rating System (Grade A to E) */}
      <section className="border-t border-border/40 py-16 bg-secondary/30">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Health Scoring Algorithm
            </span>
            <h2 className="mt-2 text-3xl font-bold">NIRIKSHAN Health Grade Standards (A to E)</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Hum har scanned product ki nutrition value, added sugar, sodium, preservatives, aur refining grade ko calculate karke 10/10 Health Score dete hain:
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
              <span className="inline-block rounded-xl bg-emerald-500 px-3 py-1 text-lg font-extrabold text-black">
                Grade A
              </span>
              <p className="mt-2 text-xs font-bold text-emerald-400">Score 8.0 - 10.0</p>
              <p className="mt-1 text-[11px] text-muted-foreground">High natural nutrition, zero added sugar, safe & clean ingredients (e.g. Bisleri, Dove).</p>
            </div>

            <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-5 text-center">
              <span className="inline-block rounded-xl bg-blue-500 px-3 py-1 text-lg font-extrabold text-white">
                Grade B
              </span>
              <p className="mt-2 text-xs font-bold text-blue-400">Score 6.5 - 7.9</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Balanced nutrition profile, low sodium, minor preservatives (e.g. Parle-G, Dettol).</p>
            </div>

            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
              <span className="inline-block rounded-xl bg-amber-500 px-3 py-1 text-lg font-extrabold text-black">
                Grade C
              </span>
              <p className="mt-2 text-xs font-bold text-amber-400">Score 5.0 - 6.4</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Moderate refinement, refined flour (maida) base, sodium content (e.g. Maggi Masala).</p>
            </div>

            <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-5 text-center">
              <span className="inline-block rounded-xl bg-orange-500 px-3 py-1 text-lg font-extrabold text-white">
                Grade D
              </span>
              <p className="mt-2 text-xs font-bold text-orange-400">Score 3.5 - 4.9</p>
              <p className="mt-1 text-[11px] text-muted-foreground">High added sugar / high saturated fat / carbonated drinks (e.g. Coca-Cola, Lay's).</p>
            </div>

            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-center">
              <span className="inline-block rounded-xl bg-red-500 px-3 py-1 text-lg font-extrabold text-white">
                Grade E
              </span>
              <p className="mt-2 text-xs font-bold text-red-400">Score 1.0 - 3.4</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Restricted items, high health risk, carcinogenic tobacco commodities (COTPA Regulated).</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <section className="border-t border-border/40 py-12">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-2xl font-bold">Search Results ({searchResults.length})</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {searchResults.map((item) => (
                <div key={item.barcode ?? item.name} className="rounded-2xl surface-glass p-5">
                  <p className="text-xs uppercase text-primary">{item.brand ?? item.category}</p>
                  <h4 className="mt-1 font-semibold">{item.name}</h4>
                  {item.mrp != null && <p className="mt-2 text-sm font-medium">MRP: ₹{item.mrp}</p>}
                  {item.ingredients && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {item.ingredients}
                    </p>
                  )}
                  <Link to="/scan" className="mt-4 inline-block text-xs font-semibold text-primary hover:underline">
                    Scan or view &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Indian Products Catalogue */}
      <section className="border-t border-border/40 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold">Pre-Indexed Database</p>
              <h2 className="mt-1 text-3xl font-bold">Verified Indian Products Catalogue</h2>
            </div>
            
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1 rounded-xl bg-secondary p-1 text-xs">
              {[
                { id: "all", label: "All Items" },
                { id: "edible", label: "Edibles & Food" },
                { id: "personal", label: "Personal Care" },
                { id: "stationery", label: "Stationery" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-beam text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((item) => (
              <div
                key={item.barcode ?? item.name}
                className="group flex flex-col justify-between rounded-2xl border border-border/60 surface-glass p-5 transition-all hover:border-primary"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.category ?? "Grocery"}
                    </span>
                    {item.healthGrade && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        Grade {item.healthGrade}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-primary/80 mt-0.5">{item.brand}</p>
                  
                  {item.fssaiStatus && (
                    <p className="mt-2 text-[11px] text-amber-400/90 font-medium line-clamp-1">
                      🛡️ {item.fssaiStatus}
                    </p>
                  )}

                  {item.description && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {item.mrp != null ? `MRP ₹${item.mrp}` : item.netWeight ?? "Pack"}
                  </span>
                  <Link
                    to="/scan"
                    className="font-medium text-primary hover:underline"
                  >
                    Audit Scan &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Visual Banner */}
      <section className="relative overflow-hidden py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 surface-glass p-8 md:p-12">
            <img
              src={productsGrid}
              alt="Everyday Consumer Goods"
              className="absolute inset-0 size-full object-cover opacity-15"
            />
            <div className="relative z-10 max-w-xl">
              <span className="flex size-10 items-center justify-center rounded-xl bg-beam text-primary-foreground mb-4">
                <ShieldCheck className="size-6" />
              </span>
              <h2 className="text-3xl font-bold">Har Indian Consumer Ka Legal & Health Mitra</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Nirikshan aapko batata hai ki packaged items mein kitna preservative, palm oil, ya sodium hai, aur FSSAI & Legal Metrology 2011 rules ke anusar packaging certified hai ya nahi.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/scan">
                  <Button className="rounded-xl bg-beam text-primary-foreground font-semibold shadow-beam">
                    Abhi Scanner Open Karein
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" className="rounded-xl border-border surface-glass">
                    Login / Join NIRIKSHAN
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ & Consumer Rights Section */}
      <section className="border-t border-border/40 py-16">
        <div className="mx-auto max-w-3xl px-5">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Consumer Rights & Legal FAQ</h2>
            <p className="mt-2 text-sm text-muted-foreground">FSSAI, Legal Metrology 2011 aur NIRIKSHAN Scanner ke bare me zaroori jankari</p>
          </div>

          <Accordion type="single" collapsible className="mt-8 space-y-3">
            <AccordionItem value="faq-1" className="rounded-2xl surface-glass px-5 border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                Legal Metrology Rules 2011 ke anusar pack par kya hona compulsory hai?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Rule 6 ke mutabiq har pre-packaged item par Name of Commodity, Net Quantity/Weight, Month & Year of Manufacture/Import, Best Before/Expiry, Maximum Retail Price (MRP inclusive of all taxes), Manufacturer/Importer name & address, aur Customer Care Contact clearly printed hona mandatory hai.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="rounded-2xl surface-glass px-5 border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                FSSAI License Number check karna kyu zaroori hai?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                FSSAI (Food Safety and Standards Authority of India) License No. se yeh confirm hota hai ki food item certified hygiene aur safety standards (FSS Act 2006) ke mutabiq bana hai aur fake / adulterated nahi hai.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="rounded-2xl surface-glass px-5 border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                Agar dukandar MRP se zyada paise mange to kya karein?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                Legal Metrology Rules 2011 ke anusar MRP se zyada bechna kanoonan gair-kanooni hai. Aap National Consumer Helpline number <strong>1915</strong> ya Consumer Grievance Portal (consumerhelpline.gov.in) par complaint darj kara sakte hain.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="rounded-2xl surface-glass px-5 border-none">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                Nirikshan scanner se barcode ya photo scan kaise karein?
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                'Start Scanner' button dabaayein. Barcode tab me pack ka 8-13 digit number enter karein, ya Photo tab me packaging ki clear photo upload karein. NIRIKSHAN AI saari details display kar dega.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-8 bg-card/30">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-beam text-primary-foreground">
              <ScanLine className="size-4" />
            </span>
            <span className="font-display font-bold tracking-widest">NIRIKSHAN</span>
            <span className="text-xs font-medium text-primary">निरीक्षण</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} NIRIKSHAN. Empowering 1.4 Billion Smart Consumers across India.
          </p>
        </div>
      </footer>
    </div>
  );
}

