const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function readAppScript(relativePath) {
    return fs.readFileSync(path.join(root, 'app/js', relativePath), 'utf8');
}

function readAppFile(relativePath) {
    return fs.readFileSync(path.join(root, 'app', relativePath), 'utf8');
}

function readRepoFile(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readAppCss() {
    const html = readAppFile('index.html');
    const hrefs = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)]
        .map((match) => match[1])
        .filter((href) => !/^https?:\/\//i.test(href));
    assert(hrefs.length > 0, 'Nessun foglio di stile locale trovato in app/index.html');
    return hrefs.map((href) => readAppFile(href)).join('\n');
}

function normalizeStablePrecachePath(value) {
    return './' + String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.?\//, '');
}

function getLocalIndexAssetPaths() {
    const html = readAppFile('index.html');
    const paths = [];
    const attrPattern = /<(script|link)\b[^>]*\s(?:src|href)="([^"]+)"/g;
    let match;

    while ((match = attrPattern.exec(html))) {
        const value = match[2];
        if (!value || /^(https?:|data:|#)/i.test(value)) continue;
        paths.push(normalizeStablePrecachePath(value));
    }

    return Array.from(new Set(paths)).sort();
}

function getStableLaunchPrecachePaths() {
    const serviceWorker = readAppFile('stable-launch-service-worker.js');
    const listMatch = serviceWorker.match(/const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);

    assert(listMatch, 'PRECACHE_URLS non trovato in stable-launch-service-worker.js');

    return new Set(
        Array.from(listMatch[1].matchAll(/["']([^"']+)["']/g))
            .map(match => normalizeStablePrecachePath(match[1]))
    );
}

function getReleaseIndexAssetPaths(releasePath) {
    const html = readRepoFile(path.join(releasePath, 'index.html'));
    const paths = [];
    const attrPattern = /<(script|link)\b[^>]*\s(?:src|href)="([^"]+)"/g;
    let match;

    while ((match = attrPattern.exec(html))) {
        const value = match[2];
        if (!value || /^(https?:|data:|#)/i.test(value)) continue;
        paths.push(normalizeStablePrecachePath(value));
    }

    return Array.from(new Set(paths)).sort();
}

function getReleasePrecachePaths(releasePath) {
    const serviceWorker = readRepoFile(path.join(releasePath, 'service-worker.js'));
    const listMatch = serviceWorker.match(/const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);

    assert(listMatch, `PRECACHE_URLS non trovato in ${releasePath}/service-worker.js`);

    return new Set(
        Array.from(listMatch[1].matchAll(/["']([^"']+)["']/g))
            .map(match => normalizeStablePrecachePath(match[1]))
    );
}

function createLocalStorage() {
    const store = new Map();

    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        }
    };
}

function loadStorage() {
    const context = {
        console,
        localStorage: createLocalStorage(),
        window: {
            SPESA_TRACKER_CONFIG: {
                storageKey: 'test-storage'
            }
        }
    };

    vm.createContext(context);
    const schemaNormalizerCode = readAppScript('data/schema-normalizer.js');
    const csvCodecCode = readAppScript('data/csv-codec.js');
    const storageCode = readAppScript('data/storage.js');
    vm.runInContext(
        `${schemaNormalizerCode}\n${csvCodecCode}\n${storageCode}\nglobalThis.SchemaNormalizer = SchemaNormalizer;\nglobalThis.CsvCodec = CsvCodec;\nglobalThis.Storage = Storage;`,
        context
    );

    return {
        Storage: context.Storage,
        SchemaNormalizer: context.SchemaNormalizer,
        CsvCodec: context.CsvCodec,
        localStorage: context.localStorage
    };
}

function loadCatalog() {
    const context = { console };
    vm.createContext(context);

    const categoriesCode = readAppScript('domain/categories.js');
    vm.runInContext(
        `${categoriesCode}\nglobalThis.Catalog = Catalog;\nglobalThis.CATEGORIES = CATEGORIES;\nglobalThis.PAYMENT_METHODS = PAYMENT_METHODS;`,
        context
    );

    return {
        Catalog: context.Catalog,
        CATEGORIES: context.CATEGORIES,
        PAYMENT_METHODS: context.PAYMENT_METHODS
    };
}

