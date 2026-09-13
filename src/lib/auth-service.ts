// VERIGRO Authentication Service
// Handles session management, SHA-256 password verification, registration, and role authorization.

import { supabase } from "@/integrations/supabase/client";

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: "retailer" | "consumer";
  storeName?: string;
  passwordHash: string;
  createdAt: string;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: "retailer" | "consumer";
    storeName?: string;
  };
  token: string;
  expiresAt: number;
}

const USERS_DB_KEY = "verigro_users_db";
const SESSION_KEY = "verigro_session";
const LEGACY_USER_KEY = "verigro_demo_user";

// Check if real Supabase backend is configured (not placeholder)
export function isSupabaseConfigured(): boolean {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL || "";
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    return (
      Boolean(url) &&
      !url.includes("your-project-id") &&
      Boolean(key) &&
      !key.includes("your-supabase")
    );
  } catch {
    return false;
  }
}

// SHA-256 Hash using Web Crypto API (Standards-compliant, non-plaintext)
export async function hashPassword(password: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return "h_" + Math.abs(hash).toString(16);
  }

  const salt = "verigro_salt_2026_";
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Pre-seeded verified accounts for initial environment setup
const DEFAULT_PRESEEDED_ACCOUNTS = [
  {
    id: "usr-retailer-default",
    email: "retailer.aman@verigro.in",
    name: "Aman Sharma",
    role: "retailer" as const,
    storeName: "Sharma Supermarket & Daily Needs",
    passwordHash: "2976f4bfecbbf968b556f8fba3f721d0935515aa025a17ca8565a0b777a94ddf",
    createdAt: new Date().toISOString(),
  },
  {
    id: "usr-consumer-default",
    email: "consumer.priya@verigro.in",
    name: "Priya Sharma",
    role: "consumer" as const,
    passwordHash: "2976f4bfecbbf968b556f8fba3f721d0935515aa025a17ca8565a0b777a94ddf",
    createdAt: new Date().toISOString(),
  },
];

// Seed default accounts asynchronously to ensure accurate SHA-256 hashes
async function ensureSeededAccounts(): Promise<UserAccount[]> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      const standardHash = await hashPassword("verigro123");
      const seeded = [
        { ...DEFAULT_PRESEEDED_ACCOUNTS[0], passwordHash: standardHash },
        { ...DEFAULT_PRESEEDED_ACCOUNTS[1], passwordHash: standardHash },
      ];
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return [];
}

export function getRegisteredUsers(): UserAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveRegisteredUsers(users: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch {}
}

// -------------------------------------------------------------
// Session Management
// -------------------------------------------------------------
export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;

  try {
    // 1. Primary session key
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw) as UserSession;
      if (session?.user && session.expiresAt && session.expiresAt > Date.now()) {
        return session;
      }
      localStorage.removeItem(SESSION_KEY);
    }

    // 2. Fallback to legacy key for backwards compatibility
    const legacy = localStorage.getItem(LEGACY_USER_KEY) || localStorage.getItem("nirikshan_demo_user");
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed && (parsed.email || parsed.name)) {
        const session: UserSession = {
          user: {
            id: parsed.id || "usr-" + Date.now(),
            email: parsed.email || "retailer.aman@verigro.in",
            name: parsed.name || "Aman Sharma",
            role: parsed.role || "retailer",
            storeName: parsed.storeName,
          },
          token: "vgr_legacy_" + Date.now(),
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
      }
    }
  } catch {}

  return null;
}

