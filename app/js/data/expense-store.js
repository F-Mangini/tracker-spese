/* ============================================
   EXPENSE STORE - cache letture spese
   ============================================ */

import { Storage } from './storage.js';

export const ExpenseStore = (() => {
    function createState() {
        return {
            storageAdapter: null,
            cachedSpese: null,
            boundWindow: null,
            storageHandler: null
        };
    }

    let state = createState();

    function getDefaultStorage() {
        return typeof Storage !== 'undefined' ? Storage : null;
    }

    function getStorage() {
        return state.storageAdapter || getDefaultStorage();
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
        state.cachedSpese = null;
    }

    function reset() {
        if (state.boundWindow && state.storageHandler && typeof state.boundWindow.removeEventListener === 'function') {
            state.boundWindow.removeEventListener('storage', state.storageHandler);
        }
        state = createState();
    }

    function getState() {
        return {
            hasStorageAdapter: !!state.storageAdapter,
            hasCachedSpese: state.cachedSpese !== null,
            cachedCount: Array.isArray(state.cachedSpese) ? state.cachedSpese.length : 0,
            hasWindowListener: !!(state.boundWindow && state.storageHandler)
        };
    }

    function init(options = {}) {
        reset();
        state.storageAdapter = options.storage || getDefaultStorage();

        const activeWindow = options.window || (typeof window !== 'undefined' ? window : null);
        const storageKey = state.storageAdapter && state.storageAdapter.KEY;

        state.boundWindow = activeWindow;
        state.storageHandler = event => {
            if (!event || !storageKey || event.key === storageKey || event.key === null) {
                invalidate();
            }
        };

        if (state.boundWindow && typeof state.boundWindow.addEventListener === 'function') {
            state.boundWindow.addEventListener('storage', state.storageHandler);
        }
    }

    function refresh() {
        state.cachedSpese = snapshotSpese(readFromStorage());
        return state.cachedSpese;
    }

    function getSpese() {
        if (state.cachedSpese === null) {
            state.cachedSpese = snapshotSpese(readFromStorage());
        }

        return state.cachedSpese;
    }

    return {
        init,
        getSpese,
        refresh,
        invalidate,
        getState,
        reset
    };
})();
