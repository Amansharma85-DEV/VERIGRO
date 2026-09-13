import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Store,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VerigroLogo } from "@/components/VerigroLogo";
import {
  getSession,
  isSupabaseConfigured,
  loginUser,
  registerUser,
  resetPasswordUser,
} from "@/lib/auth-service";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Register — VERIGRO | Verify · Manage · Shop" },
      {
        name: "description",
        content:
          "VERIGRO — Intelligent grocery product verification and store inventory management platform for Indian consumers and retail stores.",
      },
      { property: "og:title", content: "Login to VERIGRO" },
      {
        property: "og:description",
        content:
          "Verify products, inspect ingredients, track batch expiry, and manage inventory with VERIGRO.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { mode?: "login" | "signup"; role?: "consumer" | "retailer" } => ({
    mode: search["mode"] === "signup" ? "signup" : "login",
    role: search["role"] === "consumer" ? "consumer" : "retailer",
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"login" | "signup">(search.mode ?? "login");
  const [role, setRole] = useState<"retailer" | "consumer">(search.role ?? "retailer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Form input state
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    storeName: "",
    email: "",
    password: "",
  });

  // Inline and form error states
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    firstName?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // If session already exists, redirect immediately to dashboard
  useEffect(() => {
    const session = getSession();
    if (session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    // Clear inline error on type
    if (fieldErrors[key as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
    if (formError) setFormError(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Prevent double submit

    const newFieldErrors: typeof fieldErrors = {};
    const email = form.email.trim();
    const password = form.password;

    // 1. Email validation
    if (!email) {
      newFieldErrors.email = "Email is required.";
    } else if (!email.includes("@") || !email.includes(".")) {
      newFieldErrors.email = "Please enter a valid email address.";
    }

    // 2. Password validation
    if (!password) {
      newFieldErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newFieldErrors.password = "Password must be at least 6 characters long.";
    }

    // 3. Signup name validation
    if (tab === "signup" && !form.firstName.trim()) {
      newFieldErrors.firstName = "First name is required.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoading(true);
    setFormError(null);

    try {
      if (tab === "login") {
        const res = await loginUser(email, password, role);
        if (!res.success) {
          setFormError(res.error || "Invalid email or password.");
          setLoading(false);
          return;
        }

        toast.success(`Welcome back, ${res.user?.name || "User"}!`);
        navigate({ to: "/dashboard", replace: true });
      } else {
        const res = await registerUser({
          email,
          password,
          firstName: form.firstName,
          lastName: form.lastName,
          role,
          storeName: form.storeName,
        });

        if (!res.success) {
          setFormError(res.error || "Unable to register account.");
          setLoading(false);
          return;
        }

        toast.success(`Account registered successfully! Welcome to VERIGRO.`);
        navigate({ to: "/dashboard", replace: true });
      }
    } catch {
      setFormError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading) return;
    if (isSupabaseConfigured()) {
      setLoading(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) {
          toast.error("Google authentication failed. Please sign in with email/password.");
        }
      } catch {
        toast.error("Unable to connect to Google authentication service.");
      } finally {
        setLoading(false);
      }
    } else {
      // Honestly inform the user that Google Auth requires OAuth configuration in Supabase
      toast.info(
        "Google Authentication requires OAuth client ID configuration in Supabase. Please login with email/password or use the 1-Click Demo Accounts below."
      );
    }
  }

  async function handleDemoQuickLogin(demoRole: "retailer" | "consumer") {
    if (loading) return;
    setLoading(true);
    setFormError(null);

    const email = demoRole === "retailer" ? "retailer.aman@verigro.in" : "consumer.priya@verigro.in";
    const res = await loginUser(email, "verigro123", demoRole);

    setLoading(false);
    if (res.success) {
      toast.success(
        `Signed in as ${demoRole === "retailer" ? "Retailer (Aman Sharma)" : "Consumer (Priya Sharma)"}`
      );
      navigate({ to: "/dashboard", replace: true });
    } else {
      setFormError(res.error || "Demo login failed.");
    }
  }

  async function handleExecutePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    if (forgotLoading) return;

    if (!forgotEmail.trim()) {
      setForgotError("Email is required.");
      return;
    }
    if (!forgotEmail.includes("@") || !forgotEmail.includes(".")) {
      setForgotError("Please enter a valid email address.");
      return;
    }
    if (forgotNewPassword && forgotNewPassword.length < 6) {
      setForgotError("New password must be at least 6 characters long.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const res = await resetPasswordUser(forgotEmail.trim(), forgotNewPassword || undefined);
      if (!res.success) {
        setForgotError(res.error || "Unable to reset password.");
      } else {
        setForgotSuccess(res.message || "Password updated successfully. You can now login.");
        if (forgotNewPassword) {
          setForm((prev) => ({ ...prev, email: forgotEmail.trim(), password: forgotNewPassword }));
        }
      }
    } catch {
      setForgotError("Unable to connect. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-white text-slate-900">
      {/* Left Column: Dark Navy SaaS Showcase Panel (Desktop Only >= lg) */}
      <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#0B132B] text-white p-8 sm:p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,110,245,0.18)_0%,transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)] pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <VerigroLogo variant="white" size="lg" to="/" />
        </div>

        {/* Middle: Value Prop & Live Product Cards */}
        <div className="relative z-10 my-10 max-w-xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            AI-Powered Food Safety & Store Inventory Platform
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight font-display">
            Verify Products. <br />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              Manage Stores. Shop Smarter.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            VERIGRO is India’s intelligent grocery verification engine. Scan barcodes or packaging to instantly verify FSSAI licenses, detect harmful additives, calculate health scores, and track store inventory batches.
          </p>

          <div className="space-y-3 pt-2">
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">Diet Coke Can (300ml)</h3>
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      SAFE · 290d
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Batch CCLO724 · FSSAI Lic. #10012011000168 Active
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-300">Grade B</span>
                <div className="text-[10px] text-emerald-400 font-medium">Verified</div>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">Amul Taaza Milk (500ml)</h3>
                    <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      EXPIRING IN 14d
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    Store Batch A-991 · Stock: 24 units · Auto-discount scheduled
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-amber-400">Restock Soon</span>
                <div className="text-[10px] text-slate-400 font-medium">Inventory</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Feature Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>FSSAI & Legal Metrology Aligned</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>50,000+ Barcode Database</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span>Instant Barcode & OCR Scanner</span>
          </div>
        </div>
      </div>

      {/* Right Column: Clean White Authentication Form */}
      <div className="lg:col-span-6 xl:col-span-5 flex items-center justify-center p-5 sm:p-10 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-Only Top Brand Header */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-100">
            <VerigroLogo variant="default" size="md" to="/" />
            <Link
              to="/"
              className="text-xs font-bold text-slate-500 hover:text-slate-900 py-1.5 px-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ← Home
            </Link>
          </div>

          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 tracking-tight">
                {tab === "login" ? "Welcome Back" : "Create Your Account"}
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {role === "retailer" ? "Retailer Mode" : "Consumer Mode"}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {tab === "login"
                ? "Login to your account to continue"
                : "Join thousands of stores and families verifying daily groceries"}
            </p>
          </div>

          {/* Role Switcher */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Select Account Type
            </Label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setRole("retailer")}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation ${
                  role === "retailer"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Grocery Retailer</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("consumer")}
                className={`min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all touch-manipulation ${
                  role === "consumer"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Consumer</span>
              </button>
            </div>
          </div>

          {/* Form Level Error Message (Section 3, 9, 25) */}
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* Login / Sign Up Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-200 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setFormError(null);
                setFieldErrors({});
              }}
              className={`pb-3 border-b-2 min-h-[44px] transition-colors ${
                tab === "login"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setFormError(null);
                setFieldErrors({});
              }}
              className={`pb-3 border-b-2 min-h-[44px] transition-colors ${
                tab === "signup"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Continue with Google (Section 18, 20) */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full min-h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 touch-manipulation"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-xs uppercase font-medium text-slate-400 absolute">
              OR
            </span>
          </div>

          {/* Login / Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {tab === "signup" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={setField("firstName")}
                      maxLength={60}
                      placeholder="Aman"
                      className="bg-white border-slate-200 focus:border-blue-500 rounded-lg text-sm h-11"
                    />
                    {fieldErrors.firstName && (
                      <p className="text-xs text-red-600 font-medium">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={setField("lastName")}
                      maxLength={60}
                      placeholder="Sharma"
                      className="bg-white border-slate-200 focus:border-blue-500 rounded-lg text-sm h-11"
                    />
                  </div>
                </div>

                {role === "retailer" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="storeName" className="text-xs font-semibold text-slate-700">
                      Store / Enterprise Name
                    </Label>
                    <Input
                      id="storeName"
                      value={form.storeName}
                      onChange={setField("storeName")}
                      maxLength={80}
                      placeholder="Sharma Supermarket & Daily Needs"
                      className="bg-white border-slate-200 focus:border-blue-500 rounded-lg text-sm h-11"
                    />
                  </div>
                )}
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={setField("email")}
                  placeholder={role === "retailer" ? "store@retailer.com" : "you@example.com"}
                  className={`pl-10 bg-white rounded-lg text-sm h-11 ${
                    fieldErrors.email ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                {tab === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(form.email || "");
                      setForgotNewPassword("");
                      setForgotError(null);
                      setForgotSuccess(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                  value={form.password}
                  onChange={setField("password")}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 bg-white rounded-lg text-sm h-11 ${
                    fieldErrors.password ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-red-600 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Me */}
            {tab === "login" && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-600 select-none cursor-pointer">
                  Keep me signed in on this device
                </label>
              </div>
            )}

            {/* Primary Submit Button (Section 8, 20, 24) */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] bg-[#146EF5] hover:bg-[#105ac9] text-white font-semibold py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 touch-manipulation text-sm"
            >
              {loading ? (
                <span>{tab === "login" ? "Logging in..." : "Creating account..."}</span>
              ) : (
                <>
                  <span>{tab === "login" ? "Login" : "Sign Up"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle between Login and Signup text */}
          <div className="text-center text-xs text-slate-600">
            {tab === "login" ? (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTab("signup");
                    setFormError(null);
                    setFieldErrors({});
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTab("login");
                    setFormError(null);
                    setFieldErrors({});
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Login
                </button>
              </span>
            )}
          </div>

          {/* 1-Click Verified Demo Access Accounts */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Instant Verified Demo Accounts
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                1-Click Login
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoQuickLogin("retailer")}
                disabled={loading}
                className="min-h-[44px] py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-600 active:bg-slate-100 transition-all flex items-center justify-center gap-1.5 touch-manipulation shadow-2xs"
              >
                <Store className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-left">
                  <div className="leading-tight font-bold">Retailer Demo</div>
                  <div className="text-[10px] text-slate-400 font-normal">Aman Sharma</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoQuickLogin("consumer")}
                disabled={loading}
                className="min-h-[44px] py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 hover:border-blue-500 hover:text-blue-600 active:bg-slate-100 transition-all flex items-center justify-center gap-1.5 touch-manipulation shadow-2xs"
              >
                <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <div className="leading-tight font-bold">Consumer Demo</div>
                  <div className="text-[10px] text-slate-400 font-normal">Priya Sharma</div>
                </div>
              </button>
            </div>
          </div>

          {/* Footer Terms */}
          <p className="text-center text-xs text-slate-400">
            By signing in, you agree to VERIGRO's{" "}
            <a href="#terms" className="underline hover:text-slate-600">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#privacy" className="underline hover:text-slate-600">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Forgot Password Modal Dialog (Section 17) */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold font-display text-slate-900">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <span>Reset Your Password</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleExecutePasswordReset} noValidate className="space-y-3.5 pt-2">
            <p className="text-xs text-slate-600">
              Enter your registered email address to verify your account and set a new password.
            </p>

            {forgotError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Account Email Address</Label>
              <Input
                type="email"
                value={forgotEmail}
                onChange={(e) => {
                  setForgotEmail(e.target.value);
                  if (forgotError) setForgotError(null);
                }}
                placeholder="you@example.com"
                required
                className="bg-white border-slate-200 focus:border-blue-500 rounded-lg text-sm h-11"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">New Password</Label>
              <Input
                type="password"
                value={forgotNewPassword}
                onChange={(e) => {
                  setForgotNewPassword(e.target.value);
                  if (forgotError) setForgotError(null);
                }}
                placeholder="Enter at least 6 characters"
                className="bg-white border-slate-200 focus:border-blue-500 rounded-lg text-sm h-11"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowForgotModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={forgotLoading}
                size="sm"
                className="bg-[#146EF5] hover:bg-[#105ac9] text-white font-bold"
              >
                {forgotLoading ? "Processing..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
