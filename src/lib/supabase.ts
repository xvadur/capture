import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ENV } from "@/lib/config";

let serverClient: SupabaseClient | null = null;

export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_ENV.url && (SUPABASE_ENV.serviceKey || SUPABASE_ENV.anonKey));
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase environment variables are missing.");
  }

  if (!serverClient) {
    serverClient = createClient(
      SUPABASE_ENV.url as string,
      (SUPABASE_ENV.serviceKey ?? SUPABASE_ENV.anonKey) as string,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }

  return serverClient;
}
