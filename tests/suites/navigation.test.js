import {
    assert,
    readAppFile,
    readAppCss,
    loadUiViews
} from '../helpers.js';

export default function register(test) {
    test('Swipe orizzontale sceglie solo pagine adiacenti', () => {
        const { NavigationController } = loadUiViews();

        assert.equal(NavigationController.getSwipeTargetPage('timeline', -80, 10), 'stats');
        assert.equal(NavigationController.getSwipeTargetPage('stats', -80, 10), 'settings');
        assert.equal(NavigationController.getSwipeTargetPage('settings', 80, 10), 'stats');
        assert.equal(NavigationController.getSwipeTargetPage('timeline', 80, 10), null);
        assert.equal(NavigationController.getSwipeTargetPage('stats', -40, 5), null);
        assert.equal(NavigationController.getSwipeTargetPage('stats', -80, 75), null);

        assert.equal(NavigationController.shouldCompleteSwipeGesture(-22, 2, 60, 393), true, 'Un flick molto breve ma deciso completa lo swipe');
        assert.equal(NavigationController.shouldCompleteSwipeGesture(-22, 2, 90, 393), false, 'Lo stesso spostamento lento resta sulla pagina');
        assert.equal(NavigationController.shouldCompleteSwipeGesture(-12, 1, 25, 393), true, 'Un micro flick molto rapido completa lo swipe');
        assert.equal(NavigationController.shouldCompleteSwipeGesture(-12, 1, 30, 393), false, 'Un micro spostamento non abbastanza rapido resta sulla pagina');
        assert.equal(NavigationController.shouldCompleteSwipeGesture(-11, 0, 20, 393), false, 'Una vibrazione troppo corta non cambia pagina');
        assert.equal(NavigationController.shouldCompleteSwipeGesture(-22, 20, 40, 393), false, 'Un gesto diagonale non viene trattato come flick');
    });

    test('Controller navigazione coordina pagine, history e scroll fuori da App', () => {
        const { NavigationController } = loadUiViews();
        const calls = [];

        function makeClassList(initial = []) {
            const classes = new Set(initial);
            return {
                add(...items) {
                    items.forEach(cls => classes.add(cls));
                },
                remove(...items) {
                    items.forEach(cls => classes.delete(cls));
                },
                contains(cls) {
                    return classes.has(cls);
                }
            };
        }

        function makeElement(id, classes = []) {
            return {
                id,
                dataset: {},
                classList: makeClassList(classes),
                style: {},
                scrollTop: 0,
                listeners: {},
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                }
            };
        }

        const pages = {
            timeline: makeElement('page-timeline'),
            stats: makeElement('page-stats', ['hidden']),
            settings: makeElement('page-settings', ['hidden'])
        };
        const timelineBanner = makeElement('timeline-summary');
        let simulateTimelineStickyLag = false;
        let timelineNaturalReads = 0;
        timelineBanner.getBoundingClientRect = () => {
            if (simulateTimelineStickyLag &&
                !pages.timeline.classList.contains('page-swipe-preview') &&
                timelineBanner.style.transform === '') {
                timelineNaturalReads += 1;
                return { top: timelineNaturalReads === 1 ? 167 : 68, height: 84 };
            }
            return {
                top: pages.timeline.classList.contains('page-swipe-preview') ? 167 : 68,
                height: 84
            };
        };
        const statsBanner = makeElement('stats-sticky-header');
        statsBanner.getBoundingClientRect = () => ({
            top: pages.stats.classList.contains('page-swipe-preview') ? 90 : 68,
            height: 84
        });
        pages.timeline.getBoundingClientRect = () => ({ top: -304 });
        pages.timeline.querySelector = selector => selector.includes('timeline-summary') ? timelineBanner : null;
        pages.stats.querySelector = selector => selector.includes('stats-sticky-header') ? statsBanner : null;
        pages.settings.querySelector = () => null;
        const navTimeline = makeElement('nav-timeline', ['active']);
        navTimeline.dataset.page = 'timeline';
        const navStats = makeElement('nav-stats');
        navStats.dataset.page = 'stats';
        const navSettings = makeElement('nav-settings');
        navSettings.dataset.page = 'settings';
        const navButtons = [navTimeline, navStats, navSettings];
        const main = makeElement('app-main');
        const scrollAssignments = [];
        let mainScrollTop = 0;
        Object.defineProperty(main, 'scrollTop', {
            get() {
                return mainScrollTop;
            },
            set(value) {
                mainScrollTop = Number(value) || 0;
                scrollAssignments.push({
                    value: mainScrollTop,
                    targetWasPreview: pages.stats.classList.contains('page-swipe-preview') ||
                        pages.timeline.classList.contains('page-swipe-preview')
                });
            }
        });
        main.clientWidth = 393;
        main.clientHeight = 700;
        main.scrollTop = 17;
        scrollAssignments.length = 0;
        main.getBoundingClientRect = () => ({ top: 56 });
        const inputBar = makeElement('input-bar');
        const filterToggle = makeElement('btn-filter-toggle');
        const bannerResetSnapshots = [];
        let statsBannerTransform = '';
        Object.defineProperty(statsBanner.style, 'transform', {
            configurable: true,
            enumerable: true,
            get() {
                return statsBannerTransform;
            },
            set(value) {
                statsBannerTransform = value;
                if (value === '') {
                    bannerResetSnapshots.push({
                        scrollTop: main.scrollTop,
                        targetWasPreview: pages.stats.classList.contains('page-swipe-preview')
                    });
                }
            }
        });

        const doc = {
            getElementById(id) {
                if (id === 'app-main') return main;
                if (id === 'input-bar') return inputBar;
                if (id === 'btn-filter-toggle') return filterToggle;
                if (id === 'page-timeline') return pages.timeline;
                if (id === 'page-stats') return pages.stats;
                if (id === 'page-settings') return pages.settings;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.nav-btn') return navButtons;
                if (selector === '.page') return Object.values(pages);
                return [];
            },
            querySelector(selector) {
                const match = selector.match(/\.nav-btn\[data-page="([^"]+)"\]/);
                if (!match) return null;
                return navButtons.find(btn => btn.dataset.page === match[1]) || null;
            }
        };

        const state = {
            currentPage: 'timeline',
            pageScrollTop: {
                timeline: 0,
                stats: 42,
                settings: 9
            },
            restoring: false,
            filterOpen: true,
            advancedFiltersOpen: false,
            selectionActive: false
        };
        let pendingSettingsNavigation = null;
        const options = {
            document: doc,
            window: { getComputedStyle: () => ({ paddingTop: '12px' }) },
            pageScrollTop: state.pageScrollTop,
            getCurrentPage: () => state.currentPage,
            setCurrentPage: page => { state.currentPage = page; },
            isRestoringPageScroll: () => state.restoring,
            setRestoringPageScroll: value => {
                state.restoring = value;
                calls.push(['restoring', value]);
            },
            getNavigationHistoryAction: payload => ({ type: 'history', ...payload }),
            runHistoryAction: action => calls.push(['history', action]),
            isFilterOpen: () => state.filterOpen,
            shouldHideTimelineInputBar: () => state.advancedFiltersOpen,
            closeFilterPanel: () => {
                state.filterOpen = false;
                calls.push('close-filter');
            },
            updateAppMainPadding: () => calls.push('padding'),
            renderTimeline: () => calls.push('render-timeline'),
            renderStats: () => calls.push('render-stats'),
            renderSettings: () => calls.push('render-settings'),
            shouldConfirmSettingsNavigation: () => state.selectionActive,
            confirmSettingsNavigation: continueNavigation => {
                pendingSettingsNavigation = continueNavigation;
                calls.push(['confirm-settings']);
            },
            requestAnimationFrame: callback => callback(),
            defer: callback => callback(),
            setTimeout: callback => callback()
        };

        NavigationController.init(options);

        assert.equal(typeof navStats.listeners.click, 'function');
        assert.equal(typeof navStats.listeners.touchend, 'function');
        assert.equal(typeof main.listeners.scroll, 'function');

        let preventedNavTap = 0;
        navStats.listeners.touchstart({
            touches: [{ clientX: 140, clientY: 20 }]
        });
        navStats.listeners.touchend({
            changedTouches: [{ clientX: 142, clientY: 21 }],
            preventDefault() {
                preventedNavTap += 1;
            }
        });
        navStats.listeners.click({
            preventDefault() {
                preventedNavTap += 1;
            }
        });
        assert.equal(state.currentPage, 'stats');
        assert.equal(preventedNavTap, 2);
        assert.equal(calls.filter(call => call === 'render-stats').length, 1);

        NavigationController.navigateTo(options, 'timeline');
        calls.length = 0;
        main.scrollTop = 88;
        main.listeners.scroll();
        assert.equal(state.pageScrollTop.timeline, 88);

        state.restoring = true;
        main.scrollTop = 99;
        main.listeners.scroll();
        assert.equal(state.pageScrollTop.timeline, 88);
        state.restoring = false;

        navStats.listeners.click();

        assert.equal(state.currentPage, 'stats');
        assert(pages.timeline.classList.contains('hidden'));
        assert(!pages.stats.classList.contains('hidden'));
        assert(pages.stats.classList.contains('page-nav-enter'));
        assert(!navTimeline.classList.contains('active'));
        assert(navStats.classList.contains('active'));
        assert(inputBar.classList.contains('hidden'));
        assert(main.classList.contains('no-input-bar'));
        assert.equal(filterToggle.style.display, '');
        assert.equal(main.scrollTop, 42);
        assert(calls.some(call => Array.isArray(call) && call[0] === 'history' && call[1].nextPage === 'stats'));
        assert(calls.includes('render-stats'));

        state.advancedFiltersOpen = true;
        const suppressedTimelineAction = NavigationController.navigateTo(options, 'timeline', true);
        assert.equal(suppressedTimelineAction.fromPopstate, true);
        assert.equal(state.currentPage, 'timeline');
        assert(inputBar.classList.contains('hidden'));
        assert(main.classList.contains('no-input-bar'));
        state.advancedFiltersOpen = false;

        state.selectionActive = true;
        navSettings.listeners.click();
        assert.equal(state.currentPage, 'timeline');
        assert.equal(typeof pendingSettingsNavigation, 'function');
        assert(calls.some(call => Array.isArray(call) && call[0] === 'confirm-settings'));
        assert(!calls.includes('render-settings'));

        state.selectionActive = false;
        pendingSettingsNavigation();

        assert.equal(state.currentPage, 'settings');
        assert.equal(state.filterOpen, false);
        assert.equal(filterToggle.style.display, 'none');
        assert(calls.includes('close-filter'));
        assert(calls.includes('render-settings'));

        const popAction = NavigationController.navigateTo(options, 'timeline', true);
        assert.equal(popAction.fromPopstate, true);
        assert.equal(state.currentPage, 'timeline');
        assert(!inputBar.classList.contains('hidden'));
        assert(!main.classList.contains('no-input-bar'));

        assert.equal(typeof main.listeners.touchstart, 'function');
        assert.equal(typeof main.listeners.touchmove, 'function');
        assert.equal(typeof main.listeners.touchend, 'function');
        const pendingNavigationFrames = [];
        options.requestAnimationFrame = callback => {
            pendingNavigationFrames.push(callback);
            return pendingNavigationFrames.length;
        };
        const flushNavigationFrame = () => {
            assert(pendingNavigationFrames.length > 0);
            pendingNavigationFrames.shift()();
        };
        main.listeners.touchstart({
            touches: [{ clientX: 300, clientY: 200 }],
            target: { closest: () => null }
        });

        let preventedSwipe = 0;
        const statsRendersBeforeSwipe = calls.filter(call => call === 'render-stats').length;
        main.listeners.touchmove({
            touches: [{ clientX: 220, clientY: 205 }],
            preventDefault: () => {
                preventedSwipe += 1;
            }
        });

        assert.equal(preventedSwipe, 1);
        assert.equal(state.currentPage, 'timeline');
        assert(!pages.stats.classList.contains('hidden'));
        assert(!pages.timeline.classList.contains('page-nav-enter'));
        assert(!pages.stats.classList.contains('page-nav-enter'));
        assert.equal(pages.timeline.style.transform, 'translate3d(-80px, 0, 0)');
        assert.equal(pages.stats.style.transform, 'translate3d(313px, 0, 0)');
        assert.equal(pages.stats.style.top, '57px');
        assert.equal(pages.stats.style.height, '742px');
        assert.equal(statsBanner.style.transform, 'translate3d(0, -22px, 0)');
        assert(pages.stats.classList.contains('page-swipe-mask-aligned'));
        assert.equal(pages.stats.style['--page-swipe-banner-y'], '-22px');
        assert(inputBar.classList.contains('page-swipe-input'));
        assert.equal(inputBar.style['--page-swipe-input-x'], '-80px');
        assert.equal(calls.filter(call => call === 'render-stats').length, statsRendersBeforeSwipe + 1);

        main.listeners.touchend({
            changedTouches: [{ clientX: 180, clientY: 205 }],
            preventDefault() {}
        });
        assert.equal(state.currentPage, 'stats');
        assert.equal(main.scrollTop, 42);
        assert.equal(pendingNavigationFrames.length, 0);
        const completedSwipeScroll = scrollAssignments[scrollAssignments.length - 1];
        assert.equal(completedSwipeScroll.value, 42);
        assert.equal(completedSwipeScroll.targetWasPreview, false);
        assert.equal(pages.stats.style.transform, '');
        assert(!pages.stats.classList.contains('page-nav-enter'));
        assert.equal(statsBanner.style.transform, '');
        const completedBannerReset = bannerResetSnapshots[bannerResetSnapshots.length - 1];
        assert.equal(completedBannerReset.scrollTop, 42);
        assert.equal(completedBannerReset.targetWasPreview, false);

        assert(!pages.stats.classList.contains('page-swipe-mask-aligned'));
        assert.equal(pages.stats.style['--page-swipe-banner-y'], '');
        assert(inputBar.classList.contains('hidden'));
        assert(!inputBar.classList.contains('page-swipe-input'));
        assert.equal(inputBar.style['--page-swipe-input-x'], '');
        assert.equal(calls.filter(call => call === 'render-stats').length, statsRendersBeforeSwipe + 1);
        timelineBanner.classList.add('hidden');
        pages.timeline.classList.add('filter-open');
        let offsetFlushDuringTransitionNone = 0;
        let currentStatsTransition = statsBanner.style.transition || '';
        Object.defineProperty(statsBanner.style, 'transition', {
            configurable: true,
            enumerable: true,
            get() {
                return currentStatsTransition;
            },
            set(value) {
                currentStatsTransition = value;
            }
        });
        Object.defineProperty(statsBanner, 'offsetHeight', {
            configurable: true,
            get() {
                if (currentStatsTransition === 'none') {
                    offsetFlushDuringTransitionNone += 1;
                }
                return 84;
            }
        });
        main.listeners.touchstart({
            timeStamp: 2000,
            touches: [{ clientX: 180, clientY: 200 }],
            target: { closest: () => null }
        });
        main.listeners.touchmove({
            touches: [{ clientX: 220, clientY: 202 }],
            preventDefault() {}
        });

        assert.equal(state.currentPage, 'stats');
        assert(!pages.timeline.classList.contains('hidden'));
        assert.equal(pages.stats.style.transform, 'translate3d(40px, 0, 0)');
        assert(pages.timeline.classList.contains('page-swipe-mask-aligned'));
        assert.equal(pages.timeline.style['--page-swipe-banner-y'], '348px');
        assert(!inputBar.classList.contains('hidden'));
        assert(inputBar.classList.contains('page-swipe-input'));
        assert.equal(inputBar.style['--page-swipe-input-x'], '-353px');

        main.listeners.touchend({
            timeStamp: 2200,
            changedTouches: [{ clientX: 220, clientY: 202 }],
            preventDefault() {}
        });
        assert.equal(state.currentPage, 'stats');
        assert(pages.timeline.classList.contains('hidden'));
        assert.equal(pages.stats.style.transform, '');
        assert.equal(statsBanner.style.transition, '');
        assert(offsetFlushDuringTransitionNone > 0, 'Deve forzare layout flush prima di ripristinare transition del banner');
        assert(!pages.timeline.classList.contains('page-swipe-mask-aligned'));
        assert.equal(pages.timeline.style['--page-swipe-banner-y'], '');
        assert(inputBar.classList.contains('hidden'));
        assert(!inputBar.classList.contains('page-swipe-input'));
        assert.equal(inputBar.style['--page-swipe-input-x'], '');

        timelineBanner.classList.remove('hidden');
        pages.timeline.classList.remove('filter-open');
        simulateTimelineStickyLag = true;
        main.listeners.touchstart({
            touches: [{ clientX: 180, clientY: 200 }],
            target: { closest: () => null }
        });
        main.listeners.touchmove({
            touches: [{ clientX: 260, clientY: 202 }],
            preventDefault() {}
        });
        main.listeners.touchend({
            changedTouches: [{ clientX: 260, clientY: 202 }],
            preventDefault() {}
        });

        assert.equal(state.currentPage, 'timeline');
        assert.equal(main.scrollTop, 99);
        assert.equal(state.pageScrollTop.stats, 42);
        assert.equal(state.pageScrollTop.timeline, 99);
        assert.equal(pendingNavigationFrames.length, 1);
        const returnedSwipeScroll = scrollAssignments[scrollAssignments.length - 1];
        assert.equal(returnedSwipeScroll.value, 99);
        assert.equal(returnedSwipeScroll.targetWasPreview, false);
        assert(!pages.timeline.classList.contains('hidden'));
        assert(pages.stats.classList.contains('hidden'));
        assert.equal(timelineBanner.style.transform, 'translate3d(0, -99px, 0)');
        assert(pages.timeline.classList.contains('page-swipe-mask-aligned'));

        flushNavigationFrame();

        assert.equal(pendingNavigationFrames.length, 0);
        assert.equal(timelineBanner.style.transform, '');
        assert(!pages.timeline.classList.contains('page-swipe-mask-aligned'));
        assert.equal(pages.timeline.style['--page-swipe-banner-y'], '');
        assert(!inputBar.classList.contains('hidden'));
        assert(!inputBar.classList.contains('page-swipe-input'));
        assert.equal(inputBar.style['--page-swipe-input-x'], '');

        const queuedSwipeTimers = new Map();
        let nextSwipeTimerId = 1;
        options.setTimeout = (callback, delay) => {
            assert.equal(delay, 240, 'La transizione usa un assestamento piu calmo');
            const id = nextSwipeTimerId++;
            queuedSwipeTimers.set(id, callback);
            return id;
        };
        options.clearTimeout = id => {
            queuedSwipeTimers.delete(id);
        };
        const flushSwipeTimer = () => {
            const entry = queuedSwipeTimers.entries().next().value;
            assert(entry, 'Timer swipe atteso');
            const [id, callback] = entry;
            queuedSwipeTimers.delete(id);
            callback();
        };

        main.listeners.touchstart({
            timeStamp: 1000,
            touches: [{ clientX: 300, clientY: 200 }],
            target: { closest: () => null }
        });
        main.listeners.touchmove({
            timeStamp: 1020,
            touches: [{ clientX: 278, clientY: 201 }],
            preventDefault() {}
        });
        main.listeners.touchend({
            timeStamp: 1040,
            changedTouches: [{ clientX: 278, clientY: 202 }],
            preventDefault() {}
        });

        assert.equal(state.currentPage, 'timeline');
        assert.equal(pages.timeline.style.transition, 'transform 240ms cubic-bezier(0.18, 0.9, 0.22, 1)');
        assert.equal(queuedSwipeTimers.size, 1);

        main.listeners.touchstart({
            timeStamp: 1050,
            touches: [{ clientX: 300, clientY: 200 }],
            target: { closest: () => null }
        });

        assert.equal(state.currentPage, 'stats');
        assert.equal(queuedSwipeTimers.size, 0);

        main.listeners.touchmove({
            timeStamp: 1080,
            touches: [{ clientX: 220, clientY: 201 }],
            preventDefault() {}
        });
        main.listeners.touchend({
            timeStamp: 1100,
            changedTouches: [{ clientX: 210, clientY: 202 }],
            preventDefault() {}
        });

        assert.equal(state.currentPage, 'stats');
        assert.equal(queuedSwipeTimers.size, 1);
        flushSwipeTimer();
        assert.equal(state.currentPage, 'settings');
        assert.equal(queuedSwipeTimers.size, 0);
    });

    test('CSS coordina pannello filtri e riepilogo senza rimbalzo', () => {
        const css = readAppCss();
        const summaryCollapsedRule = css.match(/#timeline-summary\.filter-panel-collapsed\s*\{([^}]*)\}/);
        const closingPanelRule = css.match(/\.filter-panel\.filter-panel-closing\s*\{([^}]*)\}/);
        const mainTransitionRule = css.match(/#app-main\.filter-layout-transition\s*\{([^}]*)\}/);

        const timelineFadeRule = css.match(/#page-timeline::before\s*\{([^}]*)\}/);
        assert(summaryCollapsedRule, 'Regola collasso riepilogo filtri non trovata');
        assert(css.includes('--filter-panel-content-offset: 6px'));
        assert(closingPanelRule, 'Regola chiusura animata pannello filtri non trovata');
        assert(mainTransitionRule, 'Regola transizione layout filtri non trovata');
        assert(/height\s*:\s*0/.test(summaryCollapsedRule[1]));
        assert(/margin-bottom\s*:\s*var\(--filter-panel-content-offset\)/.test(summaryCollapsedRule[1]));
        assert(timelineFadeRule, 'Regola sfumatura Timeline non trovata');
        assert(/opacity\s*:\s*0/.test(summaryCollapsedRule[1]));
        assert(/overflow-anchor\s*:\s*none/.test(mainTransitionRule[1]));
        assert(/transform\s*:\s*translateY\(-10px\)/.test(closingPanelRule[1]));
        assert(/transition\s*:[^;]*height\s+200ms/.test(timelineFadeRule[1]));
        assert(/margin-bottom\s+200ms/.test(timelineFadeRule[1]));
        assert(/opacity\s+160ms/.test(timelineFadeRule[1]));
    });

    test('CSS impedisce il collasso dell offset verticale del contenuto', () => {
        const css = readAppCss();
        const bodyRule = css.match(/body\s*\{([^}]*)\}/);

        assert(bodyRule, 'Regola body non trovata');
        assert(/display\s*:\s*flow-root/.test(bodyRule[1]));
    });

    test('CSS separa il fade della bottom nav dallo slide dello swipe', () => {
        const css = readAppCss();
        const basePageRule = css.match(/\.page\s*\{([^}]*)\}/);
        const navEnterRule = css.match(/\.page\.page-nav-enter\s*\{([^}]*)\}/);
        const timelineBannerRule = css.match(/#timeline-summary\s*\{([^}]*)\}/);
        const statsBannerRule = css.match(/\.stats-sticky-header\s*\{([^}]*)\}/);
        const compactFilterFadeRule = css.match(/#page-timeline\.filter-open::before\s*\{([^}]*)\}/);

        assert(basePageRule, 'Regola base .page non trovata');
        assert(navEnterRule, 'Regola .page.page-nav-enter non trovata');
        assert(timelineBannerRule, 'Regola #timeline-summary non trovata');
        assert(statsBannerRule, 'Regola .stats-sticky-header non trovata');
        assert(compactFilterFadeRule, 'Sfumatura filtri compatti non trovata');
        assert(css.includes('--page-banner-h: 84px'));
        assert(/height\s*:\s*var\(--page-banner-h\)/.test(timelineBannerRule[1]));
        assert(/height\s*:\s*var\(--page-banner-h\)/.test(statsBannerRule[1]));
        assert(/border-radius\s*:\s*var\(--radius\)/.test(timelineBannerRule[1]));
        assert(/border-radius\s*:\s*var\(--radius\)/.test(statsBannerRule[1]));
        assert(/height\s*:\s*10px/.test(compactFilterFadeRule[1]));
        assert(!/\banimation\s*:/.test(basePageRule[1]));
        assert(/animation\s*:\s*fadeIn/.test(navEnterRule[1]));
        assert(css.includes('#input-bar.page-swipe-input'));
        assert(css.includes('--page-swipe-input-x'));
        assert(css.includes('.page.page-swipe-mask-aligned::before'));
        assert(css.includes('--page-swipe-banner-y'));
    });

    test('CSS centralizza i layer globali z-index in base.css', () => {
        const baseCss = readAppFile('css/base.css');
        const css = readAppCss();
        const rootMatch = baseCss.match(/:root\s*\{([\s\S]*?)\}/);
        assert(rootMatch, 'Blocco :root non trovato in css/base.css');

        const expectedTokens = {
            '--z-stats-mask': '94',
            '--z-stats-banner': '95',
            '--z-page-mask': '97',
            '--z-timeline-banner': '98',
            '--z-filter': '99',
            '--z-header': '100',
            '--z-input-bar': '100',
            '--z-nav': '100',
            '--z-modal': '200',
            '--z-dropdown': '210',
            '--z-confirm': '210',
            '--z-toast': '300'
        };

        Object.entries(expectedTokens).forEach(([token, value]) => {
            const pattern = new RegExp(`${token}\\s*:\\s*${value}\\s*;`);
            assert(pattern.test(rootMatch[1]), `Token ${token}: ${value} mancante in :root`);
        });

        const expectedSelectors = [
            ['#app-header', '--z-header'],
            ['.filter-panel', '--z-filter'],
            ['#timeline-summary', '--z-timeline-banner'],
            ['#page-timeline::before', '--z-page-mask'],
            ['#page-settings::before', '--z-page-mask'],
            ['#input-bar', '--z-input-bar'],
            ['#bottom-nav', '--z-nav'],
            ['.overlay', '--z-modal'],
            ['#confirm-overlay', '--z-confirm'],
            ['.sd-list', '--z-dropdown'],
            ['.toast', '--z-toast'],
            ['.stats-empty-initial', '--z-stats-banner'],
            ['.stats-sticky-header', '--z-stats-banner'],
            ['#page-stats::before', '--z-stats-mask']
        ];

        expectedSelectors.forEach(([selector, token]) => {
            const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const ruleRegex = new RegExp(`^\\s*${escapedSelector}\\s*\\{([^}]*)\\}`, 'gm');
            const matches = [...css.matchAll(ruleRegex)];
            assert(matches.length > 0, `Regola ${selector} non trovata nel CSS`);
            const zRegex = new RegExp(`z-index\\s*:\\s*var\\(${token}\\)\\s*;`);
            assert(
                matches.some((match) => zRegex.test(match[1])),
                `La regola ${selector} deve usare z-index: var(${token})`
            );
        });
    });

    test('CSS blocca overflow orizzontale di filtri, modali e selettori data/ora su mobile', () => {
        const css = readAppCss();

        function assertRuleMatches(selectorRegex, checks, label) {
            const match = css.match(selectorRegex);
            assert(match, `Regola CSS ${label} non trovata`);
            checks.forEach(pattern => {
                assert(pattern.test(match[1]), `Regola ${label} manca di ${pattern}`);
            });
        }

        assertRuleMatches(/^\s*html\s*\{([^}]*)\}/m, [
            /overflow\s*:\s*hidden/,
            /overscroll-behavior\s*:\s*none/
        ], 'html');

        assertRuleMatches(/^\s*\.filter-panel-scroll\s*\{([^}]*)\}/m, [
            /overflow-x\s*:\s*hidden/,
            /overscroll-behavior-x\s*:\s*none/,
            /touch-action\s*:\s*pan-y/
        ], '.filter-panel-scroll');

        assertRuleMatches(/^\s*\.overlay\s*\{([^}]*)\}/m, [
            /overflow\s*:\s*hidden/,
            /overscroll-behavior\s*:\s*none/,
            /touch-action\s*:\s*pan-y/
        ], '.overlay');

        assertRuleMatches(/^\s*\.modal-body\s*\{([^}]*)\}/m, [
            /overflow-x\s*:\s*hidden/,
            /overscroll-behavior-x\s*:\s*none/,
            /touch-action\s*:\s*pan-y/
        ], '.modal-body');

        assertRuleMatches(/^\s*\.sd-list\s*\{([^}]*)\}/m, [
            /overflow-x\s*:\s*hidden/,
            /overscroll-behavior-x\s*:\s*none/,
            /touch-action\s*:\s*pan-y/
        ], '.sd-list');

        assertRuleMatches(/^\s*\.date-filter-row\s*\{([^}]*)\}/m, [
            /grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
        ], '.date-filter-row');

        assertRuleMatches(/^\s*\.date-field\s*\{([^}]*)\}/m, [
            /min-width\s*:\s*0/
        ], '.date-field');

        assertRuleMatches(/^\s*\.date-field input\[type="date"\]\s*\{([^}]*)\}/m, [
            /min-width\s*:\s*0/,
            /max-width\s*:\s*100%/,
            /-webkit-appearance\s*:\s*none/,
            /appearance\s*:\s*none/
        ], '.date-field input[type="date"]');

        assertRuleMatches(/^\s*\.form-row\s*\{([^}]*)\}/m, [
            /grid-template-columns\s*:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
        ], '.form-row');

        assertRuleMatches(/^\s*\.flex-1\s*\{([^}]*)\}/m, [
            /min-width\s*:\s*0/
        ], '.flex-1');

        assertRuleMatches(/^\s*\.form-group input\[type="date"\],\s*\.form-group input\[type="time"\]\s*\{([^}]*)\}/m, [
            /-webkit-appearance\s*:\s*none/,
            /appearance\s*:\s*none/
        ], '.form-group input[type="date"], .form-group input[type="time"]');
    });

    test('CSS fissa riepiloghi e blocca viewport tastiera per evitare spostamenti su iOS', () => {
        const css = readAppCss();

        function assertRuleMatches(selectorRegex, checks, label) {
            const match = css.match(selectorRegex);
            assert(match, `Regola CSS ${label} non trovata`);
            checks.forEach(pattern => {
                assert(pattern.test(match[1]), `Regola ${label} manca di ${pattern}`);
            });
        }

        const bodyMatch = css.match(/^\s*body\s*\{([^}]*)\}/m);
        assert(bodyMatch, 'Regola CSS body non trovata');
        assert(!/min-height\s*:\s*100(?:d)?vh/.test(bodyMatch[1]), 'body non deve forzare min-height: 100vh/100dvh con position: fixed');

        assertRuleMatches(/^\s*body\s*\{([^}]*)\}/m, [
            /position\s*:\s*fixed/,
            /inset\s*:\s*0/,
            /height\s*:\s*100%/
        ], 'body');

        assertRuleMatches(/^\s*body\.vv-keyboard-open #bottom-nav,\s*body\.ios-expense-input-active #bottom-nav\s*\{([^}]*)\}/m, [
            /display\s*:\s*none/
        ], 'bottom-nav keyboard hide');

        assertRuleMatches(/^\s*body\.vv-keyboard-open #input-bar\s*\{([^}]*)\}/m, [
            /bottom\s*:\s*0/
        ], 'body.vv-keyboard-open #input-bar');
        assert(
            !/body\.ios-expense-input-active #input-bar\s*\{[^}]*bottom\s*:\s*0/.test(css),
            '#input-bar non deve spostarsi subito a bottom: 0 prima che si apra la tastiera'
        );
        assertRuleMatches(/^\s*body\.ios-expense-input-active\.vv-keyboard-open #input-bar\s*\{([^}]*)\}/m, [
            /transition\s*:\s*opacity\s+120ms\s+ease-out/
        ], 'body.ios-expense-input-active.vv-keyboard-open #input-bar');
        assertRuleMatches(/^\s*body\.ios-expense-input-active\.ios-input-bar-prelift #input-bar,\s*body\.ios-input-bar-prelift #input-bar\s*\{([^}]*)\}/m, [
            /opacity\s*:\s*0/,
            /transition\s*:\s*none/
        ], 'body.ios-input-bar-prelift #input-bar');
        assertRuleMatches(/^\s*body\.ios-input-bar-prelift #expense-input\s*\{([^}]*)\}/m, [
            /caret-color\s*:\s*transparent/
        ], 'body.ios-input-bar-prelift #expense-input');

        assertRuleMatches(/^\s*#timeline-summary\s*\{([^}]*)\}/m, [
            /position\s*:\s*fixed/,
            /var\(--vv-offset-top/,
            /var\(--app-main-top/
        ], '#timeline-summary');

        assertRuleMatches(/^\s*\.stats-sticky-header\s*\{([^}]*)\}/m, [
            /position\s*:\s*fixed/,
            /var\(--vv-offset-top/,
            /var\(--app-main-top/
        ], '.stats-sticky-header');

        assertRuleMatches(/^\s*#page-timeline\s*\{([^}]*)\}/m, [
            /padding-top\s*:\s*calc\(12px \+ var\(--page-banner-h\) \+ 16px\)/
        ], '#page-timeline');

        assertRuleMatches(/^\s*body\.vv-keyboard-open #app-main\s*\{([^}]*)\}/m, [
            /top\s*:\s*var\(--vv-offset-top,\s*0px\)/,
            /height\s*:\s*calc\(var\(--vv-height,\s*100dvh\) - var\(--app-main-top,\s*var\(--header-h\)\)\)/
        ], 'body.vv-keyboard-open #app-main');

        assertRuleMatches(/^\s*#app-header\s*\{([^}]*)\}/m, [
            /top\s*:\s*0/,
            /transform\s*:\s*translate3d\(0,\s*var\(--vv-offset-top,\s*0px\),\s*0\)/
        ], '#app-header compositor translate');

        assertRuleMatches(/^\s*body\.vv-keyboard-settling #app-main\s*\{([^}]*)\}/m, [
            /top\s*:\s*var\(--vv-offset-top,\s*0px\)/
        ], 'body.vv-keyboard-settling #app-main');

        const baseSummaryRule = css.match(/^\s*#timeline-summary\s*\{([^}]*)\}/m);
        const baseStatsHeaderRule = css.match(/^\s*\.stats-sticky-header\s*\{([^}]*)\}/m);
        assert(!/(?:^|[\s,:])top\s+200ms/.test(baseSummaryRule[1]), '#timeline-summary default non deve animare top');
        assert(!/(?:^|[\s,:])top\s+200ms/.test(baseStatsHeaderRule[1]), '.stats-sticky-header default non deve animare top');

        assertRuleMatches(/^\s*#app-main\.filter-layout-transition #timeline-summary\s*\{([^}]*)\}/m, [
            /(?:^|[\s,:])top\s+200ms/
        ], '#app-main.filter-layout-transition #timeline-summary');

        assertRuleMatches(/^\s*#app-main\.filter-layout-transition \.stats-sticky-header,\s*#app-main\.filter-layout-transition #page-stats::before\s*\{([^}]*)\}/m, [
            /(?:^|[\s,:])top\s+200ms/
        ], 'stats filter-layout-transition top');

        assertRuleMatches(/^\s*\.page\.page-swipe-layer #timeline-summary\s*\{([^}]*)\}/m, [
            /position\s*:\s*absolute/,
            /top\s*:\s*12px/,
            /translate\s*:\s*none/,
            /transition\s*:\s*none/
        ], '.page.page-swipe-layer #timeline-summary');

        assertRuleMatches(/^\s*\.page\.page-swipe-layer \.stats-sticky-header\s*\{([^}]*)\}/m, [
            /position\s*:\s*absolute/,
            /top\s*:\s*12px/,
            /translate\s*:\s*none/,
            /transition\s*:\s*none/
        ], '.page.page-swipe-layer .stats-sticky-header');

        assertRuleMatches(/^\s*#page-timeline\.page-swipe-layer::before\s*\{([^}]*)\}/m, [
            /position\s*:\s*absolute/,
            /top\s*:\s*0/,
            /translate\s*:\s*none/,
            /transition\s*:\s*none/
        ], '#page-timeline.page-swipe-layer::before');

        assertRuleMatches(/^\s*#page-stats\.page-swipe-layer::before\s*\{([^}]*)\}/m, [
            /position\s*:\s*absolute/,
            /top\s*:\s*0/,
            /translate\s*:\s*none/,
            /transition\s*:\s*none/
        ], '#page-stats.page-swipe-layer::before');
    });
};
