import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
function privilegedKey(value) {
  if (!value) return false;
  if (value.startsWith('sb_secret_')) return true;
  try { const part=value.split('.')[1]; return JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/'))).role==='service_role'; } catch { return false; }
}
export const isDemo = !url && !key;
export const configError = Boolean(url) !== Boolean(key)
  ? 'Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY juntas.'
  : privilegedKey(key) ? 'Use apenas a chave pública anon/publishable. Remova a chave administrativa das variáveis VITE_* e revogue qualquer chave secreta exposta.' : '';
export const supabase = url && key && !configError ? createClient(url, key) : null;
export async function unwrap(request) { const { data, error } = await request; if (error) throw new Error(error.message); return data; }
