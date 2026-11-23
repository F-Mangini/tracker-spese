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

    function freezeSnapshot(value) {
        if (Array.isArray(value)) {
            return Object.freeze(value.map(item => freezeSnapshot(item)));
        }

        if (value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]') {
            const copy = {};
            Object.keys(value).forEach(key => {
                copy[key] = freezeSnapshot(value[key]);
            });
            return Object.freeze(copy);
        }

        return value;
    }

    function snapshotSpese(spese) {
        return freezeSnapshot(Array.isArray(spese) ? spese : []);
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
        cachedSpese = snapshotSpese(readFromStorage());
        return cachedSpese;
    }

    function getSpese() {
        if (cachedSpese === null) {
            cachedSpese = snapshotSpese(readFromStorage());
        }

        return cachedSpese;
    }

    return {
        init,
        getSpese,
        refresh,
        invalidate
    };
})();
