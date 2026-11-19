import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = supabaseConfig;

  if (!url || !publishableKey) {
    return NextResponse.next();
  }

  const refreshedCookies = new Map<
    string,
    { value: string; options: CookieOptions }
  >();
  const responseHeaders = new Headers();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          refreshedCookies.set(name, { value, options });
        }

        for (const [name, value] of Object.entries(headers)) {
          responseHeaders.set(name, value);
        }
      },
    },
  });

  await supabase.auth.getClaims();

  const response = NextResponse.next({ request });

  for (const [name, { value, options }] of refreshedCookies) {
    response.cookies.set(name, value, options);
  }

  responseHeaders.forEach((value, name) => response.headers.set(name, value));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif|woff2?)$).*)",
  ],
};
