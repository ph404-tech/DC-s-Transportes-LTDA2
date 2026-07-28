-- =============================================================
--  DC's Transportes LTDA — Setup do Banco de Dados Supabase
--  Execute este script no SQL Editor do seu projeto Supabase:
--  https://supabase.com/dashboard → SQL Editor → New Query
-- =============================================================


-- ============================================================
--  1. TABELA: profiles (usuários da aplicação)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email      text        UNIQUE NOT NULL,
    name       text        NOT NULL,
    password   text        NOT NULL,       -- Fase 1: texto plano (migrar para Supabase Auth futuramente)
    status     text        NOT NULL DEFAULT 'pending', -- 'active' | 'pending'
    role       text        NOT NULL DEFAULT 'Motorista',
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
--  2. TABELA: trips (viagens)
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email  text        NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
    source      text,
    destination text,
    distance    integer     NOT NULL DEFAULT 0,
    cargo       text,
    income      integer     NOT NULL DEFAULT 0,
    date        timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
--  3. TABELA: fines (multas)
-- ============================================================
CREATE TABLE IF NOT EXISTS fines (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email text        NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
    type       text,
    amount     integer     NOT NULL DEFAULT 0,
    date       timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
--  4. TABELA: prefs (preferências / meta mensal)
-- ============================================================
CREATE TABLE IF NOT EXISTS prefs (
    user_email text        PRIMARY KEY REFERENCES profiles(email) ON DELETE CASCADE,
    goal       integer     NOT NULL DEFAULT 10000,
    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
--  5. ROW LEVEL SECURITY (RLS)
--  Por enquanto, deixamos aberto com acesso público via anon key.
--  ATENÇÃO: para produção, configure políticas mais rígidas.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prefs    ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (anon key pode ler e escrever tudo)
-- profiles
CREATE POLICY "public_profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "public_profiles_insert" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "public_profiles_update" ON profiles FOR UPDATE USING (true);
CREATE POLICY "public_profiles_delete" ON profiles FOR DELETE USING (true);

-- trips
CREATE POLICY "public_trips_select" ON trips FOR SELECT USING (true);
CREATE POLICY "public_trips_insert" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "public_trips_delete" ON trips FOR DELETE USING (true);

-- fines
CREATE POLICY "public_fines_select" ON fines FOR SELECT USING (true);
CREATE POLICY "public_fines_insert" ON fines FOR INSERT WITH CHECK (true);
CREATE POLICY "public_fines_delete" ON fines FOR DELETE USING (true);

-- prefs
CREATE POLICY "public_prefs_select" ON prefs FOR SELECT USING (true);
CREATE POLICY "public_prefs_upsert" ON prefs FOR INSERT WITH CHECK (true);
CREATE POLICY "public_prefs_update" ON prefs FOR UPDATE USING (true);


-- ============================================================
--  6. ÍNDICES (performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trips_user_email ON trips (user_email);
CREATE INDEX IF NOT EXISTS idx_trips_date       ON trips (date DESC);
CREATE INDEX IF NOT EXISTS idx_fines_user_email ON fines (user_email);
CREATE INDEX IF NOT EXISTS idx_fines_date       ON fines (date DESC);


-- ============================================================
--  7. STORAGE BUCKET para avatares
--  Crie manualmente no Dashboard: Storage → New Bucket
--  Nome: avatars | Public: SIM
--  Ou descomente e execute o bloco abaixo:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "public_avatar_select" ON storage.objects
--   FOR SELECT USING ( bucket_id = 'avatars' );

-- CREATE POLICY "public_avatar_insert" ON storage.objects
--   FOR INSERT WITH CHECK ( bucket_id = 'avatars' );

-- CREATE POLICY "public_avatar_update" ON storage.objects
--   FOR UPDATE USING ( bucket_id = 'avatars' );


-- ============================================================
--  Setup concluído! ✓
-- ============================================================
