import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type && ["signup", "email", "recovery", "invite", "magiclink", "email_change"].includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : "/app", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", request.url));
}
