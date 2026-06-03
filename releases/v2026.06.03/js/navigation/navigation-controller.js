/* ============================================
   NAVIGATION CONTROLLER - wiring pagine e scroll
   ============================================ */

const NavigationController = (() => {
    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getCurrentPage(options) {
        return typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : options.currentPage;
    }

    function setCurrentPage(options, page) {
        if (typeof options.setCurrentPage === 'function') {
            options.setCurrentPage(page);
        } else {
            options.currentPage = page;
        }
    }

    function getPageScrollTop(options) {
        return options.pageScrollTop || {};
    }

    function setRestoringPageScroll(options, value) {
        if (typeof options.setRestoringPageScroll === 'function') {
            options.setRestoringPageScroll(value);
        } else {
            options.restoringPageScroll = value;
        }
    }

    function isRestoringPageScroll(options) {
        return typeof options.isRestoringPageScroll === 'function'
            ? options.isRestoringPageScroll()
            : !!options.restoringPageScroll;
    }

    function deferFrame(options, callback) {
        const frame = options.requestAnimationFrame ||
            (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

        if (frame) frame(callback);
        else callback();
    }

    function deferTick(options, callback) {
        const defer = options.defer || (callback => setTimeout(callback, 0));
        defer(callback);
    }

    function getNavigationHistoryAction(options, payload) {
        if (typeof options.getNavigationHistoryAction === 'function') {
            return options.getNavigationHistoryAction(payload);
        }
        return UIStack.getNavigationHistoryAction(payload);
    }

    function init(options = {}) {
        const doc = getDocument(options);

        doc.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => navigateTo(options, btn.dataset.page));
        });

        setupPageScrollTracking(options);
    }

    function setupPageScrollTracking(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        main.addEventListener('scroll', () => {
            if (isRestoringPageScroll(options)) return;

            const currentPage = getCurrentPage(options);
            if (currentPage) getPageScrollTop(options)[currentPage] = main.scrollTop;
        }, { passive: true });
    }

    function rememberCurrentPageScroll(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        const currentPage = getCurrentPage(options);
        if (!main || !currentPage) return;

        getPageScrollTop(options)[currentPage] = main.scrollTop;
    }

    function restorePageScroll(options = {}, page) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        const top = getPageScrollTop(options)[page] || 0;

        deferFrame(options, () => {
            setRestoringPageScroll(options, true);
            main.scrollTop = top;

            deferTick(options, () => {
                setRestoringPageScroll(options, false);
            });
        });
    }

    function syncPageDom(options = {}, page) {
        const doc = getDocument(options);

        doc.querySelectorAll('.page').forEach(section => section.classList.add('hidden'));

        const pageEl = doc.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.remove('hidden');

        doc.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const activeBtn = doc.querySelector(`.nav-btn[data-page="${page}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const inputBar = doc.getElementById('input-bar');
        const main = doc.getElementById('app-main');

        if (inputBar && main) {
            const shouldHideTimelineInputBar =
                page === 'timeline' &&
                typeof options.shouldHideTimelineInputBar === 'function' &&
                options.shouldHideTimelineInputBar();

            if (page === 'timeline' && !shouldHideTimelineInputBar) {
                inputBar.classList.remove('hidden');
                main.classList.remove('no-input-bar');
            } else {
                inputBar.classList.add('hidden');
                main.classList.add('no-input-bar');
            }
        }

        const filterToggle = doc.getElementById('btn-filter-toggle');
        if (filterToggle) filterToggle.style.display = page === 'settings' ? 'none' : '';

        (options.syncTimelineSelectionHeader || noop)();
    }

    function syncPageContent(options = {}, page) {
        if (page === 'timeline') (options.renderTimeline || noop)();
        if (page === 'stats') (options.renderStats || noop)();
        if (page === 'settings') (options.renderSettings || noop)();
    }

    function updateNavigationHistory(options = {}, page, fromPopstate = false) {
        const action = getNavigationHistoryAction(options, {
            fromPopstate,
            currentPage: getCurrentPage(options),
            nextPage: page
        });

        (options.runHistoryAction || noop)(action);
        return action;
    }

    function navigateTo(options = {}, page, fromPopstate = false) {
        if (!page) return null;

        rememberCurrentPageScroll(options);
        const action = updateNavigationHistory(options, page, fromPopstate);
        setCurrentPage(options, page);
        syncPageDom(options, page);

        const shouldCloseFilter = page === 'settings' &&
            typeof options.isFilterOpen === 'function' &&
            options.isFilterOpen();
        if (shouldCloseFilter) (options.closeFilterPanel || noop)();

        (options.updateAppMainPadding || noop)();
        syncPageContent(options, page);
        restorePageScroll(options, page);

        return action;
    }

    return {
        init,
        setupPageScrollTracking,
        rememberCurrentPageScroll,
        restorePageScroll,
        syncPageDom,
        syncPageContent,
        updateNavigationHistory,
        navigateTo
    };
})();
