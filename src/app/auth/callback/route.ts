import { cookies } from "next/headers";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { getLoginIntent, loginDestination, loginErrorUrl, loginIntentCookie, loginIntentCookiePath } from "@/lib/supabase/login-intent";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const savedIntent = cookieStore.get(loginIntentCookie);
  const intent = getLoginIntent(savedIntent?.value);
  let destination = loginErrorUrl(intent);

  if (savedIntent) cookieStore.set(loginIntentCookie, "", { path: loginIntentCookiePath, maxAge: 0 });

  if (code && !searchParams.has("error") && !searchParams.has("error_code") && getAuthConfig()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) destination = loginDestination(intent);
    } catch {
      // The login page handles unsuccessful exchanges.
    }
  }

  return new Response(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}
