/* ============================================
   APP WIRING - option factory per controller
   ============================================ */

const AppWiring = (() => {
    function noop() { }

    function getGlobal(name, fallback = null) {
        try {
            if (typeof globalThis !== 'undefined' && name in globalThis) {
                return globalThis[name];
            }
        } catch (_) { }

        return fallback;
    }

    function getBoundGlobalFunction(name, fallback) {
        const activeWindow = getGlobal('window');
        if (activeWindow && typeof activeWindow[name] === 'function') {
            return (...args) => activeWindow[name](...args);
        }

        const fn = getGlobal(name);
        if (typeof fn === 'function') {
            return (...args) => fn(...args);
        }

        return fallback;
    }

    function getDefaults() {
        return {
            document: getGlobal('document'),
            window: getGlobal('window'),
            history: getGlobal('history'),
            Storage: typeof Storage === 'undefined' ? null : Storage,
            ExpenseStore: typeof ExpenseStore === 'undefined' ? null : ExpenseStore,
            Parser: typeof Parser === 'undefined' ? null : Parser,
            ExpenseActions: typeof ExpenseActions === 'undefined' ? null : ExpenseActions,
            ExpenseSubmitController: typeof ExpenseSubmitController === 'undefined' ? null : ExpenseSubmitController,
            ExpenseInputController: typeof ExpenseInputController === 'undefined' ? null : ExpenseInputController,
            InputBarController: typeof InputBarController === 'undefined' ? null : InputBarController,
            ExpenseFilters: typeof ExpenseFilters === 'undefined' ? null : ExpenseFilters,
            StatsData: typeof StatsData === 'undefined' ? null : StatsData,
            ExpenseQuery: typeof ExpenseQuery === 'undefined' ? null : ExpenseQuery,
            AppRefresh: typeof AppRefresh === 'undefined' ? null : AppRefresh,
            AppUI: typeof AppUI === 'undefined' ? null : AppUI,
            DownloadController: typeof DownloadController === 'undefined' ? null : DownloadController,
            FilterView: typeof FilterView === 'undefined' ? null : FilterView,
            FilterController: typeof FilterController === 'undefined' ? null : FilterController,
            TimelineController: typeof TimelineController === 'undefined' ? null : TimelineController,
            NavigationController: typeof NavigationController === 'undefined' ? null : NavigationController,
            StatsController: typeof StatsController === 'undefined' ? null : StatsController,
            ModalView: typeof ModalView === 'undefined' ? null : ModalView,
            ModalFormController: typeof ModalFormController === 'undefined' ? null : ModalFormController,
            ModalMobileController: typeof ModalMobileController === 'undefined' ? null : ModalMobileController,
            ModalInteractions: typeof ModalInteractions === 'undefined' ? null : ModalInteractions,
            ModalController: typeof ModalController === 'undefined' ? null : ModalController,
            SettingsController: typeof SettingsController === 'undefined' ? null : SettingsController,
            UIStack: typeof UIStack === 'undefined' ? null : UIStack,
            HistoryController: typeof HistoryController === 'undefined' ? null : HistoryController,
            UIStackEffects: typeof UIStackEffects === 'undefined' ? null : UIStackEffects,
            UIStackController: typeof UIStackController === 'undefined' ? null : UIStackController,
            ConfirmDialog: typeof ConfirmDialog === 'undefined' ? null : ConfirmDialog,
            ConfirmController: typeof ConfirmController === 'undefined' ? null : ConfirmController,
            ThemeController: typeof ThemeController === 'undefined' ? null : ThemeController,
            ToastController: typeof ToastController === 'undefined' ? null : ToastController,
            CATEGORIES: typeof CATEGORIES === 'undefined' ? [] : CATEGORIES,
            PAYMENT_METHODS: typeof PAYMENT_METHODS === 'undefined' ? [] : PAYMENT_METHODS,
            ChartClass: typeof Chart === 'undefined' ? null : Chart,
            FileReaderClass: typeof FileReader === 'undefined' ? null : FileReader,
            URL: typeof URL === 'undefined' ? null : URL,
            Blob: typeof Blob === 'undefined' ? null : Blob,
            requestAnimationFrame: getBoundGlobalFunction('requestAnimationFrame', callback => {
                callback();
                return null;
            }),
            cancelAnimationFrame: getBoundGlobalFunction('cancelAnimationFrame', noop),
            setTimeout: getBoundGlobalFunction('setTimeout', callback => {
                callback();
                return null;
            }),
            setInterval: getBoundGlobalFunction('setInterval', noop),
            clearInterval: getBoundGlobalFunction('clearInterval', noop)
        };
    }

    function create(app, overrides = {}) {
        const deps = {
            ...getDefaults(),
            ...overrides
        };

        const modalWiring = AppWiringModal.create({
            app,
            deps,
            core: {
                pushUiState,
                consumeUiState,
                runHistoryAction,
                confirmOptions,
                releaseFilterSearchBeforeModal
            }
        });

        const api = {
            deps,
            historyOptions,
            runHistoryAction,
            pushUiState,
            consumeUiState,
            themeOptions,
            navigationOptions,
            filterOptions,
            inputBarOptions,
            expenseInputOptions,
            expenseSubmitOptions,
            timelineOptions,
            modalMobileOptions: modalWiring.modalMobileOptions,
            modalOptions: modalWiring.modalOptions,
            uiStackOptions,
            modalInteractionHooks: modalWiring.modalInteractionHooks,
            initSearchableDropdown: modalWiring.initSearchableDropdown,
            initTagInput: modalWiring.initTagInput,
            confirmOptions,
            statsOptions,
            settingsOptions,
            toastOptions,
            refreshOptions
        };

        function historyOptions() {
            return {
                stack: deps.UIStack,
                history: deps.history,
                setSuppressPopstate: value => { app._suppressNextPopstate = value; }
            };
        }

        function runHistoryAction(action) {
            return deps.HistoryController.run(action, historyOptions());
        }

        function pushUiState(state) {
            return runHistoryAction(deps.UIStack.pushState(state));
        }

        function consumeUiState(steps = 1) {
            return runHistoryAction(deps.UIStack.consumeState({ steps }));
        }

        function releaseFilterSearchBeforeModal() {
            if (!deps.FilterController || typeof deps.FilterController.releaseFilterSearchInteraction !== 'function') {
                return false;
            }

            return deps.FilterController.releaseFilterSearchInteraction(filterOptions(), {
                consumeHistory: false
            });
        }

        function themeOptions() {
            return {
                storage: deps.Storage,
                document: deps.document,
                window: deps.window,
                onTemporaryThemeChange: () => {
                    if (app.currentPage === 'stats') app.renderStats();
                }
            };
        }

        function navigationOptions() {
            return {
                document: deps.document,
                pageScrollTop: app.pageScrollTop,
                getCurrentPage: () => app.currentPage,
                setCurrentPage: page => { app.currentPage = page; },
                isRestoringPageScroll: () => app._restoringPageScroll,
                setRestoringPageScroll: value => { app._restoringPageScroll = value; },
                getNavigationHistoryAction: payload => deps.UIStack.getNavigationHistoryAction(payload),
                runHistoryAction,
                isFilterOpen: () => app.filterOpen,
                shouldHideTimelineInputBar: () => app.advancedFiltersOpen,
                closeFilterPanel: () => deps.FilterController.closeFilterPanel(filterOptions()),
                updateAppMainPadding: () => deps.InputBarController.updateAppMainPadding(inputBarOptions()),
                renderTimeline: () => app.renderTimeline(),
                renderStats: () => app.renderStats(),
                renderSettings: () => app.renderSettings(),
                requestAnimationFrame: callback => deps.requestAnimationFrame(callback),
                defer: callback => deps.setTimeout(callback, 0)
            };
        }

        function filterOptions() {
            return {
                document: deps.document,
                body: deps.document.body,
                filters: app.filters,
                categories: deps.CATEGORIES,
                methods: deps.PAYMENT_METHODS,
                getSpese: () => deps.ExpenseStore.getSpese(),
                getSliderMax: spese => deps.FilterView.getSliderMax(spese),
                renderChips: items => deps.FilterView.renderChips(items),
                renderFooterInfo: payload => deps.FilterView.renderFooterInfo(payload),
                getQuickTotals: spese => deps.StatsData.getQuickTotals(spese),
                countActiveFilters: () => deps.ExpenseFilters.countActive(app.filters),
                applyFilters: spese => deps.ExpenseFilters.apply(spese, app.filters),
                getFilterModel: () => deps.ExpenseQuery.buildFilterModel({
                    spese: deps.ExpenseStore.getSpese(),
                    filters: app.filters
                }),
                getFilterOpen: () => app.filterOpen,
                setFilterOpen: value => { app.filterOpen = value; },
                getAdvancedFiltersOpen: () => app.advancedFiltersOpen,
                setAdvancedFiltersOpen: value => { app.advancedFiltersOpen = value; },
                getFilterSearchActive: () => app._filterSearchActive,
                setFilterSearchActive: value => { app._filterSearchActive = value; },
                getCurrentPage: () => app.currentPage,
                getLastSliderInput: () => app._lastSliderInput,
                setLastSliderInput: value => { app._lastSliderInput = value; },
                getSliderMaxValue: () => app.sliderMax,
                setSliderMaxValue: value => { app.sliderMax = value; },
                setLastViewportHeight: value => { app._lastViewportHeight = value; },
                getViewportHeight: () => deps.ModalMobileController.getViewportHeight(modalWiring.modalMobileOptions()),
                startExpenseInputBarWatch: () => deps.InputBarController.startWatch(inputBarOptions()),
                stopExpenseInputBarWatch: () => deps.InputBarController.stopWatch(inputBarOptions()),
                pushUiState,
                consumeUiState: steps => consumeUiState(steps),
                runHistoryAction,
                getCloseHistoryAction: payload => deps.UIStack.getCloseHistoryAction(payload),
                updateAppMainPadding: () => deps.InputBarController.updateAppMainPadding(inputBarOptions()),
                markReleasedFilterSearchHistory: () => { app._releasedFilterSearchHistory = true; },
                shouldCleanupReleasedFilterSearchHistory: () => app._releasedFilterSearchHistory,
                clearReleasedFilterSearchHistory: () => { app._releasedFilterSearchHistory = false; },
                onFilterChange: () => app.onFilterChange(),
                showToast: (message, type) => app.showToast(message, type),
                requestAnimationFrame: callback => deps.requestAnimationFrame(callback)
            };
        }

        function inputBarOptions() {
            return {
                document: deps.document,
                window: deps.window,
                isExpenseInputActive: () => app._expenseInputActive,
                isFilterSearchActive: () => app._filterSearchActive,
                isFilterOpen: () => app.filterOpen,
                getRafId: () => app._expenseInputBarRaf,
                setRafId: value => { app._expenseInputBarRaf = value; },
                getResizeHandler: () => app._expenseInputResizeHandler,
                setResizeHandler: value => { app._expenseInputResizeHandler = value; },
                requestAnimationFrame: callback => deps.requestAnimationFrame(callback),
                cancelAnimationFrame: id => deps.cancelAnimationFrame(id),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay)
            };
        }

        function expenseInputOptions() {
            return {
                document: deps.document,
                window: deps.window,
                onSubmit: () => app.submitExpense(),
                onVoiceError: () => app.showToast('Non ho capito. Riprova.', 'error'),
                isInputActive: () => app._expenseInputActive,
                setInputActive: value => { app._expenseInputActive = value; },
                getViewportHeight: () => deps.ModalMobileController.getViewportHeight(modalWiring.modalMobileOptions()),
                setLastViewportHeight: value => { app._lastViewportHeight = value; },
                pushInputState: () => pushUiState({ panel: 'expense-input' }),
                consumeInputState: () => consumeUiState(),
                startInputBarWatch: () => deps.InputBarController.startWatch(inputBarOptions()),
                stopInputBarWatch: () => deps.InputBarController.stopWatch(inputBarOptions()),
                scheduleInputBarPositionUpdate: force => deps.InputBarController.schedulePositionUpdate(inputBarOptions(), force),
                updateAppMainPadding: () => deps.InputBarController.updateAppMainPadding(inputBarOptions())
            };
        }

        function expenseSubmitOptions() {
            return {
                document: deps.document,
                actions: deps.ExpenseActions,
                parser: deps.Parser,
                storage: deps.Storage,
                categories: deps.CATEGORIES,
                ui: deps.AppUI,
                setNewCardId: id => { app.newCardId = id; },
                refreshAfterAdd: () => app.refreshExpenseViews({ updateFilterSlider: true }),
                showToast: (message, type) => app.showToast(message, type)
            };
        }

        function timelineOptions(filterModel = null) {
            return {
                document: deps.document,
                spese: filterModel ? filterModel.allSpese : deps.ExpenseStore.getSpese(),
                filterModel,
                newCardId: app.newCardId,
                hasActiveFilters: () => deps.ExpenseFilters.hasActive(app.filters),
                applyFilters: spese => deps.ExpenseFilters.apply(spese, app.filters),
                getQuickTotals: spese => deps.StatsData.getQuickTotals(spese),
                groupByDay: spese => deps.StatsData.groupByDay(spese),
                getCategory: id => deps.AppUI.getCategory(id, deps.CATEGORIES),
                getMethod: id => deps.AppUI.getMethod(id, deps.PAYMENT_METHODS),
                formatDayLabel: date => deps.AppUI.formatDayLabel(date),
                clearNewCardId: () => { app.newCardId = null; },
                openEditModal: id => deps.ModalController.open(modalWiring.modalOptions(), id)
            };
        }

        function uiStackOptions() {
            return {
                document: deps.document,
                stack: deps.UIStack,
                effects: deps.UIStackEffects,
                getSuppressNextPopstate: () => app._suppressNextPopstate,
                setSuppressNextPopstate: value => { app._suppressNextPopstate = value; },
                isConfirmOpen: () => deps.ConfirmController.isOpen(confirmOptions()),
                closeConfirm: fromPopstate => deps.ConfirmController.close({
                    ...confirmOptions(),
                    fromPopstate
                }),
                isReleaseModalOpen: () => deps.SettingsController.isReleaseModalOpen(settingsOptions()),
                closeReleaseModal: fromPopstate => deps.SettingsController.closeReleaseModal(
                    settingsOptions(),
                    fromPopstate
                ),
                isModalOpen: () => deps.ModalController.isOpen(modalWiring.modalOptions()),
                closeModal: fromPopstate => deps.ModalController.close(modalWiring.modalOptions(), fromPopstate),
                isFilterSearchActive: () => app._filterSearchActive,
                setFilterSearchActive: value => { app._filterSearchActive = value; },
                isExpenseInputActive: () => app._expenseInputActive,
                setExpenseInputActive: value => { app._expenseInputActive = value; },
                isAdvancedFiltersOpen: () => app.advancedFiltersOpen,
                closeAdvancedFilters: fromPopstate => deps.FilterController.closeAdvancedFilters(
                    filterOptions(),
                    fromPopstate
                ),
                isFilterOpen: () => app.filterOpen,
                closeFilterPanel: fromPopstate => deps.FilterController.closeFilterPanel(
                    filterOptions(),
                    fromPopstate
                ),
                getCurrentPage: () => app.currentPage,
                navigateTo: (page, fromPopstate) => deps.NavigationController.navigateTo(
                    navigationOptions(),
                    page,
                    fromPopstate
                ),
                stopExpenseInputBarWatch: () => deps.InputBarController.stopWatch(inputBarOptions()),
                isModalInteractionActive: () => app._modalInteractionActive,
                setModalInteractionActive: value => { app._modalInteractionActive = value; },
                setModalInteractionReleaseSuspended: value => { app._suspendInteractionRelease = value; },
                hasOpenModalDropdown: () => !!deps.ModalMobileController.getOpenDropdown(modalWiring.modalMobileOptions()),
                hasActivePlainModalField: () => !!deps.ModalMobileController.getActivePlainField(modalWiring.modalMobileOptions()),
                clearModalSelection: () => deps.ModalMobileController.clearSelection(modalWiring.modalMobileOptions()),
                pushModalHistoryState: () => deps.ModalMobileController.pushHistoryState(modalWiring.modalMobileOptions())
            };
        }

        function confirmOptions() {
            return {
                document: deps.document,
                dialog: deps.ConfirmDialog,
                stack: deps.UIStack,
                pushUiState,
                runHistoryAction
            };
        }

        function statsOptions(filterModel = null) {
            const allSpese = filterModel ? filterModel.allSpese : deps.ExpenseStore.getSpese();
            const statsModel = deps.ExpenseQuery.buildStatsModel({
                spese: allSpese,
                filters: app.filters,
                period: app.statsPeriod,
                offset: app.statsOffset
            });

            return {
                document: deps.document,
                container: deps.document.getElementById('stats-content'),
                spese: allSpese,
                statsModel,
                period: app.statsPeriod,
                offset: app.statsOffset,
                filters: app.filters,
                charts: {
                    doughnut: app.chartDoughnut,
                    bar: app.chartBar
                },
                ChartClass: deps.ChartClass,
                getCategory: id => deps.AppUI.getCategory(id, deps.CATEGORIES),
                applyNonDateFilters: spese => deps.ExpenseFilters.applyNonDate(spese, app.filters),
                setPeriod: period => { app.statsPeriod = period; },
                setOffset: offset => { app.statsOffset = offset; },
                rerender: () => app.renderStats()
            };
        }

        function settingsOptions() {
            return {
                container: deps.document.getElementById('settings-content'),
                document: deps.document,
                storage: deps.Storage,
                getSpese: () => deps.ExpenseStore.getSpese(),
                FileReaderClass: deps.FileReaderClass,
                fetchFn: deps.window.fetch ? deps.window.fetch.bind(deps.window) : null,
                locationLike: deps.window.location,
                window: deps.window,
                setTimeout: deps.window.setTimeout ? deps.window.setTimeout.bind(deps.window) : null,
                appConfig: deps.window.SPESA_TRACKER_CONFIG || {},
                localStorage: deps.window.localStorage,
                getCurrentPage: () => app.currentPage,
                pushUiState,
                consumeUiState: steps => consumeUiState(steps),
                dateStamp: () => deps.AppUI.dateStamp(),
                download: (content, filename, mime) => deps.DownloadController.download(content, filename, mime, {
                    document: deps.document,
                    URL: deps.URL,
                    Blob: deps.Blob
                }),
                showToast: (message, type) => app.showToast(message, type),
                showChoices: (message, choices) => deps.ConfirmController.showChoices({
                    ...confirmOptions(),
                    message,
                    choices
                }),
                showConfirm: (message, onYes) => deps.ConfirmController.showConfirm({
                    ...confirmOptions(),
                    message,
                    onYes
                }),
                applyTheme: theme => deps.ThemeController.applyTheme(theme, {
                    document: deps.document,
                    window: deps.window
                }),
                refreshSettings: () => app.renderSettings(),
                refreshAfterDataChange: () => app.refreshExpenseViews({ includeSettings: true })
            };
        }

        function toastOptions() {
            return {
                document: deps.document,
                window: deps.window,
                isExpenseInputActive: () => app._expenseInputActive
            };
        }

        function refreshOptions(options = {}) {
            return {
                invalidateSpeseCache: () => deps.ExpenseStore.invalidate(),
                updateFilterSlider: !!options.updateFilterSlider,
                isFilterOpen: () => app.filterOpen,
                recalcSliderMax: () => deps.FilterController.recalcSliderMax(filterOptions()),
                updateFilterBadge: () => {
                    if (!deps.FilterController || typeof deps.FilterController.updateFilterBadge !== 'function') {
                        return;
                    }

                    const filterModel = deps.ExpenseQuery.buildFilterModel({
                        spese: deps.ExpenseStore.getSpese(),
                        filters: app.filters
                    });

                    deps.FilterController.updateFilterBadge({
                        ...filterOptions(),
                        filterModel
                    });
                },
                getCurrentPage: () => app.currentPage,
                renderTimeline: () => app.renderTimeline(),
                renderStats: () => app.renderStats(),
                includeSettings: !!options.includeSettings,
                renderSettings: () => app.renderSettings()
            };
        }

        return api;
    }

    return {
        create
    };
})();
