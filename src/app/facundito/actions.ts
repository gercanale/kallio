"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { ADMIN_EMAILS } from "@/lib/admin-config";

async function assertAdmin() {
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
}

export async function banUserAction(id: string, banned: boolean) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, {
    ban_duration: banned ? "876600h" : "none",
  });
}

export async function deleteUserAction(id: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(id);
}
