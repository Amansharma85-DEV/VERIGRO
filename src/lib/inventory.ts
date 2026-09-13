import * as XLSX from "xlsx";
import type { ProductInfo } from "./product-types";

export interface InventoryRecord {
  id: string;
  storeId: string;
  barcode: string;
  productName: string;
  brand: string;
  category: string;
  sku: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  daysRemaining: number;
  expiryStatus: "SAFE" | "EXPIRING SOON" | "EXPIRED";
  mrp: number | null;
  sellingPrice: number | null;
  netQuantity: string | null;
  stockQuantity: number;
  reorderLevel: number;
  fssaiNumber: string | null;
  supplier: string | null;
  imageUrl: string | null;
  lastScanned: string;
  lastUpdated: string;
}

export interface InventoryActivity {
  id: string;
  storeId: string;
  type: "PRODUCT_SCANNED" | "STOCK_ADDED" | "STOCK_REDUCED" | "NEW_BATCH_REGISTERED" | "DISCOUNT_APPLIED";
  productName: string;
  barcode: string;
  batchNumber: string;
  quantityDelta: number;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface ScanSession {
  id: string;
  storeId: string;
  name: string;
  startedAt: string;
  totalScanned: number;
  newProducts: number;
  updatedProducts: number;
  expiredProducts: number;
  expiringSoonProducts: number;
  items: Array<{
    barcode: string;
    productName: string;
    batchNumber: string;
    quantityAdded: number;
    status: "SAFE" | "EXPIRING SOON" | "EXPIRED";
  }>;
}

// Get the active store ID for the current authenticated retailer
export function getCurrentStoreId(): string {
  if (typeof window === "undefined") return "store_default";
  try {
    const saved = localStorage.getItem("verigro_demo_user") || localStorage.getItem("nirikshan_demo_user");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.id) return `store_${parsed.id}`;
      if (parsed?.email) return `store_${parsed.email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    }
  } catch (error) {
    console.error(error);
  }
  return "store_default";
}

// Calculate days remaining and expiry status dynamically from any date format
export function calculateExpiry(expiryDateStr?: string | null): {
  daysRemaining: number;
  expiryStatus: "SAFE" | "EXPIRING SOON" | "EXPIRED";
} {
  if (!expiryDateStr || expiryDateStr === "Not Available") {
    return { daysRemaining: 365, expiryStatus: "SAFE" };
  }

  try {
    // Attempt standard parse
    let expiryDate = new Date(expiryDateStr);
    if (isNaN(expiryDate.getTime())) {
      // Try parsing formats like "30 Jun 2025" or "01/07/2025"
      const parts = expiryDateStr.trim().split(/[\s/-]+/);
      if (parts.length === 3) {
        // e.g. "30", "Jun", "2025"
        expiryDate = new Date(parts.join(" "));
      }
    }

    if (!isNaN(expiryDate.getTime())) {
      const now = new Date();
      const diffMs = expiryDate.getTime() - now.getTime();
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (days < 0) {
        return { daysRemaining: days, expiryStatus: "EXPIRED" };
      }
      if (days <= 30) {
        return { daysRemaining: days, expiryStatus: "EXPIRING SOON" };
      }
      return { daysRemaining: days, expiryStatus: "SAFE" };
    }
  } catch (error) {
    console.error(error);
  }

  return { daysRemaining: 180, expiryStatus: "SAFE" };
}

// Seed data for a store if empty
function getInitialSeedInventory(storeId: string): InventoryRecord[] {
  return [
    {
      id: "inv-seed-1",
      storeId,
      barcode: "8901764061103",
      productName: "Diet Coke Can (300ml)",
      brand: "Coca-Cola",
      category: "Beverages / Low Calorie",
      sku: "BEV-COKE-001",
      batchNumber: "CCLO724",
      mfgDate: "01 Jul 2024",
      expiryDate: "30 Jun 2025",
      daysRemaining: 290,
      expiryStatus: "SAFE",
      mrp: 40.0,
      sellingPrice: 40.0,
      netQuantity: "300 ml",
      stockQuantity: 12,
      reorderLevel: 10,
      fssaiNumber: "10012011000168",
      supplier: "Moon Beverages Ltd (Coca-Cola Authorised)",
      imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      lastScanned: "Today, 10:15 AM",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "inv-seed-2",
      storeId,
      barcode: "8906002000018",
      productName: "Bisleri 1L Packaged Water with Minerals",
      brand: "Bisleri",
      category: "Beverages & Packaged Water",
      sku: "WAT-BIS-002",
      batchNumber: "BIS-402",
      mfgDate: "15 Apr 2024",
      expiryDate: "15 Oct 2025",
      daysRemaining: 398,
      expiryStatus: "SAFE",
      mrp: 20.0,
      sellingPrice: 20.0,
      netQuantity: "1 L",
      stockQuantity: 120,
      reorderLevel: 25,
      fssaiNumber: "10012022000277",
      supplier: "Bisleri International Pvt Ltd",
      imageUrl: null,
      lastScanned: "Yesterday",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "inv-seed-3",
      storeId,
      barcode: "8901262010054",
      productName: "Amul Taaza Homogenised Toned Milk 500ml",
      brand: "Amul",
      category: "Dairy & Perishables",
      sku: "DAI-AMUL-003",
      batchNumber: "A-991",
      mfgDate: "27 Aug 2024",
      expiryDate: "26 Sep 2024",
      daysRemaining: 14,
      expiryStatus: "EXPIRING SOON",
      mrp: 27.0,
      sellingPrice: 27.0,
      netQuantity: "500 ml",
      stockQuantity: 24,
      reorderLevel: 15,
      fssaiNumber: "10014021001289",
      supplier: "Gujarat Co-operative Milk Marketing Federation",
      imageUrl: null,
      lastScanned: "Today, 08:30 AM",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "inv-seed-4",
      storeId,
      barcode: "8901063012639",
      productName: "Britannia Bourbon Chocolate Cream Biscuits",
      brand: "Britannia",
      category: "Bakery & Confectionery",
      sku: "BIS-BOUR-004",
      batchNumber: "BT-882",
      mfgDate: "10 Jul 2024",
      expiryDate: "20 Aug 2025",
      daysRemaining: 342,
      expiryStatus: "SAFE",
      mrp: 35.0,
      sellingPrice: 35.0,
      netQuantity: "150 g",
      stockQuantity: 32,
      reorderLevel: 10,
      fssaiNumber: "10015043001129",
      supplier: "Britannia Industries Ltd",
      imageUrl: null,
      lastScanned: "11 Sep 2024",
      lastUpdated: new Date().toISOString(),
    },
    {
      id: "inv-seed-5",
      storeId,
      barcode: "8901063124501",
      productName: "Britannia Daily Fresh White Bread 400g",
      brand: "Britannia",
      category: "Fresh Bakery",
      sku: "BRD-BRIT-005",
      batchNumber: "BRD-90",
      mfgDate: "05 Sep 2024",
      expiryDate: "10 Sep 2024",
      daysRemaining: -2,
      expiryStatus: "EXPIRED",
      mrp: 45.0,
      sellingPrice: 45.0,
      netQuantity: "400 g",
      stockQuantity: 6,
      reorderLevel: 10,
      fssaiNumber: "10015043001129",
      supplier: "Britannia Daily Bread Depot",
      imageUrl: null,
      lastScanned: "10 Sep 2024",
      lastUpdated: new Date().toISOString(),
    },
  ];
}

// Retrieve store inventory
export function getStoreInventory(storeId: string = getCurrentStoreId()): InventoryRecord[] {
  if (typeof window === "undefined") return getInitialSeedInventory(storeId);
  try {
    const key = `verigro_inventory_${storeId}`;
    const data = localStorage.getItem(key);
    if (data) {
      const records: InventoryRecord[] = JSON.parse(data);
      // Re-evaluate daysRemaining dynamically
      return records.map((rec) => {
        const { daysRemaining, expiryStatus } = calculateExpiry(rec.expiryDate);
        return { ...rec, daysRemaining, expiryStatus };
      });
    } else {
      const seed = getInitialSeedInventory(storeId);
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
  } catch {
    return getInitialSeedInventory(storeId);
  }
}

// Save store inventory
export function saveStoreInventory(records: InventoryRecord[], storeId: string = getCurrentStoreId()) {
  if (typeof window === "undefined") return;
  try {
    const key = `verigro_inventory_${storeId}`;
    localStorage.setItem(key, JSON.stringify(records));
    // Trigger custom event so all active tabs/components re-render immediately
    window.dispatchEvent(new CustomEvent("verigro_inventory_updated", { detail: { storeId, count: records.length } }));
  } catch (error) {
    console.error(error);
  }
}

// Log inventory activity
export function logInventoryActivity(activity: Omit<InventoryActivity, "id" | "timestamp">) {
  if (typeof window === "undefined") return;
  try {
    const key = `verigro_activities_${activity.storeId}`;
    const existing = localStorage.getItem(key);
    const list: InventoryActivity[] = existing ? JSON.parse(existing) : [];
    const newEntry: InventoryActivity = {
      ...activity,
      id: "act_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [newEntry, ...list].slice(0, 30);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("verigro_activity_logged", { detail: newEntry }));
  } catch (error) {
    console.error(error);
  }
}

// Retrieve activities
export function getStoreActivities(storeId: string = getCurrentStoreId()): InventoryActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const key = `verigro_activities_${storeId}`;
    const data = localStorage.getItem(key);
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error(error);
  }
  return [
    {
      id: "act-1",
      storeId,
      type: "STOCK_ADDED",
      productName: "Diet Coke Can (300ml)",
      barcode: "8901764061103",
      batchNumber: "CCLO724",
      quantityDelta: 1,
      userName: "Amansharma",
      timestamp: "Today, 10:15 AM",
      details: "Scanned via Product Scanner",
    },
    {
      id: "act-2",
      storeId,
      type: "STOCK_ADDED",
      productName: "Bisleri 1L Packaged Water with Minerals",
      barcode: "8906002000018",
      batchNumber: "BIS-402",
      quantityDelta: 12,
      userName: "Amansharma",
      timestamp: "Yesterday, 4:20 PM",
      details: "Supplier Shipment Restock",
    },
  ];
}

// Add or update inventory item based on Barcode + Store + Batch Number
export function addOrUpdateInventoryItem(
  storeId: string = getCurrentStoreId(),
  product: ProductInfo,
  options?: {
    batchNumber?: string;
    mfgDate?: string;
    expiryDate?: string;
    quantity?: number;
    userName?: string;
  }
): {
  record: InventoryRecord;
  isDuplicate: boolean;
  previousQuantity: number;
  newQuantity: number;
} {
  const current = getStoreInventory(storeId);
  const barcode = (product.barcode || "").trim();
  const batchNumber = (options?.batchNumber || product.batchNumber || "BATCH-" + new Date().getFullYear()).trim();
  const quantityToAdd = options?.quantity && options.quantity > 0 ? options.quantity : 1;
  const userName = options?.userName || "Retailer Store Owner";

  const mfgDate = options?.mfgDate || product.mfgDate || "Not Available";
  const expiryDate = options?.expiryDate || product.expiryDate || "Not Available";
  const { daysRemaining, expiryStatus } = calculateExpiry(expiryDate);

  // Check exact duplicate: (Barcode + Store + Batch Number)
  const existingIndex = current.findIndex(
    (item) => item.barcode === barcode && item.batchNumber.toLowerCase() === batchNumber.toLowerCase()
  );

  if (existingIndex >= 0) {
    // DUPLICATE MATCH: Increment quantity
    const existing = current[existingIndex];
    const prevQty = existing.stockQuantity;
    const nextQty = prevQty + quantityToAdd;

    const updatedRecord: InventoryRecord = {
      ...existing,
      stockQuantity: nextQty,
      daysRemaining,
      expiryStatus,
      lastScanned: "Just now",
      lastUpdated: new Date().toISOString(),
    };

    current[existingIndex] = updatedRecord;
    saveStoreInventory(current, storeId);

    logInventoryActivity({
      storeId,
      type: "STOCK_ADDED",
      productName: updatedRecord.productName,
      barcode: updatedRecord.barcode,
      batchNumber: updatedRecord.batchNumber,
      quantityDelta: quantityToAdd,
      userName,
      details: `Quantity updated: ${prevQty} → ${nextQty}`,
    });

    return {
      record: updatedRecord,
      isDuplicate: true,
      previousQuantity: prevQty,
      newQuantity: nextQty,
    };
  } else {
    // NEW BATCH OR NEW PRODUCT: Create distinct record
    const newRecord: InventoryRecord = {
      id: "inv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      storeId,
      barcode: barcode || "PHOTO-SCAN-" + Date.now().toString().slice(-5),
      productName: product.name,
      brand: product.brand || "Not Available",
      category: product.category || "General Grocery",
      sku: `${(product.brand || "SKU").slice(0, 3).toUpperCase()}-${barcode.slice(-4) || "001"}`,
      batchNumber,
      mfgDate,
      expiryDate,
      daysRemaining,
      expiryStatus,
      mrp: product.mrp || null,
      sellingPrice: product.mrp || null,
      netQuantity: product.netWeight || "Standard pack",
      stockQuantity: quantityToAdd,
      reorderLevel: 10,
      fssaiNumber: product.fssaiLicNo || (product.fssaiStatus?.match(/\d{14}/)?.[0] ?? null),
      supplier: product.origin || "Authorised Distributor",
      imageUrl: product.imageUrl || null,
      lastScanned: "Just now",
      lastUpdated: new Date().toISOString(),
    };

    const updated = [newRecord, ...current];
    saveStoreInventory(updated, storeId);

    logInventoryActivity({
      storeId,
      type: "NEW_BATCH_REGISTERED",
      productName: newRecord.productName,
      barcode: newRecord.barcode,
      batchNumber: newRecord.batchNumber,
      quantityDelta: quantityToAdd,
      userName,
      details: `New batch registered with ${quantityToAdd} units`,
    });

    return {
      record: newRecord,
      isDuplicate: false,
      previousQuantity: 0,
      newQuantity: quantityToAdd,
    };
  }
}

// Adjust quantity on existing record (+/-)
export function adjustItemStock(
  storeId: string = getCurrentStoreId(),
  id: string,
  delta: number,
  userName: string = "Retailer"
): InventoryRecord | null {
  const current = getStoreInventory(storeId);
  const idx = current.findIndex((item) => item.id === id);
  if (idx < 0) return null;

  const item = current[idx];
  const newQty = Math.max(0, item.stockQuantity + delta);
  const updated: InventoryRecord = {
    ...item,
    stockQuantity: newQty,
    lastUpdated: new Date().toISOString(),
  };

  current[idx] = updated;
  saveStoreInventory(current, storeId);

  logInventoryActivity({
    storeId,
    type: delta > 0 ? "STOCK_ADDED" : "STOCK_REDUCED",
    productName: item.productName,
    barcode: item.barcode,
    batchNumber: item.batchNumber,
    quantityDelta: delta,
    userName,
    details: `Stock manually adjusted from ${item.stockQuantity} to ${newQty}`,
  });

  return updated;
}

// Apply quick discount to an inventory record (e.g. 20% clearance)
export function applyClearanceDiscountToItem(
  storeId: string = getCurrentStoreId(),
  id: string,
  discountPercentage: number
): InventoryRecord | null {
  const current = getStoreInventory(storeId);
  const idx = current.findIndex((item) => item.id === id);
  if (idx < 0) return null;

  const item = current[idx];
  const originalMrp = item.mrp || 40;
  const discountedPrice = Math.round(originalMrp * (1 - discountPercentage / 100));

  const updated: InventoryRecord = {
    ...item,
    sellingPrice: discountedPrice,
    lastUpdated: new Date().toISOString(),
  };

  current[idx] = updated;
  saveStoreInventory(current, storeId);

  logInventoryActivity({
    storeId,
    type: "DISCOUNT_APPLIED",
    productName: item.productName,
    barcode: item.barcode,
    batchNumber: item.batchNumber,
    quantityDelta: 0,
    userName: "Retailer Owner",
    details: `Clearance discount of ${discountPercentage}% applied (₹${originalMrp} → ₹${discountedPrice})`,
  });

  return updated;
}

// Real Excel Export using xlsx library
export function exportInventoryToExcel(
  records: InventoryRecord[],
  options?: {
    filter?: "all" | "SAFE" | "EXPIRING SOON" | "EXPIRED";
    filename?: string;
  }
): { filename: string; count: number } {
  const filterType = options?.filter || "all";
  const filtered = filterType === "all" ? records : records.filter((r) => r.expiryStatus === filterType);

  // Format columns matching exact requirements
  const rows = filtered.map((r, idx) => ({
    "S.No": idx + 1,
    "Product Name": r.productName || "Not Available",
    Brand: r.brand || "Not Available",
    Category: r.category || "Not Available",
    "Barcode / GTIN": r.barcode || "Not Available",
    SKU: r.sku || "Not Available",
    "Batch Number": r.batchNumber || "Not Available",
    "Manufacturing Date": r.mfgDate || "Not Available",
    "Expiry Date": r.expiryDate || "Not Available",
    "Days Remaining": r.daysRemaining,
    "Expiry Status": r.expiryStatus,
    "MRP (₹)": r.mrp !== null ? r.mrp : "Not Available",
    "Selling Price (₹)": r.sellingPrice !== null ? r.sellingPrice : "Not Available",
    "Net Quantity": r.netQuantity || "Not Available",
    "Stock Quantity": r.stockQuantity,
    "FSSAI Number": r.fssaiNumber || "Not Available",
    Supplier: r.supplier || "Not Available",
    "Last Scanned": r.lastScanned || "Not Available",
    "Last Updated": r.lastUpdated ? new Date(r.lastUpdated).toLocaleString() : "Not Available",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for professional readability
  worksheet["!cols"] = [
    { wch: 6 },  // S.No
    { wch: 35 }, // Product Name
    { wch: 18 }, // Brand
    { wch: 22 }, // Category
    { wch: 16 }, // Barcode
    { wch: 14 }, // SKU
    { wch: 14 }, // Batch Number
    { wch: 16 }, // Mfg Date
    { wch: 16 }, // Expiry Date
    { wch: 14 }, // Days Remaining
    { wch: 16 }, // Expiry Status
    { wch: 10 }, // MRP
    { wch: 14 }, // Selling Price
    { wch: 12 }, // Net Quantity
    { wch: 14 }, // Stock Quantity
    { wch: 18 }, // FSSAI
    { wch: 30 }, // Supplier
    { wch: 18 }, // Last Scanned
    { wch: 22 }, // Last Updated
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Store Inventory");

  const todayStr = new Date().toISOString().slice(0, 10);
  const finalFilename = options?.filename || `VERIGRO_Inventory_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, finalFilename);