function loadParser() {
    const context = { console };
    vm.createContext(context);

    const categoriesCode = readAppScript('domain/categories.js');
    const parserCode = readAppScript('domain/parser.js');
    vm.runInContext(
        `${categoriesCode}\n${parserCode}\nglobalThis.Catalog = Catalog;\nglobalThis.Parser = Parser;`,
        context
    );

    return context.Parser;
}

function loadFilters() {
    const context = { console };
    vm.createContext(context);

    const filtersCode = readAppScript('domain/filters.js');
    vm.runInContext(`${filtersCode}\nglobalThis.ExpenseFilters = ExpenseFilters;`, context);

    return context.ExpenseFilters;
}

function loadStats() {
    const context = { console };
    vm.createContext(context);

    const statsCode = readAppScript('domain/stats.js');
    vm.runInContext(`${statsCode}\nglobalThis.StatsData = StatsData;`, context);

    return context.StatsData;
}

function loadUiViews(globals = {}) {
    const context = { console, URL, ...globals };
    vm.createContext(context);

    const categoriesCode = readAppScript('domain/categories.js');
    const parserCode = readAppScript('domain/parser.js');
    const schemaNormalizerCode = readAppScript('data/schema-normalizer.js');
    const csvCodecCode = readAppScript('data/csv-codec.js');
    const expenseStoreCode = readAppScript('data/expense-store.js');
    const filtersCode = readAppScript('domain/filters.js');
    const statsCode = readAppScript('domain/stats.js');
    const expenseQueryCode = readAppScript('domain/expense-query.js');
    const appRefreshCode = readAppScript('core/app-refresh.js');
    const expenseActionsCode = readAppScript('domain/expense-actions.js');
    const expenseSubmitControllerCode = readAppScript('input/expense-submit-controller.js');
    const expenseInputControllerCode = readAppScript('input/expense-input-controller.js');
    const inputBarControllerCode = readAppScript('input/input-bar-controller.js');
    const uiCode = readAppScript('ui/ui-utils.js');
    const downloadControllerCode = readAppScript('ui/download-controller.js');
    const headerTitleControllerCode = readAppScript('ui/header-title-controller.js');
    const filterViewCode = readAppScript('filters/filter-view.js');
    const quickFilterControllerCode = readAppScript('filters/quick-filter-controller.js');
    const filterControllerCode = readAppScript('filters/filter-controller.js');
    const timelineViewCode = readAppScript('timeline/timeline-view.js');
    const timelineControllerCode = readAppScript('timeline/timeline-controller.js');
    const timelineSelectionControllerCode = readAppScript('timeline/timeline-selection-controller.js');
    const navigationControllerCode = readAppScript('navigation/navigation-controller.js');
    const statsViewCode = readAppScript('stats/stats-view.js');
    const statsChartsCode = readAppScript('stats/stats-charts.js');
    const statsControllerCode = readAppScript('stats/stats-controller.js');
    const modalViewCode = readAppScript('modal/modal-view.js');
    const modalFormControllerCode = readAppScript('modal/modal-form-controller.js');
    const modalMobileControllerCode = readAppScript('modal/modal-mobile-controller.js');
    const modalInteractionsCode = readAppScript('modal/modal-interactions.js');
    const modalControllerCode = readAppScript('modal/modal-controller.js');
    const settingsViewCode = readAppScript('settings/settings-view.js');
    const settingsActionsCode = readAppScript('settings/settings-actions.js');
    const releaseModalControllerCode = readAppScript('settings/release-modal-controller.js');
    const exportModalControllerCode = readAppScript('settings/export-modal-controller.js');
    const settingsControllerCode = readAppScript('settings/settings-controller.js');
    const uiStackCode = readAppScript('navigation/ui-stack.js');
    const historyControllerCode = readAppScript('navigation/history-controller.js');
    const uiStackEffectsCode = readAppScript('navigation/ui-stack-effects.js');
    const uiStackControllerCode = readAppScript('navigation/ui-stack-controller.js');
    const confirmDialogCode = readAppScript('ui/confirm-dialog.js');
    const confirmControllerCode = readAppScript('ui/confirm-controller.js');
    const themeControllerCode = readAppScript('ui/theme-controller.js');
    const toastControllerCode = readAppScript('ui/toast-controller.js');
    const appStateCode = readAppScript('core/app-state.js');
    const appWiringModalCode = readAppScript('core/app-wiring-modal.js');
    const appWiringCode = readAppScript('core/app-wiring.js');

    vm.runInContext(
        [
            categoriesCode,
            parserCode,
            schemaNormalizerCode,
            csvCodecCode,
            expenseStoreCode,
            filtersCode,
            statsCode,
            expenseQueryCode,
            appRefreshCode,
            expenseActionsCode,
            expenseSubmitControllerCode,
            expenseInputControllerCode,
            inputBarControllerCode,
            uiCode,
            downloadControllerCode,
            headerTitleControllerCode,
            filterViewCode,
            quickFilterControllerCode,
            filterControllerCode,
            timelineViewCode,
            timelineControllerCode,
            timelineSelectionControllerCode,
            navigationControllerCode,
            statsViewCode,
            statsChartsCode,
            statsControllerCode,
            modalViewCode,
            modalFormControllerCode,
            modalMobileControllerCode,
            modalInteractionsCode,
            modalControllerCode,
            settingsViewCode,
            settingsActionsCode,
            releaseModalControllerCode,
            exportModalControllerCode,
            settingsControllerCode,
            uiStackCode,
            historyControllerCode,
            uiStackEffectsCode,
            uiStackControllerCode,
            confirmDialogCode,
            confirmControllerCode,
            themeControllerCode,
            toastControllerCode,
            appStateCode,
            appWiringModalCode,
            appWiringCode,
            'globalThis.Catalog = Catalog;',
            'globalThis.CATEGORIES = CATEGORIES;',
            'globalThis.PAYMENT_METHODS = PAYMENT_METHODS;',
            'globalThis.Parser = Parser;',
            'globalThis.SchemaNormalizer = SchemaNormalizer;',
            'globalThis.CsvCodec = CsvCodec;',
            'globalThis.ExpenseStore = ExpenseStore;',
            'globalThis.ExpenseFilters = ExpenseFilters;',
            'globalThis.ExpenseQuery = ExpenseQuery;',
            'globalThis.AppRefresh = AppRefresh;',
            'globalThis.AppUI = AppUI;',
            'globalThis.DownloadController = DownloadController;',
            'globalThis.HeaderTitleController = HeaderTitleController;',
            'globalThis.ExpenseActions = ExpenseActions;',
            'globalThis.ExpenseSubmitController = ExpenseSubmitController;',
            'globalThis.ExpenseInputController = ExpenseInputController;',
            'globalThis.InputBarController = InputBarController;',
            'globalThis.FilterView = FilterView;',
            'globalThis.QuickFilterController = QuickFilterController;',
            'globalThis.FilterController = FilterController;',
            'globalThis.TimelineView = TimelineView;',
            'globalThis.TimelineController = TimelineController;',
            'globalThis.TimelineSelectionController = TimelineSelectionController;',
            'globalThis.NavigationController = NavigationController;',
            'globalThis.StatsView = StatsView;',
            'globalThis.StatsCharts = StatsCharts;',
            'globalThis.StatsController = StatsController;',
            'globalThis.ModalView = ModalView;',
            'globalThis.ModalFormController = ModalFormController;',
            'globalThis.ModalMobileController = ModalMobileController;',
            'globalThis.ModalInteractions = ModalInteractions;',
            'globalThis.ModalController = ModalController;',
            'globalThis.SettingsView = SettingsView;',
            'globalThis.SettingsActions = SettingsActions;',
            'globalThis.ReleaseModalController = ReleaseModalController;',
            'globalThis.ExportModalController = ExportModalController;',
            'globalThis.SettingsController = SettingsController;',
            'globalThis.UIStack = UIStack;',
            'globalThis.HistoryController = HistoryController;',
            'globalThis.UIStackEffects = UIStackEffects;',
            'globalThis.UIStackController = UIStackController;',
            'globalThis.ConfirmDialog = ConfirmDialog;',
            'globalThis.ConfirmController = ConfirmController;',
            'globalThis.ThemeController = ThemeController;',
            'globalThis.ToastController = ToastController;',
            'globalThis.AppState = AppState;',
            'globalThis.AppWiringModal = AppWiringModal;',
            'globalThis.AppWiring = AppWiring;'
        ].join('\n'),
        context
    );

    return {
        Catalog: context.Catalog,
        CATEGORIES: context.CATEGORIES,
        PAYMENT_METHODS: context.PAYMENT_METHODS,
        Parser: context.Parser,
        SchemaNormalizer: context.SchemaNormalizer,
        CsvCodec: context.CsvCodec,
        AppUI: context.AppUI,
        DownloadController: context.DownloadController,
        HeaderTitleController: context.HeaderTitleController,
        ExpenseStore: context.ExpenseStore,
        ExpenseQuery: context.ExpenseQuery,
        AppRefresh: context.AppRefresh,
        ExpenseActions: context.ExpenseActions,
        ExpenseSubmitController: context.ExpenseSubmitController,
        ExpenseInputController: context.ExpenseInputController,
        InputBarController: context.InputBarController,
        FilterView: context.FilterView,
        QuickFilterController: context.QuickFilterController,
        FilterController: context.FilterController,
        TimelineView: context.TimelineView,
        TimelineController: context.TimelineController,
        TimelineSelectionController: context.TimelineSelectionController,
        NavigationController: context.NavigationController,
        StatsView: context.StatsView,
        StatsCharts: context.StatsCharts,
        StatsController: context.StatsController,
        ModalView: context.ModalView,
        ModalFormController: context.ModalFormController,
        ModalMobileController: context.ModalMobileController,
        ModalInteractions: context.ModalInteractions,
        ModalController: context.ModalController,
        SettingsView: context.SettingsView,
        SettingsActions: context.SettingsActions,
        ReleaseModalController: context.ReleaseModalController,
        ExportModalController: context.ExportModalController,
        SettingsController: context.SettingsController,
        UIStack: context.UIStack,
        HistoryController: context.HistoryController,
        UIStackEffects: context.UIStackEffects,
        UIStackController: context.UIStackController,
        ConfirmDialog: context.ConfirmDialog,
        ConfirmController: context.ConfirmController,
        ThemeController: context.ThemeController,
        ToastController: context.ToastController,
        AppState: context.AppState,
        AppWiringModal: context.AppWiringModal,
        AppWiring: context.AppWiring
    };
}

function expense(overrides = {}) {
    return {
        id: 'expense-1',
        importo: 1.5,
        descrizione: 'Caffe',
        categoria: 'bar',
        metodo: 'carta',
        data: '2026-05-16T10:00:00.000Z',
        tags: ['colazione'],
        nota: '',
        creatoIl: '2026-05-16T10:00:00.000Z',
        modificatoIl: '2026-05-16T10:00:00.000Z',
        ...overrides
    };
}

module.exports = {
    assert,
    root,
    readAppScript,
    readAppFile,
    readRepoFile,
    readAppCss,
    normalizeStablePrecachePath,
    getLocalIndexAssetPaths,
    getStableLaunchPrecachePaths,
    getReleaseIndexAssetPaths,
    getReleasePrecachePaths,
    createLocalStorage,
    loadStorage,
    loadCatalog,
    loadParser,
    loadFilters,
    loadStats,
    loadUiViews,
    expense
};
