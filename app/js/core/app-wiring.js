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
            TimelineSelectionController: typeof TimelineSelectionController === 'undefined' ? null : TimelineSelectionController,
            NavigationController: typeof NavigationController === 'undefined' ? null : NavigationController,
            StatsController: typeof StatsController === 'undefined' ? null : StatsController,
            ModalView: typeof ModalView === 'undefined' ? null : ModalView,
            ModalFormController: typeof ModalFormController === 'undefined' ? null : ModalFormController,
            ModalMobileController: typeof ModalMobileController === 'undefined' ? null : ModalMobileController,
            ModalInteractions: typeof ModalInteractions === 'undefined' ? null : ModalInteractions,
            ModalController: typeof ModalController === 'undefined' ? null : ModalController,
            SettingsActions: typeof SettingsActions === 'undefined' ? null : SettingsActions,
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
            clearTimeout: getBoundGlobalFunction('clearTimeout', noop),
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
            timelineSelectionOptions,
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
                setSuppressPopstate
            };
        }

        function runHistoryAction(action) {
            return deps.HistoryController.run(action, historyOptions());
        }

        function hasSuppressedPopstate() {
            return !!app._suppressNextPopstate || Number(app._suppressPopstateCount || 0) > 0;
        }

        function setSuppressPopstate(value) {
            if (value) {
                app._suppressPopstateCount = Number(app._suppressPopstateCount || 0) + 1;
            } else if (Number(app._suppressPopstateCount || 0) > 0) {
                app._suppressPopstateCount -= 1;
            } else {
                app._suppressNextPopstate = false;
            }

            app._suppressNextPopstate = Number(app._suppressPopstateCount || 0) > 0;

            if (!app._suppressNextPopstate) {
                flushAfterSuppressedPopstates();
            }
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

        function afterSuppressedPopstates(callback) {
            if (typeof callback !== 'function') return;

            if (!hasSuppressedPopstate()) {
                callback();
                return;
            }

            if (!Array.isArray(app._afterSuppressedPopstates)) {
                app._afterSuppressedPopstates = [];
            }

            app._afterSuppressedPopstates.push(callback);
        }

        function flushAfterSuppressedPopstates() {
            if (!Array.isArray(app._afterSuppressedPopstates) || app._afterSuppressedPopstates.length === 0) {
                return;
            }

            const callbacks = app._afterSuppressedPopstates.slice();
            app._afterSuppressedPopstates = [];
            deps.setTimeout(() => {
                callbacks.forEach(callback => callback());
            }, 0);
        }

        function exitSelectionForSettingsNavigation() {
            let steps = 0;
            const hadFilterSearch = !!app._filterSearchActive;
            const hadAdvancedFilters = !!app.advancedFiltersOpen;
            const hadFilterPanel = !!app.filterOpen;

            if (
                hadFilterSearch &&
                deps.FilterController &&
                typeof deps.FilterController.releaseFilterSearchInteraction === 'function'
            ) {
                const released = deps.FilterController.releaseFilterSearchInteraction(filterOptions(), {
                    consumeHistory: false
                });

                if (released) {
                    app._releasedFilterSearchHistory = false;
                    steps += 1;
                }
            }

            if (
                hadFilterPanel &&
                deps.FilterController &&
                typeof deps.FilterController.closeFilterPanel === 'function'
            ) {
                deps.FilterController.closeFilterPanel(filterOptions(), true);
                steps += hadAdvancedFilters ? 2 : 1;
            } else if (
                hadAdvancedFilters &&
                deps.FilterController &&
                typeof deps.FilterController.closeAdvancedFilters === 'function'
            ) {
                deps.FilterController.closeAdvancedFilters(filterOptions(), true);
                steps += 1;
            }

            if (
                app.timelineSelectionActive &&
                deps.TimelineSelectionController &&
                typeof deps.TimelineSelectionController.exit === 'function'
            ) {
                deps.TimelineSelectionController.exit(timelineSelectionOptions(), true);
                steps += 1;
            }

            if (steps > 0) {
                consumeUiState(steps);
            }
        }

        function getTimelineSelectedIdsForFilters() {
            return app.timelineSelectionActive ? app.timelineSelectedIds : new Set();
        }

        function getSelectedOnlyIdsForFilters() {
            if (!app.timelineSelectionActive) return new Set();
            if (!app.filters.selectedOnly && !app.filters.excludedSelectedOnly) {
                return app.timelineSelectedIds;
            }
            return app.filters.selectedOnlyIds instanceof Set
                ? app.filters.selectedOnlyIds
                : new Set();
        }

        function buildCurrentFilterModel() {
            return deps.ExpenseQuery.buildFilterModel({
                spese: deps.ExpenseStore.getSpese(),
                filters: app.filters,
                selectedIds: getTimelineSelectedIdsForFilters(),
                selectedOnlyIds: getSelectedOnlyIdsForFilters()
            });
        }

        function syncFiltersAndViews(filterModel = null) {
            const model = filterModel || buildCurrentFilterModel();

            if (typeof app.syncActiveFiltersHistory === 'function') {
                app.syncActiveFiltersHistory(model.hasActiveFilters);
            }

            deps.FilterController.updateFilterBadge({
                ...filterOptions(),
                filterModel: model
            });

            if (typeof deps.FilterController.syncFilterUI === 'function') {
                deps.FilterController.syncFilterUI(filterOptions());
            }

            if (app.currentPage === 'timeline') app.renderTimeline(model);
            if (app.currentPage === 'stats') app.renderStats(model);
        }

        function applyFilterSnapshot(snapshot = {}, selectedIds = []) {
            const filters = deps.SettingsActions && typeof deps.SettingsActions.normalizeFilterSnapshot === 'function'
                ? deps.SettingsActions.normalizeFilterSnapshot(snapshot)
                : snapshot;

            app.filters.query = filters.query || '';
            app.filters.categories = new Set(filters.categories || []);
            app.filters.excludedCategories = new Set(filters.excludedCategories || []);
            app.filters.methods = new Set(filters.methods || []);
            app.filters.excludedMethods = new Set(filters.excludedMethods || []);
            app.filters.amountMin = Number(filters.amountMin || 0);
            app.filters.amountMax = filters.amountMax === Infinity
                ? Infinity
                : Number(filters.amountMax);
            app.filters.dateFrom = filters.dateFrom || '';
            app.filters.dateTo = filters.dateTo || '';
            app.filters.selectedOnly = !!filters.selectedOnly;
            app.filters.excludedSelectedOnly = !!filters.excludedSelectedOnly;
            app.filters.selectedOnlyIds = filters.selectedOnly || filters.excludedSelectedOnly
                ? new Set(selectedIds || [])
                : new Set();

            syncFiltersAndViews();
        }

        function createCurrentFilterSnapshot() {
            if (deps.SettingsActions && typeof deps.SettingsActions.createExportFilterSnapshot === 'function') {
                return deps.SettingsActions.createExportFilterSnapshot(app.filters);
            }

            return {
                query: app.filters.query || '',
                categories: Array.from(app.filters.categories || []),
                excludedCategories: Array.from(app.filters.excludedCategories || []),
                methods: Array.from(app.filters.methods || []),
                excludedMethods: Array.from(app.filters.excludedMethods || []),
                amountMin: Number(app.filters.amountMin || 0),
                amountMax: app.filters.amountMax === Infinity ? Infinity : Number(app.filters.amountMax),
                dateFrom: app.filters.dateFrom || '',
                dateTo: app.filters.dateTo || '',
                selectedOnly: !!app.filters.selectedOnly,
                excludedSelectedOnly: !!app.filters.excludedSelectedOnly
            };
        }

        function rememberFiltersBeforeSelection() {
            if (app.timelineSelectionActive || app.timelineSelectionBaseFilters) return;

            app.timelineSelectionBaseFilters = createCurrentFilterSnapshot();
        }

        function restoreFiltersAfterSelection() {
            const snapshot = app.timelineSelectionBaseFilters;
            app.timelineSelectionBaseFilters = null;
            if (!snapshot) return;

            applyFilterSnapshot(snapshot, []);
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
                syncTimelineSelectionHeader: () => deps.TimelineSelectionController.syncHeader(
                    timelineSelectionOptions()
                ),
                shouldConfirmSettingsNavigation: () => app.timelineSelectionActive,
                confirmSettingsNavigation: continueNavigation => deps.ConfirmController.showChoices({
                    ...confirmOptions(),
                    message: 'Uscire da Selezione?',
                    choices: [
                        { text: 'Annulla', className: 'btn-secondary' },
                        {
                            text: 'Esci',
                            className: 'btn-primary',
                            onClick: () => {
                                exitSelectionForSettingsNavigation();
                                if (typeof continueNavigation === 'function') {
                                    afterSuppressedPopstates(continueNavigation);
                                }
                            }
                        }
                    ]
                }),
                renderTimeline: () => app.renderTimeline(),
                renderStats: () => app.renderStats(),
                renderSettings: () => app.renderSettings(),
                getCurrentPage: () => app.currentPage,
                isTimelineSelectionActive: () => app.timelineSelectionActive,
                requestAnimationFrame: callback => deps.requestAnimationFrame(callback),
                defer: callback => deps.setTimeout(callback, 0),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay)
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
                applyFilters: spese => deps.ExpenseFilters.apply(spese, app.filters, {
                    selectedIds: getTimelineSelectedIdsForFilters(),
                    selectedOnlyIds: getSelectedOnlyIdsForFilters()
                }),
                getFilterModel: () => deps.ExpenseQuery.buildFilterModel({
                    spese: deps.ExpenseStore.getSpese(),
                    filters: app.filters,
                    selectedIds: getTimelineSelectedIdsForFilters(),
                    selectedOnlyIds: getSelectedOnlyIdsForFilters()
                }),
                storage: deps.Storage,
                localStorage: (() => {
                    try {
                        return deps.window && deps.window.localStorage
                            ? deps.window.localStorage
                            : null;
                    } catch (_) {
                        return null;
                    }
                })(),
                createFilterSnapshot: createCurrentFilterSnapshot,
                applyFilterSnapshot,
                normalizeFilterSnapshot: value => deps.SettingsActions.normalizeFilterSnapshot(value),
                pageScrollTop: app.pageScrollTop,
                getFilterOpen: () => app.filterOpen,
                setFilterOpen: value => { app.filterOpen = value; },
                getAdvancedFiltersOpen: () => app.advancedFiltersOpen,
                setAdvancedFiltersOpen: value => { app.advancedFiltersOpen = value; },
                getFilterSearchActive: () => app._filterSearchActive,
                setFilterSearchActive: value => { app._filterSearchActive = value; },
                getCurrentPage: () => app.currentPage,
                isTimelineSelectionActive: () => app.currentPage !== 'settings' && app.timelineSelectionActive,
                getTimelineSelectedIds: () => app.timelineSelectedIds,
                setSelectedOnlyFilter: (value, selectedIds = null, excluded = false) => {
                    app.filters.selectedOnly = !!value;
                    app.filters.excludedSelectedOnly = !value && !!excluded;
                    app.filters.selectedOnlyIds = value || excluded
                        ? new Set(selectedIds || app.timelineSelectedIds)
                        : new Set();
                },
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
                requestAnimationFrame: callback => deps.requestAnimationFrame(callback),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay),
                clearTimeout: timerId => deps.clearTimeout(timerId)
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
                applyFilters: spese => deps.ExpenseFilters.apply(spese, app.filters, {
                    selectedIds: getTimelineSelectedIdsForFilters(),
                    selectedOnlyIds: getSelectedOnlyIdsForFilters()
                }),
                getQuickTotals: spese => deps.StatsData.getQuickTotals(spese),
                groupByDay: spese => deps.StatsData.groupByDay(spese),
                getCategory: id => deps.AppUI.getCategory(id, deps.CATEGORIES),
                getMethod: id => deps.AppUI.getMethod(id, deps.PAYMENT_METHODS),
                formatDayLabel: date => deps.AppUI.formatDayLabel(date),
                clearNewCardId: () => { app.newCardId = null; },
                openEditModal: id => deps.ModalController.open(modalWiring.modalOptions(), id),
                selection: {
                    active: app.timelineSelectionActive,
                    selectedIds: app.timelineSelectedIds,
                    deletePending: app.timelineSelectionDeletePending
                },
                getSelectionSummary: (filtered, allSpese) => deps.TimelineSelectionController.getSummary(
                    timelineSelectionOptions(),
                    filtered,
                    allSpese
                ),
                onSelectionSummary: summary => deps.TimelineSelectionController.syncHeader(
                    timelineSelectionOptions(),
                    summary
                ),
                isSelectionActive: () => app.timelineSelectionActive,
                enterSelection: id => deps.TimelineSelectionController.enter(timelineSelectionOptions(), id),
                toggleSelection: id => deps.TimelineSelectionController.toggle(timelineSelectionOptions(), id),
                setTimeout: (callback, delay) => deps.setTimeout(callback, delay),
                clearTimeout: id => deps.clearTimeout(id)
            };
        }

        function timelineSelectionOptions() {
            return {
                document: deps.document,
                appConfig: deps.window.SPESA_TRACKER_CONFIG || {},
                storage: deps.Storage,
                getSpese: () => deps.ExpenseStore.getSpese(),
                getFilterModel: () => deps.ExpenseQuery.buildFilterModel({
                    spese: deps.ExpenseStore.getSpese(),
                    filters: app.filters,
                    selectedIds: getTimelineSelectedIdsForFilters(),
                    selectedOnlyIds: getSelectedOnlyIdsForFilters()
                }),
                getSelectedIds: () => app.timelineSelectedIds,
                setSelectedIds: ids => { app.timelineSelectedIds = ids; },
                isActive: () => app.timelineSelectionActive,
                setActive: value => { app.timelineSelectionActive = value; },
                isDeletePending: () => app.timelineSelectionDeletePending,
                setDeletePending: value => { app.timelineSelectionDeletePending = value; },
                getCurrentPage: () => app.currentPage,
                setSelectedOnlyFilter: (value, selectedIds = null, excluded = false) => {
                    app.filters.selectedOnly = !!value;
                    app.filters.excludedSelectedOnly = !value && !!excluded;
                    app.filters.selectedOnlyIds = value || excluded
                        ? new Set(selectedIds || app.timelineSelectedIds)
                        : new Set();
                },
                rememberFiltersBeforeSelection,
                restoreFiltersAfterSelection,
                pushUiState,
                consumeUiState: steps => consumeUiState(steps),
                renderTimeline: () => app.renderTimeline(),
                onSelectionChange: () => syncFiltersAndViews(),
                refreshAfterDataChange: () => app.refreshExpenseViews({
                    updateFilterSlider: true,
                    includeSettings: app.currentPage === 'settings'
                }),
                dateStamp: () => deps.AppUI.dateStamp(),
                download: (content, filename, mime) => deps.DownloadController.download(content, filename, mime, {
                    document: deps.document,
                    URL: deps.URL,
                    Blob: deps.Blob
                }),
                openCustomExportModal: () => {
                    const options = settingsOptions();
                    deps.SettingsController.bindExportModal(options);
                    deps.SettingsController.openExportModal(options, {
                        keepCurrentSelection: true
                    });
                },
                closeFiltersForSelectionAction: continueAction => {
                    if (!app.filterOpen) return false;

                    deps.FilterController.closeFilterPanel(filterOptions());
                    deps.setTimeout(() => {
                        deps.setTimeout(() => {
                            if (typeof continueAction === 'function') continueAction();
                        }, 0);
                    }, 0);
                    return true;
                },
                navigatorLike: deps.window.navigator,
                showToast: (message, type) => app.showToast(message, type),
                showChoices: (message, choices) => deps.ConfirmController.showChoices({
                    ...confirmOptions(),
                    message,
                    choices
                })
            };
        }

        function uiStackOptions() {
            return {
                document: deps.document,
                stack: deps.UIStack,
                effects: deps.UIStackEffects,
                getSuppressNextPopstate: hasSuppressedPopstate,
                setSuppressNextPopstate: setSuppressPopstate,
                isConfirmOpen: () => deps.ConfirmController.isOpen(confirmOptions()),
                closeConfirm: fromPopstate => {
                    const result = deps.ConfirmController.close({
                        ...confirmOptions(),
                        fromPopstate
                    });

                    if (app.timelineSelectionDeletePending) {
                        deps.TimelineSelectionController.clearDeletePending(timelineSelectionOptions());
                    }

                    return result;
                },
                isExportModalOpen: () => deps.SettingsController.isExportModalOpen(settingsOptions()),
                isExportFormatDropdownOpen: () => deps.SettingsController.isExportFormatDropdownOpen(settingsOptions()),
                clearExportModalInteraction: fromPopstate => deps.SettingsController.clearExportModalInteraction(
                    settingsOptions(),
                    fromPopstate
                ),
                closeExportModal: fromPopstate => deps.SettingsController.closeExportModal(
                    settingsOptions(),
                    fromPopstate
                ),
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
                isTimelineSelectionActive: () => app.currentPage === 'timeline' && app.timelineSelectionActive,
                closeTimelineSelection: fromPopstate => deps.TimelineSelectionController.exit(
                    timelineSelectionOptions(),
                    fromPopstate
                ),
                hasActiveFilters: () => deps.ExpenseFilters.hasActive(app.filters),
                resetFilters: () => {
                    if (typeof app.syncActiveFiltersHistory === 'function') {
                        app.syncActiveFiltersHistory(false, {
                            consumeWhenCleared: false
                        });
                    } else {
                        app._activeFiltersHistory = false;
                    }

                    deps.FilterController.resetFilters(filterOptions(), {
                        showToast: false
                    });
                },
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
                offset: app.statsOffset,
                selectedIds: getTimelineSelectedIdsForFilters(),
                selectedOnlyIds: getSelectedOnlyIdsForFilters()
            });

            return {
                document: deps.document,
                container: deps.document.getElementById('stats-content'),
                spese: allSpese,
                statsModel,
                period: app.statsPeriod,
                offset: app.statsOffset,
                filters: app.filters,
                selectedIds: getTimelineSelectedIdsForFilters(),
                charts: {
                    doughnut: app.chartDoughnut,
                    bar: app.chartBar
                },
                ChartClass: deps.ChartClass,
                getCategory: id => deps.AppUI.getCategory(id, deps.CATEGORIES),
                applyNonDateFilters: spese => deps.ExpenseFilters.applyNonDate(spese, app.filters, {
                    selectedIds: getTimelineSelectedIdsForFilters(),
                    selectedOnlyIds: getSelectedOnlyIdsForFilters()
                }),
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
                getTimelineSelectedIds: () => app.timelineSelectedIds,
                getCurrentFilters: () => app.filters,
                applyExportFilters: applyFilterSnapshot,
                getFilteredIdsForExportFilters: (filters, selectedIds = []) => deps.ExpenseFilters
                    .apply(deps.ExpenseStore.getSpese(), filters, {
                        selectedIds,
                        selectedOnlyIds: selectedIds
                    })
                    .map(spesa => spesa && spesa.id)
                    .filter(Boolean),
                getSelectedSpese: () => deps.TimelineSelectionController.getSelectedSpese(
                    timelineSelectionOptions()
                ),
                countActiveFilters: () => deps.ExpenseFilters.countActive(app.filters),
                rememberFiltersBeforeSelection,
                beginExportSelection: config => deps.TimelineSelectionController.beginExportSelection(
                    timelineSelectionOptions(),
                    config
                ),
                isTimelineSelectionActive: () => app.timelineSelectionActive,
                exitTimelineSelection: fromPopstate => deps.TimelineSelectionController.exit(
                    timelineSelectionOptions(),
                    fromPopstate
                ),
                navigateToTimeline: () => {
                    consumeUiState(app.currentPage === 'timeline' ? 1 : 2);
                    deps.NavigationController.navigateTo(
                        navigationOptions(),
                        'timeline',
                        true
                    );
                },
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
                showConfirm: (message, onYes, dialogOptions = {}) => deps.ConfirmController.showConfirm({
                    ...confirmOptions(),
                    message,
                    onYes,
                    ...dialogOptions
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
                        filters: app.filters,
                        selectedIds: getTimelineSelectedIdsForFilters(),
                        selectedOnlyIds: getSelectedOnlyIdsForFilters()
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
