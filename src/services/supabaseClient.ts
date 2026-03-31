import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const looksLikePlaceholder = (value: string) => {
  const lower = value.toLowerCase();
  return lower.includes('placeholder') || lower.includes('<project-ref>') || lower.includes('<your anon key>');
};

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !looksLikePlaceholder(supabaseUrl) &&
  !looksLikePlaceholder(supabaseAnonKey);

// Exportamos el cliente. Si las keys son vacías o placeholders, el cliente se crea
// pero fallará si intentamos hacer llamadas reales (lo cual es correcto en modo Mock).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getPaginationRange = (page: number, limit: number) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { from, to };
};
