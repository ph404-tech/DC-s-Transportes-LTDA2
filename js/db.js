// =============================================================
//  db.js — DC's Transportes LTDA
//  Camada de acesso ao banco de dados (Supabase).
//  Substitui todas as operações de localStorage.
//
//  Expõe o objeto global `DB` com métodos assíncronos para:
//    - Usuários/Perfis  (profiles)
//    - Viagens          (trips)
//    - Multas           (fines)
//    - Preferências     (prefs)
// =============================================================

const DB = (() => {
    const sb = supabaseClient; // inicializado em supabase-config.js

    // ----------------------------------------------------------
    //  Utilitário interno: exibe erro no console e retorna null
    // ----------------------------------------------------------
    function handleError(context, error) {
        console.error(`[DB] ${context}:`, error.message);
        return null;
    }

    // ==========================================================
    //  USERS / PROFILES
    // ==========================================================

    async function getUsers() {
        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) return handleError('getUsers', error) ?? [];
        return data;
    }

    async function getUserByEmail(email) {
        const { data, error } = await sb
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();
        if (error) return null;
        return data;
    }

    /**
     * Cria um novo usuário.
     * @param {{ name, email, password, status?, role? }} user
     */
    async function createUser(user) {
        const payload = {
            name:     user.name,
            email:    user.email,
            password: user.password,
            status:   user.status  || 'pending',
            role:     user.role    || 'Motorista',
        };
        const { data, error } = await sb
            .from('profiles')
            .insert(payload)
            .select()
            .single();
        if (error) return handleError('createUser', error);
        return data;
    }

    /**
     * Atualiza campos de um usuário existente.
     * @param {string} email
     * @param {Partial<{name, password, status, role, avatar_url}>} fields
     */
    async function updateUser(email, fields) {
        const { data, error } = await sb
            .from('profiles')
            .update(fields)
            .eq('email', email)
            .select()
            .single();
        if (error) return handleError('updateUser', error);
        return data;
    }

    async function deleteUser(email) {
        const { error } = await sb
            .from('profiles')
            .delete()
            .eq('email', email);
        if (error) return handleError('deleteUser', error);
        return true;
    }

    // ==========================================================
    //  TRIPS / VIAGENS
    // ==========================================================

    async function getTrips() {
        const { data, error } = await sb
            .from('trips')
            .select('*')
            .order('date', { ascending: false });
        if (error) return handleError('getTrips', error) ?? [];
        return data;
    }

    async function getTripsByUser(email) {
        const { data, error } = await sb
            .from('trips')
            .select('*')
            .eq('user_email', email)
            .order('date', { ascending: false });
        if (error) return handleError('getTripsByUser', error) ?? [];
        return data;
    }

    /**
     * Cria uma nova viagem.
     * @param {{ userEmail, source, destination, distance, cargo, income, date? }} trip
     */
    async function createTrip(trip) {
        const payload = {
            user_email:  trip.userEmail,
            source:      trip.source,
            destination: trip.destination,
            distance:    trip.distance || 0,
            cargo:       trip.cargo    || '',
            income:      trip.income   || 0,
            date:        trip.date     || new Date().toISOString(),
        };
        const { data, error } = await sb
            .from('trips')
            .insert(payload)
            .select()
            .single();
        if (error) return handleError('createTrip', error);
        return data;
    }

    async function deleteTrip(id) {
        const { error } = await sb
            .from('trips')
            .delete()
            .eq('id', id);
        if (error) return handleError('deleteTrip', error);
        return true;
    }

    async function deleteTripsByUser(email) {
        const { error } = await sb
            .from('trips')
            .delete()
            .eq('user_email', email);
        if (error) return handleError('deleteTripsByUser', error);
        return true;
    }

    // ==========================================================
    //  FINES / MULTAS
    // ==========================================================

    async function getFines() {
        const { data, error } = await sb
            .from('fines')
            .select('*')
            .order('date', { ascending: false });
        if (error) return handleError('getFines', error) ?? [];
        return data;
    }

    async function getFinesByUser(email) {
        const { data, error } = await sb
            .from('fines')
            .select('*')
            .eq('user_email', email)
            .order('date', { ascending: false });
        if (error) return handleError('getFinesByUser', error) ?? [];
        return data;
    }

    /**
     * Registra uma nova multa.
     * @param {{ userEmail, type, amount, date? }} fine
     */
    async function createFine(fine) {
        const payload = {
            user_email: fine.userEmail,
            type:       fine.type   || 'Infração',
            amount:     fine.amount || 0,
            date:       fine.date   || new Date().toISOString(),
        };
        const { data, error } = await sb
            .from('fines')
            .insert(payload)
            .select()
            .single();
        if (error) return handleError('createFine', error);
        return data;
    }

    async function deleteFinesByUser(email) {
        const { error } = await sb
            .from('fines')
            .delete()
            .eq('user_email', email);
        if (error) return handleError('deleteFinesByUser', error);
        return true;
    }

    // ==========================================================
    //  PREFS / PREFERÊNCIAS
    // ==========================================================

    async function getPrefs(email) {
        const { data, error } = await sb
            .from('prefs')
            .select('*')
            .eq('user_email', email)
            .single();
        if (error) return { goal: 10000 }; // valor padrão
        return data;
    }

    async function savePrefs(email, goal) {
        const { data, error } = await sb
            .from('prefs')
            .upsert({ user_email: email, goal, updated_at: new Date().toISOString() })
            .select()
            .single();
        if (error) return handleError('savePrefs', error);
        return data;
    }

    // ==========================================================
    //  AVATAR — Upload para Supabase Storage
    // ==========================================================

    /**
     * Faz upload de um arquivo de avatar e retorna a URL pública.
     * Cria o bucket "avatars" (público) via dashboard antes de usar.
     * @param {string} email  — usado como nome do arquivo
     * @param {File}   file   — arquivo de imagem
     * @returns {string|null} URL pública do avatar
     */
    async function uploadAvatar(email, file) {
        const ext      = file.name.split('.').pop();
        const fileName = `${email.replace('@', '_').replace('.', '_')}.${ext}`;

        const { error: uploadError } = await sb.storage
            .from('avatars')
            .upload(fileName, file, { upsert: true, contentType: file.type });

        if (uploadError) return handleError('uploadAvatar', uploadError);

        const { data } = sb.storage.from('avatars').getPublicUrl(fileName);
        return data.publicUrl;
    }

    // ==========================================================
    //  API pública do módulo DB
    // ==========================================================
    return {
        // Usuários
        getUsers,
        getUserByEmail,
        createUser,
        updateUser,
        deleteUser,

        // Viagens
        getTrips,
        getTripsByUser,
        createTrip,
        deleteTrip,
        deleteTripsByUser,

        // Multas
        getFines,
        getFinesByUser,
        createFine,
        deleteFinesByUser,

        // Preferências
        getPrefs,
        savePrefs,

        // Storage
        uploadAvatar,
    };
})();
