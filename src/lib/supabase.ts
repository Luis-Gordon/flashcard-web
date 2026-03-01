import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? "";

if (typeof window !== "undefined" && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// During SSR/prerender (no window), create a placeholder to avoid Supabase's
// internal URL validation. No Supabase calls are made outside the browser.
export const supabase: SupabaseClient =
  typeof window !== "undefined"
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (undefined as unknown as SupabaseClient);
