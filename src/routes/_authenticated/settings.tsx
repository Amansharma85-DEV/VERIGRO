import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Lock,
  Save,
  Shield,
  Store,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [{ title: "Account & Store Settings — VERIGRO" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [profile, setProfile] = useState({
    name: "Amansharma",
    email: "retailer.aman@verigro.in",
    role: "retailer",
    storeName: "Sharma Supermarket & Daily Needs",
    fssaiRegistrationNumber: "10012011000168",
    phone: "+91 98765 43210",
    city: "New Delhi, Delhi",
    autoFlash: false,
    soundOnScan: true,
    batchAlertDays: "30",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("verigro_demo_user") || localStorage.getItem("nirikshan_demo_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) {
            setProfile((prev) => ({
              ...prev,
              name: parsed.name || prev.name,
              email: parsed.email || prev.email,
              role: parsed.role || prev.role,
              storeName: parsed.storeName || prev.storeName,
            }));
          }
        } catch {}
      }
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "verigro_demo_user",
        JSON.stringify({
          id: "local-user",
          name: profile.name,
          email: profile.email,
          role: profile.role,
          storeName: profile.storeName,
        })
      );
    }
    toast.success("Settings updated successfully!");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            System Preferences
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">Retailer & Personal Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight mt-1">
          Account & Store Settings
        </h1>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold font-display text-slate-900">User Profile</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Display Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Contact Phone Number</Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Account Mode</Label>
              <select
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs sm:text-sm text-slate-800"
              >
                <option value="retailer">Grocery Retailer / Store Owner</option>
                <option value="consumer">Consumer (Personal Shopper)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Store Information Card */}
        {profile.role === "retailer" && (
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold font-display text-slate-900">Grocery Store Details</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Store / Enterprise Name</Label>
                <Input
                  value={profile.storeName}
                  onChange={(e) => setProfile({ ...profile, storeName: e.target.value })}
                  className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Store FSSAI Registration No.</Label>
                <Input
                  value={profile.fssaiRegistrationNumber}
                  onChange={(e) => setProfile({ ...profile, fssaiRegistrationNumber: e.target.value })}
                  className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Store City & Location</Label>
                <Input
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="bg-white border-slate-200 rounded-lg text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Scanner Preferences */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Camera className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold font-display text-slate-900">Scanner & Alert Preferences</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-slate-900 block">Sound on Successful Barcode Match</strong>
                <span className="text-slate-500">Play pleasant confirmation beep upon barcode detection</span>
              </div>
              <input
                type="checkbox"
                checked={profile.soundOnScan}
                onChange={(e) => setProfile({ ...profile, soundOnScan: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 border-slate-300"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <strong className="text-slate-900 block">Batch Expiry Warning Threshold</strong>
                <span className="text-slate-500">Alert store when products have fewer than X days left</span>
              </div>
              <select
                value={profile.batchAlertDays}
                onChange={(e) => setProfile({ ...profile, batchAlertDays: e.target.value })}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="15">15 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
                <option value="90">90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            type="submit"
            className="bg-[#146EF5] hover:bg-[#1059c4] text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
