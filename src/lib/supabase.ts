import { createClient } from "@supabase/supabase-js";

// React (Vite) da o'zgaruvchilar import.meta.env bilan chaqiriladi
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
