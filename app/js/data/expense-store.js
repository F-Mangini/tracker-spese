/* ============================================
   EXPENSE STORE - cache letture spese
   ============================================ */

const ExpenseStore = (() => {
    let storageAdapter = null;
    let cachedSpese = null;
    let boundWindow = null;
    let storageHandler = null;

    function getDefaultStorage() {
        return typeof Storage !== 'undefined' ? Storage : null;
    }

    function getStorage() {
        return storageAdapter || getDefaultStorage();
    }

    function cloneSpese(spese) {
        return JSON.parse(JSON.stringify(Array.isArray(spese) ? spese : []));
    }

    function readFromStorage() {
        const storage = getStorage();
        if (!storage || typeof storage.getSpese !== 'function') return [];
        return storage.getSpese();
    }

    function invalidate() {
        cachedSpese = null;
    }

    function init(options = {}) {
        storageAdapter = options.storage || getDefaultStorage();
        invalidate();

        if (boundWindow && storageHandler && typeof boundWindow.removeEventListener === 'function') {
            boundWindow.removeEventListener('storage', storageHandler);
        }

        const activeWindow = options.window || (typeof window !== 'undefined' ? window : null);
        const storageKey = storageAdapter && storageAdapter.KEY;

        boundWindow = activeWindow;
        storageHandler = event => {
            if (!event || !storageKey || event.key === storageKey || event.key === null) {
                invalidate();
            }
        };

        if (boundWindow && typeof boundWindow.addEventListener === 'function') {
            boundWindow.addEventListener('storage', storageHandler);
        }
    }

    function refresh() {
        cachedSpese = cloneSpese(readFromStorage());
        return getSpese();
    }

    function getSpese() {
        if (cachedSpese === null) {
            cachedSpese = cloneSpese(readFromStorage());
        }

        return cloneSpese(cachedSpese);
    }

    return {
        init,
        getSpese,
        refresh,
        invalidate
    };
})();
