"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { getLoginIntent, loginErrorUrl, loginIntentCookie, loginIntentCookiePath } from "@/lib/supabase/login-intent";
import { createClient } from "@/lib/supabase/server";

export async function startSocialSignIn(formData: FormData): Promise<never> {
  const config = getAuthConfig();
  const provider = formData.get("provider");
  const intent = getLoginIntent(formData.get("acao"));
  const origin = (await headers()).get("origin");
  if (
    !config ||
    origin !== config.origin ||
    (provider !== "google" && provider !== "apple") ||
    (provider === "apple" && !config.appleEnabled)
  ) {
    redirect(loginErrorUrl(intent));
  }

  let authorizationUrl: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: new URL("/auth/callback", config.origin).href },
    });
    if (!error && data.url) {
      (await cookies()).set(loginIntentCookie, intent ?? "", {
        path: loginIntentCookiePath,
        maxAge: intent ? 600 : 0,
        httpOnly: true,
        sameSite: "lax",
        secure: config.origin.startsWith("https:"),
      });
      authorizationUrl = data.url;
    }
  } catch {
    // The login page offers a retry without exposing provider details.
  }

  redirect(authorizationUrl || loginErrorUrl(intent));
}

export async function signOut(): Promise<never> {
  if (!getAuthConfig()) redirect("/entrar");

  let destination = "/conta?erro=saida";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (!error) destination = "/entrar";
  } catch {
    // The account page checks whether the browser still has a valid session.
  }

  redirect(destination);
}
