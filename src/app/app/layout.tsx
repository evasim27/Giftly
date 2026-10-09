import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  return <AppShell displayName={profile?.display_name || user.email?.split("@")[0] || "Friend"} email={user.email || ""}>{children}</AppShell>;
}
