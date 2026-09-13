import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  Clock,
  History,
  Home,
  Layers,
  LogOut,
  Menu,
  Package,
  Play,
  ScanLine,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { VerigroLogo } from "@/components/VerigroLogo";
import { Button } from "@/components/ui/button";
import { getCurrentStoreId, getStoreInventory } from "@/lib/inventory";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getSession } from "@/lib/auth-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const session = getSession();
      if (session?.user) {
        return { user: session.user };
      }
    }
    const { data, error } = await supabase.auth
      .getUser()
      .catch(() => ({ data: { user: null }, error: new Error("Network error") }));
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    role: string;
    storeName?: string;
  }>({
    name: "Amansharma",
    email: "retailer.aman@verigro.in",
    role: "retailer",
    storeName: "Sharma Supermarket & Daily Needs",
  });

  useEffect(() => {
    function syncUser() {
      const session = getSession();
      if (session?.user) {
        setUserInfo({
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          storeName: session.user.storeName,
        });
      }
    }
    syncUser();

    window.addEventListener("verigro_auth_changed", syncUser);
    return () => window.removeEventListener("verigro_auth_changed", syncUser);
  }, []);

  async function handleSignOut() {
    clearSession();
    await supabase.auth.signOut().catch(() => {});
    toast.success("Signed out successfully.");
    navigate({ to: "/login", replace: true });
  }

  const [expiringAlerts, setExpiringAlerts] = useState<number>(0);

  useEffect(() => {
    function updateAlerts() {
      try {
        const inv = getStoreInventory(getCurrentStoreId());
        const count = inv.filter((i) => i.expiryStatus === "EXPIRING SOON" || i.expiryStatus === "EXPIRED").length;
        setExpiringAlerts(count);
      } catch {}
    }
    updateAlerts();
    window.addEventListener("verigro_inventory_updated", updateAlerts);
    return () => window.removeEventListener("verigro_inventory_updated", updateAlerts);
  }, []);

  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  type BottomNavItem = {
    label: string;
    to?: string;
    icon: React.ComponentType<{ className?: string }>;
    isPrimary?: boolean;
    onClick?: () => void;
  };

  const retailerBottomNav: BottomNavItem[] = [
    { label: "Home", to: "/dashboard", icon: Home },
    { label: "Products", to: "/products", icon: Package },
    { label: "Scan", to: "/scan", icon: ScanLine, isPrimary: true },
    { label: "Inventory", to: "/inventory", icon: Layers },
    { label: "More", onClick: () => setMoreDrawerOpen(true), icon: Menu },
  ];

  const consumerBottomNav: BottomNavItem[] = [
    { label: "Home", to: "/dashboard", icon: Home },
    { label: "Scan", to: "/scan", icon: ScanLine, isPrimary: true },
    { label: "My Scans", to: "/scans", icon: History },
    { label: "Saved", to: "/scans", icon: Sparkles },
    { label: "Profile", to: "/settings", icon: User },
  ];

  const activeBottomNav: BottomNavItem[] = userInfo.role === "retailer" ? retailerBottomNav : consumerBottomNav;

  type NavItem = {
    label: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    highlight?: boolean;
    badge?: string;
    badgeColor?: string;
  };

  const retailerNavItems: NavItem[] = [
    { label: "Home", to: "/dashboard", icon: Home },
    { label: "Scan Product", to: "/scan", icon: ScanLine, highlight: true },
    { label: "Products", to: "/products", icon: Package },
    { label: "Inventory", to: "/inventory", icon: Layers },
    {
      label: "Expiry Management",
      to: "/expiry",
      icon: Clock,
      badge: expiringAlerts > 0 ? `${expiringAlerts} Alerts` : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
    { label: "My Scans", to: "/scans", icon: History },
    { label: "Settings", to: "/settings", icon: Settings },
  ];

  const consumerNavItems: NavItem[] = [
    { label: "Home", to: "/dashboard", icon: Home },
    { label: "Scan Product", to: "/scan", icon: ScanLine, highlight: true },
    { label: "My Scans", to: "/scans", icon: History },
    { label: "Saved Products", to: "/scans", icon: Sparkles },
    { label: "Settings", to: "/settings", icon: Settings },
  ];

  const navItems: NavItem[] = userInfo.role === "retailer" ? retailerNavItems : consumerNavItems;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col antialiased overflow-x-hidden">
      <div className="flex flex-1 min-h-screen">
        {/* Left Sidebar for Desktop (>= 1024px) */}
        <aside className="hidden lg:flex w-64 flex-col justify-between bg-white border-r border-slate-200 sticky top-0 h-screen z-30">
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Logo */}
            <div className="p-5 border-b border-slate-100">
              <VerigroLogo variant="default" size="md" to="/dashboard" />
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-bold border border-blue-100 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Upgrade Card */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Upgrade to Pro</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Get unlimited scans, batch alerts & full store inventory management.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Retailer Pro Plan is active for your account!")}
                className="w-full py-1.5 px-3 bg-[#146EF5] hover:bg-[#1059c4] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                Upgrade Now
              </button>
            </div>

            {/* User row and quick sign out */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {userInfo.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{userInfo.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {userInfo.role === "retailer" ? "Retailer Plan" : "Consumer Plan"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Bar: Responsive Desktop & Compact Mobile */}
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-3">
            {/* Mobile Header Left: Brand Logo */}
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <VerigroLogo variant="default" size="sm" to="/dashboard" />
              </div>

              {/* Desktop Global Search (Hidden on small screens to keep compact header) */}
              <div className="hidden lg:block relative w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && globalSearch.trim()) {
                      navigate({ to: "/scan", search: { q: globalSearch.trim() } as any });
                    }
                  }}
                  placeholder="Search products, barcodes, batches..."
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Desktop Video Guide */}
              <button
                type="button"
                onClick={() => setShowVideoModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-blue-600 text-blue-600" />
                <span>Video Guide</span>
              </button>

              {/* Notification Bell */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <DropdownMenuLabel className="text-xs font-bold text-slate-900 flex justify-between items-center px-2 py-1.5">
                    <span>Notifications & Alerts</span>
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                      {expiringAlerts > 0 ? `${expiringAlerts} Urgent` : "3 New"}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="space-y-1">
                    <Link
                      to="/expiry"
                      className="block p-2 rounded-xl bg-amber-50/70 border border-amber-200 text-xs hover:bg-amber-100/70 transition-colors"
                    >
                      <div className="font-bold text-amber-900">Amul Taaza Milk (500ml)</div>
                      <div className="text-slate-600 text-[11px]">Batch A-991 expires in 14 days. Tap to discount.</div>
                    </Link>
                    <Link
                      to="/scan"
                      search={{ code: "8901764061103" }}
                      className="block p-2 rounded-xl bg-blue-50/70 border border-blue-200 text-xs hover:bg-blue-100/70 transition-colors"
                    >
                      <div className="font-bold text-blue-900">Diet Coke Can (300ml)</div>
                      <div className="text-slate-600 text-[11px]">Batch CCLO724 verified safe (290 days left).</div>
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Profile Avatar & Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition-all focus:outline-none min-h-[44px]">
                  <div className="w-8 h-8 rounded-full bg-[#146EF5] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    {userInfo.name.charAt(0)}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-900 leading-tight">{userInfo.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {userInfo.role === "retailer" ? "Retailer Plan" : "Consumer Plan"}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
                  <DropdownMenuLabel className="px-3 py-2">
                    <div className="text-xs font-bold text-slate-900">{userInfo.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{userInfo.email}</div>
                    {userInfo.storeName && (
                      <div className="text-[10px] text-blue-600 font-medium mt-0.5 truncate">{userInfo.storeName}</div>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => navigate({ to: "/settings" })}
                    className="text-xs font-medium text-slate-700 cursor-pointer rounded-lg hover:bg-slate-50"
                  >
                    <Settings className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const newRole = userInfo.role === "retailer" ? "consumer" : "retailer";
                      const updated = { ...userInfo, role: newRole };
                      setUserInfo(updated);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("verigro_demo_user", JSON.stringify(updated));
                      }
                      toast.success(`Switched to ${newRole === "retailer" ? "Retailer" : "Consumer"} Mode`);
                    }}
                    className="text-xs font-medium text-slate-700 cursor-pointer rounded-lg hover:bg-slate-50"
                  >
                    <Store className="w-3.5 h-3.5 mr-2 text-slate-400" />
                    Switch to {userInfo.role === "retailer" ? "Consumer" : "Retailer"} Mode
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-xs font-medium text-red-600 cursor-pointer rounded-lg hover:bg-red-50"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2 text-red-600" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Child Page Content with generous bottom padding for Mobile Navigation */}
          <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: MOBILE BOTTOM NAVIGATION BAR (FIXED ON PHONES & TABLETS)      */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around pb-safe">
        {activeBottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = item.to ? location.pathname === item.to : false;

          // Prominent Elevated Center Scan Button
          if (item.isPrimary) {
            return (
              <Link
                key={item.label}
                to={item.to!}
                className="flex flex-col items-center justify-center -mt-6 group focus:outline-none"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#146EF5] to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-4 border-white active:scale-95 transition-transform">
                  <ScanLine className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-extrabold text-blue-600 mt-0.5 tracking-tight">
                  {item.label}
                </span>
              </Link>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 text-slate-500 active:text-blue-600 transition-colors"
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to!}
              className={`flex flex-col items-center justify-center min-w-[54px] min-h-[44px] py-1 transition-colors ${
                isActive ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-blue-600 stroke-[2.5]" : "text-slate-500"}`} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ========================================================================= */}
      {/* SECTION 20 & 22: MOBILE "MORE" BOTTOM DRAWER MODAL                         */}
      {/* ========================================================================= */}
      <Dialog open={moreDrawerOpen} onOpenChange={setMoreDrawerOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 p-5 rounded-3xl shadow-2xl z-50">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold font-display text-slate-900 flex items-center justify-between">
              <span>More Options & Store Tools</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {userInfo.role === "retailer" ? "Retailer Suite" : "Consumer Suite"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {userInfo.role === "retailer" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/expiry"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 hover:bg-amber-100/70 text-amber-900 font-bold flex items-center gap-2.5 transition-colors"
                >
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Expiry Manager</div>
                    <div className="text-[10px] text-amber-700 font-normal">
                      {expiringAlerts > 0 ? `${expiringAlerts} alerts` : "Freshness tracking"}
                    </div>
                  </div>
                </Link>

                <Link
                  to="/analytics"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 text-blue-900 font-bold flex items-center gap-2.5 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Analytics</div>
                    <div className="text-[10px] text-blue-700 font-normal">Sales & metrics</div>
                  </div>
                </Link>

                <Link
                  to="/inventory"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                >
                  <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Inventory</div>
                    <div className="text-[10px] text-slate-500 font-normal">Stock & Excel</div>
                  </div>
                </Link>

                <Link
                  to="/products"
                  onClick={() => setMoreDrawerOpen(false)}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2.5 transition-colors"
                >
                  <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="text-left">
                    <div className="font-bold">Catalog</div>
                    <div className="text-[10px] text-slate-500 font-normal">Products & OCR</div>
                  </div>
                </Link>
              </div>
            )}

            <div className="space-y-1 pt-1 border-t border-slate-100 text-xs">
              <Link
                to="/scans"
                onClick={() => setMoreDrawerOpen(false)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
              >
                <History className="w-4 h-4 text-slate-400" />
                <span>My Scanned History</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setMoreDrawerOpen(false);
                  setShowVideoModal(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-left"
              >
                <Play className="w-4 h-4 fill-blue-600 text-blue-600" />
                <span>Watch Video Guide & Tutorial</span>
              </button>

              <Link
                to="/settings"
                onClick={() => setMoreDrawerOpen(false)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-medium"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Store Information & Settings</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  const newRole = userInfo.role === "retailer" ? "consumer" : "retailer";
                  const updated = { ...userInfo, role: newRole };
                  setUserInfo(updated);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("verigro_demo_user", JSON.stringify(updated));
                  }
                  setMoreDrawerOpen(false);
                  toast.success(`Switched to ${newRole === "retailer" ? "Retailer" : "Consumer"} Mode`);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-700 hover:bg-slate-50 font-medium text-left"
              >
                <Store className="w-4 h-4 text-slate-400" />
                <span>Switch to {userInfo.role === "retailer" ? "Consumer" : "Retailer"} Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMoreDrawerOpen(false);
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-red-600 hover:bg-red-50 font-medium text-left"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Guide Modal */}
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold font-display text-slate-900">
              <Play className="w-5 h-5 text-blue-600 fill-blue-600" />
              <span>VERIGRO Scanner & Inventory Video Guide</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="aspect-video w-full rounded-xl bg-slate-950 flex items-center justify-center relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000&auto=format&fit=crop&q=80"
                alt="Video thumbnail"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-600/90 flex items-center justify-center text-white mb-2 shadow-lg">
                  <Play className="w-6 h-6 fill-white ml-0.5" />
                </div>
                <h4 className="font-bold text-sm">How to Scan & Audit Grocery Products</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  Point your camera at any EAN-13 barcode or upload packaging images to test ingredients, FSSAI licenses, and batch expiry.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowVideoModal(false)} className="text-xs font-semibold">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
