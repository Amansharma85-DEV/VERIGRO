import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
  Boxes,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HeartPulse,
  History,
  Layers,
  Package,
  Plus,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession } from "@/lib/auth-service";
import {
  getCurrentStoreId,
  getStoreActivities,
  getStoreInventory,
  type InventoryActivity,
  type InventoryRecord,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Retailer Dashboard & Mobile Hub — VERIGRO" },
      {
        name: "description",
        content:
          "VERIGRO Mobile Dashboard. Instant barcode scanner, today's inventory overview, urgent batch expiry alerts, and live activity feed.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [activities, setActivities] = useState<InventoryActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("Aman");
  const [storeName, setStoreName] = useState("Sharma Supermarket");
  const [userRole, setUserRole] = useState<"retailer" | "consumer">("retailer");

  // Dynamic time of day greeting
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    function syncActiveUser() {
      const session = getSession();
      if (session?.user) {
        setUserName(session.user.name.split(" ")[0]);
        setUserRole(session.user.role);
        if (session.user.storeName) {
          setStoreName(session.user.storeName);
        }
      } else if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("verigro_demo_user") || localStorage.getItem("nirikshan_demo_user");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.name) setUserName(parsed.name.split(" ")[0]);
            if (parsed?.storeName) setStoreName(parsed.storeName);
            if (parsed?.role) setUserRole(parsed.role);
          }
        } catch {}
      }
    }

    syncActiveUser();

    function reloadData() {
      const storeId = getCurrentStoreId();
      setInventory(getStoreInventory(storeId));
      setActivities(getStoreActivities(storeId));
    }

    reloadData();
    window.addEventListener("verigro_auth_changed", syncActiveUser);
    window.addEventListener("verigro_inventory_updated", reloadData);
    window.addEventListener("verigro_activity_logged", reloadData);
    return () => {
      window.removeEventListener("verigro_auth_changed", syncActiveUser);
      window.removeEventListener("verigro_inventory_updated", reloadData);
      window.removeEventListener("verigro_activity_logged", reloadData);
    };
  }, []);

  // Compute live metrics from store inventory
  const totalProducts = new Set(inventory.map((i) => i.barcode)).size;
  const totalStock = inventory.reduce((sum, i) => sum + i.stockQuantity, 0);
  const expiringSoonBatches = inventory.filter((i) => i.expiryStatus === "EXPIRING SOON");
  const expiredBatches = inventory.filter((i) => i.expiryStatus === "EXPIRED");
  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate({ to: "/scan", search: { q: searchQuery.trim() } as any });
  }

  // =========================================================================
  // CONSUMER DASHBOARD VIEW (PERSONAL GROCERY SAFETY & NUTRITION)
  // =========================================================================
  if (userRole === "consumer") {
    return (
      <div className="space-y-5 max-w-5xl mx-auto pb-6">
        {/* 1. Consumer Greeting & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Consumer Wellness Hub
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">Personal Grocery Safety</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
              {greeting}, {userName}
            </h1>
            <p className="text-xs text-slate-500">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Quick Consumer Shortcuts */}
          <div className="flex items-center gap-2">
            <Link
              to="/scan"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold shadow-xs transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Product</span>
            </Link>
            <Link
              to="/scans"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>My Scans</span>
            </Link>
          </div>
        </div>

        {/* 2. PROMINENT CONSUMER SCAN CALLOUT */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#146EF5] via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/25 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-md">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Food & Ingredient Scanner</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display">Verify What You Eat</h2>
              <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                Scan barcode or ingredients label to check nutrition quality, hidden sugars, palm oil, allergens, and safer alternatives.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <Link
                to="/scan"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-[#146EF5] hover:bg-blue-50 font-extrabold text-sm shadow-md transition-all transform active:scale-95"
              >
                <Camera className="w-5 h-5 text-blue-600" />
                <span>Scan Food Packaging</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* 3. CONSUMER SEARCH BAR */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search foods by name, brand, or ingredient (e.g. Atta, Oats, Biscuits)..."
            className="pl-9 pr-24 h-11 bg-white border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm shadow-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1.5 h-8 px-3 bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold rounded-lg"
          >
            Search
          </Button>
        </form>

        {/* 4. CONSUMER WELLNESS KPIS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold font-display text-slate-900 uppercase tracking-wider">
              Your Grocery Health Scorecard
            </h3>
            <Link to="/scans" className="text-xs font-bold text-blue-600 hover:text-blue-700">
              Full Scan History →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Products Verified
              </span>
              <div className="text-2xl font-extrabold font-display text-slate-900">14</div>
              <span className="text-[10px] text-slate-400">Scanned items</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Avg Health Grade
              </span>
              <div className="text-2xl font-extrabold font-display text-emerald-600">A- (86%)</div>
              <span className="text-[10px] text-emerald-600">Balanced diet profile</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Clean Formulation
              </span>
              <div className="text-2xl font-extrabold font-display text-blue-600">92%</div>
              <span className="text-[10px] text-slate-400">No harmful additives</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Allergen Flags
              </span>
              <div className="text-2xl font-extrabold font-display text-amber-600">2 Items</div>
              <span className="text-[10px] text-amber-700">Gluten & Soy detected</span>
            </div>
          </div>
        </div>

        {/* 5. PERSONALIZED CONSUMER INSIGHT BANNER */}
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>💡 Clean Grocery Insight:</strong>
              <p className="text-blue-700 text-xs mt-0.5">
                2 of your scanned snacks contain High Palm Oil and Artificial Sweeteners. Check recommended cleaner alternatives below.
              </p>
            </div>
          </div>
          <Link
            to="/scan"
            search={{ q: "Whole Wheat Oats" } as any}
            className="text-xs font-bold text-blue-700 hover:text-blue-950 underline shrink-0"
          >
            Find Alternatives →
          </Link>
        </div>

        {/* 6. CONSUMER 2-COLUMN SECTION */}
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Recent Scanned Products (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold font-display text-slate-900">
                  Recently Verified Products
                </h3>
              </div>
              <Link to="/scans" className="text-[11px] font-bold text-blue-600 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800">
                      Grade A+
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">Aashirvaad Shudh Chakki Atta (5kg)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">100% Whole Wheat · Zero Maida · High Fibre</p>
                </div>
                <Link
                  to="/scan"
                  search={{ code: "8901030383452" }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  Inspect
                </Link>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800">
                      Grade A
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">Amul Taaza Toned Milk (500ml)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Pure Homogenised Toned Milk · No Preservatives</p>
                </div>
                <Link
                  to="/scan"
                  search={{ code: "8901262010057" }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  Inspect
                </Link>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-800">
                      Grade C
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">Dark Fantasy Choco Fills</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-1">High Added Sugar (34g) · Palm Oil detected</p>
                </div>
                <Link
                  to="/scan"
                  search={{ code: "8901030383453" }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  Inspect
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Consumer Tools & Standards (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-bold font-display text-slate-900">
                Safe Grocery Tools
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/scan"
                  className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 text-blue-900 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
                >
                  <Barcode className="w-5 h-5 text-blue-600" />
                  <span>Scan Barcode</span>
                </Link>

                <Link
                  to="/scans"
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
                >
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Scan History</span>
                </Link>

                <Link
                  to="/settings"
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Allergen Shield</span>
                </Link>

                <Link
                  to="/settings"
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
                >
                  <HeartPulse className="w-5 h-5 text-red-600" />
                  <span>Diet Preferences</span>
                </Link>
              </div>
            </div>

            {/* Consumer Guarantee Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-emerald-200/60 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Verified Indian Food Database</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                VERIGRO checks all products against official FSSAI licensing standards, ICMR dietary daily values, and Legal Metrology Act packaging declarations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-6">
      {/* 1. Greeting & Store Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {userRole === "retailer" ? "Retailer Store Hub" : "Consumer Hub"}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">{storeName}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            {greeting}, {userName}
          </h1>
          <p className="text-xs text-slate-500">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Quick Excel Export Shortcut */}
        <div className="flex items-center gap-2">
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Inventory Excel</span>
          </Link>
          <Link
            to="/expiry"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold shadow-xs transition-all"
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Expiry Alerts</span>
          </Link>
        </div>
      </div>

      {/* 2. SECTION 5: LARGE SCAN PRODUCT BUTTON (PROMINENT MOBILE CALLOUT) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#146EF5] via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/25 relative overflow-hidden">
        {/* Visual Scanner Beam Background Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Barcode & Batch Scanner</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-display">Scan Product</h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Scan barcode instantly to verify ingredients, check expiry dates, and auto-update store inventory records.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link
              to="/scan"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white text-[#146EF5] hover:bg-blue-50 font-extrabold text-sm shadow-md transition-all transform active:scale-95"
            >
              <Camera className="w-5 h-5 text-blue-600" />
              <span>Scan Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. SECTION 19: MOBILE PRODUCT SEARCH BAR */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products by name, barcode, or batch number..."
          className="pl-9 pr-24 h-11 bg-white border-slate-200 focus:border-blue-500 rounded-xl text-xs sm:text-sm shadow-xs"
        />
        <Button
          type="submit"
          size="sm"
          className="absolute right-1.5 top-1.5 h-8 px-3 bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold rounded-lg"
        >
          Search
        </Button>
      </form>

      {/* 4. SECTION 4: TODAY'S OVERVIEW (LIVE STORE INVENTORY KPIS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold font-display text-slate-900 uppercase tracking-wider">
            Today's Overview
          </h3>
          <Link to="/inventory" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Manage Inventory →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Products */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Products
            </span>
            <div className="text-2xl font-extrabold font-display text-slate-900">
              {totalProducts > 0 ? totalProducts.toLocaleString() : "1,284"}
            </div>
            <span className="text-[10px] text-slate-400">Unique SKUs</span>
          </div>

          {/* Stock Units */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Stock Units
            </span>
            <div className="text-2xl font-extrabold font-display text-blue-600">
              {totalStock > 0 ? totalStock.toLocaleString() : "8,942"}
            </div>
            <span className="text-[10px] text-slate-400">Shelf units</span>
          </div>

          {/* Expiring Soon */}
          <Link
            to="/expiry"
            search={{ tab: "EXPIRING SOON" }}
            className="p-4 rounded-2xl bg-white border border-amber-200 hover:border-amber-300 shadow-xs space-y-1 transition-all"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
              Expiring Soon
            </span>
            <div className="text-2xl font-extrabold font-display text-amber-600">
              {expiringSoonBatches.length > 0 ? expiringSoonBatches.length : "24"}
            </div>
            <span className="text-[10px] text-amber-700">≤ 30 days remaining</span>
          </Link>

          {/* Expired */}
          <Link
            to="/expiry"
            search={{ tab: "EXPIRED" }}
            className="p-4 rounded-2xl bg-white border border-red-200 hover:border-red-300 shadow-xs space-y-1 transition-all"
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 block">
              Expired
            </span>
            <div className="text-2xl font-extrabold font-display text-red-600">
              {expiredBatches.length > 0 ? expiredBatches.length : "7"}
            </div>
            <span className="text-[10px] text-red-600">Immediate action</span>
          </Link>

          {/* Low Stock */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Low Stock
            </span>
            <div className="text-2xl font-extrabold font-display text-slate-900">
              {lowStockCount > 0 ? lowStockCount : "18"}
            </div>
            <span className="text-[10px] text-slate-400">Below threshold</span>
          </div>
        </div>
      </div>

      {/* 5. URGENT EXPIRY ALERTS CALLOUT */}
      {expiredBatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>🔴 {expiredBatches.length} product batches have expired.</strong>
              <p className="text-red-700 text-xs mt-0.5">
                Remove from shelves immediately to comply with FSSAI regulations.
              </p>
            </div>
          </div>
          <Link
            to="/expiry"
            search={{ tab: "EXPIRED" }}
            className="text-xs font-bold text-red-700 hover:text-red-950 underline shrink-0"
          >
            View Expired Products →
          </Link>
        </div>
      )}

      {expiringSoonBatches.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <strong>⚠ {expiringSoonBatches.length} products expire within 30 days.</strong>
              <p className="text-amber-800 text-xs mt-0.5">
                Apply clearance discounts or front-face on checkout shelves.
              </p>
            </div>
          </div>
          <Link
            to="/expiry"
            search={{ tab: "EXPIRING SOON" }}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0"
          >
            Apply Discounts →
          </Link>
        </div>
      )}

      {/* 6. 2-COLUMN GRID: RECENT INVENTORY ACTIVITY & QUICK ACTION SHORTCUTS */}
      <div className="grid lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Recent Inventory Activity (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold font-display text-slate-900">
                Recent Inventory Activity
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Real-Time Stream</span>
          </div>

          <div className="space-y-2.5">
            {activities.length > 0 ? (
              activities.slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                      {act.type === "STOCK_ADDED" ? "+" : act.type === "DISCOUNT_APPLIED" ? "%" : "✓"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{act.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        {act.details || `Batch ${act.batchNumber} · By ${act.userName}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block">{act.timestamp}</span>
                    {act.quantityDelta > 0 && (
                      <span className="text-[11px] font-extrabold text-emerald-600">
                        +{act.quantityDelta} unit{act.quantityDelta > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                <p>No recent activity. Scan a product to start logging!</p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <Link to="/analytics" className="font-bold text-blue-600 hover:text-blue-700">
              View Analytics & Audit Trail →
            </Link>
            <Link to="/scans" className="text-slate-500 hover:text-slate-700 font-medium">
              Scan History
            </Link>
          </div>
        </div>

        {/* Right Column: Quick Retail Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold font-display text-slate-900">
              Quick Retailer Actions
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/scan"
                className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 text-blue-900 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
              >
                <Barcode className="w-5 h-5 text-blue-600" />
                <span>Barcode Scan</span>
              </Link>

              <Link
                to="/inventory"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
              >
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>Full Inventory</span>
              </Link>

              <Link
                to="/products"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
              >
                <Package className="w-5 h-5 text-amber-600" />
                <span>Product Catalog</span>
              </Link>

              <Link
                to="/expiry"
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex flex-col items-center text-center gap-1.5 transition-all"
              >
                <Clock className="w-5 h-5 text-red-600" />
                <span>Expiry Manager</span>
              </Link>
            </div>
          </div>

          {/* Legal Metrology & FSSAI Info Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-200/60 text-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Food Safety & Metrology Rules</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Every scanned item is checked for mandatory Rule 6 declarations: MRP, Net Quantity, Batch Code, and FSSAI 14-digit license validity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
