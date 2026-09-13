import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Barcode,
  Camera,
  CheckCircle2,
  ChevronRight,
  Download,
  History,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductInfo } from "@/lib/product-types";

export const Route = createFileRoute("/_authenticated/scans")({
  head: () => ({
    meta: [{ title: "My Scan History — VERIGRO" }],
  }),
  component: ScansHistoryPage,
});

interface ScanRecord {
  id: string;
  query: string;
  productName: string;
  brand: string;
  mode: string;
  date: string;
  expiryStatus?: string;
  product: ProductInfo;
}

function ScansHistoryPage() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("verigro_saved_scans") || localStorage.getItem("nirikshan_saved_scans");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setHistory(parsed);
        }
      } catch {}
    }
  }, []);

  function clearHistory() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("verigro_saved_scans");
      localStorage.removeItem("nirikshan_saved_scans");
    }
    setHistory([]);
    toast.success("Scan history cleared.");
  }

  const filtered = history.filter(
    (h) =>
      !search ||
      h.productName.toLowerCase().includes(search.toLowerCase()) ||
      h.brand.toLowerCase().includes(search.toLowerCase()) ||
      h.query.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Audit Logs
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Local & Server Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            My Scan History
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear All
            </Button>
          )}
          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-semibold shadow-xs"
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>Scan New Item</span>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter scans by product name, barcode, brand..."
          className="pl-9 bg-white border-slate-300 focus:border-blue-500 rounded-xl text-xs sm:text-sm"
        />
      </div>

      {/* History List */}
      {filtered.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  {item.mode === "image" ? <Camera className="w-5 h-5" /> : <Barcode className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{item.productName}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {item.mode === "image" ? "Photo OCR" : "Barcode"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {item.brand} · Barcode: {item.query} · Scanned at {item.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    item.product.expiryStatus === "Expired"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : item.product.expiryStatus === "Expiring Soon"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {item.product.expiryStatus || "Safe"}
                </span>
                <Link
                  to="/scan"
                  search={{ code: item.product.barcode ?? item.query }}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Inspect"
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
          <History className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Scans Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan your first grocery product using the scanner to see full audit history here.
          </p>
          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#146EF5] text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Launch Scanner
          </Link>
        </div>
      )}
    </div>
  );
}
