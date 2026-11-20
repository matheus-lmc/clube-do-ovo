import { getAuthConfig } from "@/lib/supabase/auth-config";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  let destination = "/entrar?erro=login";

  if (code && !searchParams.has("error") && !searchParams.has("error_code") && getAuthConfig()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) destination = "/conta";
    } catch {
      // The login page handles unsuccessful exchanges.
    }
  }

  return new Response(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "no-store" },
  });
}
