import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Catalog, CATEGORIES, PAYMENT_METHODS } from '../app/js/domain/categories.js';
import { SchemaNormalizer } from '../app/js/data/schema-normalizer.js';
import { CsvCodec } from '../app/js/data/csv-codec.js';
import { createStorage, Storage } from '../app/js/data/storage.js';
import { ExpenseStore } from '../app/js/data/expense-store.js';
import { Parser } from '../app/js/domain/parser.js';
import { ExpenseFilters } from '../app/js/domain/filters.js';
import { StatsData } from '../app/js/domain/stats.js';
import { ExpenseQuery } from '../app/js/domain/expense-query.js';
import { ExpenseActions } from '../app/js/domain/expense-actions.js';
import { AppRefresh } from '../app/js/core/app-refresh.js';
import { ExpenseSubmitController } from '../app/js/input/expense-submit-controller.js';
import { ExpenseInputController } from '../app/js/input/expense-input-controller.js';
import { InputBarController } from '../app/js/input/input-bar-controller.js';
import { AppUI } from '../app/js/ui/ui-utils.js';
import { DownloadController } from '../app/js/ui/download-controller.js';
import { HeaderTitleController } from '../app/js/ui/header-title-controller.js';
import { FilterView } from '../app/js/filters/filter-view.js';
import { QuickFilterController } from '../app/js/filters/quick-filter-controller.js';
import { FilterController } from '../app/js/filters/filter-controller.js';
import { TimelineView } from '../app/js/timeline/timeline-view.js';
import { TimelineController } from '../app/js/timeline/timeline-controller.js';
import { TimelineSelectionController } from '../app/js/timeline/timeline-selection-controller.js';
import { NavigationController } from '../app/js/navigation/navigation-controller.js';
import { StatsView } from '../app/js/stats/stats-view.js';
import { StatsCharts } from '../app/js/stats/stats-charts.js';
import { StatsController } from '../app/js/stats/stats-controller.js';
import { ModalView } from '../app/js/modal/modal-view.js';
import { ModalFormController } from '../app/js/modal/modal-form-controller.js';
import { ModalMobileController } from '../app/js/modal/modal-mobile-controller.js';
import { ModalInteractions } from '../app/js/modal/modal-interactions.js';
import { ModalController } from '../app/js/modal/modal-controller.js';
import { SettingsView } from '../app/js/settings/settings-view.js';
import { SettingsActions } from '../app/js/settings/settings-actions.js';
import { ReleaseModalController } from '../app/js/settings/release-modal-controller.js';
import { ExportModalController } from '../app/js/settings/export-modal-controller.js';
import { SettingsController } from '../app/js/settings/settings-controller.js';
import { UIStack } from '../app/js/navigation/ui-stack.js';
import { HistoryController } from '../app/js/navigation/history-controller.js';
import { UIStackEffects } from '../app/js/navigation/ui-stack-effects.js';
import { UIStackController } from '../app/js/navigation/ui-stack-controller.js';
import { ConfirmDialog } from '../app/js/ui/confirm-dialog.js';
import { ConfirmController } from '../app/js/ui/confirm-controller.js';
import { ThemeController } from '../app/js/ui/theme-controller.js';
import { ToastController } from '../app/js/ui/toast-controller.js';
import { AppState } from '../app/js/core/app-state.js';
import { AppWiringModal } from '../app/js/core/app-wiring-modal.js';
import { AppWiring } from '../app/js/core/app-wiring.js';
import { App } from '../app/js/core/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

