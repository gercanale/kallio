import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, verifyAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  if (!(await verifyAdmin(req.headers.get("authorization")))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [{ data: authData }, { data: profiles }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, name"),
  ]);

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
}
