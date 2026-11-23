const fs = require('fs');
const path = require('path');
const {
    assert,
    root,
    readRepoFile,
    getLocalIndexAssetPaths,
    getStableLaunchPrecachePaths,
    getReleaseIndexAssetPaths,
    getReleasePrecachePaths,
    createLocalStorage,
    loadUiViews,
    expense
} = require('../helpers');

module.exports = function register(test) {
    test('Vista impostazioni renderizza info, guardrail e preview import escapata', () => {
        const { SettingsView } = loadUiViews();
        const spese = [
            expense({ id: 'a', data: '2026-05-10T10:00:00.000Z' }),
            expense({ id: 'b', data: '2026-05-12T10:00:00.000Z' })
        ];
        const page = SettingsView.renderPage({
            settings: { tema: 'auto' },
            spese,
            sizeKB: 12.34,
            storageStatus: { ok: false },
            appInfo: { version: 'v2026.05.30', label: 'Stabile' }
        });
        const preview = SettingsView.renderImportPreviewMessage({
            format: 'json',
            count: 2,
            settingsIncluded: true,
            warnings: ['<script>alert(1)</script>']
        }, true);

        assert(page.includes('btn-export-raw'));
        assert(page.includes('Esporta Dati'));
        assert(page.includes('Scarica un backup JSON o nel formato che preferisci.'));
        assert(page.includes('Importa Dati'));
        assert(page.includes('btn-export-default'));
        assert(page.includes('btn-export-custom'));
        assert(page.includes('>Custom</button>'));
        assert(page.includes('btn-import'));
        assert(page.includes('Spese registrate'));
        assert(page.includes('Versioni'));
        assert(page.includes('Puoi cambiare la versione installata quando vuoi.'));
        assert(page.includes('Scegli versione...'));
        assert(!page.includes('release-modal-list'));
        assert(page.includes("Where's My Money? v2026.05.30"));
        assert(page.includes('Stabile'));
        assert(page.includes('12.3 KB'));
        assert(preview.includes('2 spese valide con impostazioni'));
        assert(preview.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
        assert(!preview.includes('<script>alert(1)</script>'));

        const exportModal = SettingsView.renderExportModal({
            preferences: {
                format: 'json',
                includeData: true,
                includeSettings: false,
                includePersonalizzazioni: true
            },
            selectedCount: 3,
            filterCount: 2
        });
        assert(exportModal.includes('JSON'));
        assert(!exportModal.includes('JSON backup'));
        assert(!exportModal.includes('CSV tabella'));
        assert(!exportModal.includes('file in chiaro'));
        assert(!exportModal.includes('JSON puo includere'));
        assert(exportModal.includes('3 spese selezionate'));
        assert(exportModal.includes('sd-item selected'));
        assert(exportModal.includes('export-toggle-last-selection'));
        assert(exportModal.includes('export-toggle-last-filters'));
        assert(exportModal.includes('disabled'));
        assert(exportModal.includes('Personalizzazioni'));

        const noDataExportModal = SettingsView.renderExportModal({
            preferences: {
                format: 'json',
                includeData: false,
                includeSettings: true,
                includePersonalizzazioni: false
            },
            selectedCount: 3
        });
        assert(noDataExportModal.includes('0 spese selezionate'));

        const activeExportModal = SettingsView.renderExportModal({
            preferences: { format: 'json' },
            selectedCount: 2,
            memory: {
                hasLastExport: true,
                lastSelectionActive: true,
                lastFiltersActive: true
            }
        });
        assert(activeExportModal.includes('aria-pressed="true"'));
        assert(!activeExportModal.includes('disabled'));
    });

    test('Azioni impostazioni isolano formati, scelte e download', () => {
        const { SettingsActions } = loadUiViews();

        assert.equal(SettingsActions.detectImportFormat({ name: 'backup.JSON', type: '' }), 'json');
        assert.equal(SettingsActions.detectImportFormat({ name: 'spese.txt', type: 'text/csv' }), 'csv');
        assert.equal(SettingsActions.detectImportFormat({ name: 'spese.md', type: 'text/markdown' }), null);

        assert.deepEqual(
            SettingsActions.getExportChoices().map(choice => choice.format || 'cancel'),
            ['cancel', 'json', 'csv']
        );
        assert.deepEqual(
            SettingsActions.getImportChoices(true).map(choice => choice.mode || 'cancel'),
            ['cancel', 'append', 'replace']
        );
        assert.deepEqual(
            SettingsActions.getImportChoices(false).map(choice => choice.mode || 'cancel'),
            ['cancel', 'replace']
        );
        assert.deepEqual(
            SettingsActions.getExportFormats().map(format => format.value),
            ['json', 'csv']
        );
        assert.deepEqual(
            SettingsActions.normalizeFilterSnapshot({
                query: ' caffe ',
                categories: ['bar', 2],
                excludedCategories: new Set(['bollette']),
                methods: new Set(['carta']),
                excludedMethods: ['contanti'],
                amountMin: '3',
                amountMax: null,
                dateFrom: '2026-06-01',
                selectedOnly: true
            }),
            {
                query: 'caffe',
                categories: ['bar', '2'],
                excludedCategories: ['bollette'],
                methods: ['carta'],
                excludedMethods: ['contanti'],
                amountMin: 3,
                amountMax: Infinity,
                dateFrom: '2026-06-01',
                dateTo: '',
                selectedOnly: true,
                excludedSelectedOnly: false
            }
        );

        const prefsStorage = createLocalStorage();
        const normalizedPrefs = SettingsActions.saveExportPreferences(
            prefsStorage,
            { KEY: 'spese-test' },
            {
                format: 'csv',
                includeSettings: true,
                includePersonalizzazioni: true,
                selectedIds: ['a', 2],
                selectionInitialized: true,
                lastExport: {
                    selectedIds: ['b'],
                    filters: {
                        query: 'pane',
                        categories: ['spesa'],
                        excludedCategories: ['bar'],
                        excludedSelectedOnly: true,
                        amountMax: 40
                    }
                }
            }
        );
        assert.equal(normalizedPrefs.format, 'csv');
        assert.equal(normalizedPrefs.includeSettings, false);
        assert.deepEqual(normalizedPrefs.lastExport.selectedIds, ['b']);
        assert.equal(normalizedPrefs.lastExport.filters.query, 'pane');
        assert.deepEqual(normalizedPrefs.lastExport.filters.categories, ['spesa']);
        assert.deepEqual(normalizedPrefs.lastExport.filters.excludedCategories, ['bar']);
        assert.equal(normalizedPrefs.lastExport.filters.excludedSelectedOnly, true);
        assert.deepEqual(
            SettingsActions.normalizeExportPreferences({
                lastExport: {
                    selectedIds: [],
                    filters: { query: 'solo impostazioni' }
                }
            }).lastExport,
            {
                selectedIds: [],
                filters: {
                    query: 'solo impostazioni',
                    categories: [],
                    excludedCategories: [],
                    methods: [],
                    excludedMethods: [],
                    amountMin: 0,
                    amountMax: Infinity,
                    dateFrom: '',
                    dateTo: '',
                    selectedOnly: false,
                    excludedSelectedOnly: false
                }
            }
        );
        assert.deepEqual(
            SettingsActions.readExportPreferences(prefsStorage, { KEY: 'spese-test' }).selectedIds,
            ['a', '2']
        );

        const csv = SettingsActions.getExportDownloadSpec('csv', 'a,b', '2026-05-19');
        const json = SettingsActions.getExportDownloadSpec('json', '{}', '2026-05-19');
        const customJson = SettingsActions.getCustomExportDownloadSpec('json', '{}', '2026-05-19');
        const raw = SettingsActions.getRawDownloadSpec('raw', '2026-05-19');

        assert.equal(csv.filename, 'spese_2026-05-19.csv');
        assert(csv.content.startsWith('\uFEFF'));
        assert.equal(json.filename, 'spese_backup_2026-05-19.json');
        assert.equal(json.mime, 'application/json');
        assert.equal(customJson.filename, 'spese_export_2026-05-19.json');
        assert.equal(raw.filename, 'spese_raw_2026-05-19.txt');
        assert.equal(
            SettingsActions.getReleasesManifestUrl({ href: 'https://f-mangini.github.io/tracker-spese/stable/' }),
            'https://f-mangini.github.io/tracker-spese/releases.json'
        );
        assert.equal(
            SettingsActions.getReleasesManifestUrl({ href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }),
            'https://f-mangini.github.io/tracker-spese/releases.json'
        );
        assert.equal(
            SettingsActions.getCurrentReleaseId({ href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }),
            'v2026.05.30'
        );
        assert.deepEqual(
            SettingsActions.getAppInfo(
                { channel: 'stable' },
                { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' }
            ),
            {
                channel: 'stable',
                releaseId: 'v2026.05.30',
                version: 'v2026.05.30',
                label: 'Stabile'
            }
        );
        assert.deepEqual(
            SettingsActions.getAppInfo(
                { channel: 'dev' },
                { href: 'https://f-mangini.github.io/tracker-spese/dev/' }
            ),
            {
                channel: 'dev',
                releaseId: '',
                version: 'dev',
                label: 'Sviluppo'
            }
        );
        const launchStorage = createLocalStorage();
        SettingsActions.setLaunchTarget('releases/v2026.05.30/', launchStorage);
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
                storageLike: launchStorage
            }),
            'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/'
        );
        SettingsActions.setLaunchTarget('releases/v2026.06.02/', launchStorage);
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
                storageLike: launchStorage
            }),
            'https://f-mangini.github.io/tracker-spese/releases/v2026.06.02/'
        );
        SettingsActions.setLaunchTarget('stable/', launchStorage);
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
                storageLike: launchStorage
            }),
            'https://f-mangini.github.io/tracker-spese/stable/'
        );
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
                storageLike: launchStorage
            }),
            ''
        );
        SettingsActions.setLaunchTarget('releases/v2026.05.30/', launchStorage);
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
                storageLike: launchStorage
            }),
            ''
        );
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'dev' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/dev/' },
                storageLike: launchStorage
            }),
            ''
        );
        SettingsActions.setLaunchTarget('', launchStorage);
        assert.equal(
            SettingsActions.getPreferredLaunchUrl({
                config: { channel: 'stable' },
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
                storageLike: launchStorage
            }),
            ''
        );

        const releaseModel = SettingsActions.normalizeReleaseManifest({
            recommended: 'v2026.05.30',
            releases: [
                {
                    id: 'v2026.05.30',
                    path: 'releases/v2026.05.30/',
                    date: '2026-05-30',
                    status: 'recommended',
                    notes: '<b>ok</b>',
                    schemaVersion: 1
                }
            ]
        }, {
            releasesUrl: 'https://f-mangini.github.io/tracker-spese/releases.json',
            currentReleaseId: 'v2026.05.30'
        });

        assert.equal(releaseModel.releases[0].id, 'stable/latest');
        assert.equal(releaseModel.releases[0].url, 'https://f-mangini.github.io/tracker-spese/stable/');
        assert.equal(releaseModel.releases[0].launchPath, 'stable/');
        assert.equal(releaseModel.releases[0].isCurrent, false);
        assert.equal(releaseModel.releases[1].url, 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/');
        assert.equal(releaseModel.releases[1].isRecommended, true);
        assert.equal(releaseModel.releases[1].isCurrent, true);
        assert.equal(
            SettingsActions.getImportSuccessMessage({ count: 3, regeneratedIds: 2 }, 'append'),
            '3 spese aggiunte, 2 id rigenerati ✓'
        );
    });

    test('Azioni impostazioni registrano il launcher offline solo su /stable/', async () => {
        const { SettingsActions } = loadUiViews();
        const registered = [];
        const navigatorLike = {
            serviceWorker: {
                ready: Promise.resolve(true),
                register(script, options) {
                    registered.push([script, options]);
                    return Promise.resolve({});
                }
            }
        };

        assert.equal(
            SettingsActions.shouldRegisterLaunchServiceWorker({
                href: 'https://f-mangini.github.io/tracker-spese/stable/'
            }),
            true
        );
        assert.equal(
            SettingsActions.shouldRegisterLaunchServiceWorker({
                href: 'https://f-mangini.github.io/tracker-spese/stable/index.html'
            }),
            true
        );
        assert.equal(
            SettingsActions.shouldRegisterLaunchServiceWorker({
                href: 'https://f-mangini.github.io/tracker-spese/'
            }),
            false
        );
        assert.equal(
            SettingsActions.shouldRegisterLaunchServiceWorker({
                href: 'https://f-mangini.github.io/tracker-spese/dev/'
            }),
            false
        );
        assert.equal(
            SettingsActions.shouldRegisterLaunchServiceWorker({
                href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/'
            }),
            false
        );

        assert.equal(
            await SettingsActions.registerLaunchServiceWorker({
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/stable/' },
                navigatorLike,
                setTimeout: callback => callback(),
                waitMs: 0
            }),
            true
        );
        assert.deepEqual(registered, [
            ['./stable-launch-service-worker.js', { scope: './' }]
        ]);

        assert.equal(
            await SettingsActions.registerLaunchServiceWorker({
                locationLike: { href: 'https://f-mangini.github.io/tracker-spese/dev/' },
                navigatorLike,
                setTimeout: callback => callback(),
                waitMs: 0
            }),
            false
        );
        assert.equal(registered.length, 1);
    });

    test('Launcher offline stable precachea gli asset locali della stable', () => {
        const indexAssets = getLocalIndexAssetPaths();
        const precacheAssets = getStableLaunchPrecachePaths();
        const missing = indexAssets.filter(asset => !precacheAssets.has(asset));

        assert.deepEqual(missing, []);
    });

    test('Manifest release punta a una release consigliata installabile', () => {
        const manifest = JSON.parse(readRepoFile('releases.json'));
        const recommended = manifest.releases.find(release => release.id === manifest.recommended);
        const releasePath = recommended && recommended.path ? recommended.path.replace(/\/$/, '') : '';

        assert(recommended, 'Release consigliata non trovata in releases.json');
        assert.equal(recommended.status, 'recommended');
        assert.equal(fs.existsSync(path.join(root, releasePath, 'index.html')), true);
        assert.equal(fs.existsSync(path.join(root, releasePath, 'manifest.json')), true);
        assert.equal(fs.existsSync(path.join(root, releasePath, 'service-worker.js')), true);

        const serviceWorker = readRepoFile(path.join(releasePath, 'service-worker.js'));
        assert(serviceWorker.includes(`const RELEASE_ID = "${recommended.id}"`));
        assert(serviceWorker.includes('url.href.startsWith(self.registration.scope)'));
    });

    test('Release consigliata precachea gli asset locali della propria pagina', () => {
        const manifest = JSON.parse(readRepoFile('releases.json'));
        const recommended = manifest.releases.find(release => release.id === manifest.recommended);
        const releasePath = recommended.path.replace(/\/$/, '');
        const indexAssets = getReleaseIndexAssetPaths(releasePath);
        const precacheAssets = getReleasePrecachePaths(releasePath);
        const missing = indexAssets.filter(asset => !precacheAssets.has(asset));

        assert.deepEqual(missing, []);
    });

    test('Azioni impostazioni orchestrano flussi storage con adapter', () => {
        const { SettingsActions } = loadUiViews();
        const calls = [];
        const storage = {
            previewImportJSON(content) {
                calls.push(['preview-json', content]);
                return { success: true, format: 'json', count: 1 };
            },
            previewImportCSV(content) {
                calls.push(['preview-csv', content]);
                return { success: true, format: 'csv', count: 2 };
            },
            exportJSON() {
                calls.push(['export-json', arguments[0] || null]);
                return { success: true, content: '{"ok":true}' };
            },
            exportCSV() {
                calls.push(['export-csv', arguments[0] || null]);
                return { success: true, content: 'a,b' };
            },
            exportRaw() {
                calls.push(['export-raw']);
                return { success: true, content: 'raw-data' };
            },
            updateSettings(updates) {
                calls.push(['update-settings', updates.tema]);
                return { success: true, impostazioni: { tema: updates.tema } };
            },
            clearAll(options) {
                calls.push(['clear-all', options || null]);
                return { success: true };
            },
            restoreSnapshot() {
                calls.push(['restore-snapshot']);
                return { success: true, count: 1, restoredRaw: false };
            },
            createSnapshot(reason) {
                calls.push(['snapshot', reason]);
                return { success: true };
            },
            importJSON(content, options) {
                calls.push(['import-json', content, options.mode]);
                return { success: true, count: 1, regeneratedIds: 0 };
            },
            importCSV(content, options) {
                calls.push(['import-csv', content, options.mode]);
                return { success: true, count: 2, regeneratedIds: 1 };
            }
        };

        assert.deepEqual(
            SettingsActions.previewImportFile({
                file: { name: 'backup.json' },
                content: '{}',
                storage
            }),
            { success: true, format: 'json', count: 1 }
        );
        assert.deepEqual(
            SettingsActions.previewImportFile({
                file: { name: 'spese.csv' },
                content: 'a,b',
                storage
            }),
            { success: true, format: 'csv', count: 2 }
        );
        assert.deepEqual(
            SettingsActions.previewImportFile({
                file: { name: 'spese.txt' },
                content: 'x',
                storage
            }),
            {
                success: false,
                error: 'Usa .json o .csv',
                code: 'unsupported-import-format'
            }
        );

        const jsonDownload = SettingsActions.buildExportDownload({
            format: 'json',
            storage,
            dateStamp: '2026-05-19'
        });
        const csvDownload = SettingsActions.buildExportDownload({
            format: 'csv',
            storage,
            dateStamp: '2026-05-19'
        });
        const rawDownload = SettingsActions.buildRawDownload({
            storage,
            dateStamp: '2026-05-19'
        });
        const customDownload = SettingsActions.buildCustomExportDownload({
            format: 'json',
            storage,
            selectedSpese: [expense({ id: 'sel' })],
            includeData: true,
            includeSettings: false,
            includePersonalizzazioni: true,
            dateStamp: '2026-05-19'
        });
        const importResult = SettingsActions.commitImport({
            preview: { format: 'csv' },
            content: 'a,b',
            mode: 'append',
            storage
        });
        const themeResult = SettingsActions.updateTheme({
            theme: 'dark',
            storage
        });
        const clearResult = SettingsActions.clearAll({ storage });
        const clearSnapshotResult = SettingsActions.clearAll({ storage, clearSnapshot: true });
        const restoreResult = SettingsActions.restoreSnapshot({ storage });
        const versionSnapshot = SettingsActions.createVersionChangeSnapshot({ storage });

        assert.equal(jsonDownload.download.filename, 'spese_backup_2026-05-19.json');
        assert.equal(csvDownload.download.filename, 'spese_2026-05-19.csv');
        assert.equal(rawDownload.download.filename, 'spese_raw_2026-05-19.txt');
        assert.equal(customDownload.download.filename, 'spese_export_2026-05-19.json');
        assert.equal(importResult.toast, '2 spese aggiunte, 1 id rigenerati \u2713');
        assert.equal(themeResult.theme, 'dark');
        assert.equal(clearResult.toast, 'Dati eliminati');
        assert.equal(clearSnapshotResult.toast, 'Dati e snapshot eliminati');
        assert.equal(restoreResult.toast, '1 spese ripristinate dallo snapshot \u2713');
        assert.equal(versionSnapshot.success, true);
        assert.deepEqual(calls, [
            ['preview-json', '{}'],
            ['preview-csv', 'a,b'],
            ['export-json', null],
            ['export-csv', null],
            ['export-raw'],
            ['export-json', {
                spese: [expense({ id: 'sel' })],
                includeData: true,
                includeSettings: false,
                includePersonalizzazioni: true
            }],
            ['import-csv', 'a,b', 'append'],
            ['update-settings', 'dark'],
            ['clear-all', { clearSnapshot: false }],
            ['clear-all', { clearSnapshot: true }],
            ['restore-snapshot'],
            ['snapshot', 'version-change']
        ]);
    });

    test('Controller impostazioni prepara modello e callback senza dipendere da App', () => {
        const { SettingsController } = loadUiViews();
        const calls = [];
        const spese = [
            expense({ id: 'old', data: '2026-05-10T10:00:00.000Z' }),
            expense({ id: 'new', data: '2026-05-12T10:00:00.000Z' })
        ];
        const storage = {
            getSettings() {
                return { tema: 'auto' };
            },
            getSpese() {
                return spese;
            },
            getStorageSizeKB() {
                return 4.2;
            },
            getStatus() {
                return { ok: true };
            },
            exportJSON() {
                calls.push(['export-json']);
                return { success: true, content: '{}' };
            },
            importCSV(content, options) {
                calls.push(['import-csv', content, options.mode]);
                return { success: true, count: 2, regeneratedIds: 0 };
            }
        };

        const model = SettingsController.getRenderModel(storage);
        assert.equal(model.settings.tema, 'auto');
        assert.equal(model.spese.length, 2);
        assert.equal(model.sizeKB, 4.2);
        assert.equal(model.appInfo.version, 'stable/latest');
        assert(/10\/0?5\/2026/.test(model.dateRange));
        assert(/12\/0?5\/2026/.test(model.dateRange));

        const cachedModel = SettingsController.getRenderModel({
            storage,
            getSpese: () => [expense({ id: 'cached', data: '2026-05-13T10:00:00.000Z' })]
        });
        assert.equal(cachedModel.spese[0].id, 'cached');
        assert(/13\/0?5\/2026/.test(cachedModel.dateRange));

        const exportChoices = SettingsController.createExportChoices({
            storage,
            dateStamp: () => '2026-05-19',
            download: (content, filename, mime) => calls.push(['download', filename, mime, content]),
            showToast: (message, type) => calls.push(['toast', type, message])
        });
        exportChoices.find(choice => choice.format === 'json').onClick();

        const importChoices = SettingsController.createImportChoices(
            { format: 'csv' },
            'a,b',
            true,
            {
                storage,
                refreshAfterDataChange: () => calls.push(['refresh-data']),
                showToast: (message, type) => calls.push(['toast', type, message])
            }
        );
        importChoices.find(choice => choice.mode === 'append').onClick();

        assert.deepEqual(calls, [
            ['export-json'],
            ['download', 'spese_backup_2026-05-19.json', 'application/json', '{}'],
            ['toast', 'info', 'Download JSON avviato...'],
            ['import-csv', 'a,b', 'append'],
            ['refresh-data'],
            ['toast', 'success', '2 spese aggiunte \u2713']
        ]);
    });

    test('Controller impostazioni carica releases.json e renderizza la lista versioni', async () => {
        const { SettingsController } = loadUiViews();
        const releaseList = { innerHTML: '' };
        const calls = [];
        const container = {
            querySelector(selector) {
                return selector === '#release-modal-list' ? releaseList : null;
            }
        };

        await SettingsController.loadReleases(container, {
            locationLike: { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' },
            fetchFn(url, options) {
                calls.push([url, options.cache]);

                return Promise.resolve({
                    ok: true,
                    json() {
                        return Promise.resolve({
                            recommended: 'v2026.05.30',
                            releases: [
                                {
                                    id: 'v2026.05.30',
                                    path: 'releases/v2026.05.30/',
                                    date: '2026-05-30',
                                    status: 'recommended',
                                    notes: 'Baseline <b>PWA</b>',
                                    schemaVersion: 1
                                }
                            ]
                        });
                    }
                });
            }
        });

        assert.deepEqual(calls, [
            ['https://f-mangini.github.io/tracker-spese/releases.json', 'no-store']
        ]);
        assert(releaseList.innerHTML.includes('v2026.05.30'));
        assert(releaseList.innerHTML.includes('stable/latest'));
        assert(releaseList.innerHTML.includes('Canale'));
        assert(releaseList.innerHTML.includes('Installata'));
        assert(releaseList.innerHTML.includes('Consigliata'));
        assert(releaseList.innerHTML.includes('Installa'));
        assert(releaseList.innerHTML.includes('https://f-mangini.github.io/tracker-spese/stable/'));
        assert(!releaseList.innerHTML.includes('href="https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/"'));
        assert(releaseList.innerHTML.includes('Baseline &lt;b&gt;PWA&lt;/b&gt;'));
        assert(!releaseList.innerHTML.includes('Baseline <b>PWA</b>'));
    });

    test('Controller impostazioni collega finestra versioni a history e back button', () => {
        const { SettingsController } = loadUiViews();
        const classes = new Set(['hidden']);
        const calls = [];
        const modal = {
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            }
        };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'release-modal-overlay' ? modal : null;
                }
            },
            pushUiState: state => calls.push(['push', state]),
            consumeUiState: () => calls.push(['consume'])
        };

        SettingsController.openReleaseModal(options);
        assert.equal(SettingsController.isReleaseModalOpen(options), true);
        assert.deepEqual(calls, [['push', { panel: 'release-modal' }]]);

        SettingsController.openReleaseModal(options);
        assert.deepEqual(calls, [['push', { panel: 'release-modal' }]]);

        SettingsController.closeReleaseModal(options);
        assert.equal(SettingsController.isReleaseModalOpen(options), false);
        assert.deepEqual(calls, [
            ['push', { panel: 'release-modal' }],
            ['consume']
        ]);

        SettingsController.openReleaseModal(options);
        SettingsController.closeReleaseModal(options, true);
        assert.equal(SettingsController.isReleaseModalOpen(options), false);
        assert.deepEqual(calls, [
            ['push', { panel: 'release-modal' }],
            ['consume'],
            ['push', { panel: 'release-modal' }]
        ]);
    });

    test('ReleaseModalController ed ExportModalController lavorano in autonomia e corrispondono alle deleghe di SettingsController', () => {
        const {
            SettingsController,
            ReleaseModalController,
            ExportModalController
        } = loadUiViews();

        assert.equal(SettingsController.openReleaseModal, ReleaseModalController.open);
        assert.equal(SettingsController.closeReleaseModal, ReleaseModalController.close);
        assert.equal(SettingsController.isReleaseModalOpen, ReleaseModalController.isOpen);
        assert.equal(SettingsController.openExportModal, ExportModalController.open);
        assert.equal(SettingsController.closeExportModal, ExportModalController.close);
        assert.equal(SettingsController.isExportModalOpen, ExportModalController.isOpen);

        const releaseClasses = new Set(['hidden']);
        const exportClasses = new Set(['hidden']);
        const calls = [];
        const releaseModal = {
            classList: {
                contains: cls => releaseClasses.has(cls),
                add: cls => releaseClasses.add(cls),
                remove: cls => releaseClasses.delete(cls)
            }
        };
        const exportModal = {
            dataset: {},
            classList: {
                contains: cls => exportClasses.has(cls),
                add: cls => exportClasses.add(cls),
                remove: cls => exportClasses.delete(cls)
            },
            querySelector: () => null
        };
        const options = {
            document: {
                getElementById(id) {
                    if (id === 'release-modal-overlay') return releaseModal;
                    if (id === 'export-modal-overlay') return exportModal;
                    return null;
                }
            },
            localStorage: createLocalStorage(),
            storage: { KEY: 'unit-modals', getSpese: () => [] },
            pushUiState: state => calls.push(['push', state]),
            consumeUiState: steps => calls.push(['consume', steps || 1])
        };

        ReleaseModalController.open(options);
        assert.equal(ReleaseModalController.isOpen(options), true);
        ReleaseModalController.close(options);
        assert.equal(ReleaseModalController.isOpen(options), false);

        ExportModalController.open(options, { keepCurrentSelection: true });
        assert.equal(ExportModalController.isOpen(options), true);
        ExportModalController.close(options);
        assert.equal(ExportModalController.isOpen(options), false);

        assert.deepEqual(calls, [
            ['push', { panel: 'release-modal' }],
            ['consume', 1],
            ['push', { panel: 'export-modal' }],
            ['consume', 1]
        ]);
    });
};
