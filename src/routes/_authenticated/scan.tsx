import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import Tesseract from "tesseract.js";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Barcode,
  Boxes,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  HeartPulse,
  History,
  Info,
  Layers,
  Leaf,
  Loader2,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  PlayCircle,
  Plus,
  RefreshCw,
  Scale,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  SwitchCamera,
  Tag,
  Upload,
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
import { identifyFromImage, listProducts, lookupBarcode } from "@/lib/products.functions";
import { saveScan } from "@/lib/scans.functions";
import type { ProductInfo } from "@/lib/product-types";
import {
  addOrUpdateInventoryItem,
  calculateExpiry,
  getCurrentStoreId,
  type InventoryRecord,
  type ScanSession,
} from "@/lib/inventory";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Product Scanner & Inventory Entry — VERIGRO" },
      {
        name: "description",
        content:
          "VERIGRO Smart Scanner. Scan barcodes or packaging photos to automatically add and update grocery store inventory records with batch and expiry tracking.",
      },
      { property: "og:title", content: "VERIGRO Smart Scanner" },
      {
        property: "og:description",
        content: "Scan products to verify ingredients, expiry dates, and auto-update store inventory.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { code?: string; q?: string; autostart?: string } => ({
    code: typeof search["code"] === "string" ? search["code"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    autostart: typeof search["autostart"] === "string" ? search["autostart"] : undefined,
  }),
  component: ScanPage,
});

type Mode = "barcode" | "image";

function ScanPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const runBarcode = useServerFn(lookupBarcode);
  const runImage = useServerFn(identifyFromImage);
  const runSave = useServerFn(saveScan);
  const runList = useServerFn(listProducts);

  const [mode, setMode] = useState<Mode>("barcode");
  const [code, setCode] = useState(searchParams.code || searchParams.q || "");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Camera permissions and mobile fallback states
  const [cameraDenied, setCameraDenied] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Retailer Inventory & Scan Session Settings
  const [autoAdd, setAutoAdd] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("verigro_auto_add_inventory");
      return saved !== null ? saved === "true" : true;
    }
    return true;
  });

  const [quickScan, setQuickScan] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [customBatch, setCustomBatch] = useState<string>("");

  // Scan Confirmation State
  const [lastScanResult, setLastScanResult] = useState<{
    record: InventoryRecord;
    isDuplicate: boolean;
    previousQuantity: number;
    newQuantity: number;
    addedQty: number;
  } | null>(null);

  // Scan Session tracking (Today's Stock Entry)
  const [session, setSession] = useState<ScanSession>({
    id: "session_" + Date.now(),
    storeId: getCurrentStoreId(),
    name: "Today's Stock Entry",
    startedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    totalScanned: 0,
    newProducts: 0,
    updatedProducts: 0,
    expiredProducts: 0,
    expiringSoonProducts: 0,
    items: [],
  });

  // Camera stream state
  const [cameraActive, setCameraActive] = useState(searchParams.autostart === "1");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scanLoopActiveRef = useRef(false);

  const [history, setHistory] = useState<
    Array<{
      id: string;
      query: string;
      productName: string;
      brand: string;
      mode: string;
      date: string;
      expiryStatus?: string;
      product: ProductInfo;
    }>
  >([]);

  // Load initial product and saved history
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("verigro_saved_scans") || localStorage.getItem("nirikshan_saved_scans");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistory(parsed);
          }
        }
      } catch (error) {
        console.error(error);
      }
    }

    // Default to Diet Coke or param lookup
    const initialTarget = searchParams.code || searchParams.q || "8901764061103";
    runBarcode({ data: { code: initialTarget } })
      .then((res) => {
        if (res.product) {
          setProduct(res.product);
          setCustomBatch(res.product.batchNumber || "CCLO724");
        }
      })
      .catch(() => {});
    // Intentionally runs once on mount to read the initial URL params and seed history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleToggleAutoAdd(val: boolean) {
    setAutoAdd(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("verigro_auto_add_inventory", String(val));
    }
  }

  // Camera management
  useEffect(() => {
    if (cameraActive && mode === "barcode") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraActive, facingMode, mode]);

  async function startCamera() {
    stopCamera();
    setCameraDenied(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraDenied(true);
        setCameraActive(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraDenied(false);
      startContinuousBarcodeScan();
    } catch {
      setCameraDenied(true);
      setCameraActive(false);
    }
  }

  function stopCamera() {
    scanLoopActiveRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Barcode detector continuous loop from camera
  function startContinuousBarcodeScan() {
    scanLoopActiveRef.current = true;

    const scanFrame = async () => {
      if (!scanLoopActiveRef.current || !videoRef.current || !cameraActive) return;
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          if ("BarcodeDetector" in window) {
            const detector = new (window as any).BarcodeDetector({
              formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
            });
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = String(barcodes[0].rawValue).replace(/\D/g, "");
              if (detected.length >= 6) {
                toast.success(`Barcode detected: ${detected}`);
                setCode(detected);
                if (!quickScan) {
                  setCameraActive(false);
                }
                handleBarcode(detected);
                return;
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      if (scanLoopActiveRef.current && cameraActive) {
        requestAnimationFrame(scanFrame);
      }
    };

    requestAnimationFrame(scanFrame);
  }

  async function recordHistory(modeType: Mode, query: string, found: ProductInfo | null) {
    if (found) {
      const entry = {
        id: String(Date.now()),
        query,
        productName: found.name,
        brand: found.brand ?? "VERIGRO Verified",
        mode: modeType,
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        expiryStatus: found.expiryStatus || "Safe",
        product: found,
      };
      setHistory((prev) => {
        const updated = [entry, ...prev.filter((p) => p.productName !== found.name)].slice(0, 10);
        if (typeof window !== "undefined") {
          localStorage.setItem("verigro_saved_scans", JSON.stringify(updated));
        }
        return updated;
      });
    }
    try {
      await runSave({
        data: {
          mode: modeType,
          query,
          productName: found?.name ?? null,
          brand: found?.brand ?? null,
          source: found?.source ?? null,
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  // Add current product to inventory
  function processInventoryEntry(targetProduct: ProductInfo, qtyToAdd: number, batchToUse?: string) {
    const storeId = getCurrentStoreId();
    const batch = (batchToUse || customBatch || targetProduct.batchNumber || "BATCH-" + new Date().getFullYear()).trim();

    const { daysRemaining, expiryStatus } = calculateExpiry(targetProduct.expiryDate);

    const invResult = addOrUpdateInventoryItem(storeId, targetProduct, {
      batchNumber: batch,
      mfgDate: targetProduct.mfgDate || undefined,
      expiryDate: targetProduct.expiryDate || undefined,
      quantity: qtyToAdd,
    });

    setLastScanResult({
      record: invResult.record,
      isDuplicate: invResult.isDuplicate,
      previousQuantity: invResult.previousQuantity,
      newQuantity: invResult.newQuantity,
      addedQty: qtyToAdd,
    });

    // Update session metrics
    setSession((prev) => ({
      ...prev,
      totalScanned: prev.totalScanned + 1,
      newProducts: invResult.isDuplicate ? prev.newProducts : prev.newProducts + 1,
      updatedProducts: invResult.isDuplicate ? prev.updatedProducts + 1 : prev.updatedProducts,
      expiredProducts: expiryStatus === "EXPIRED" ? prev.expiredProducts + 1 : prev.expiredProducts,
      expiringSoonProducts: expiryStatus === "EXPIRING SOON" ? prev.expiringSoonProducts + 1 : prev.expiringSoonProducts,
      items: [
        {
          barcode: targetProduct.barcode || "",
          productName: targetProduct.name,
          batchNumber: batch,
          quantityAdded: qtyToAdd,
          status: expiryStatus,
        },
        ...prev.items,
      ],
    }));

    if (invResult.isDuplicate) {
      toast.success(`✓ Existing inventory updated: ${targetProduct.name} (+${qtyToAdd} unit · Total: ${invResult.newQuantity})`);
    } else {
      toast.success(`✓ Added to Inventory: ${targetProduct.name} (${qtyToAdd} units)`);
    }

    // Quick Scan mode auto-reset
    if (quickScan) {
      setTimeout(() => {
        setQuantity(1);
      }, 1200);
    }
  }

  async function handleBarcode(value?: string) {
    const target = (value ?? code).trim();
    if (!target) {
      toast.error("Please enter a valid barcode number.");
      return;
    }
    setProduct(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await runBarcode({ data: { code: target } });
      setProduct(res.product);
      setMessage(res.message ?? null);

      if (res.product) {
        setCustomBatch(res.product.batchNumber || "CCLO724");
        await recordHistory("barcode", target, res.product);

        // AUTO-ADD TO INVENTORY WORKFLOW
        if (autoAdd) {
          processInventoryEntry(res.product, quantity, res.product.batchNumber || undefined);
        }
      } else {
        toast.error(res.message ?? "Product not found in verification catalog.");
      }
    } catch {
      toast.error("Lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Client-side image recognition using ZXing + OCR
  async function scanImageForBarcode(dataUrl: string): Promise<string | null> {
    if (typeof window === "undefined") return null;
    const img = new Image();
    img.src = dataUrl;
    await img.decode().catch(() => {});

    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        const barcodes = await detector.detect(img);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          const c = String(barcodes[0].rawValue).replace(/\D/g, "");
          if (c.length >= 5) return c;
        }
      } catch (error) {
        console.error(error);
      }
    }

    try {
      const reader = new BrowserMultiFormatReader();
      const zxRes = await reader.decodeFromImageUrl(dataUrl);
      if (zxRes && zxRes.getText()) {
        const c = zxRes.getText().replace(/\D/g, "");
        if (c.length >= 5) return c;
      }
    } catch (error) {
      console.error(error);
    }

    return null;
  }

  async function extractTextWithTesseract(dataUrl: string): Promise<string> {
    setOcrProgress("Reading package label with OCR...");
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(dataUrl, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text" && typeof m.progress === "number") {
            setOcrProgress(`Reading packaging text: ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      return text;
    } catch {
      return "";
    } finally {
      setOcrProgress(null);
    }
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPG, PNG, WEBP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      setProduct(null);
      setMessage(null);
      setLoading(true);

      try {
        setOcrProgress("Scanning image for barcode...");
        const detectedBarcode = await scanImageForBarcode(dataUrl);
        if (detectedBarcode) {
          toast.success(`Barcode detected in photo: ${detectedBarcode}`);
          setCode(detectedBarcode);
          const res = await runBarcode({ data: { code: detectedBarcode } });
          if (res.product) {
            setProduct(res.product);
            setCustomBatch(res.product.batchNumber || "CCLO724");
            await recordHistory("image", detectedBarcode, res.product);

            if (autoAdd) {
              processInventoryEntry(res.product, quantity);
            }
            return;
          }
        }

        const ocrText = await extractTextWithTesseract(dataUrl);
        const res = await runImage({
          data: {
            imageDataUrl: dataUrl,
            fileName: `${file.name} ${detectedBarcode ?? ""} ${ocrText}`.slice(0, 500),
          },
        });
        setProduct(res.product);
        setMessage(res.message ?? null);
        await recordHistory("image", file.name, res.product);

        if (res.product && autoAdd) {
          processInventoryEntry(res.product, quantity);
        }
      } catch {
        toast.error("Photo analysis failed. Please try entering the barcode number.");
      } finally {
        setLoading(false);
        setOcrProgress(null);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-6">
      {/* Top Mobile & Desktop Header with Back Button */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors font-bold text-xs min-h-[44px]"
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-5 h-5 text-blue-600" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Barcode & Batch Scanner
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">Store POS Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-0.5">
              Scan Product
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCode("8901764061103");
              handleBarcode("8901764061103");
            }}
            className="hidden md:inline-flex text-xs font-semibold border-slate-300 hover:bg-slate-50"
          >
            Sample: Diet Coke
          </Button>
          <Link
            to="/inventory"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs min-h-[44px]"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Inventory</span>
          </Link>
        </div>
      </div>

      {/* SECTION 18: SCAN SESSION BAR (Today's Stock Entry) */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {session.name}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full">
                Active Session
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Started at {session.startedAt} · Multi-scan inventory logging
            </p>
          </div>
        </div>

        {/* Live Session Counter Metrics */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs">
          <div className="text-center sm:text-left">
            <div className="text-slate-400 text-[11px]">Total Scanned</div>
            <strong className="text-sm font-extrabold text-slate-900">{session.totalScanned}</strong>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-slate-400 text-[11px]">New Items</div>
            <strong className="text-sm font-extrabold text-blue-600">+{session.newProducts}</strong>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-slate-400 text-[11px]">Updated</div>
            <strong className="text-sm font-extrabold text-emerald-600">+{session.updatedProducts}</strong>
          </div>
          {session.expiringSoonProducts > 0 && (
            <div className="text-center sm:text-left">
              <div className="text-amber-500 text-[11px]">Expiring Soon</div>
              <strong className="text-sm font-extrabold text-amber-600">{session.expiringSoonProducts}</strong>
            </div>
          )}
          {session.expiredProducts > 0 && (
            <div className="text-center sm:text-left">
              <div className="text-red-500 text-[11px]">Expired</div>
              <strong className="text-sm font-extrabold text-red-600">{session.expiredProducts}</strong>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast.info(`Session finished! ${session.totalScanned} products logged to inventory.`);
                setSession({
                  id: "session_" + Date.now(),
                  storeId: getCurrentStoreId(),
                  name: "Afternoon Stock Batch",
                  startedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  totalScanned: 0,
                  newProducts: 0,
                  updatedProducts: 0,
                  expiredProducts: 0,
                  expiringSoonProducts: 0,
                  items: [],
                });
              }}
              className="text-[11px] font-bold h-8 min-h-[36px]"
            >
              Finish Session
            </Button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Product Scanner + Auto Add + Controls (5 cols)               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Product Scanner Card with Light-Slate Camera Viewport */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-display text-slate-900">Camera Viewfinder</h2>
                <p className="text-xs text-slate-500">Align barcode or package within the guide box</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Mode Switcher: Barcode vs Photo */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("barcode")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
                  mode === "barcode"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Barcode className="w-4 h-4" />
                <span>Barcode Scan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("image");
                  stopCamera();
                  setCameraActive(false);
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all min-h-[40px] ${
                  mode === "image"
                    ? "bg-white text-blue-600 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Photo / OCR</span>
              </button>
            </div>

            {/* AUTOMATIC INVENTORY TOGGLE & CONTROLS */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoAdd}
                    onChange={(e) => handleToggleAutoAdd(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Auto-add scanned products to inventory
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Automatically registers batches upon successful scan.
                    </span>
                  </div>
                </label>
              </div>

              {/* Quantity Modifier and Quick Scan Mode */}
              <div className="flex items-center justify-between pt-2 border-t border-blue-100 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-semibold">Qty:</span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* SECTION 11: QUICK SCAN MODE (ON / OFF) */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-bold bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    checked={quickScan}
                    onChange={(e) => setQuickScan(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                  <span>Quick Scan: {quickScan ? "ON" : "OFF"}</span>
                </label>
              </div>
            </div>

            {/* SECTION 6 & 7: CAMERA SCANNER CONTAINER & PERMISSION FALLBACK */}
            {mode === "barcode" && (
              <div className="space-y-3">
                {cameraDenied ? (
                  /* SECTION 7: CAMERA PERMISSION DENIED CARD */
                  <div className="p-6 text-center space-y-4 bg-amber-50/80 border-2 border-dashed border-amber-300 rounded-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h3 className="text-sm font-extrabold text-amber-950">
                        Camera access is required to scan products.
                      </h3>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Please enable camera access in your mobile browser settings to scan barcodes directly, or type the barcode number manually below.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setCameraDenied(false);
                          setCameraActive(true);
                        }}
                        className="bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold px-4 py-2.5 rounded-xl min-h-[44px]"
                      >
                        <RefreshCw className="w-4 h-4 mr-1.5" />
                        Try Again
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowManualInput(true);
                          const el = document.getElementById("manualBarcodeInput");
                          el?.focus();
                        }}
                        className="text-xs font-bold border-slate-300 min-h-[44px]"
                      >
                        Enter Barcode Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-blue-200/80 flex items-center justify-center scan-line">
                    {cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Laser scanner line effect */}
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-bounce pointer-events-none" />

                        {/* Controls overlay */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                          <button
                            type="button"
                            onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                            className="p-2 rounded-xl bg-white/90 text-slate-700 hover:bg-white shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Switch Camera"
                          >
                            <SwitchCamera className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCameraActive(false)}
                            className="p-2 rounded-xl bg-red-500 text-white hover:bg-red-600 shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center"
                            title="Stop Camera"
                          >
                            <Minimize2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 space-y-3">
                        <div className="w-14 h-14 rounded-2xl bg-white text-blue-600 mx-auto flex items-center justify-center border border-blue-200 shadow-xs">
                          <Barcode className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-slate-800">Scanner Viewfinder Ready</h3>
                          <p className="text-xs text-slate-500 max-w-xs mx-auto">
                            Point your phone camera at the barcode, or choose a manual option below.
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setCameraActive(true)}
                          className="bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs min-h-[44px]"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Start Camera Scanner
                        </Button>
                      </div>
                    )}

                    {/* Target reticle inside light container */}
                    {cameraActive && (
                      <div className="absolute inset-8 border-2 border-dashed border-blue-500/80 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between">
                          <span className="w-4 h-4 border-t-2 border-l-2 border-blue-600" />
                          <span className="w-4 h-4 border-t-2 border-r-2 border-blue-600" />
                        </div>
                        <div className="text-center">
                          <span className="bg-white/90 backdrop-blur-md text-blue-900 text-[11px] font-bold px-2.5 py-1 rounded-full border border-blue-200 shadow-xs">
                            Align barcode inside target box
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="w-4 h-4 border-b-2 border-l-2 border-blue-600" />
                          <span className="w-4 h-4 border-b-2 border-r-2 border-blue-600" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Point camera helper text */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 font-medium">Point your camera at the barcode.</p>
                </div>

                {/* SECTION 6: QUICK ACTION BUTTONS BELOW CAMERA */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowManualInput((prev) => !prev)}
                    className="w-full text-xs font-bold border-slate-300 text-slate-700 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Barcode className="w-4 h-4 text-blue-600" />
                    <span>Enter Barcode Manually</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setMode("image");
                      fileRef.current?.click();
                    }}
                    className="w-full text-xs font-bold border-slate-300 text-slate-700 min-h-[44px] rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Upload Product Photo</span>
                  </Button>
                </div>

                {/* Manual Barcode Input Form (collapsible on mobile, always accessible) */}
                {(showManualInput || !cameraActive) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleBarcode();
                    }}
                    className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <label className="text-xs font-bold text-slate-700 block">
                      Barcode Number (EAN-13 / GTIN)
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Barcode className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                        <Input
                          id="manualBarcodeInput"
                          value={code}
                          onChange={(e) => setCode(e.target.value)}
                          placeholder="e.g. 8901764061103"
                          className="pl-9 bg-white border-slate-300 focus:border-blue-500 rounded-xl text-sm h-11"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-[#146EF5] hover:bg-[#1059c4] text-white font-bold text-xs px-5 rounded-xl shadow-xs min-h-[44px]"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lookup"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Quick Samples List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Quick Sample Barcodes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { code: "8901764061103", label: "Diet Coke Can" },
                      { code: "8906002000018", label: "Bisleri Water" },
                      { code: "8901262010054", label: "Amul Taaza Milk" },
                      { code: "8901063124501", label: "Expired Bread" },
                    ].map((s) => (
                      <button
                        key={s.code}
                        type="button"
                        onClick={() => {
                          setCode(s.code);
                          handleBarcode(s.code);
                        }}
                        className="text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:text-blue-600 rounded-lg text-slate-700 font-medium transition-colors min-h-[32px]"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Photo / OCR Mode */}
            {mode === "image" && (
              <div className="space-y-4">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageFile(f);
                  }}
                  className="hidden"
                />

                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3"
                >
                  {preview ? (
                    <div className="space-y-2">
                      <img
                        src={preview}
                        alt="Uploaded package preview"
                        className="max-h-48 mx-auto rounded-xl object-contain shadow-xs"
                      />
                      <span className="text-xs text-blue-600 font-semibold block">
                        Click to change photo
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-800">Upload Product Packaging Image</h3>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">
                          Take a crisp photo of the front label, printed barcode, or batch details. Supports JPG, PNG, WEBP.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs font-semibold">
                        Choose File or Take Photo
                      </Button>
                    </>
                  )}
                </div>

                {ocrProgress && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />
                    <span>{ocrProgress}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. CONFIRMATION PANEL (AFTER SCANNING) */}
          {lastScanResult && (
            <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-md space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PRODUCT SCANNED SUCCESSFULLY</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lastScanResult.record.lastScanned}
                </span>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  {lastScanResult.record.productName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                  <span>Barcode: <strong>{lastScanResult.record.barcode}</strong></span>
                  <span>·</span>
                  <span>Batch: <strong>{lastScanResult.record.batchNumber}</strong></span>
                  <span>·</span>
                  <span>Expiry: <strong>{lastScanResult.record.expiryDate}</strong></span>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Expiry Status:</span>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    lastScanResult.record.expiryStatus === "EXPIRED"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : lastScanResult.record.expiryStatus === "EXPIRING SOON"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {lastScanResult.record.expiryStatus} ({lastScanResult.record.daysRemaining}d)
                </span>
              </div>

              {/* Duplicate vs New Quantity Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-slate-900 block font-bold">
                    {lastScanResult.isDuplicate ? "✓ Existing Inventory Updated" : "✓ Added to Inventory"}
                  </strong>
                  <span className="text-slate-500 text-[11px]">
                    {lastScanResult.isDuplicate
                      ? `Stock Quantity: ${lastScanResult.previousQuantity} → ${lastScanResult.newQuantity} (+${lastScanResult.addedQty} unit)`
                      : `Initial Stock: ${lastScanResult.newQuantity} units`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-blue-600">
                    {lastScanResult.newQuantity} Total Units
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/inventory"
                  className="w-full py-2 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>View Inventory</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setLastScanResult(null);
                    setCode("");
                  }}
                  className="w-full py-2 px-3 bg-[#146EF5] hover:bg-[#1059c4] text-white rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  <span>Scan Next Product</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Recent Scans Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold font-display text-slate-900">Recent Scans</h3>
              </div>
              <Link to="/scans" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View All Scans →
              </Link>
            </div>

            {history.length > 0 ? (
              <div className="space-y-2">
                {history.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setProduct(item.product);
                      setCustomBatch(item.product.batchNumber || "CCLO724");
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Barcode className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {item.productName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.brand} · {item.date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.product.expiryStatus === "Expired"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : item.product.expiryStatus === "Expiring Soon"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {item.product.expiryStatus || "Safe"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 space-y-1">
                <Barcode className="w-8 h-8 mx-auto text-slate-300" />
                <p>No recent scans yet. Scan a barcode above!</p>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Product Details & Inventory Integration (7 cols)            */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {product ? (
            <>
              {/* Prominent Expired / Expiring Alerts */}
              {(() => {
                const { daysRemaining, expiryStatus } = calculateExpiry(product.expiryDate);
                if (expiryStatus === "EXPIRED") {
                  return (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3 shadow-xs">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-sm font-extrabold block text-red-800">
                          ⚠ EXPIRED PRODUCT DETECTED
                        </strong>
                        <p className="text-xs text-red-700 mt-0.5">
                          Printed Expiry Date: <strong>{product.expiryDate}</strong> (Expired {Math.abs(daysRemaining)} days ago). This product has passed its legal shelf life. Return to supplier or dispose.
                        </p>
                      </div>
                    </div>
                  );
                }
                if (expiryStatus === "EXPIRING SOON") {
                  return (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-sm font-extrabold block text-amber-800">
                          ⚠ EXPIRING SOON ({daysRemaining} DAYS REMAINING)
                        </strong>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Printed Expiry Date: <strong>{product.expiryDate}</strong>. Schedule an automated discount or place at the front of the retail shelf.
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* 1. Main Product Overview Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>VERIGRO VERIFIED</span>
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Source: {product.source === "catalog" ? "Central Knowledge Base" : product.source}
                    </span>
                  </div>

                  {product.healthScore !== null && product.healthScore !== undefined && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                      <span>Health Score:</span>
                      <strong className="text-sm font-extrabold text-blue-900 font-display">
                        {product.healthScore.toFixed(1)} / 10
                      </strong>
                      {product.healthGrade && (
                        <span className="bg-blue-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                          Grade {product.healthGrade}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
                    {product.brand || "Verified Manufacturer"}
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900">
                    {product.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {product.description || "Comprehensive packaged commodity verification profile."}
                  </p>
                </div>

                {/* 2-Column Specification Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400">Brand</span>
                    <div className="font-bold text-slate-900">{product.brand || "Not Available"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400">Manufacturer</span>
                    <div className="font-bold text-slate-900 truncate">
                      {product.manufacturer || product.origin || "Not Available"}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400">Barcode</span>
                    <div className="font-mono font-bold text-slate-900">{product.barcode || "Not Available"}</div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-slate-400">Batch Number</span>
                    <div className="font-mono font-bold text-slate-900">{customBatch || product.batchNumber || "Not Available"}</div>
                  </div>
                  <div className="space-y-0.5 pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-400">Net Quantity</span>
                    <div className="font-bold text-slate-900">{product.netWeight || "Not Available"}</div>
                  </div>
                  <div className="space-y-0.5 pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-400">Mfg Date</span>
                    <div className="font-bold text-slate-900">{product.mfgDate || "Not Available"}</div>
                  </div>
                  <div className="space-y-0.5 pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-400">Official MRP</span>
                    <div className="font-bold text-blue-600">
                      {product.mrp ? `₹${product.mrp.toFixed(2)}` : "Not Available"}
                    </div>
                  </div>
                  <div className="space-y-0.5 pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-400">Expiry Date</span>
                    <div className="font-bold text-slate-900">{product.expiryDate || "Not Available"}</div>
                  </div>
                </div>

                {/* MANUAL INVENTORY ADD BAR */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900 block">Inventory Stock Entry</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Batch:</span>
                      <input
                        type="text"
                        value={customBatch}
                        onChange={(e) => setCustomBatch(e.target.value)}
                        placeholder="Batch Number"
                        className="h-7 px-2 bg-white border border-slate-200 rounded font-mono text-xs w-28 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                      <span className="text-xs text-slate-500 font-semibold px-1">Qty:</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-extrabold text-xs text-slate-900">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      onClick={() => processInventoryEntry(product, quantity, customBatch)}
                      className="bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add {quantity} to Inventory
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. Expiry & Batch Tracking Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-bold font-display text-slate-900">
                      Expiry & Batch Freshness Tracker
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">Batch: {customBatch || product.batchNumber || "Not Available"}</span>
                </div>

                {(() => {
                  const { daysRemaining, expiryStatus } = calculateExpiry(product.expiryDate);
                  return (
                    <div
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        expiryStatus === "EXPIRED"
                          ? "bg-red-50 border-red-200 text-red-900"
                          : expiryStatus === "EXPIRING SOON"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                            expiryStatus === "EXPIRED"
                              ? "bg-red-600"
                              : expiryStatus === "EXPIRING SOON"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                          }`}
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider">
                            Expiry Status: {expiryStatus}
                          </div>
                          <p className="text-xs opacity-90">
                            Expiry Date: <strong>{product.expiryDate || "Not Available"}</strong> (Manufactured:{" "}
                            {product.mfgDate || "Not Available"})
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="inline-block px-3 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 font-extrabold text-xs shadow-xs">
                          {daysRemaining} Days Remaining
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {product.usageTips && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    💡 <strong>Storage & Usage Advice:</strong> {product.usageTips}
                  </p>
                )}
              </div>

              {/* 3. Health & Ingredients Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-bold font-display text-slate-900">
                    Health, Nutrition & Allergen Audit
                  </h3>
                </div>

                {product.nutrition && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <strong className="text-slate-900 block mb-1">Nutrition Facts:</strong>
                    <p className="text-slate-600 font-mono text-[11px] leading-relaxed">
                      {product.nutrition}
                    </p>
                  </div>
                )}

                {product.ingredients && (
                  <div className="space-y-1">
                    <strong className="text-xs text-slate-800 block">Ingredients List:</strong>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                      {product.ingredients}
                    </p>
                  </div>
                )}

                {product.allergens && product.allergens.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <strong className="text-xs text-slate-800 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Allergen & Sensitive Ingredient Disclosures:</span>
                    </strong>
                    <div className="flex flex-wrap gap-2">
                      {product.allergens.map((a, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Regulatory & Legal Compliance Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold font-display text-slate-900">
                    FSSAI & Legal Metrology 2011 Compliance
                  </h3>
                </div>

                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-blue-950 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Food Safety & Standards Authority of India (FSSAI)</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {product.fssaiStatus || "FSSAI Lic. No. 10012011000168 — Approved & Verified"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-amber-950 font-bold">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <span>Legal Metrology (Packaged Commodities) Rules 2011 — Rule 6</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {product.legalMetrologyRules ||
                      "Mandatory declarations complete: Net quantity, maximum retail price (MRP incl. all taxes), batch number, consumer helpline details verified."}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <ScanLine className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-base font-bold text-slate-900 font-display">
                  No Product Selected Yet
                </h3>
                <p className="text-xs text-slate-500">
                  Scan a product barcode or click a sample on the left to view the instant verification audit and auto-add to your store inventory.
                </p>
              </div>
              <Button
                onClick={() => {
                  setCode("8901764061103");
                  handleBarcode("8901764061103");
                }}
                className="bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-semibold px-4 py-2 rounded-xl"
              >
                Inspect Sample: Diet Coke Can
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
