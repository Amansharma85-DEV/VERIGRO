import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Percent,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSession, setSession } from "@/lib/auth-service";
import {
  applyClearanceDiscountToItem,
  exportInventoryToExcel,
  getCurrentStoreId,
  getStoreInventory,
  saveStoreInventory,
  type InventoryRecord,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/expiry")({
  head: () => ({
    meta: [{ title: "Batch Expiry & Freshness Tracking — VERIGRO" }],
  }),
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
  }),
  component: ExpiryPage,
});

function ExpiryPage() {
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

  const searchParams = Route.useSearch();
  const [batches, setBatches] = useState<InventoryRecord[]>([]);
  const [tab, setTab] = useState<"all" | "EXPIRING SOON" | "EXPIRED" | "SAFE">(
    (searchParams.tab as any) || "all"
  );

  function reloadBatches() {
    const data = getStoreInventory(getCurrentStoreId());
    setBatches(data);
  }

  useEffect(() => {
    reloadBatches();
    const handleUpdate = () => reloadBatches();
    window.addEventListener("verigro_inventory_updated", handleUpdate);
    return () => window.removeEventListener("verigro_inventory_updated", handleUpdate);
  }, []);

  const filtered = batches.filter((b) => (tab === "all" ? true : b.expiryStatus === tab));

  function applyClearanceDiscount(id: string, percentage: number) {
    const updated = applyClearanceDiscountToItem(getCurrentStoreId(), id, percentage);
    if (updated) {
      setBatches((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success(`${percentage}% Quick-Clearance Discount activated for POS scanner! Selling price: ₹${updated.sellingPrice}`);
    }
  }

  function disposeExpired(id: string, name: string) {
    const updated = batches.filter((item) => item.id !== id);
    saveStoreInventory(updated, getCurrentStoreId());
    setBatches(updated);
    toast.info(`Expired batch for ${name} logged for disposal.`);
  }

  const expiringSoonCount = batches.filter((b) => b.expiryStatus === "EXPIRING SOON").length;
  const expiredCount = batches.filter((b) => b.expiryStatus === "EXPIRED").length;

  if (userRole === "consumer") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold font-display text-slate-900">Retailer Access Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Batch expiry tracking, clearance discounting, and disposal logs are designed for grocery store owners and inventory managers.
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
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              Loss Prevention & Food Safety
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Legal Metrology Compliant</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            Batch Expiry Management & Clearance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time batch freshness tracking connected to store inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportInventoryToExcel(batches, { filter: "EXPIRING SOON", filename: "VERIGRO_Expiring_Batches.xlsx" })}
            className="text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            <span>Export Expiry List</span>
          </Button>
          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-semibold shadow-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scan Incoming Batch</span>
          </Link>
        </div>
      </div>

      {/* Expiry Overview Alert Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-amber-950 font-bold">
              {expiringSoonCount} Batches Require Clearance Attention
            </strong>
            <span className="text-xs text-amber-800">
              Expiring in under 30 days. Auto-discounting is available to recover stock investment before write-off.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-amber-900">
            Expired Items: <strong className="text-red-600">{expiredCount}</strong>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-bold overflow-x-auto no-scrollbar whitespace-nowrap">
        {[
          { key: "all", label: `All Batches (${batches.length})` },
          { key: "EXPIRING SOON", label: `Expiring Soon (${expiringSoonCount})` },
          { key: "EXPIRED", label: `Expired (${expiredCount})` },
          { key: "SAFE", label: "Safe Stock" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key as any)}
            className={`pb-2.5 transition-colors border-b-2 shrink-0 ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Batch Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => (
          <div
            key={b.id}
            className={`bg-white rounded-2xl border p-4 shadow-sm transition-all space-y-3 flex flex-col justify-between ${
              b.expiryStatus === "EXPIRED"
                ? "border-red-200 bg-red-50/20"
                : b.expiryStatus === "EXPIRING SOON"
                  ? "border-amber-200 bg-amber-50/15"
                  : "border-slate-200"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Batch: {b.batchNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.expiryStatus === "EXPIRED"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : b.expiryStatus === "EXPIRING SOON"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {b.expiryStatus === "EXPIRED"
                    ? "EXPIRED"
                    : b.expiryStatus === "EXPIRING SOON"
                      ? `${b.daysRemaining}d Left`
                      : "SAFE"}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{b.productName}</h3>
                <p className="text-xs text-slate-500">{b.brand} · Barcode: {b.barcode}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Mfg Date</span>
                  <strong className="text-slate-800">{b.mfgDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Expiry Date</span>
                  <strong className={b.expiryStatus === "EXPIRED" ? "text-red-600" : "text-slate-800"}>
                    {b.expiryDate}
                  </strong>
                </div>
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 block">Stock Units</span>
                  <strong className="text-slate-800">{b.stockQuantity} units</strong>
                </div>
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400 block">Selling Price</span>
                  <strong className="text-slate-800">
                    ₹{b.sellingPrice !== null ? b.sellingPrice.toFixed(2) : "40.00"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {b.expiryStatus === "EXPIRING SOON" ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => applyClearanceDiscount(b.id, 20)}
                    className="flex-1 min-h-[40px] py-2 px-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Apply 20% Off</span>
                  </button>
                  <Link
                    to="/scan"
                    search={{ code: b.barcode }}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center touch-manipulation"
                  >
                    Audit
                  </Link>
                </div>
              ) : b.expiryStatus === "EXPIRED" ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] text-red-600 font-bold">Unfit for Sale</span>
                  <button
                    type="button"
                    onClick={() => disposeExpired(b.id, b.productName)}
                    className="min-h-[40px] py-2 px-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-semibold touch-manipulation"
                  >
                    Mark Disposed
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Safe for Store Sale</span>
                  </span>
                  <Link
                    to="/scan"
                    search={{ code: b.barcode }}
                    className="text-blue-600 font-bold hover:text-blue-700"
                  >
                    Inspect →
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
