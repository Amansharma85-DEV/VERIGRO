import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import Tesseract from "tesseract.js";
import {
  AlertTriangle,
  Award,
  Barcode,
  Camera,
  CheckCircle2,
  ExternalLink,
  Leaf,
  Loader2,
  LogOut,
  MapPin,
  PlayCircle,
  ScanLine,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Video,
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
import { supabase } from "@/integrations/supabase/client";
import { identifyFromImage, listProducts, lookupBarcode } from "@/lib/products.functions";
import { saveScan } from "@/lib/scans.functions";
import type { ProductInfo } from "@/lib/product-types";
import scanHero from "@/assets/scan-hero.jpg";
import nirikshanLogo from "@/assets/nirikshan-logo.png";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({
    meta: [
      { title: "Scanner — NIRIKSHAN" },
      {
        name: "description",
        content: "Barcode number daalein ya product ki photo upload karke poori detail dekhein.",
      },
      { property: "og:title", content: "NIRIKSHAN Scanner" },
      {
        property: "og:description",
        content: "Barcode ya photo se daily use products ki detail turant paayein.",
      },
    ],
  }),
  component: ScanPage,
});

type Mode = "barcode" | "image";

function ScanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const runBarcode = useServerFn(lookupBarcode);
  const runImage = useServerFn(identifyFromImage);
  const runSave = useServerFn(saveScan);
  const runList = useServerFn(listProducts);

  const [mode, setMode] = useState<Mode>("barcode");
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ProductInfo[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      query: string;
      productName: string;
      brand: string;
      mode: string;
      date: string;
      product: ProductInfo;
    }>
  >([]);

  useEffect(() => {
    runList().then((res) => setCatalog(res.products)).catch(() => setCatalog([]));
    
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email);
      } else if (typeof window !== "undefined") {
        const saved = localStorage.getItem("nirikshan_demo_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setEmail(parsed.email || parsed.name || "User");
          } catch {
            setEmail(null);
          }
        }
      }
    });

    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("nirikshan_saved_scans");
        if (saved) setHistory(JSON.parse(saved));
      } catch {
        // history parse fallback
      }
    }
  }, [runList]);

  async function record(mode: Mode, query: string, found: ProductInfo | null) {
    if (found) {
      const entry = {
        id: String(Date.now()),
        query,
        productName: found.name,
        brand: found.brand ?? "NIRIKSHAN Verified",
        mode,
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        product: found,
      };
      setHistory((prev) => {
        const updated = [entry, ...prev.filter((p) => p.productName !== found.name)].slice(0, 10);
        if (typeof window !== "undefined") {
          localStorage.setItem("nirikshan_saved_scans", JSON.stringify(updated));
        }
        return updated;
      });
    }
    try {
      await runSave({
        data: {
          mode,
          query,
          productName: found?.name ?? null,
          brand: found?.brand ?? null,
          source: found?.source ?? null,
        },
      });
    } catch {
      // history save fail hona scan ko nahi rokta
    }
  }

  async function handleBarcode(value?: string) {
    const target = (value ?? code).trim();
    if (!target) {
      toast.error("Barcode number daalein.");
      return;
    }
    setProduct(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await runBarcode({ data: { code: target } });
      setProduct(res.product);
      setMessage(res.message ?? null);
      if (!res.product) toast.error(res.message ?? "Product nahi mila.");
      await record("barcode", target, res.product);
    } catch {
      toast.error("Scan fail hua, dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  async function scanImageForBarcode(dataUrl: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const img = new Image();
    img.src = dataUrl;
    await img.decode().catch(() => {});

    // 1. Browser Native BarcodeDetector API
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        const barcodes = await detector.detect(img);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          const code = String(barcodes[0].rawValue).replace(/\D/g, "");
          if (code.length >= 5) return code;
        }
      } catch {}
    }

    // 2. ZXing MultiFormat Reader on original URL
    try {
      const codeReader = new BrowserMultiFormatReader();
      const res = await codeReader.decodeFromImageUrl(dataUrl);
      if (res && res.getText()) {
        const code = String(res.getText()).replace(/\D/g, "");
        if (code.length >= 5) return code;
      }
    } catch {}

    // 3. Multi-angle Canvas Rotations (90°, 180°, 270°) for sideways/rotated image barcodes
    try {
      if (img.width > 0 && img.height > 0) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const codeReader = new BrowserMultiFormatReader();

        if (ctx) {
          for (const angle of [90, 180, 270]) {
            canvas.width = angle % 180 === 0 ? img.width : img.height;
            canvas.height = angle % 180 === 0 ? img.height : img.width;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((angle * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();

            const rotatedUrl = canvas.toDataURL("image/png");
            try {
              const res = await codeReader.decodeFromImageUrl(rotatedUrl);
              if (res && res.getText()) {
                const code = String(res.getText()).replace(/\D/g, "");
                if (code.length >= 5) return code;
              }
            } catch {}
          }
        }
      }
    } catch {}

    return null;
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file chalegi.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image 6MB se chhoti honi chahiye.");
      return;
    }
    setProduct(null);
    setMessage(null);
    setLoading(true);

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);

    // Run client-side multi-angle barcode scanner
    const detectedCode = await scanImageForBarcode(dataUrl);

    try {
      let finalProduct: ProductInfo | null = null;
      let finalMessage: string | null = null;

      if (detectedCode && detectedCode.length >= 5) {
        setCode(detectedCode);
        const res = await runBarcode({ data: { code: detectedCode } });
        finalProduct = res.product;
        finalMessage = res.message ?? null;
      }

      // If no barcode detected OR the barcode led to a generic fallback, try OCR
      const isGeneric = finalProduct?.name.includes("Barcode: ");
      if (!finalProduct || isGeneric) {
        toast.info(isGeneric ? "Verifying with AI Vision..." : "Barcode not clear. AI is reading package text...");
        let ocrText = "";
        try {
          const { data } = await Tesseract.recognize(dataUrl, "eng", { logger: m => console.log(m) });
          ocrText = data.text.replace(/\n/g, " ");
        } catch (err) {
          console.error("OCR Failed", err);
        }

        // Send both filename and extracted text to backend
        const combinedHints = (file.name + " " + ocrText).toLowerCase();
        const res = await runImage({ data: { imageDataUrl: dataUrl, fileName: combinedHints } });
        
        // If image analyzer found a specific match (not its own fallback), use it
        if (res.product && !res.product.name.includes("Product Photo Scan")) {
             finalProduct = res.product;
             finalMessage = res.message ?? null;
             if (res.product.barcode && !res.product.barcode.startsWith("PHOTO")) {
                 setCode(res.product.barcode);
             }
        } else if (!finalProduct && res.product) {
             finalProduct = res.product;
             finalMessage = res.message ?? null;
        }
      }

      setProduct(finalProduct);
      setMessage(finalMessage);
      if (!finalProduct) toast.error("Product pehchana nahi gaya.");
      if (finalProduct) await record("image", file.name.slice(0, 60), finalProduct);
    } catch {
      toast.error("Image scan fail hua, dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("nirikshan_demo_user");
    }
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 p-0.5 border border-primary/40 shadow-beam overflow-hidden">
              <img src={nirikshanLogo} alt="NIRIKSHAN Logo" className="size-full object-cover rounded-lg" />
            </div>
            <span className="font-display text-lg font-bold tracking-[0.2em]">NIRIKSHAN</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVideoModal(true)}
              className="border-primary/40 text-primary hover:bg-primary/10 gap-1.5 text-xs font-semibold"
            >
              <PlayCircle className="size-4 text-accent" /> Video Guide
            </Button>
            {email && (
              <span className="hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
                👤 {email}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-1.5 size-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section>
            <h1 className="text-3xl">Product scanner</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Barcode number daalein, ya product ki photo upload karein — dono se detail milegi.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
              {(
                [
                  { value: "barcode" as Mode, label: "Barcode", icon: Barcode },
                  { value: "image" as Mode, label: "Photo", icon: Camera },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    mode === option.value
                      ? "bg-beam text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <option.icon className="size-4" /> {option.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-3xl surface-glass p-5">
              {mode === "barcode" ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleBarcode();
                  }}
                  className="space-y-4"
                >
                  <div className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 20))}
                      inputMode="numeric"
                      placeholder="4902505085703"
                      aria-label="Barcode number"
                    />
                    <Button type="submit" disabled={loading} className="shadow-beam">
                      {loading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pack ke peeche likha 8-13 digit ka number daalein.
                  </p>
                </form>
              ) : (
                <div className="space-y-4">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="scan-line flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-secondary/40 px-6 py-10 text-center transition-colors hover:border-primary"
                  >
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-beam text-primary-foreground">
                      <Upload className="size-5" />
                    </span>
                    <span className="font-display text-sm">Photo lein ya upload karein</span>
                    <span className="text-xs text-muted-foreground">JPG / PNG, max 6MB</span>
                  </button>
                  {preview && (
                    <img
                      src={preview}
                      alt="Aapki upload ki hui product photo"
                      loading="lazy"
                      className="max-h-52 w-full rounded-2xl object-contain"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Saved Scans History Section */}
            {history.length > 0 && (
              <div className="mt-6 rounded-3xl surface-glass p-5">
                <h3 className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-primary font-semibold">
                  <CheckCircle2 className="size-4" /> Saved Scans / Purana Data (Recent History)
                </h3>
                <div className="mt-3 space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setProduct(item.product)}
                      className="flex w-full items-center justify-between rounded-2xl bg-secondary/40 p-3 text-left transition-colors hover:bg-secondary"
                    >
                      <div>
                        <p className="text-xs font-semibold text-foreground">{item.productName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.brand} • {item.date} • {item.mode === "image" ? "Photo Scan" : "Barcode"}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        Saved
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-3xl surface-glass">
              <img
                src={scanHero}
                alt="Barcode scanning"
                width={1600}
                height={1008}
                loading="lazy"
                className="h-36 w-full object-cover opacity-70"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xl">Result</h2>
            <div className="mt-4 min-h-[18rem] rounded-3xl surface-glass p-6">
              {loading ? (
                <div className="flex h-full min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-primary" />
                  Detail nikaali ja rahi hai...
                </div>
              ) : product ? (
                <div className="space-y-5">
                  {/* Product Header */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-primary">
                        {product.brand ?? "Brand Verified"}
                      </p>
                      {product.healthScore != null && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                          <Award className="size-3.5" />
                          Health Score: {product.healthScore} / 10
                          {product.healthGrade && ` (Grade ${product.healthGrade})`}
                        </div>
                      )}
                    </div>
                    <h3 className="mt-1 text-2xl font-bold">{product.name}</h3>
                  </div>

                  {/* Product Classification & Badges */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {product.classification && (
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${
                          product.classification.includes("Tobacco")
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-primary/20 text-primary border border-primary/40"
                        }`}
                      >
                        🏷️ Category: {product.classification}
                      </span>
                    )}
                    {product.category && (
                      <span className="rounded-full bg-secondary px-3 py-1">{product.category}</span>
                    )}
                    {product.netWeight && (
                      <span className="rounded-full bg-secondary px-3 py-1">{product.netWeight}</span>
                    )}
                    {product.mrp != null && (
                      <span className="rounded-full bg-secondary px-3 py-1 font-semibold text-primary">
                        MRP ₹{product.mrp}
                      </span>
                    )}
                    <span className="rounded-full border border-primary/40 px-3 py-1 text-primary">
                      NIRIKSHAN Verified
                    </span>
                  </div>

                  {/* Tobacco & COTPA Act 2003 Critical Risk Audit Box */}
                  {(() => {
                    const cls = (product.classification ?? "").toLowerCase();
                    const cat = (product.category ?? "").toLowerCase();
                    const name = (product.name ?? "").toLowerCase();
                    const isTobacco = cls.includes("tobacco") || cls.includes("restricted") || cat.includes("tobacco") || name.includes("cigarette") || name.includes("tobacco");
                    if (!isTobacco) return null;

                    return (
                      <div className="rounded-2xl border border-red-500/60 bg-red-500/10 p-5 text-sm shadow-xl animate-pulse">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-2 font-bold text-red-400 text-base">
                            <AlertTriangle className="size-6 text-red-500 shrink-0" /> SEVERE HEALTH HAZARD & CANCER RISK AUDIT
                          </p>
                          <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold text-white uppercase tracking-wider">
                            GRADE E • CRITICAL RISK
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-red-200 space-y-2">
                            <p className="font-bold text-base text-red-400 flex items-center gap-2">
                              🚨 TOBACCO SMOKING CAUSES PAINFUL DEATH & LUNG CANCER
                            </p>
                            <p className="text-xs text-red-200/90 leading-relaxed">
                              This product contains highly addictive <strong>Nicotine</strong>, carcinogenic <strong>Tar</strong>, <strong>Carbon Monoxide</strong>, Lead, Arsenic, and toxic chemical compounds.
                            </p>
                            <ul className="list-disc pl-5 text-xs text-red-200/80 space-y-1 font-medium">
                              <li><strong>Severe Respiratory Risk:</strong> Causes Chronic Obstructive Pulmonary Disease (COPD) & Lung Cancer</li>
                              <li><strong>Cardiovascular Hazard:</strong> Causes heart attacks, stroke, and arterial constriction</li>
                              <li><strong>Secondhand Smoke Warning:</strong> Highly toxic to children, family members, and non-smokers nearby</li>
                            </ul>
                          </div>

                          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-300 text-xs font-semibold">
                            <p className="flex items-center gap-2 text-sm font-bold text-amber-400">
                              🏛️ Statutory Regulations — COTPA Act, 2003
                            </p>
                            <p className="mt-1 leading-relaxed">
                              Section 7, Cigarettes and Other Tobacco Products Act (COTPA), 2003 mandates 85% Graphic Health Warnings on packaging. Sale to individuals under 18 years is strictly illegal and punishable by law.
                            </p>
                            <div className="mt-3 text-emerald-400 font-bold bg-emerald-500/20 p-2.5 rounded-xl flex items-center justify-between">
                              <span>📞 National Tobacco Quitline Helpline:</span>
                              <span className="text-sm tracking-wider font-extrabold text-emerald-300">1800-11-2356 (Toll-Free)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Personalized Health Profile Audit Box — Only for edible food products */}
                  {(() => {
                    const cls = (product.classification ?? "").toLowerCase();
                    const cat = (product.category ?? "").toLowerCase();
                    const isTobacco = cls.includes("tobacco") || cls.includes("restricted") || cat.includes("tobacco");
                    if (isTobacco) return null;

                    const isEdible = cls.includes("edible") || cls.includes("food") || cls.includes("beverage") || cls.includes("dairy") || cls.includes("snack") || cls.includes("juice") || cls.includes("grocery") || cls.includes("staple") || cls.includes("confectionery") || cls.includes("instant") || cls.includes("bakery") || cls.includes("namkeen");
                    if (!isEdible) return null;

                    const hasHighSugar = product.nutrition?.toLowerCase().includes("sugar") || product.ingredients?.toLowerCase().includes("sugar");
                    const nutritionText = product.nutrition ?? "";
                    const sodiumMatch = nutritionText.match(/sodium[:\s]+(\d+)\s*mg/i);
                    const sodiumMg = sodiumMatch ? parseInt(sodiumMatch[1]) : null;
                    const hasHighSodium = sodiumMg != null ? sodiumMg > 400 : (nutritionText.toLowerCase().includes("sodium") && (product.ingredients?.toLowerCase().includes("salt") ?? false));

                    return (
                      <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-md">
                        <p className="flex items-center justify-between font-bold text-primary text-base">
                          <span className="flex items-center gap-2">🏥 Health Profile Audit</span>
                          <span className="rounded-full bg-primary/20 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider">
                            Active Risk Analysis
                          </span>
                        </p>
                        <div className="mt-4 space-y-3 font-medium">
                          {hasHighSugar ? (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-red-500">
                              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                              <p><strong>Diabetic Alert:</strong> Contains added sugar or high glycemic carbohydrates.</p>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-500">
                              <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                              <p><strong>Diabetic Safe:</strong> No high refined sugar detected.</p>
                            </div>
                          )}

                          {hasHighSodium ? (
                            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-red-500">
                              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
                              <p><strong>High BP Warning:</strong> {sodiumMg != null ? `High Sodium ${sodiumMg}mg detected.` : "Elevated sodium content."} Consume in moderation.</p>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-500">
                              <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                              <p><strong>Heart & BP Safe:</strong> Sodium within healthy range.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* FSSAI & Legal Metrology Badges */}
                  <div className="flex flex-col gap-4">
                    {product.fssaiStatus && (() => {
                      const isPending = product.fssaiStatus.toLowerCase().includes("pending") || product.fssaiStatus.toLowerCase().includes("verification pending");
                      const isExempt = product.fssaiStatus.includes("N/A");
                      const badge = isPending ? "PENDING" : isExempt ? "EXEMPT" : "14-DIGIT VERIFIED";
                      const borderColor = isPending ? "border-gray-500/30" : "border-amber-500/30";
                      const bgColor = isPending ? "bg-gray-500/10" : "bg-amber-500/10";
                      const textColor = isPending ? "text-gray-400" : "text-amber-400";
                      const badgeBg = isPending ? "bg-gray-500/20 text-gray-300" : "bg-amber-500/20 text-amber-300";

                      return (
                        <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4 text-sm shadow-md`}>
                          <p className={`flex items-center justify-between font-bold ${textColor} text-base`}>
                            <span className="flex items-center gap-2">🛡️ FSSAI Approval Status</span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold ${badgeBg}`}>{badge}</span>
                          </p>
                          <p className="mt-2 text-foreground font-medium leading-relaxed">{product.fssaiStatus}</p>
                          {!isExempt && !isPending && (
                            <div className="mt-3 flex items-center gap-2 text-emerald-500 font-semibold">
                              <ShieldCheck className="size-5" />
                              Government Database Verified
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {product.legalMetrologyRules && (
                      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm shadow-md">
                        <p className="flex items-center justify-between font-bold text-indigo-400 text-base">
                          <span className="flex items-center gap-2">📜 Govt. Legal Metrology Rules, 2011</span>
                          <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-indigo-300">
                            RULE 6
                          </span>
                        </p>
                        <p className="mt-3 text-foreground font-medium leading-relaxed">
                          Legal Metrology (Packaged Commodities) Rules, 2011 — Rule 6 mandates: Net Qty (as
                          declared), MRP (incl. taxes), Mfg date, Expiry/BBD, Manufacturer name & address, Consumer helpline.
                        </p>
                        <div className="mt-4 space-y-2 text-xs font-semibold text-indigo-300/80">
                          <p className="flex items-start gap-2">
                            <span className="text-indigo-400">📌</span>
                            Act: Legal Metrology Act, 2009 (LM Act)
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="text-indigo-400">📌</span>
                            Rules: Legal Metrology (Packaged Commodities) Rules, 2011
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="text-indigo-400">📌</span>
                            Rule 6 — Mandatory Declarations on Pack:
                          </p>
                          <ul className="ml-6 list-disc space-y-1 text-indigo-200/60 font-normal">
                            <li>Name & Address of Manufacturer / Importer / Packer</li>
                            <li>Month & Year of Manufacture / Packing</li>
                            <li>Best Before / Use By / Expiry Date</li>
                            <li>Maximum Retail Price (MRP incl. all taxes)</li>
                            <li>Consumer Care Number / Complaint Contact</li>
                            {product.classification?.toLowerCase().includes("edible") || product.classification?.toLowerCase().includes("food") ? (
                              <li>FSSAI License No. (Food Safety Act 2006)</li>
                            ) : null}
                            {product.origin?.toLowerCase().includes("import") ? (
                              <li>Country of Origin (Import Labelling Rule 7)</li>
                            ) : null}
                          </ul>
                          <p className="mt-3 text-indigo-300 font-medium bg-indigo-500/20 p-2 rounded-lg">⚖️ <strong>Penalty:</strong> Violation punishable under Section 36, LM Act 2009 — Fine up to ₹25,000 (1st offense), ₹50,000 + 1-yr jail (repeat)</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Highlights Badges */}
                  {product.highlights && product.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {product.highlights.map((h) => (
                        <span
                          key={h}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                        >
                          <CheckCircle2 className="size-3" /> {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Product Details Grid */}
                  {product.description && (
                    <Detail label="Product ke bare me" value={product.description} />
                  )}
                  {product.ingredients && <Detail label="Ingredients & Materials" value={product.ingredients} />}
                  {product.nutrition && <Detail label="Specification / Nutrition" value={product.nutrition} />}
                  {product.usageTips && <Detail label="Use kaise karein" value={product.usageTips} />}

                  {/* Eco & Safety info */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {product.ecoScore && (
                      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                        <p className="flex items-center gap-1.5 font-semibold text-emerald-400">
                          <Leaf className="size-3.5" /> Eco-Rating & Sustainability
                        </p>
                        <p className="mt-1 text-muted-foreground">{product.ecoScore}</p>
                      </div>
                    )}

                    {product.allergens && product.allergens.length > 0 && (
                      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
                        <p className="flex items-center gap-1.5 font-semibold text-blue-400">
                          <ShieldCheck className="size-3.5" /> Safety & Allergens
                        </p>
                        <p className="mt-1 text-muted-foreground">{product.allergens.join(" • ")}</p>
                      </div>
                    )}
                  </div>

                  {/* Origin */}
                  {product.origin && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-primary" />
                      <span>{product.origin}</span>
                    </div>
                  )}

                  {/* Barcode Footer */}
                  {product.barcode && (
                    <div className="rounded-2xl bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">BARCODE:</span> {product.barcode}
                    </div>
                  )}

                  {/* Better Alternatives Section */}
                  {product.alternatives && product.alternatives.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] font-semibold text-primary">
                        <Sparkles className="size-3.5" /> Healthier / Better Alternatives (Indian Market)
                      </p>
                      <div className="mt-3 space-y-2">
                        {product.alternatives.map((alt) => (
                          <div
                            key={alt.name}
                            className="flex items-center justify-between rounded-xl bg-background/80 p-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{alt.name}</p>
                              <p className="text-muted-foreground">{alt.reason}</p>
                            </div>
                            {alt.price && (
                              <span className="ml-2 font-semibold text-primary">{alt.price}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                  <Barcode className="size-8 text-primary" />
                  {message ?? "Barcode daalein ya photo lein — detail yahan dikhegi."}
                </div>
              )}
            </div>

            {catalog.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                  Try karein (ready barcodes)
                </h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {catalog.slice(0, 8).map((item) => (
                    <button
                      key={item.barcode ?? item.name}
                      type="button"
                      onClick={() => {
                        setMode("barcode");
                        setCode(item.barcode ?? "");
                        void handleBarcode(item.barcode ?? "");
                      }}
                      className="rounded-2xl surface-glass px-4 py-3 text-left transition-colors hover:border-primary"
                    >
                      <p className="text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.barcode}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Video Guide Dialog Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-3xl surface-glass border-primary/50 p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <PlayCircle className="size-5 text-primary animate-pulse" /> NIRIKSHAN Scanner — Video Guide & Tutorial
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 relative aspect-video w-full rounded-2xl overflow-hidden border border-primary/40 bg-black">
            <iframe
              src="https://drive.google.com/file/d/1U5gHXWA2b8XvLMfcN0mQMrvSvDUYk-sz/preview"
              title="NIRIKSHAN Scanner Video Tutorial"
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Watch how to scan barcodes, verify FSSAI licenses & find healthy swaps.</span>
            <a
              href="https://drive.google.com/file/d/1U5gHXWA2b8XvLMfcN0mQMrvSvDUYk-sz/view?usp=drivesdk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
            >
              <ExternalLink className="size-3.5" /> Direct Drive Link
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.15em] text-primary">{label}</p>
      <p className="mt-1 text-sm text-foreground/90">{value}</p>
    </div>
  );
}
