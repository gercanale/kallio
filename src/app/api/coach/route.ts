import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COACH_BETA_EMAILS } from '@/config/coachBetaUsers';
import { buildSystemPrompt } from '@/lib/coachPrompt';
import type { CoachContext } from '@/lib/coachPrompt';

// Simple in-memory monthly call counter (resets on server restart)
// For production, replace with Supabase or Redis
let monthlyCallCount = 0;
let monthlyCounterResetDate = new Date().getMonth();

function getAndIncrementCallCount(): number {
  const currentMonth = new Date().getMonth();
  if (currentMonth !== monthlyCounterResetDate) {
    monthlyCallCount = 0;
    monthlyCounterResetDate = currentMonth;
  }
  return ++monthlyCallCount;
}

const MONTHLY_CALL_LIMIT = 500;

export async function POST(req: Request) {
  // 1. Auth check
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
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Whitelist check
  if (!user.email || !COACH_BETA_EMAILS.includes(user.email)) {
    return Response.json({ eligible: false }, { status: 403 });
  }

  // 3. Parse request
  const { contextObject, userMessage, conversationHistory, llmEnabled } =
    (await req.json()) as {
      contextObject: CoachContext;
      userMessage: string;
      conversationHistory: { role: 'user' | 'assistant'; content: string }[];
      llmEnabled: boolean;
    };

  // 4. Toggle gate — checked server-side
  if (!llmEnabled) {
    return Response.json({ reply: null, useFallback: true });
  }

  // 5. Session limit — server-side
  const userMessages = conversationHistory.filter((m) => m.role === 'user');
  if (userMessages.length >= 4) {
    return Response.json({
      reply:
        'Hemos llegado al límite de esta sesión. Para preguntas más complejas, genera un resumen para tu gestor o consulta nuestra sección de aprendizaje.',
      sessionLimit: true,
    });
  }

  // 6. Validate context
  if (
    !contextObject?.user ||
    !contextObject?.currentQuarter ||
    !contextObject?.upcomingDeadline
  ) {
    return Response.json({ error: 'Invalid context' }, { status: 400 });
  }

  // 7. Monthly call limit
  const count = getAndIncrementCallCount();
  if (count > MONTHLY_CALL_LIMIT) {
    console.warn(`COACH: Monthly call limit reached (${count})`);
    return Response.json({
      reply: 'El asistente está temporalmente no disponible. Tus preguntas se responden con las respuestas automáticas por ahora.',
      limitReached: true,
    });
  }

  // 8. Build system prompt
  const systemPrompt = buildSystemPrompt(contextObject);

  // 9. Call Anthropic API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          ...conversationHistory,
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = (await response.json()) as { content: { text: string }[] };
    return Response.json({ reply: data.content[0].text, eligible: true });
  } catch (error) {
    console.error('Coach API error:', error);
    return Response.json({
      reply: 'En este momento no puedo procesar tu pregunta. Prueba de nuevo en unos segundos o consulta la sección de aprendizaje.',
      error: true,
    });
  }
}
