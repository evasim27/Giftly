import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/share/")) {
    const response = NextResponse.next({ request });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(cookiesToSet, headers) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      for (const key of ["cache-control", "expires", "pragma"]) { const value = headers?.[key]; if (value) response.headers.set(key, value); }
    },
  }});
  const { data: { user } } = await supabase.auth.getUser();
  if (request.nextUrl.pathname.startsWith("/app") && !user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = { matcher: ["/app/:path*", "/share/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/auth/:path*"] };
