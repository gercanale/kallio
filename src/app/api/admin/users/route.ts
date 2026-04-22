import { NextResponse } from "next/server";
import { createAdminClient, verifyAdminFromCookies } from "@/lib/supabase-admin";

export async function GET() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not configured" }, { status: 503 });
  }

  try {
    if (!(await verifyAdminFromCookies())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const admin = createAdminClient();

    const [{ data: authData, error: authError }, { data: profiles }] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from("profiles").select("id, name"),
    ]);

    if (authError) {
      console.error("listUsers error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

    const users = (authData?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: profileMap.get(u.id) ?? "",
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      banned: u.banned_until ? new Date(u.banned_until) > new Date() : false,
    }));

    return NextResponse.json(users);
  } catch (e) {
    console.error("admin/users error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
