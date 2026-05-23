/* ============================================
   EXPENSE ACTIONS - operazioni spesa testabili
   ============================================ */

const ExpenseActions = (() => {
    function addFromText(options = {}) {
        const parser = options.parser;
        const storage = options.storage;
        const text = String(options.text || '').trim();

        if (!text) {
            return { success: false, reason: 'empty' };
        }

        if (!parser || typeof parser.parse !== 'function') {
            return { success: false, reason: 'parser-unavailable' };
        }

        const parsed = parser.parse(text);
        if (!parsed) {
            return { success: false, reason: 'parse' };
        }

        if (!storage || typeof storage.addSpesa !== 'function') {
            return { success: false, reason: 'storage-unavailable' };
        }

        const result = storage.addSpesa(parsed) || {};
        if (!result.success) {
            return {
                success: false,
                reason: 'storage',
                error: result.error || 'Salvataggio non riuscito'
            };
        }

        return {
            success: true,
            spesa: result.spesa
        };
    }

    function updateExpense(options = {}) {
        const storage = options.storage;
        if (!storage || typeof storage.updateSpesa !== 'function') {
            return { success: false, error: 'Salvataggio non riuscito' };
        }

        return storage.updateSpesa(options.id, options.data) || {
            success: false,
            error: 'Salvataggio non riuscito'
        };
    }

    function deleteExpense(options = {}) {
        const storage = options.storage;
        if (!storage || typeof storage.deleteSpesa !== 'function') {
            return { success: false, error: 'Eliminazione non riuscita' };
        }

        return storage.deleteSpesa(options.id) || {
            success: false,
            error: 'Eliminazione non riuscita'
        };
    }

    return {
        addFromText,
        updateExpense,
        deleteExpense
    };
})();
