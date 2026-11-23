/* ============================================
   HEADER TITLE CONTROLLER - toggle titolo/data
   ============================================ */

export const HeaderTitleController = (() => {
    const FADE_DURATION_MS = 90;
    let titleStates = new WeakMap();

    function getDocument(options) {
        return options.document || document;
    }

    function ensureTitleState(title) {
        if (!title || typeof title !== 'object') return null;

        let state = titleStates.get(title);
        if (!state) {
            state = {
                defaultHtml: typeof title.innerHTML === 'string' ? title.innerHTML : '',
                showingDate: false,
                animating: false
            };
            titleStates.set(title, state);
        }

        return state;
    }

    function syncDefaultTitle(title) {
        const state = ensureTitleState(title);
        if (!state) return false;

        if (!state.showingDate) {
            title.innerHTML = state.defaultHtml;
        }

        return true;
    }

    function getState(title) {
        if (!title || typeof title !== 'object') return null;
        const state = titleStates.get(title);
        return state ? { ...state } : null;
    }

    function resetState() {
        titleStates = new WeakMap();
    }

    function formatToday(date, locale = 'it-IT') {
        const value = date instanceof Date ? date : new Date(date);

        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(value);
    }

    function init(options = {}) {
        const doc = getDocument(options);
        const title = doc.querySelector('#app-header h1');
        if (!title) return null;

        const state = ensureTitleState(title);

        if (typeof title.setAttribute === 'function') {
            title.setAttribute('role', 'button');
            title.setAttribute('tabindex', '0');
            title.setAttribute('aria-label', 'Mostra la data di oggi');
        }

        const activeWindow = options.window ||
            (typeof window !== 'undefined' ? window : null);
        const setTimer = options.setTimeout ||
            (activeWindow && typeof activeWindow.setTimeout === 'function'
                ? activeWindow.setTimeout.bind(activeWindow)
                : setTimeout);
        const reducedMotion = activeWindow &&
            typeof activeWindow.matchMedia === 'function' &&
            activeWindow.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const applyToggle = () => {
            if (state.showingDate) {
                title.innerHTML = state.defaultHtml;
                state.showingDate = false;
                if (typeof title.setAttribute === 'function') {
                    title.setAttribute('aria-label', 'Mostra la data di oggi');
                }
            } else {
                const now = typeof options.now === 'function' ? options.now() : new Date();
                title.textContent = formatToday(now, options.locale || 'it-IT');
                state.showingDate = true;
                if (typeof title.setAttribute === 'function') {
                    title.setAttribute('aria-label', "Mostra il nome dell'app");
                }
            }
        };

        const toggle = () => {
            if (state.animating) return;

            if (reducedMotion || !title.classList) {
                applyToggle();
                return;
            }

            state.animating = true;
            title.classList.add('header-title-fade-out');

            setTimer(() => {
                applyToggle();
                title.classList.remove('header-title-fade-out');

                setTimer(() => {
                    state.animating = false;
                }, FADE_DURATION_MS);
            }, FADE_DURATION_MS);
        };

        title.addEventListener('click', toggle);
        title.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            if (typeof event.preventDefault === 'function') event.preventDefault();
            toggle();
        });

        return { toggle, title };
    }

    return {
        formatToday,
        init,
        syncDefaultTitle,
        getState,
        resetState
    };
})();
