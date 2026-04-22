import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export const ADMIN_EMAILS = ["gercanale@gmail.com", "gomezvera.f@gmail.com"];

export async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const admin = createAdminClient();
  const { data } = await admin.auth.getUser(token);
  return !!data.user?.email && ADMIN_EMAILS.includes(data.user.email);
}
