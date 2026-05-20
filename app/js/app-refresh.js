/* ============================================
   APP REFRESH - policy di aggiornamento viste
   ============================================ */

const AppRefresh = (() => {
    function getCurrentPage(options) {
        if (typeof options.getCurrentPage === 'function') return options.getCurrentPage();
        return options.currentPage || 'timeline';
    }

    function shouldUpdateFilterSlider(options) {
        if (!options.updateFilterSlider) return false;
        if (typeof options.isFilterOpen === 'function') return options.isFilterOpen();
        return !!options.filterOpen;
    }

    function refreshExpenseViews(options = {}) {
        if (options.invalidateCache !== false && typeof options.invalidateSpeseCache === 'function') {
            options.invalidateSpeseCache();
        }

        if (shouldUpdateFilterSlider(options) && typeof options.recalcSliderMax === 'function') {
            options.recalcSliderMax();
        }

        if (typeof options.renderTimeline === 'function') {
            options.renderTimeline();
        }

        if (getCurrentPage(options) === 'stats' && typeof options.renderStats === 'function') {
            options.renderStats();
        }

        if (options.includeSettings && typeof options.renderSettings === 'function') {
            options.renderSettings();
        }
    }

    return {
        refreshExpenseViews
    };
})();
