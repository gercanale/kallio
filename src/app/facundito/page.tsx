import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";
import { UsersClient } from "./UsersClient";
import type { AdminUser } from "./UsersClient";

export default async function FacunditoPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !ADMIN_EMAILS.includes(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, name"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p: { id: string; name: string }) => [p.id, p.name]));

  const users: AdminUser[] = (authData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    name: profileMap.get(u.id) ?? "",
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
    banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
  }));

  return <UsersClient initialUsers={users} />;
}