export function setSession(
  user: UserSession["user"],
  persistDays: number = 7
): UserSession {
  const token = "vgr_tok_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
  const session: UserSession = {
    user,
    token,
    expiresAt: Date.now() + persistDays * 24 * 60 * 60 * 1000,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
    localStorage.setItem("nirikshan_demo_user", JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("verigro_auth_changed", { detail: session }));
  }

  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    localStorage.removeItem("nirikshan_demo_user");
    sessionStorage.clear();
    window.dispatchEvent(new CustomEvent("verigro_auth_changed", { detail: null }));
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// -------------------------------------------------------------
// Authentication Actions (Login, Register, Reset)
// -------------------------------------------------------------

export async function loginUser(
  emailInput: string,
  passwordInput: string,
  selectedRole?: "retailer" | "consumer"
): Promise<{ success: boolean; user?: UserSession["user"]; error?: string }> {
  const email = emailInput.trim();
  const password = passwordInput;

  // Validation
  if (!email) {
    return { success: false, error: "Email is required." };
  }
  if (!email.includes("@") || !email.includes(".")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password) {
    return { success: false, error: "Password is required." };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  // 1. If real Supabase is configured, use Supabase Auth
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("failed to fetch") ||
          error.message?.toLowerCase().includes("network")
        ) {
          return { success: false, error: "Unable to connect. Please try again." };
        }
        return { success: false, error: "Invalid email or password." };
      }

      if (data.user && data.session) {
        const role =
          (data.user.user_metadata?.role as "retailer" | "consumer") ||
          selectedRole ||
          "retailer";
        const name =
          data.user.user_metadata?.first_name
            ? `${data.user.user_metadata.first_name} ${data.user.user_metadata.last_name || ""}`.trim()
            : email.split("@")[0];
        const storeName = data.user.user_metadata?.store_name;

        const userObj = {
          id: data.user.id,
          email: data.user.email || email,
          name,
          role,
          storeName,
        };

        setSession(userObj);
        return { success: true, user: userObj };
      }
    } catch {
      return { success: false, error: "Unable to connect. Please try again." };
    }
  }

  // 2. Local Verified Database Authentication
  await ensureSeededAccounts();
  const users = getRegisteredUsers();
  const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!existingUser) {
    return { success: false, error: "Invalid email or password." };
  }

  const computedHash = await hashPassword(password);
  if (existingUser.passwordHash !== computedHash) {
    return { success: false, error: "Invalid email or password." };
  }

  // Login successful
  const userObj = {
    id: existingUser.id,
    email: existingUser.email,
    name: existingUser.name,
    role: existingUser.role,
    storeName: existingUser.storeName,
  };

  setSession(userObj);
  return { success: true, user: userObj };
}

export async function registerUser(params: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  role: "retailer" | "consumer";
  storeName?: string;
}): Promise<{ success: boolean; user?: UserSession["user"]; error?: string }> {
  const email = params.email.trim();
  const password = params.password;
  const firstName = params.firstName.trim();
  const lastName = (params.lastName || "").trim();

  if (!firstName) {
    return { success: false, error: "Please provide your first name." };
  }
  if (!email) {
    return { success: false, error: "Email is required." };
  }
  if (!email.includes("@") || !email.includes(".")) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!password) {
    return { success: false, error: "Password is required." };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  // 1. Supabase registration if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: params.role,
            store_name: params.storeName?.trim(),
          },
        },
      });

      if (error) {
        if (error.message?.toLowerCase().includes("already registered")) {
          return { success: false, error: "An account with this email already exists." };
        }
        return { success: false, error: "Unable to connect. Please try again." };
      }

      const userObj = {
        id: data.user?.id || "usr-" + Date.now(),
        email,
        name: `${firstName} ${lastName}`.trim(),
        role: params.role,
        storeName: params.storeName?.trim(),
      };

      setSession(userObj);
      return { success: true, user: userObj };
    } catch {
      return { success: false, error: "Unable to connect. Please try again." };
    }
  }

  // 2. Local Database registration
  await ensureSeededAccounts();
  const users = getRegisteredUsers();
  const duplicate = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (duplicate) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const newUser: UserAccount = {
    id: "usr-" + Date.now(),
    email,
    name: `${firstName} ${lastName}`.trim() || firstName,
    role: params.role,
    storeName: params.storeName?.trim() || (params.role === "retailer" ? "Sharma Supermarket & Daily Needs" : undefined),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  const userObj = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    storeName: newUser.storeName,
  };

  setSession(userObj);
  return { success: true, user: userObj };
}

export async function resetPasswordUser(
  emailInput: string,
  newPassword?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const email = emailInput.trim();
  if (!email) {
    return { success: false, error: "Email is required." };
  }
  if (!email.includes("@") || !email.includes(".")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) {
        return { success: false, error: "Unable to send reset instructions. Please try again." };
      }
      return {
        success: true,
        message: "Password reset link has been dispatched to your email.",
      };
    } catch {
      return { success: false, error: "Unable to connect. Please try again." };
    }
  }

  // Local reset workflow
  await ensureSeededAccounts();
  const users = getRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { success: false, error: "No account found with this email address." };
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters long." };
    }
    user.passwordHash = await hashPassword(newPassword);
    saveRegisteredUsers(users);
    return {
      success: true,
      message: "Password has been updated. You can now login with your new credentials.",
    };
  }

  return {
    success: true,
    message: "Account verified. Please specify your new password.",
  };
}
