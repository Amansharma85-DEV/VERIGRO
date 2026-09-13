import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Barcode,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  HeartPulse,
  Info,
  Layers,
  Leaf,
  Play,
  PlayCircle,
  QrCode,
  Scale,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VerigroLogo } from "@/components/VerigroLogo";
import { supabase } from "@/integrations/supabase/client";
import { listProducts, searchProducts } from "@/lib/products.functions";
import type { ProductInfo } from "@/lib/product-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VERIGRO — Verify Products. Manage Stores. Shop Smarter." },
      {
        name: "description",
        content:
          "VERIGRO — Intelligent grocery product verification and store inventory management. Scan barcodes to verify FSSAI licenses, detect harmful additives, and track store batch expiry.",
      },
      { property: "og:title", content: "VERIGRO — Verify Products. Manage Stores. Shop Smarter." },
      {
        property: "og:description",
        content:
          "Instant FSSAI compliance, batch expiry tracking, allergen alerts, and Legal Metrology Rule 6 verification for Indian retail stores and consumers.",
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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Over-MRP Calculator
  const [mrpInput, setMrpInput] = useState<string>("40");
  const [chargedInput, setChargedInput] = useState<string>("50");

  useEffect(() => {
    runList()
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]));

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setUserEmail(data.user.email);
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("verigro_demo_user") || localStorage.getItem("nirikshan_demo_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setUserEmail(parsed.email || parsed.name || null);
          } catch (error) {
            console.error(error);
          }
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
      if (res.products.length === 0) {
        toast.info("No matching products found. Try another barcode or name.");
      }
    } catch {
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  const overchargeDiff = Math.max(0, Number(chargedInput || 0) - Number(mrpInput || 0));

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
      {/* 1. Sticky White Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <VerigroLogo variant="default" size="md" to="/" />

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <Link to="/" className="text-blue-600 font-semibold transition-colors">
              Home
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#retailers" className="hover:text-slate-900 transition-colors">
              For Retailers
            </a>
            <a href="#consumers" className="hover:text-slate-900 transition-colors">
              For Consumers
            </a>
            <a href="#products" className="hover:text-slate-900 transition-colors">
              Products
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVideoModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
              <span>Video Guide</span>
            </button>

            {userEmail ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#146EF5] hover:bg-[#115cc7] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#146EF5] hover:bg-[#115cc7] text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section Matching media_1789210388672.jpg */}
      <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#146EF5] animate-pulse" />
              <span>AI-Powered Product Verification · FSSAI & Legal Metrology Compliant</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 font-display tracking-tight leading-[1.12]">
              Scan. Verify. <br />
              <span className="bg-gradient-to-r from-[#146EF5] via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Buy with Confidence.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Instantly verify ingredients, expiry dates, FSSAI licenses, and eco-ratings for grocery products across India. Protect your family, manage store inventory, and shop smarter.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/scan"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white font-semibold text-sm sm:text-base shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
              >
                <ScanLine className="w-5 h-5" />
                <span>Scan a Product Now</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
              <a
                href="#retailers"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm sm:text-base hover:bg-slate-50 transition-all shadow-sm"
              >
                <Store className="w-4 h-4 text-blue-600" />
                <span>For Grocery Retailers</span>
              </a>
              <button
                type="button"
                onClick={() => setShowVideoModal(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-all"
              >
                <Play className="w-4 h-4 fill-blue-600 text-blue-600" />
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Metrics Bar */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center max-w-2xl mx-auto border-t border-slate-200/80">
              <div className="p-2">
                <div className="text-xl sm:text-2xl font-bold font-display text-slate-900">50,000+</div>
                <div className="text-xs text-slate-500 font-medium">Verified Products</div>
              </div>
              <div className="p-2">
                <div className="text-xl sm:text-2xl font-bold font-display text-slate-900">10,000+</div>
                <div className="text-xs text-slate-500 font-medium">Active Retailers</div>
              </div>
              <div className="p-2">
                <div className="text-xl sm:text-2xl font-bold font-display text-slate-900">99.8%</div>
                <div className="text-xs text-slate-500 font-medium">Verification Accuracy</div>
              </div>
              <div className="p-2">
                <div className="text-xl sm:text-2xl font-bold font-display text-[#16A34A]">FSSAI Aligned</div>
                <div className="text-xs text-slate-500 font-medium">Govt Regulations</div>
              </div>
            </div>
          </div>

          {/* Central Hero Mockup Visual with 5 Floating Highlight Cards */}
          <div className="relative mt-12 sm:mt-16 max-w-4xl mx-auto">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 -top-10 bg-gradient-to-tr from-blue-100/50 via-sky-100/40 to-indigo-100/30 rounded-3xl filter blur-3xl -z-10" />

            {/* Main Phone / Scanner Container */}
            <div className="relative mx-auto w-full max-w-md sm:max-w-lg bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-6">
              {/* Top Phone Sensor Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <VerigroLogo variant="compact" size="sm" showTagline={false} />
                  <span className="text-xs font-bold text-slate-800">Scanner Viewfinder</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Camera Active
                </span>
              </div>

              {/* Viewfinder Preview Box */}
              <div className="relative mt-4 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center scan-line">
                <img
                  src="https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80"
                  alt="Diet Coke Can Scanner Preview"
                  className="w-full h-full object-cover opacity-85"
                />
                {/* Laser scan line overlay */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] animate-bounce" />

                {/* Viewfinder Target Reticle */}
                <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-blue-400" />
                    <span className="w-4 h-4 border-t-2 border-r-2 border-blue-400" />
                  </div>
                  <div className="text-center">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full border border-white/20">
                      Align Barcode or Can Front Label
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-blue-400" />
                    <span className="w-4 h-4 border-b-2 border-r-2 border-blue-400" />
                  </div>
                </div>
              </div>

              {/* Action bar beneath preview */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Barcode: 8901764061103</span>
                <span className="text-blue-600 font-semibold">Matched in 0.24s</span>
              </div>
            </div>

            {/* 5 Floating Verification Cards Matching Mockup */}
            {/* Card 1: Top Left — VERIGRO VERIFIED */}
            <div className="hidden lg:flex absolute -left-12 top-6 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 items-center gap-3 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">VERIGRO VERIFIED</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <p className="text-[11px] text-slate-500 truncate">FSSAI Lic. #10012011000168 Active</p>
              </div>
            </div>

            {/* Card 2: Top Right — Health Score 7.0 / 10 (Grade B) */}
            <div className="hidden lg:flex absolute -right-12 top-10 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 items-center gap-3 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 font-display font-extrabold text-sm">
                7.0
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Health Score</span>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 rounded">
                    Grade B
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">Better Alternative Available</p>
              </div>
            </div>

            {/* Card 3: Bottom Left — Expiry Status: SAFE (290 Days Remaining) */}
            <div className="hidden lg:flex absolute -left-14 bottom-12 w-72 bg-white rounded-2xl border border-emerald-200 shadow-xl p-3.5 items-center gap-3 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-800">EXPIRY: SAFE</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    290d Left
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">Batch CCLO724 · Expiry: 30 Jun 2025</p>
              </div>
            </div>

            {/* Card 4: Bottom Right — Legal Metrology Rule 6 Compliant */}
            <div className="hidden lg:flex absolute -right-14 bottom-10 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 items-center gap-3 transition-all hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Legal Metrology 2011</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                    Rule 6
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">All 6 Mandatory Declarations Complete</p>
              </div>
            </div>

            {/* Card 5: Bottom Center — Allergen / Additive Alert */}
            <div className="hidden sm:flex absolute left-1/2 -bottom-6 -translate-x-1/2 bg-white rounded-2xl border border-slate-200 shadow-lg px-4 py-2.5 items-center gap-2.5 text-xs text-slate-700">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong className="text-slate-900">Sweetener Alert:</strong> Contains Phenylalanine (Aspartame) & Caffeine
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Search & Instant Verification Bar */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try barcode '8901764061103' (Diet Coke), '8906002000018' (Bisleri) or brand..."
                className="pl-11 h-12 bg-white border-slate-300 focus:border-blue-500 text-sm rounded-xl shadow-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching}
              className="h-12 px-6 bg-[#146EF5] hover:bg-[#1059c4] text-white rounded-xl font-semibold text-sm shadow-sm"
            >
              {isSearching ? "Searching..." : "Lookup"}
            </Button>
          </form>

          {/* Quick Barcode Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Quick Samples:</span>
            {[
              { code: "8901764061103", label: "Diet Coke Can" },
              { code: "8906002000018", label: "Bisleri 1L" },
              { code: "8901030000000", label: "Dove Soap" },
              { code: "8901063012639", label: "Britannia Bourbon" },
            ].map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setQuery(item.code);
                  runSearch({ data: { q: item.code } }).then((r) => setSearchResults(r.products));
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {item.label} ({item.code})
              </button>
            ))}
          </div>

          {/* Search Results Dropdown / Preview */}
          {searchResults.length > 0 && (
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{searchResults.length} Products Found</span>
                <button
                  type="button"
                  onClick={() => setSearchResults([])}
                  className="text-slate-400 hover:text-slate-700"
                >
                  Clear Results
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {searchResults.map((prod) => (
                  <div
                    key={prod.barcode || prod.name}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => setSelectedProduct(prod)}
                  >
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{prod.name}</h4>
                      <p className="text-xs text-slate-500">
                        {prod.brand} · Barcode: {prod.barcode}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                      View Details →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Why VERIGRO — 6 SaaS Feature Cards */}
      <section id="features" className="py-16 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Complete Intelligence Suite
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
              Why Consumers & Retailers Choose VERIGRO
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Engineered specifically for the Indian grocery ecosystem, covering Indian legal norms, FSSAI database checks, and grocery retail requirements.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Barcode className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Instant Barcode & OCR Scan</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Scan standard EAN-13 barcodes with camera or upload front packaging photos. Embedded client-side OCR and multi-format ZXing parser recognize products in under a second.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">FSSAI License & Authenticity</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Automatically validate 14-digit FSSAI license numbers against Indian Food Safety regulations. Distinguish certified edible foods from non-edible commodities.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Batch Expiry & Freshness Tracking</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Compute exact days remaining until expiry based on printed batch data. Flag expired items instantly to prevent accidental consumption or stock write-downs.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Health Grade & Allergen Alerts</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Transparent health scores (Grade A to E) revealing hidden sugars, excessive sodium, trans fats, microplastics, and sensitive allergens like aspartame, gluten, and soy.
              </p>
            </div>

            {/* Card 5 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Store className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Store Inventory & Stock Audits</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Designed for Indian Kiranas and Supermarkets. Track units in stock, register new inventory SKUs, receive restock alerts, and avoid customer complaints over expired stock.
              </p>
            </div>

            {/* Card 6 */}
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Healthier Indian Alternatives</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                When a scanned product has a low health grade or high sugar content, VERIGRO suggests clean, nutritious Indian market alternatives with fair pricing and better ratings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dual Target Audience Sections (Retailers & Consumers) */}
      <section id="retailers" className="py-16 sm:py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                <Store className="w-3.5 h-3.5" />
                <span>For Grocery Retailers & Supermarkets</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
                Eliminate Expired Stock Losses & Automate Inventory Audits
              </h2>
              <p className="text-slate-600 text-base leading-relaxed">
                Indian retail stores lose up to 4–7% of perishable inventory annually due to untracked batch expiries. VERIGRO gives store owners an automated scanning audit tool to inspect supplier shipments, track batches, and clear goods before expiration.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  {
                    title: "Batch & Expiry Management",
                    desc: "Scan entire supplier deliveries in minutes and log batch numbers with automated expiry date calculation.",
                  },
                  {
                    title: "Legal Metrology Rule 6 Safeguard",
                    desc: "Protect your store from penal action under Section 36 of Legal Metrology Act 2009 by ensuring MRP & Net Qty match.",
                  },
                  {
                    title: "Low Stock & Reorder Alerts",
                    desc: "Get automated notifications when high-demand pantry staples reach reorder thresholds.",
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  to="/auth"
                  search={{ mode: "signup", role: "retailer" }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white font-semibold text-sm shadow-sm transition-all"
                >
                  <span>Register Your Store on VERIGRO</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Visual Preview Box for Retailer */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    S
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Sharma Supermarket & Daily Needs</h3>
                    <p className="text-xs text-slate-400">Retailer Inventory Dashboard</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                  Store Active
                </span>
              </div>

              {/* Sample Batch Rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Diet Coke Can (300ml)</div>
                    <div className="text-slate-500">Batch CCLO724 · 48 units in stock</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded">
                    Safe (290d)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Amul Taaza Milk (500ml)</div>
                    <div className="text-slate-500">Batch A-991 · 24 units in stock</div>
                  </div>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 font-bold rounded">
                    Expiring in 14d
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">Bisleri 1L Mineral Water</div>
                    <div className="text-slate-500">Batch BIS-402 · 120 units in stock</div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold rounded">
                    Safe (180d)
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500">
                  Includes automatic discount pricing triggers for expiring items.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Over-MRP & Legal Metrology Rule 6 Calculator */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-8 rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  Consumer Protection Tool
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-slate-900">
                  Over-MRP Grievance & Overcharge Calculator
                </h3>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Under Rule 18(2) of the <strong>Legal Metrology (Packaged Commodities) Rules, 2011</strong>, no retail vendor can sell any pre-packaged commodity at a price higher than the Maximum Retail Price (MRP) inclusive of all taxes. Test your purchase below:
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Printed MRP (₹)</label>
                <Input
                  type="number"
                  value={mrpInput}
                  onChange={(e) => setMrpInput(e.target.value)}
                  className="bg-white border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Charged Amount (₹)</label>
                <Input
                  type="number"
                  value={chargedInput}
                  onChange={(e) => setChargedInput(e.target.value)}
                  className="bg-white border-slate-300"
                />
              </div>
            </div>

            {overchargeDiff > 0 ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>Illegal Overcharging Detected: ₹{overchargeDiff} above MRP</span>
                </div>
                <p>
                  Section 36(1) of Legal Metrology Act 2009 prescribes a fine up to <strong>₹25,000</strong> for first offense and up to <strong>₹50,000</strong> for repeat offenses.
                </p>
                <div className="pt-1">
                  <a
                    href="https://consumerhelpline.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-red-700 underline"
                  >
                    File Complaint on National Consumer Helpline (1915) <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Fair Pricing Confirmed! Product is charged at or below official printed MRP.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. Product Catalog Showcase */}
      <section id="products" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                Verified Indian Catalog
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
                Explore Verified Products
              </h2>
              <p className="text-sm text-slate-600">
                Browse popular everyday packaged items with full regulatory and nutrition audits.
              </p>
            </div>
            <Link
              to="/scan"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Open Scanner Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.slice(0, 8).map((p) => (
              <div
                key={p.barcode || p.name}
                onClick={() => setSelectedProduct(p)}
                className="group bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="aspect-video w-full rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center relative">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Barcode className="w-12 h-12 text-slate-300" />
                    )}
                    <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 border border-slate-200">
                      {p.healthGrade ? `Grade ${p.healthGrade}` : "Audited"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      {p.brand || "Verified Brand"}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                      {p.description || "Indian grocery packaged commodity."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-900">
                    {p.mrp ? `₹${p.mrp.toFixed(2)}` : "MRP Verified"}
                  </span>
                  <span className="text-blue-600 font-semibold flex items-center gap-0.5">
                    <span>Audit Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Pricing Plans */}
      <section id="pricing" className="py-16 sm:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Simple Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display tracking-tight">
              Plans for Families & Store Owners
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Start free as a consumer. Upgrade when you manage store inventory and supplier batches.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Consumer Plan */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-display text-slate-900">Consumer Basic</h3>
                  <p className="text-xs text-slate-500">For smart personal and family grocery shopping.</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ₹0 <span className="text-xs font-normal text-slate-400">/ forever free</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Unlimited Barcode & OCR Scans</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>FSSAI License Validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Health Grades & Allergen Alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Overcharge Grievance Calculator</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/auth"
                search={{ mode: "signup", role: "consumer" }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-center font-semibold text-xs text-slate-800 transition-all"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Retailer Pro Plan — Featured */}
            <div className="p-6 sm:p-8 rounded-3xl border-2 border-blue-600 bg-white shadow-xl relative flex flex-col justify-between space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                Most Popular for Stores
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-display text-slate-900">Retailer Pro</h3>
                  <p className="text-xs text-slate-500">For grocery stores, supermarkets, and Kiranas.</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  ₹999 <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>All Consumer Features Included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Batch Expiry & Freshness Tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Automated Expiring-Soon Alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Store Inventory SKU Management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Legal Metrology Compliance Audits</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/auth"
                search={{ mode: "signup", role: "retailer" }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-center font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Start 14-Day Free Retailer Trial
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-display text-slate-900">Multi-Store Chain</h3>
                  <p className="text-xs text-slate-500">For regional retail chains and FMCG distributors.</p>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  Custom <span className="text-xs font-normal text-slate-400">/ tailored</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Centralized Multi-Outlet Dashboard</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Custom POS & ERP Integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Supplier Quality Audit Reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Dedicated Account Manager & SLAs</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Contacting enterprise support: enterprise@verigro.in")}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-center font-semibold text-xs text-slate-800 transition-all"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm">
              Everything you need to know about VERIGRO verification and store tools.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            <AccordionItem value="item-1" className="bg-white border border-slate-200 rounded-2xl px-5">
              <AccordionTrigger className="text-sm font-bold text-slate-900 text-left hover:no-underline">
                How does VERIGRO verify product barcodes and labels?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                VERIGRO runs a dual-layer scanner: native browser BarcodeDetector API with ZXing fallback for instant barcode reads, combined with client-side OCR (Tesseract.js) to extract printed batch codes, manufacturing dates, and FSSAI license numbers directly from packaging photos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="bg-white border border-slate-200 rounded-2xl px-5">
              <AccordionTrigger className="text-sm font-bold text-slate-900 text-left hover:no-underline">
                What is Legal Metrology Rule 6 and why does it matter?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 mandates that every packaged good sold in India must clearly display: (1) Name & Address of Manufacturer/Packer, (2) Common Name of Commodity, (3) Net Quantity, (4) Month & Year of Manufacture, (5) Maximum Retail Price (MRP inclusive of all taxes), and (6) Consumer Care helpline details. Selling above MRP or omitting declarations attracts penalties up to ₹50,000.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="bg-white border border-slate-200 rounded-2xl px-5">
              <AccordionTrigger className="text-sm font-bold text-slate-900 text-left hover:no-underline">
                Can grocery store owners use VERIGRO without expensive hardware?
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Yes! VERIGRO requires zero specialized hardware. Any smartphone camera, tablet, or laptop webcam functions as a professional high-speed barcode reader and batch logger.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* 10. Final Call to Action */}
      <section className="py-16 sm:py-20 bg-[#0B132B] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(20,110,245,0.25)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <VerigroLogo variant="white" size="lg" to="/" />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white">
            Start Verifying Products in Seconds
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Join conscious shoppers and top Indian grocery retailers managing clean inventory and safe food standards.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/scan"
              className="px-6 py-3.5 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all"
            >
              Open Live Scanner
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm transition-all"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Modern White Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <VerigroLogo variant="default" size="sm" to="/" />
            <p className="text-slate-500 text-xs leading-relaxed">
              VERIGRO — Verify Products. Manage Stores. Shop Smarter. India’s intelligent grocery product verification and inventory platform.
            </p>
            <div className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} VERIGRO Technologies India. All rights reserved.
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Solutions</h4>
            <ul className="space-y-1.5">
              <li>
                <Link to="/scan" className="hover:text-blue-600 transition-colors">
                  Barcode & Photo Scanner
                </Link>
              </li>
              <li>
                <a href="#retailers" className="hover:text-blue-600 transition-colors">
                  Retailer Inventory Management
                </a>
              </li>
              <li>
                <a href="#consumers" className="hover:text-blue-600 transition-colors">
                  Consumer Nutrition & Allergens
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-blue-600 transition-colors">
                  Store Pricing Plans
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Standards & Laws</h4>
            <ul className="space-y-1.5">
              <li>
                <span className="text-slate-600">FSSAI Act 2006 Regulations</span>
              </li>
              <li>
                <span className="text-slate-600">Legal Metrology Rules 2011 (Rule 6)</span>
              </li>
              <li>
                <span className="text-slate-600">Consumer Protection Act 2019</span>
              </li>
              <li>
                <span className="text-slate-600">BIS IS 14543 Drinking Water Standard</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Help & Support</h4>
            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => setShowVideoModal(true)}
                  className="hover:text-blue-600 transition-colors"
                >
                  Watch Product Tour
                </button>
              </li>
              <li>
                <a href="https://consumerhelpline.gov.in" target="_blank" rel="noreferrer" className="hover:text-blue-600 transition-colors">
                  National Consumer Helpline (1915)
                </a>
              </li>
              <li>
                <a href="mailto:support@verigro.in" className="hover:text-blue-600 transition-colors">
                  Contact Support (support@verigro.in)
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {/* Video Guide Modal Dialog */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold font-display text-slate-900">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span>VERIGRO Platform Video Walkthrough</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="aspect-video w-full rounded-xl bg-slate-900 flex items-center justify-center relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80"
                alt="Video thumbnail"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-600/90 flex items-center justify-center text-white mb-2 shadow-lg cursor-pointer hover:scale-105 transition-transform">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <h4 className="font-bold text-sm">How to Scan & Audit Grocery Products</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  Learn how to detect expired batches, inspect FSSAI licenses, and prevent overcharging.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowVideoModal(false)}
                className="text-xs font-semibold"
              >
                Close Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-lg bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {selectedProduct.brand || "Brand Verified"}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {selectedProduct.healthGrade ? `Grade ${selectedProduct.healthGrade}` : "VERIFIED"}
                </span>
              </div>
              <DialogTitle className="text-xl font-bold font-display text-slate-900 mt-1">
                {selectedProduct.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs text-slate-600">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Barcode</span>
                  <strong className="text-slate-800">{selectedProduct.barcode || "N/A"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">MRP</span>
                  <strong className="text-slate-800">
                    {selectedProduct.mrp ? `₹${selectedProduct.mrp.toFixed(2)}` : "As per label"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Quantity</span>
                  <strong className="text-slate-800">{selectedProduct.netWeight || "Standard pack"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Classification</span>
                  <strong className="text-slate-800">{selectedProduct.classification || "Packaged Food"}</strong>
                </div>
              </div>

              {selectedProduct.ingredients && (
                <div>
                  <strong className="text-slate-900 block mb-1">Ingredients:</strong>
                  <p className="leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedProduct.ingredients}
                  </p>
                </div>
              )}

              {selectedProduct.fssaiStatus && (
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-blue-900">
                  <strong className="block mb-0.5">FSSAI Status:</strong>
                  <span>{selectedProduct.fssaiStatus}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <Link
                  to="/scan"
                  className="px-4 py-2 bg-[#146EF5] text-white rounded-lg font-semibold hover:bg-[#1059c4] transition-colors"
                >
                  Open in Scanner →
                </Link>
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