function extractRelativeModuleSpecifiers(source) {
    const specifiers = [];
    const lines = String(source || '').split(/\r?\n/);
    let buffer = '';
    let collecting = false;

    for (const line of lines) {
        if (!collecting) {
            if (/^\s*(?:import|export\s+(?:\*|\{))/.test(line)) {
                collecting = true;
                buffer = line;
            } else {
                continue;
            }
        } else {
            buffer += ' ' + line;
        }

        const bareMatch = buffer.match(/^\s*import\s+["'](\.[^"']+)["']\s*;?/);
        if (bareMatch) {
            specifiers.push(bareMatch[1]);
            collecting = false;
            buffer = '';
            continue;
        }

        const fromMatch = buffer.match(/\bfrom\s+["'](\.[^"']+)["']/);
        if (fromMatch) {
            specifiers.push(fromMatch[1]);
            collecting = false;
            buffer = '';
            continue;
        }

        if (buffer.includes(';')) {
            collecting = false;
            buffer = '';
        }
    }

    return specifiers;
}

function collectModuleGraph(baseDir, entryRelativePath) {
    const visited = new Set();
    const visiting = new Set();
    const cycles = [];
    const files = [];

    function visit(relPosixPath) {
        const normalized = path.posix.normalize(String(relPosixPath || '').replace(/\\/g, '/').replace(/^\.\//, ''));
        if (visiting.has(normalized)) {
            cycles.push(normalized);
            return;
        }
        if (visited.has(normalized)) return;

        const fullPath = path.resolve(baseDir, normalized);
        assert(fs.existsSync(fullPath), `Modulo ES non trovato: ${normalized}`);

        visiting.add(normalized);
        const source = fs.readFileSync(fullPath, 'utf8');
        const dir = path.posix.dirname(normalized);

        for (const specifier of extractRelativeModuleSpecifiers(source)) {
            const target = path.posix.normalize(path.posix.join(dir, specifier));
            visit(target);
        }

        visiting.delete(normalized);
        visited.add(normalized);
        files.push(normalized);
    }

    visit(entryRelativePath);

    return { files, cycles };
}

function getIndexAssetPaths(baseDir) {
    const html = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
    const paths = [];
    const tagPattern = /<(script|link)\b([^>]*)>/gi;
    let match;

    while ((match = tagPattern.exec(html))) {
        const tagName = match[1].toLowerCase();
        const attrs = match[2];
        const attrMatch = tagName === 'script'
            ? /\bsrc=["']([^"']+)["']/i.exec(attrs)
            : /\bhref=["']([^"']+)["']/i.exec(attrs);

        if (!attrMatch) continue;

        const value = attrMatch[1];
        if (!value || /^(https?:|data:|#)/i.test(value)) continue;

        paths.push(normalizeStablePrecachePath(value));

        if (tagName === 'script' && /\btype\s*=\s*["']module["']/i.test(attrs)) {
            const graph = collectModuleGraph(baseDir, value);
            assert.deepEqual(graph.cycles, [], `Dipendenze circolari rilevate nel grafo ESM: ${graph.cycles.join(', ')}`);
            graph.files.forEach(file => paths.push(normalizeStablePrecachePath(file)));
        }
    }

    return Array.from(new Set(paths)).sort();
}

function getLocalIndexAssetPaths() {
    return getIndexAssetPaths(path.join(root, 'app'));
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
    return getIndexAssetPaths(path.join(root, releasePath));
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

function resetAppState() {
    Catalog.reset();
    ExpenseStore.reset();
    FilterController.resetState();
    QuickFilterController.resetState();
    TimelineController.resetState();
    TimelineSelectionController.resetState();
    ExportModalController.resetState();
    ReleaseModalController.resetState();
    HeaderTitleController.resetState();
    ToastController.resetState();
}

function loadStorage() {
    resetAppState();
    const localStorage = createLocalStorage();
    const storageInstance = createStorage({
        localStorage,
        key: 'test-storage'
    });

    return {
        Storage: storageInstance,
        SchemaNormalizer,
        CsvCodec,
        localStorage
    };
}

function loadCatalog() {
    resetAppState();
    return {
        Catalog,
        CATEGORIES,
        PAYMENT_METHODS
    };
}

function loadParser() {
    resetAppState();
    return Parser;
}

function loadFilters() {
    resetAppState();
    return ExpenseFilters;
}

function loadStats() {
    resetAppState();
    return StatsData;
}

function loadUiViews() {
    resetAppState();
    return {
        Catalog,
        CATEGORIES,
        PAYMENT_METHODS,
        Parser,
        SchemaNormalizer,
        CsvCodec,
        Storage,
        createStorage,
        AppUI,
        DownloadController,
        HeaderTitleController,
        ExpenseStore,
        ExpenseQuery,
        AppRefresh,
        ExpenseActions,
        ExpenseSubmitController,
        ExpenseInputController,
        InputBarController,
        FilterView,
        QuickFilterController,
        FilterController,
        TimelineView,
        TimelineController,
        TimelineSelectionController,
        NavigationController,
        StatsView,
        StatsCharts,
        StatsController,
        ModalView,
        ModalFormController,
        ModalMobileController,
        ModalInteractions,
        ModalController,
        SettingsView,
        SettingsActions,
        ReleaseModalController,
        ExportModalController,
        SettingsController,
        UIStack,
        HistoryController,
        UIStackEffects,
        UIStackController,
        ConfirmDialog,
        ConfirmController,
        ThemeController,
        ToastController,
        AppState,
        AppWiringModal,
        AppWiring,
        App
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

export {
    assert,
    root,
    readAppScript,
    readAppFile,
    readRepoFile,
    readAppCss,
    normalizeStablePrecachePath,
    collectModuleGraph,
    getLocalIndexAssetPaths,
    getStableLaunchPrecachePaths,
    getReleaseIndexAssetPaths,
    getReleasePrecachePaths,
    createLocalStorage,
    resetAppState,
    loadStorage,
    loadCatalog,
    loadParser,
    loadFilters,
    loadStats,
    loadUiViews,
    expense
};
