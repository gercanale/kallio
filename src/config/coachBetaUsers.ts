/**
 * Manually maintained whitelist of user IDs eligible for the AI Coach beta.
 * Add Supabase user UUIDs here to grant access.
 * The /api/coach route checks this list before any Anthropic API call.
 */
export const COACH_BETA_USERS: string[] = [
  // Add your own Supabase user UUID here:
  // 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
];
