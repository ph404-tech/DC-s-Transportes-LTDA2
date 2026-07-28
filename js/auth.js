// =============================================================
//  auth.js — DC's Transportes LTDA
//  Módulo de autenticação: gerencia sessão do usuário.
//  Sessão guardada em sessionStorage (apagada ao fechar o browser).
// =============================================================

const Auth = {
    // --- Sessão ---
    isAuthenticated: () => !!sessionStorage.getItem('dct_user'),

    getCurrentUser: () => {
        const raw = sessionStorage.getItem('dct_user');
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    },

    _setSession: (user) => {
        // Nunca persiste a senha na sessão
        const safe = { ...user };
        delete safe.password;
        sessionStorage.setItem('dct_user', JSON.stringify(safe));
    },

    logout: () => {
        sessionStorage.removeItem('dct_user');
    },
};
