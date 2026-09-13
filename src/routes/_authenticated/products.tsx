import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Barcode,
  CheckCircle2,
  Filter,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
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
import { listProducts } from "@/lib/products.functions";
import type { ProductInfo } from "@/lib/product-types";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({
    meta: [{ title: "Product Catalog — VERIGRO" }],
  }),
  component: ProductsPage,
});

function ProductsPage() {
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

  const runList = useServerFn(listProducts);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // New product form
  const [newProduct, setNewProduct] = useState({
    name: "",
    brand: "",
    category: "Pantry & Groceries",
    barcode: "",
    batchNumber: "",
    mrp: "",
    stockQuantity: "24",
    mfgDate: "",
    expiryDate: "",
  });

  useEffect(() => {
    runList()
      .then((res) => {
        setProducts(res.products);
      })
      .catch(() => setProducts([]));
  }, [runList]);

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.brand?.toLowerCase().includes(query.toLowerCase()) ||
      p.barcode?.includes(query);
    const matchesCategory =
      selectedCategory === "all" ||
      (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    return matchesQuery && matchesCategory;
  });

  function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.name || !newProduct.barcode) {
      toast.error("Please provide both Product Name and Barcode.");
      return;
    }

    const item: ProductInfo = {
      name: newProduct.name,
      brand: newProduct.brand || "Store Private Label",
      category: newProduct.category,
      barcode: newProduct.barcode,
      batchNumber: newProduct.batchNumber || "B-" + Date.now().toString().slice(-4),
      mrp: Number(newProduct.mrp) || 50,
      stockQuantity: Number(newProduct.stockQuantity) || 20,
      mfgDate: newProduct.mfgDate || "01 Jan 2025",
      expiryDate: newProduct.expiryDate || "31 Dec 2025",
      healthScore: 8.0,
      healthGrade: "A",
      expiryStatus: "Safe",
      source: "catalog",
    };

    setProducts((prev) => [item, ...prev]);
    toast.success(`Registered product: ${newProduct.name}`);
    setShowAddModal(false);
    setNewProduct({
      name: "",
      brand: "",
      category: "Pantry & Groceries",
      barcode: "",
      batchNumber: "",
      mrp: "",
      stockQuantity: "24",
      mfgDate: "",
      expiryDate: "",
    });
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
            The Product Catalog management suite is designed for grocery store owners to register, edit, and organize store inventory SKUs.
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
              Retail Catalog Management
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Verified SKUs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
            Store Product Catalog
          </h1>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#146EF5] hover:bg-[#1059c4] text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Register New SKU</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search catalog by name, brand, or barcode..."
            className="pl-9 bg-white border-slate-300 focus:border-blue-500 rounded-xl text-xs sm:text-sm"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap pb-1">
          {["all", "beverage", "dairy", "water", "personal"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((prod) => (
          <div
            key={prod.barcode || prod.name}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {prod.brand || "Verified Brand"}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>FSSAI Active</span>
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{prod.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Barcode: {prod.barcode || "N/A"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block">MRP</span>
                  <strong className="text-slate-900">{prod.mrp ? `₹${prod.mrp.toFixed(2)}` : "₹40.00"}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Health Grade</span>
                  <strong className="text-blue-600 font-bold">{prod.healthGrade ? `Grade ${prod.healthGrade}` : "Grade B"}</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/scan"
                search={{ code: prod.barcode ?? undefined }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Audit in Scanner</span>
                <span>→</span>
              </Link>
              <span className="text-[10px] text-slate-400">
                Stock: {prod.stockQuantity ?? 36} units
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-display text-slate-900">
              Register New Store Product SKU
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateProduct} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Product Name</label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="e.g. Tata Tea Gold 500g"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Brand</label>
                <Input
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  placeholder="e.g. Tata Consumer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Barcode (EAN-13)</label>
                <Input
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                  placeholder="8901234567890"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Official MRP (₹)</label>
                <Input
                  type="number"
                  value={newProduct.mrp}
                  onChange={(e) => setNewProduct({ ...newProduct, mrp: e.target.value })}
                  placeholder="240"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Initial Stock (Units)</label>
                <Input
                  type="number"
                  value={newProduct.stockQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                  placeholder="24"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Batch Number</label>
                <Input
                  value={newProduct.batchNumber}
                  onChange={(e) => setNewProduct({ ...newProduct, batchNumber: e.target.value })}
                  placeholder="e.g. BATCH-2025"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Expiry Date</label>
                <Input
                  type="date"
                  value={newProduct.expiryDate}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#146EF5] hover:bg-[#1059c4] text-white">
                Save & Register SKU
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
