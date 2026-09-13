import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSession, setSession } from "@/lib/auth-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adjustItemStock,
  exportInventoryToExcel,
  getCurrentStoreId,
  getStoreInventory,
  importInventoryFromExcel,
  saveStoreInventory,
  type InventoryRecord,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — VERIGRO | Manage Products & Expiry" },
      {
        name: "description",
        content: "Manage products, batches and expiry dates in one place. Real-time stock counts, auto-scan tracking, and Excel export.",
      },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"expiry" | "stock-asc" | "stock-desc" | "name">("expiry");

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilter, setExportFilter] = useState<"all" | "SAFE" | "EXPIRING SOON" | "EXPIRED">("all");
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    updated: number;
    newItems: number;
    errors: number;
    details: string[];
  } | null>(null);

  // Add/Edit Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryRecord | null>(null);
  const [formData, setFormData] = useState({
    productName: "",
    brand: "",
    category: "Groceries & Kitchen",
    barcode: "",
    batchNumber: "",
    stockQuantity: 1,
    mrp: 40,
    mfgDate: "",
    expiryDate: "",
  });

  function reloadInventory() {
    const data = getStoreInventory(getCurrentStoreId());
    setInventory(data);
  }

  useEffect(() => {
    reloadInventory();

    const handleUpdate = () => reloadInventory();
    window.addEventListener("verigro_inventory_updated", handleUpdate);
    return () => window.removeEventListener("verigro_inventory_updated", handleUpdate);
  }, []);

  // Summary Metrics Computed from Real Inventory Data
  const totalProductsCount = new Set(inventory.map((i) => i.barcode)).size;
  const totalStockCount = inventory.reduce((sum, i) => sum + i.stockQuantity, 0);
  const expiringSoonCount = inventory.filter((i) => i.expiryStatus === "EXPIRING SOON").length;
  const expiredCount = inventory.filter((i) => i.expiryStatus === "EXPIRED").length;
  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.reorderLevel).length;

  // Filtered Table Rows
  const filtered = inventory.filter((item) => {
    const matchesSearch =
      !search ||
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search);
    const matchesStatus = statusFilter === "all" || item.expiryStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const displayedItems = [...filtered].sort((a, b) => {
    if (sortBy === "expiry") return a.daysRemaining - b.daysRemaining;
    if (sortBy === "stock-asc") return a.stockQuantity - b.stockQuantity;
    if (sortBy === "stock-desc") return b.stockQuantity - a.stockQuantity;
    if (sortBy === "name") return a.productName.localeCompare(b.productName);
    return 0;
  });

  // Handle Quick Quantity Adjustment (+ / -)
  function handleStockAdjust(id: string, delta: number) {
    const updated = adjustItemStock(getCurrentStoreId(), id, delta);
    if (updated) {
      setInventory((prev) => prev.map((item) => (item.id === id ? updated : item)));
      toast.success(`${updated.productName}: Stock ${delta > 0 ? "+1" : "-1"} (${updated.stockQuantity} total)`);
    }
  }

  // Handle Real Excel Export
  function handleExecuteExcelExport() {
    setExportLoading(true);
    setTimeout(() => {
      try {
        const { filename, count } = exportInventoryToExcel(inventory, { filter: exportFilter });
        setExportLoading(false);
        setExportSuccess(true);
        toast.success(`Exported ${count} inventory records to ${filename}`);
      } catch {
        setExportLoading(false);
        toast.error("Failed to generate Excel file.");
      }
    }, 450);
  }

  // Handle Real Excel Import
  async function handleImportFile(file: File) {
    setImportLoading(true);
    setImportResult(null);
    try {
      const res = await importInventoryFromExcel(file, getCurrentStoreId());
      setImportResult(res);
      reloadInventory();
      toast.success(`Import complete: ${res.imported} items processed.`);
    } catch {
      toast.error("Failed to parse Excel file. Ensure valid columns.");
    } finally {
      setImportLoading(false);
    }
  }

  // Save Add/Edit
  function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.productName || !formData.barcode) {
      toast.error("Please fill in both Product Name and Barcode.");
      return;
    }

    if (editingItem) {
      // Edit existing record
      const updatedList = inventory.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              productName: formData.productName,
              brand: formData.brand || "Not Available",
              batchNumber: formData.batchNumber || item.batchNumber,
              stockQuantity: Number(formData.stockQuantity) || 1,
              mrp: Number(formData.mrp) || null,
              mfgDate: formData.mfgDate || item.mfgDate,
              expiryDate: formData.expiryDate || item.expiryDate,
              lastUpdated: new Date().toISOString(),
            }
          : item
      );
      saveStoreInventory(updatedList, getCurrentStoreId());
      setInventory(updatedList);
      toast.success("Inventory record updated!");
      setEditingItem(null);
    } else {
      // Add new record
      const newRec: InventoryRecord = {
        id: "inv_" + Date.now(),
        storeId: getCurrentStoreId(),
        barcode: formData.barcode,
        productName: formData.productName,
        brand: formData.brand || "Not Available",
        category: formData.category,
        sku: `SKU-${formData.barcode.slice(-4)}`,
        batchNumber: formData.batchNumber || "B-MANUAL",
        mfgDate: formData.mfgDate || "Not Available",
        expiryDate: formData.expiryDate || "Not Available",
        daysRemaining: 180,
        expiryStatus: "SAFE",
        mrp: Number(formData.mrp) || 40,
        sellingPrice: Number(formData.mrp) || 40,
        netQuantity: "Standard",
        stockQuantity: Number(formData.stockQuantity) || 1,
        reorderLevel: 10,
        fssaiNumber: null,
        supplier: "Store Local Restock",
        imageUrl: null,
        lastScanned: "Manually Added",
        lastUpdated: new Date().toISOString(),
      };
      const updated = [newRec, ...inventory];
      saveStoreInventory(updated, getCurrentStoreId());
      setInventory(updated);
      toast.success("New product added to inventory!");
      setShowAddModal(false);
    }
  }

  function deleteRecord(id: string, name: string) {
    const updated = inventory.filter((i) => i.id !== id);
    saveStoreInventory(updated, getCurrentStoreId());
    setInventory(updated);
    toast.info(`Removed ${name} from inventory.`);
  }

  if (userRole === "consumer") {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold font-display text-slate-900">Retailer Access Required</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Store inventory, batch stock management, and Excel sync are exclusively designed for verified grocery retailers and store owners.
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
      {/* 1. Header & Top-Right Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Retail Operations
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Live Inventory Database</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage products, batches and expiry dates in one place.
          </p>
        </div>

        {/* Top-Right Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scan Product */}
          <Link
            to="/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold shadow-xs transition-all"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan Product</span>
          </Link>

          {/* + Add Product */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormData({
                productName: "",
                brand: "",
                category: "Groceries & Kitchen",
                barcode: "",
                batchNumber: "",
                stockQuantity: 1,
                mrp: 40,
                mfgDate: "",
                expiryDate: "",
              });
              setShowAddModal(true);
            }}
            className="text-xs font-bold border-slate-300 hover:bg-slate-50"
          >
            <Plus className="w-4 h-4 mr-1 text-blue-600" />
            <span>Add Product</span>
          </Button>

          {/* Export Excel (with real SheetJS icon) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExportSuccess(false);
              setShowExportModal(true);
            }}
            className="text-xs font-bold border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            <span>Export Excel</span>
          </Button>

          {/* Import Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportResult(null);
              setShowImportModal(true);
            }}
            className="text-xs font-bold border-slate-300 hover:bg-slate-50"
          >
            <Upload className="w-4 h-4 mr-1 text-slate-600" />
            <span>Import Excel</span>
          </Button>
        </div>
      </div>

      {/* 2. REAL SUMMARY METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Total Products
          </span>
          <div className="text-2xl font-extrabold font-display text-slate-900">{totalProductsCount}</div>
          <span className="text-[10px] text-slate-400">Unique SKUs / Barcodes</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Total Stock
          </span>
          <div className="text-2xl font-extrabold font-display text-blue-600">{totalStockCount}</div>
          <span className="text-[10px] text-slate-400">Total units on shelf</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-amber-600 font-bold block">
            Expiring Soon
          </span>
          <div className="text-2xl font-extrabold font-display text-amber-600">{expiringSoonCount}</div>
          <span className="text-[10px] text-amber-700">≤ 30 days remaining</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-red-600 font-bold block">
            Expired
          </span>
          <div className="text-2xl font-extrabold font-display text-red-600">{expiredCount}</div>
          <span className="text-[10px] text-red-600">Past legal shelf life</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
            Low Stock
          </span>
          <div className="text-2xl font-extrabold font-display text-slate-900">{lowStockCount}</div>
          <span className="text-[10px] text-slate-400">Below reorder limit</span>
        </div>
      </div>

      {/* 3. DYNAMIC EXPIRY ALERTS CALLOUT */}
      {expiredCount > 0 && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <strong className="text-xs sm:text-sm font-bold">
              🔴 {expiredCount} product {expiredCount === 1 ? "batch has" : "batches have"} expired.
            </strong>
          </div>
          <Link
            to="/expiry"
            className="text-xs font-bold text-red-700 hover:text-red-900 underline flex items-center gap-1"
          >
            <span>View Expired Products →</span>
          </Link>
        </div>
      )}

      {expiringSoonCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <strong className="text-xs sm:text-sm font-bold">
              ⚠ {expiringSoonCount} products expire within 30 days.
            </strong>
          </div>
          <Link
            to="/expiry"
            className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
          >
            <span>View Expiring Products & Apply Discounts →</span>
          </Link>
        </div>
      )}

      {/* 4. Filter, Sort, and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by title, barcode, brand, or batch number..."
              className="pl-9 bg-white border-slate-300 focus:border-blue-500 rounded-xl text-xs sm:text-sm shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-semibold shrink-0 hidden sm:inline">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="expiry">Expiry (Soonest First)</option>
              <option value="stock-asc">Stock (Low to High)</option>
              <option value="stock-desc">Stock (High to Low)</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { key: "all", label: `All (${inventory.length})` },
            { key: "SAFE", label: "Safe" },
            { key: "EXPIRING SOON", label: `Expiring Soon (${expiringSoonCount})` },
            { key: "EXPIRED", label: `Expired (${expiredCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                statusFilter === tab.key
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. INVENTORY LIST (Mobile Cards < md, Desktop Table >= md) */}
      {displayedItems.length > 0 ? (
        <>
          {/* MOBILE PHONE CARD VIEW (< md) */}
          <div className="block md:hidden space-y-3">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl bg-white border shadow-xs space-y-3 transition-all ${
                  item.expiryStatus === "EXPIRED"
                    ? "border-red-200 bg-red-50/10"
                    : item.expiryStatus === "EXPIRING SOON"
                      ? "border-amber-200 bg-amber-50/10"
                      : "border-slate-200"
                }`}
              >
                {/* Top: Product Name, Brand & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      {item.brand || "Brand"} {item.category ? `· ${item.category}` : ""}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug truncate mt-0.5">
                      {item.productName}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      item.expiryStatus === "EXPIRED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : item.expiryStatus === "EXPIRING SOON"
                          ? "bg-amber-50 text-amber-800 border border-amber-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {item.expiryStatus}
                  </span>
                </div>

                {/* Data Grid: Batch, Barcode, Expiry, MRP */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Batch / Code</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px] truncate block">
                      {item.batchNumber}
                    </span>
                    <span className="font-mono text-slate-500 text-[10px] truncate block">
                      {item.barcode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Expiry / Shelf Life</span>
                    <span className="font-bold text-slate-900 text-[11px] block truncate">
                      {item.expiryDate || "Not Available"}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold block truncate ${
                        item.daysRemaining < 0
                          ? "text-red-600"
                          : item.daysRemaining <= 30
                            ? "text-amber-600"
                            : "text-slate-600"
                      }`}
                    >
                      {item.daysRemaining < 0
                        ? `${Math.abs(item.daysRemaining)}d ago (EXPIRED)`
                        : `${item.daysRemaining} days left`}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">MRP</span>
                    <span className="font-extrabold text-slate-900 text-xs">
                      {item.mrp !== null ? `₹${item.mrp.toFixed(2)}` : "Not Available"}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Activity</span>
                    <span className="text-slate-600 text-[11px] truncate block">
                      {item.lastScanned || "Today"}
                    </span>
                  </div>
                </div>

                {/* Bottom: Stock Stepper & Quick Action Buttons */}
                <div className="flex items-center justify-between pt-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(item.id, -1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-base flex items-center justify-center transition-colors touch-manipulation"
                      aria-label="Decrease stock"
                    >
                      -
                    </button>
                    <div className="w-10 text-center">
                      <span className="text-[10px] text-slate-400 block -mb-0.5">Stock</span>
                      <span className="font-extrabold text-sm text-slate-900">{item.stockQuantity}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStockAdjust(item.id, 1)}
                      className="w-9 h-9 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-base flex items-center justify-center transition-colors touch-manipulation"
                      aria-label="Increase stock"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      to="/scan"
                      search={{ code: item.barcode }}
                      className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 text-xs font-bold transition-colors touch-manipulation"
                    >
                      Scan
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setFormData({
                          productName: item.productName,
                          brand: item.brand,
                          category: item.category,
                          barcode: item.barcode,
                          batchNumber: item.batchNumber,
                          stockQuantity: item.stockQuantity,
                          mrp: item.mrp || 40,
                          mfgDate: item.mfgDate,
                          expiryDate: item.expiryDate,
                        });
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-xs font-bold transition-colors touch-manipulation"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRecord(item.id, item.productName)}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
                      aria-label="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP 11-COLUMN TABLE VIEW (>= md) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-3">Barcode</th>
                    <th className="py-3.5 px-3">Batch</th>
                    <th className="py-3.5 px-3">Quantity</th>
                    <th className="py-3.5 px-3">MRP</th>
                    <th className="py-3.5 px-3">Mfg Date</th>
                    <th className="py-3.5 px-3">Expiry Date</th>
                    <th className="py-3.5 px-3">Days Left</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3">Last Scanned</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Product Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">{item.productName}</div>
                        <div className="text-[11px] text-slate-400">
                          {item.brand} {item.category ? `· ${item.category}` : ""}
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-600 text-[11px]">
                        {item.barcode}
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-800 text-[11px]">
                        {item.batchNumber}
                      </td>

                      {/* Quantity with + / - adjuster */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStockAdjust(item.id, -1)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]"
                            title="Decrease stock by 1"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-slate-900 w-7 text-center">
                            {item.stockQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStockAdjust(item.id, 1)}
                            className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]"
                            title="Increase stock by 1"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* MRP */}
                      <td className="py-3.5 px-3 font-semibold text-slate-800">
                        {item.mrp !== null ? `₹${item.mrp.toFixed(2)}` : "Not Available"}
                      </td>

                      {/* Mfg Date */}
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {item.mfgDate || "Not Available"}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-3.5 px-3 font-medium text-slate-800">
                        {item.expiryDate || "Not Available"}
                      </td>

                      {/* Days Remaining */}
                      <td className="py-3.5 px-3 font-bold font-mono">
                        <span className={item.daysRemaining < 0 ? "text-red-600" : item.daysRemaining <= 30 ? "text-amber-600" : "text-slate-800"}>
                          {item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)}d ago` : `${item.daysRemaining} days`}
                        </span>
                      </td>

                      {/* Expiry Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.expiryStatus === "EXPIRED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : item.expiryStatus === "EXPIRING SOON"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {item.expiryStatus}
                        </span>
                      </td>

                      {/* Last Scanned */}
                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        {item.lastScanned || "Today"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <Link
                          to="/scan"
                          search={{ code: item.barcode }}
                          className="text-blue-600 hover:text-blue-700 font-bold text-[11px]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setFormData({
                              productName: item.productName,
                              brand: item.brand,
                              category: item.category,
                              barcode: item.barcode,
                              batchNumber: item.batchNumber,
                              stockQuantity: item.stockQuantity,
                              mrp: item.mrp || 40,
                              mfgDate: item.mfgDate,
                              expiryDate: item.expiryDate,
                            });
                          }}
                          className="text-slate-600 hover:text-slate-900 font-bold text-[11px]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecord(item.id, item.productName)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* EMPTY INVENTORY STATE */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
            <Boxes className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-base font-extrabold text-slate-900 font-display">
              Your Inventory is Empty
            </h3>
            <p className="text-xs text-slate-500">
              Scan your first product to start building your inventory automatically, or import an Excel spreadsheet.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Link
              to="/scan"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold rounded-xl shadow-xs"
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Product</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="text-xs font-bold"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              <span>Import Excel</span>
            </Button>
          </div>
        </div>
      )}

      {/* 6. EXCEL EXPORT MODAL WITH OPTIONS */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold font-display text-slate-900">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Export Store Inventory to Excel</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600">
              Download an Excel-compatible spreadsheet (<strong>.xlsx</strong>) formatted with your store’s live products, batch numbers, MRP, and expiry dates.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Filter Export Records:</label>
              <div className="space-y-1.5 text-xs text-slate-700">
                {[
                  { key: "all", label: `All Products (${inventory.length} records)` },
                  { key: "SAFE", label: "Safe Products Only" },
                  { key: "EXPIRING SOON", label: "Expiring Soon Products Only" },
                  { key: "EXPIRED", label: "Expired Products Only" },
                ].map((opt) => (
                  <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFilter"
                      checked={exportFilter === opt.key}
                      onChange={() => setExportFilter(opt.key as any)}
                      className="text-blue-600"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {exportLoading && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Preparing your inventory spreadsheet...</span>
              </div>
            )}

            {exportSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>✓ Excel file ready and downloaded!</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowExportModal(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteExcelExport}
                disabled={exportLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Download Excel (.xlsx)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. EXCEL / CSV IMPORT MODAL */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold font-display text-slate-900">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Import Store Inventory Spreadsheet</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600">
              Upload an existing product spreadsheet (<strong>.xlsx</strong> or <strong>.csv</strong>). Columns will be automatically mapped by Barcode, Product Name, Batch, Expiry, Quantity, and MRP.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
                className="hidden"
                id="importFileInput"
              />
              <label htmlFor="importFileInput" className="cursor-pointer space-y-2 block">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-blue-600" />
                <div className="text-xs font-bold text-slate-800">
                  Click to select .xlsx or .csv file
                </div>
                <div className="text-[11px] text-slate-500">
                  Files up to 10MB supported
                </div>
              </label>
            </div>

            {importLoading && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Reading and validating inventory rows...</span>
              </div>
            )}

            {importResult && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <strong className="text-slate-900 block font-bold">Import Validation Summary:</strong>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>Total Processed: <strong>{importResult.imported}</strong></div>
                  <div>New SKUs Added: <strong className="text-emerald-600">+{importResult.newItems}</strong></div>
                  <div>Existing Batches Updated: <strong className="text-blue-600">{importResult.updated}</strong></div>
                  <div>Validation Errors: <strong className="text-red-600">{importResult.errors}</strong></div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowImportModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 8. ADD / EDIT PRODUCT MODAL */}
      <Dialog
        open={showAddModal || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingItem(null);
          }
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold font-display text-slate-900">
              {editingItem ? "Edit Inventory Record" : "Add Product to Inventory"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveForm} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Product Name</label>
              <Input
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="e.g. Diet Coke Can 300ml"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Brand</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="e.g. Coca-Cola"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Barcode (EAN-13)</label>
                <Input
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="8901764061103"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Batch Number</label>
                <Input
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="e.g. CCLO724"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Stock Quantity</label>
                <Input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                  min={0}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">MRP (₹)</label>
                <Input
                  type="number"
                  value={formData.mrp}
                  onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
                  placeholder="40"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Expiry Date</label>
                <Input
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  placeholder="30 Jun 2025"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-[#146EF5] hover:bg-[#1059c4] text-white font-bold">
                Save Record
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
