import { createClient } from "@supabase/supabase-js";

// Load configuration with double fallbacks for production, staging, and development environments:
const getSupabaseConfig = () => {
  const url =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL) ||
    "";

  const key =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof process !== "undefined" && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    "";

  return { url, key };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase Client] Environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Falling back to placeholder."
  );
}

export const supabase = createClient(
  supabaseUrl || "https://cluevault-placeholder-id.supabase.co",
  supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.placeholder"
);
