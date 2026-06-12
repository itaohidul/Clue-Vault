import { createClient } from "@supabase/supabase-js";

// Load configuration with double fallbacks for production, staging, and development environments:
const getSupabaseConfig = () => {
  const isServer = typeof process !== "undefined";

  const url =
    (isServer && process.env?.SUPABASE_URL) ||
    (isServer && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (isServer && process.env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof window !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof window !== "undefined" && (import.meta as any).env?.SUPABASE_URL) ||
    "";

  // On the server, prefer SUPABASE_SERVICE_ROLE_KEY to safely bypass client RLS rules.
  // Otherwise, fall back to standard anon credentials.
  const key =
    (isServer && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    (isServer && process.env?.SERVICE_ROLE_KEY) ||
    (isServer && process.env?.SUPABASE_ANON_KEY) ||
    (isServer && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (isServer && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof window !== "undefined" && (import.meta as any).env?.SUPABASE_ANON_KEY) ||
    "";

  return { url, key };
};

const { url: supabaseUrl, key: supabaseAnonKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase Client] Environment variables NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. Falling back to placeholder."
  );
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && !supabaseUrl.includes("placeholder");

export const supabase = createClient(
  supabaseUrl || "https://cluevault-placeholder-id.supabase.co",
  supabaseAnonKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.placeholder"
);
