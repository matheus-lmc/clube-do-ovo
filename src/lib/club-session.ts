import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthConfig } from "@/lib/supabase/auth-config";
import { createClient } from "@/lib/supabase/server";

export const getClubUser = cache(async () => {
  await connection();
  if (!getAuthConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) return null;

  const metadata = data.claims.user_metadata;
  const name = [metadata?.full_name, metadata?.name, metadata?.preferred_username]
    .find((value): value is string => typeof value === "string" && Boolean(value.trim()));

  return { id: data.claims.sub, name: name?.trim().slice(0, 80) ?? "Leitor do clube" };
});

export async function requireClubUser() {
  const user = await getClubUser();
  if (!user) redirect("/entrar");
  return user;
}
