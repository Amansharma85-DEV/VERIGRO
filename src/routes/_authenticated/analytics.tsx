import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  HeartPulse,
  Package,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSession, setSession } from "@/lib/auth-service";
import {
  getCurrentStoreId,
  getStoreActivities,
  getStoreInventory,
  type InventoryActivity,
  type InventoryRecord,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [{ title: "Store Analytics & Verification Insights — VERIGRO" }],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [userRole, setUserRole] = useState<"retailer" | "consumer">(() => {
    return getSession()?.user?.role || "retailer";
  });

  useEffect(() => {
    const handleAuthChange = () => {
      setUserRole(getSession()?.user?.role || "retailer");
    };
    window.addEventListener("verigro_auth_changed", handleAuthChange);
    return () => window.removeEventListener("verigro_auth_changed", handleAuthChange);
  }, []);

  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [activities, setActivities] = useState<InventoryActivity[]>([]);

  useEffect(() => {
    const storeId = getCurrentStoreId();
    setInventory(getStoreInventory(storeId));
    setActivities(getStoreActivities(storeId));
  }, []);

  const totalProducts = new Set(inventory.map((i) => i.barcode)).size;
  const totalStock = inventory.reduce((sum, i) => sum + i.stockQuantity, 0);
  const expiringSoonCount = inventory.filter((i) => i.expiryStatus === "EXPIRING SOON").length;
  const expiredCount = inventory.filter((i) => i.expiryStatus === "EXPIRED").length;
  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;

  if (userRole === "consumer") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold font-display text-slate-900">Retailer Access Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Store inventory analytics, SKU metrics, and turnover reports are designed exclusively for retail grocery store managers.
          </p>
        </div>
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all text-center"
          >
            Go to Consumer Dashboard
          </Link>
          <Button
            onClick={() => {
              const session = getSession();
              if (session?.user) {
                const updated = { ...session.user, role: "retailer" as const };
                setSession(updated);
                setUserRole("retailer");
                toast.success("Switched to Retailer Mode");
              }
            }}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold rounded-xl shadow-sm"
          >
            Switch to Retailer Mode
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Retail Intelligence
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Live Inventory & Audit KPIs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            Store Analytics & Inventory Activity
          </h1>
        </div>

        <Link
          to="/inventory"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold shadow-xs transition-all"
        >
          <span>Open Full Inventory</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Real Inventory KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Active Store SKUs</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Live
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
            {totalProducts}
          </div>
          <p className="text-[11px] text-slate-400">Across {inventory.length} active batch records</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Total Stock Units</span>
            <span className="text-xs text-blue-600 font-bold">On Shelf</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-blue-600">
            {totalStock}
          </div>
          <p className="text-[11px] text-slate-400">{lowStockCount} items near reorder limit</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Expiring Soon Items</span>
            <span className="text-xs text-amber-600 font-bold">≤ 30d</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-amber-600">
            {expiringSoonCount}
          </div>
          <p className="text-[11px] text-slate-400">Scheduled for 20% clearance discount</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Expired Stock</span>
            <span className="text-xs text-red-600 font-bold">Action Req.</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-red-600">
            {expiredCount}
          </div>
          <p className="text-[11px] text-slate-400">Prevented from customer sale</p>
        </div>
      </div>

      {/* Recent Inventory Activity Log & Category Distribution */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Activity Stream */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold font-display text-slate-900">
                Recent Inventory Activity
              </h3>
            </div>
            <span className="text-xs text-slate-400">Real-Time Event Stream</span>
          </div>

          <div className="space-y-2.5">
            {activities.length > 0 ? (
              activities.slice(0, 7).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                        +{act.quantityDelta} units
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-400">
                No recent activity logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold font-display text-slate-900">Stock by Category</h3>
            <span className="text-xs text-slate-400">Shelf Distribution</span>
          </div>

          <div className="space-y-3">
            {[
              { category: "Beverages & Cold Drinks", percentage: 42, count: "168 units", color: "bg-blue-600" },
              { category: "Dairy & Perishables", percentage: 28, count: "48 units", color: "bg-emerald-500" },
              { category: "Bakery & Confectionery", percentage: 20, count: "38 units", color: "bg-amber-500" },
              { category: "Pantry & Groceries", percentage: 10, count: "24 units", color: "bg-purple-500" },
            ].map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{item.category}</span>
                  <span className="text-slate-500">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>FSSAI License Compliance</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Certified</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
