// =============================================================
//  supabase-config.js — DC's Transportes LTDA
//  Inicializa o cliente global do Supabase.
//  IMPORTANTE: substitua os valores abaixo pelas suas chaves
//  disponíveis em https://supabase.com/dashboard → Settings → API
// =============================================================

const SUPABASE_URL  = 'https://sfztejnoeckechboqkoe.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xl9UtSgbFNx86hcxvIauHA_4d_AKWMX';

// O script CDN do Supabase expõe `window.supabase`
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
