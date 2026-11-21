export const loginIntentCookie = "club-login-intent";
export const loginIntentCookiePath = "/auth/callback";

export function getLoginIntent(value: unknown) {
  return value === "criar-clube" || value === "entrar-clube" ? value : null;
}

export function loginDestination(intent: ReturnType<typeof getLoginIntent>) {
  if (intent === "criar-clube") return "/clubes/novo";
  if (intent === "entrar-clube") return "/clubes/entrar";
  return "/conta";
}

export function loginErrorUrl(intent: ReturnType<typeof getLoginIntent>) {
  return intent ? `/entrar?erro=login&acao=${intent}` : "/entrar?erro=login";
}
