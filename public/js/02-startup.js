
const SUPABASE_URL = "https://mssyabasyxhkwmrtzgzv.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = (window.INTEGRA_CONFIG?.supabasePublishableKey || 'CONFIGURE_SUPABASE_PUBLISHABLE_KEY');
const SUPABASE_KEY = SUPABASE_PUBLISHABLE_KEY; // compatibilidad interna

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
        auth:{
            persistSession:false,
            autoRefreshToken:false,
            detectSessionInUrl:false
        }
    }
);
