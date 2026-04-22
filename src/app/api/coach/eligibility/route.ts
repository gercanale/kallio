import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COACH_BETA_EMAILS } from '@/config/coachBetaUsers';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return Response.json({ eligible: false });
  return Response.json({ eligible: COACH_BETA_EMAILS.includes(user.email) });
}