  return { filename: finalFilename, count: filtered.length };
}

// Real Excel / CSV Import with validation
export async function importInventoryFromExcel(
  file: File,
  storeId: string = getCurrentStoreId()
): Promise<{
  imported: number;
  updated: number;
  newItems: number;
  errors: number;
  details: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        let updatedCount = 0;
        let newCount = 0;
        let errorCount = 0;
        const details: string[] = [];

        for (const row of rawJson) {
          // Flexible key mapping
          const barcode = String(row["Barcode / GTIN"] || row["Barcode"] || row["barcode"] || row["GTIN"] || "").trim();
          const name = String(row["Product Name"] || row["Product"] || row["name"] || row["Title"] || "").trim();

          if (!name && !barcode) {
            errorCount++;
            continue;
          }

          const batchNumber = String(row["Batch Number"] || row["Batch"] || row["batch"] || "BATCH-IMPORT").trim();
          const mrp = Number(row["MRP (₹)"] || row["MRP"] || row["mrp"] || 0) || null;
          const quantity = Number(row["Stock Quantity"] || row["Quantity"] || row["stock"] || row["Qty"] || 1) || 1;
          const expiryDate = String(row["Expiry Date"] || row["Expiry"] || row["expiry"] || "Not Available").trim();
          const mfgDate = String(row["Manufacturing Date"] || row["Mfg Date"] || row["mfg"] || "Not Available").trim();
          const brand = String(row["Brand"] || row["brand"] || "Imported Brand").trim();
          const category = String(row["Category"] || row["category"] || "General Packaged Commodity").trim();
          const fssai = String(row["FSSAI Number"] || row["FSSAI"] || "").trim() || null;

          const productInfo: ProductInfo = {
            name: name || `Product ${barcode}`,
            brand,
            category,
            barcode: barcode || "IMP-" + Date.now().toString().slice(-6),
            batchNumber,
            mrp,
            mfgDate,
            expiryDate,
            stockQuantity: quantity,
            fssaiLicNo: fssai,
            source: "catalog",
          };

          const result = addOrUpdateInventoryItem(storeId, productInfo, {
            batchNumber,
            mfgDate,
            expiryDate,
            quantity,
            userName: "Excel Import",
          });

          importedCount++;
          if (result.isDuplicate) {
            updatedCount++;
          } else {
            newCount++;
          }
        }

        details.push(`Successfully imported ${importedCount} items (${newCount} new, ${updatedCount} updated, ${errorCount} errors).`);
        resolve({
          imported: importedCount,
          updated: updatedCount,
          newItems: newCount,
          errors: errorCount,
          details,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
