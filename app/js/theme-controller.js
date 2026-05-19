/* ============================================
   THEME CONTROLLER - tema persistente e toggle temporaneo
   ============================================ */

const ThemeController = (() => {
    function getSystemTheme(win) {
        const activeWindow = win || (typeof window !== 'undefined' ? window : null);
        const prefersDark = activeWindow &&
            activeWindow.matchMedia &&
            activeWindow.matchMedia('(prefers-color-scheme: dark)').matches;

        return prefersDark ? 'dark' : 'light';
    }

    function applyTheme(theme, options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        if (!activeDocument || !activeDocument.documentElement) return;

        const resolvedTheme = theme === 'auto'
            ? getSystemTheme(options.window)
            : theme;

        activeDocument.documentElement.setAttribute('data-theme', resolvedTheme);
    }

    function init(options = {}) {
        const storage = options.storage;
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        if (!storage || !activeDocument) return;

        const saved = storage.getSettings().tema || 'auto';
        applyTheme(saved, options);

        const toggle = activeDocument.getElementById('theme-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', () => {
            const current = activeDocument.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';

            applyTheme(next, options);

            if (typeof options.onTemporaryThemeChange === 'function') {
                options.onTemporaryThemeChange(next);
            }
        });
    }

    return {
        getSystemTheme,
        applyTheme,
        init
    };
})();
