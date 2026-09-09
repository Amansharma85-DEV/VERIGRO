import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nirikshan_demo_user");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.email || parsed.name)) {
            return { user: { id: parsed.id || "local-user", email: parsed.email || parsed.name, name: parsed.name } };
          }
        } catch {
          // ignore error
        }
      }
    }
    const { data, error } = await supabase.auth.getUser().catch(() => ({ data: { user: null }, error: new Error("Network error") }));
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
