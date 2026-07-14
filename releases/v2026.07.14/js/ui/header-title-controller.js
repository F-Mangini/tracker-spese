/* ============================================
   HEADER TITLE CONTROLLER - toggle titolo/data
   ============================================ */

const HeaderTitleController = (() => {
    const FADE_DURATION_MS = 90;

    function getDocument(options) {
        return options.document || document;
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

        const dataset = title.dataset || {};
        if (typeof dataset.defaultHtml !== 'string') dataset.defaultHtml = title.innerHTML;
        dataset.showingDate = dataset.showingDate === 'true' ? 'true' : 'false';

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
        let animating = false;

        const applyToggle = () => {
            const showingDate = dataset.showingDate === 'true';

            if (showingDate) {
                title.innerHTML = dataset.defaultHtml;
                dataset.showingDate = 'false';
                if (typeof title.setAttribute === 'function') {
                    title.setAttribute('aria-label', 'Mostra la data di oggi');
                }
            } else {
                const now = typeof options.now === 'function' ? options.now() : new Date();
                title.textContent = formatToday(now, options.locale || 'it-IT');
                dataset.showingDate = 'true';
                if (typeof title.setAttribute === 'function') {
                    title.setAttribute('aria-label', "Mostra il nome dell'app");
                }
            }
        };

        const toggle = () => {
            if (animating) return;

            if (reducedMotion || !title.classList) {
                applyToggle();
                return;
            }

            animating = true;
            title.classList.add('header-title-fade-out');

            setTimer(() => {
                applyToggle();
                title.classList.remove('header-title-fade-out');

                setTimer(() => {
                    animating = false;
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

    return { formatToday, init };
})();
