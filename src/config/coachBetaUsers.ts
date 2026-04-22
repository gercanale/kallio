/**
 * Manually maintained whitelist of emails eligible for the AI Coach beta.
 * The /api/coach route checks the authenticated user's email against this list
 * before any Anthropic API call — non-whitelisted users get a 403 and no API call is made.
 */
export const COACH_BETA_EMAILS: string[] = [
  "gomezvera.f@gmail.com",
  "gercanale@gmail.com",
];
