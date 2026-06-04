/* ============================================
   SETTINGS ACTIONS - decisioni pure impostazioni
   ============================================ */

const SettingsActions = (() => {
    const LAUNCH_TARGET_KEY = 'spesa-tracker-launch-target';
    const EXPORT_PREFS_SUFFIX = ':export-custom';
    const DEFAULT_EXPORT_PREFS = Object.freeze({
        format: 'json',
        includeData: true,
        includeSettings: true,
        includePersonalizzazioni: false,
        selectedIds: [],
        selectionInitialized: false,
        lastExport: null
    });

    function detectImportFormat(file = {}) {
        const fileName = String(file.name || '').toLowerCase();
        const fileType = String(file.type || '').toLowerCase();

        if (fileName.endsWith('.json') || fileType.includes('json')) {
            return 'json';
        }

        if (
            fileName.endsWith('.csv') ||
            fileType.includes('csv') ||
            fileType.includes('comma-separated-values')
        ) {
            return 'csv';
        }

        return null;
    }

    function getExportChoices() {
        return [
            { text: 'Annulla', className: 'btn-secondary' },
            { text: 'JSON', className: 'btn-primary', format: 'json' },
            { text: 'CSV', className: 'btn-secondary', format: 'csv' }
        ];
    }

    function getExportFormats() {
        return [
            { value: 'json', label: 'JSON' },
            { value: 'csv', label: 'CSV' }
        ];
    }

    function normalizeExportFormat(format) {
        return format === 'csv' ? 'csv' : 'json';
    }

    function normalizeIdList(value) {
        if (value instanceof Set) {
            return Array.from(value).map(String).filter(Boolean);
        }

        if (
            value &&
            typeof value.size === 'number' &&
            typeof value.has === 'function' &&
            typeof value.forEach === 'function'
        ) {
            return Array.from(value).map(String).filter(Boolean);
        }

        if (Array.isArray(value)) {
            return value.map(String).filter(Boolean);
        }

        return [];
    }

    function normalizeNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function normalizeFilterSnapshot(value = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
        const rawMax = source.amountMax === Infinity ||
            source.amountMax === null ||
            source.amountMax === 'Infinity'
            ? Infinity
            : Number(source.amountMax);

        return {
            query: String(source.query || '').trim(),
            categories: normalizeIdList(source.categories),
            methods: normalizeIdList(source.methods),
            amountMin: Math.max(0, normalizeNumber(source.amountMin, 0)),
            amountMax: Number.isFinite(rawMax) && rawMax >= 0 ? rawMax : Infinity,
            dateFrom: String(source.dateFrom || '').trim(),
            dateTo: String(source.dateTo || '').trim(),
            selectedOnly: source.selectedOnly === true
        };
    }

    function createExportFilterSnapshot(filters = {}) {
        return normalizeFilterSnapshot({
            query: filters.query,
            categories: filters.categories,
            methods: filters.methods,
            amountMin: filters.amountMin,
            amountMax: filters.amountMax,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            selectedOnly: filters.selectedOnly
        });
    }

    function normalizeLastExport(value = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
        const selectedIds = normalizeIdList(source.selectedIds);

        if (selectedIds.length === 0 && !source.filters) return null;

        return {
            selectedIds,
            filters: normalizeFilterSnapshot(source.filters || {})
        };
    }

    function normalizeExportPreferences(value = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value)
            ? value
            : {};
        const format = normalizeExportFormat(source.format);
        const prefs = {
            ...DEFAULT_EXPORT_PREFS,
            format,
            includeData: source.includeData !== false,
            includeSettings: source.includeSettings !== false,
            includePersonalizzazioni: source.includePersonalizzazioni === true,
            selectedIds: normalizeIdList(source.selectedIds),
            selectionInitialized: source.selectionInitialized === true,
            lastExport: normalizeLastExport(source.lastExport)
        };

        if (format === 'csv') {
            prefs.includeData = true;
            prefs.includeSettings = false;
            prefs.includePersonalizzazioni = false;
        }

        return prefs;
    }

    function getExportPreferencesKey(storage) {
        const key = storage && storage.KEY ? storage.KEY : 'spesa-tracker-data';
        return `${key}${EXPORT_PREFS_SUFFIX}`;
    }

    function readExportPreferences(storageLike, storage) {
        if (!storageLike || typeof storageLike.getItem !== 'function') {
            return normalizeExportPreferences();
        }

        try {
            const raw = storageLike.getItem(getExportPreferencesKey(storage));
            return normalizeExportPreferences(raw ? JSON.parse(raw) : {});
        } catch (_) {
            return normalizeExportPreferences();
        }
    }

    function saveExportPreferences(storageLike, storage, preferences = {}) {
        const prefs = normalizeExportPreferences(preferences);
        if (!storageLike || typeof storageLike.setItem !== 'function') {
            return prefs;
        }

        try {
            storageLike.setItem(getExportPreferencesKey(storage), JSON.stringify(prefs));
        } catch (_) { }

        return prefs;
    }

    function getImportChoices(hasSpese) {
        const choices = [{ text: 'Annulla', className: 'btn-secondary' }];

        if (hasSpese) {
            choices.push(
                { text: 'Aggiungi', className: 'btn-primary', mode: 'append' },
                { text: 'Sostituisci', className: 'btn-warning', mode: 'replace' }
            );
        } else {
            choices.push({ text: 'Importa', className: 'btn-primary', mode: 'replace' });
        }

        return choices;
    }

    function getExportDownloadSpec(format, content, dateStamp) {
        if (format === 'json') {
            return {
                content,
                filename: `spese_backup_${dateStamp}.json`,
                mime: 'application/json',
                toast: 'Download JSON avviato...'
            };
        }

        return {
            content: '\uFEFF' + content,
            filename: `spese_${dateStamp}.csv`,
            mime: 'text/csv;charset=utf-8',
            toast: 'Download CSV avviato...'
        };
    }

    function getCustomExportDownloadSpec(format, content, dateStamp) {
        if (format === 'json') {
            return {
                content,
                filename: `spese_export_${dateStamp}.json`,
                mime: 'application/json',
                toast: 'Export JSON custom avviato...'
            };
        }

        return {
            content: '\uFEFF' + content,
            filename: `spese_export_${dateStamp}.csv`,
            mime: 'text/csv;charset=utf-8',
            toast: 'Export CSV custom avviato...'
        };
    }

    function getRawDownloadSpec(content, dateStamp) {
        return {
            content,
            filename: `spese_raw_${dateStamp}.txt`,
            mime: 'text/plain;charset=utf-8',
            toast: 'Download dati grezzi avviato...'
        };
    }

    function getImportSuccessMessage(result = {}, mode) {
        const suffix = result.regeneratedIds
            ? `, ${result.regeneratedIds} id rigenerati`
            : '';
        const modeLabel = mode === 'replace' ? 'sostituite' : 'aggiunte';

        return `${Number(result.count || 0)} spese ${modeLabel}${suffix} \u2713`;
    }

    function getReleasesManifestUrl(locationLike = {}) {
        const href = locationLike.href || 'http://localhost/';
        const url = new URL(href);
        const path = url.pathname;

        if (/\/releases\/[^/]+\/?/.test(path)) {
            return new URL('../../releases.json', url).href;
        }

        if (/\/(?:stable|dev|app)(?:\/index\.html|\/)?$/.test(path)) {
            return new URL('../releases.json', url).href;
        }

        return new URL('releases.json', url).href;
    }

    function getCurrentReleaseId(locationLike = {}) {
        const href = locationLike.href || 'http://localhost/';
        const url = new URL(href);
        const match = url.pathname.match(/\/releases\/([^/]+)\//);

        return match ? match[1] : '';
    }

    function getLaunchBaseUrl(locationLike = {}) {
        return getReleasesManifestUrl(locationLike);
    }

    function normalizeLaunchPath(path) {
        const value = String(path || '');

        return value === 'stable/' || /^releases\/[^/]+\/$/.test(value) ? value : '';
    }

    function readLaunchTarget(storageLike) {
        if (!storageLike || typeof storageLike.getItem !== 'function') return '';

        try {
            return normalizeLaunchPath(storageLike.getItem(LAUNCH_TARGET_KEY));
        } catch (_) {
            return '';
        }
    }

    function setLaunchTarget(path, storageLike) {
        if (!storageLike) return;

        const normalizedPath = normalizeLaunchPath(path);

        try {
            if (!normalizedPath) {
                if (typeof storageLike.removeItem === 'function') {
                    storageLike.removeItem(LAUNCH_TARGET_KEY);
                }
                return;
            }

            if (typeof storageLike.setItem === 'function') {
                storageLike.setItem(LAUNCH_TARGET_KEY, normalizedPath);
            }
        } catch (_) { }
    }

    function getPreferredLaunchUrl(options = {}) {
        const config = options.config || {};
        const locationLike = options.locationLike || {};
        const channel = String(config.channel || 'stable');
        const targetPath = readLaunchTarget(options.storageLike);

        if (channel === 'dev' || !targetPath) {
            return '';
        }

        const targetUrl = new URL(targetPath, getLaunchBaseUrl(locationLike)).href;
        const currentUrl = new URL(locationLike.href || 'http://localhost/').href;

        return targetUrl === currentUrl ? '' : targetUrl;
    }

    function shouldRegisterLaunchServiceWorker(locationLike = {}) {
        const href = locationLike.href || 'http://localhost/';
        const path = new URL(href).pathname;

        return /\/stable\/(?:index\.html)?$/.test(path);
    }

    function registerLaunchServiceWorker(options = {}) {
        const navigatorLike = options.navigatorLike;
        const waitMs = Number.isFinite(options.waitMs) ? options.waitMs : 2000;
        const setTimer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : null);

        if (
            !shouldRegisterLaunchServiceWorker(options.locationLike || {}) ||
            !navigatorLike ||
            !navigatorLike.serviceWorker ||
            typeof navigatorLike.serviceWorker.register !== 'function'
        ) {
            return Promise.resolve(false);
        }

        return navigatorLike.serviceWorker
            .register('./stable-launch-service-worker.js', { scope: './' })
            .then(() => {
                const ready = navigatorLike.serviceWorker.ready;

                if (!ready || typeof ready.then !== 'function') {
                    return true;
                }

                if (!setTimer) {
                    return ready.then(() => true);
                }

                return Promise.race([
                    ready.then(() => true),
                    new Promise(resolve => setTimer(() => resolve(true), waitMs))
                ]);
            })
            .catch(() => false);
    }

    function getAppInfo(config = {}, locationLike = {}) {
        const channel = String(config.channel || 'stable');
        const releaseId = getCurrentReleaseId(locationLike);
        const version = releaseId || String(config.version || (channel === 'dev' ? 'dev' : 'stable/latest'));

        return {
            channel,
            releaseId,
            version,
            label: channel === 'dev' ? 'Sviluppo' : 'Stabile'
        };
    }

    function normalizeReleaseManifest(manifest = {}, options = {}) {
        const releasesUrl = options.releasesUrl || 'http://localhost/releases.json';
        const currentReleaseId = options.currentReleaseId || '';
        const channel = String(options.channel || 'stable');
        const recommended = String(manifest.recommended || '');
        const releases = Array.isArray(manifest.releases) ? manifest.releases : [];
        const stableEntry = {
            id: 'stable/latest',
            path: 'stable/',
            url: new URL('stable/', releasesUrl).href,
            date: '',
            status: 'stable',
            notes: 'Entrypoint stabile. Riceve aggiornamenti automatici.',
            schemaVersion: null,
            isRecommended: false,
            isCurrent: !currentReleaseId && channel !== 'dev',
            isChannel: true,
            launchPath: 'stable/'
        };

        return {
            recommended,
            releases: [
                stableEntry,
                ...releases
                .filter(release => release && release.id && release.path)
                .map(release => {
                    const id = String(release.id);
                    const status = String(release.status || '');

                    return {
                        id,
                        path: String(release.path),
                        url: new URL(String(release.path), releasesUrl).href,
                        date: String(release.date || ''),
                        status,
                        notes: String(release.notes || ''),
                        schemaVersion: release.schemaVersion,
                        isRecommended: id === recommended || status === 'recommended',
                        isCurrent: id === currentReleaseId,
                        isChannel: false,
                        launchPath: String(release.path)
                    };
                })
            ]
        };
    }

    function getSnapshotRestoreSuccessMessage(result = {}) {
        if (result.restoredRaw) {
            return 'Snapshot grezzo ripristinato. Controlla i dati grezzi se l app segnala errori.';
        }

        return `${Number(result.count || 0)} spese ripristinate dallo snapshot \u2713`;
    }

    function fail(error, code) {
        return {
            success: false,
            error,
            code
        };
    }

    function previewImportFile(options = {}) {
        const { file, content, storage } = options;
        const format = detectImportFormat(file);

        if (format === 'json') {
            return storage.previewImportJSON(content);
        }

        if (format === 'csv') {
            return storage.previewImportCSV(content);
        }

        return fail('Usa .json o .csv', 'unsupported-import-format');
    }

    function buildExportDownload(options = {}) {
        const { format, storage, dateStamp } = options;

        let result;
        if (format === 'json') {
            result = storage.exportJSON();
        } else if (format === 'csv') {
            result = storage.exportCSV();
        } else {
            return fail('Formato export non valido', 'unsupported-export-format');
        }

        if (!result.success) return result;

        return {
            success: true,
            download: getExportDownloadSpec(format, result.content, dateStamp)
        };
    }

    function buildCustomExportDownload(options = {}) {
        const storage = options.storage;
        const format = normalizeExportFormat(options.format);
        const includeData = options.includeData !== false;
        const includeSettings = format === 'json' && options.includeSettings !== false;
        const includePersonalizzazioni = format === 'json' && options.includePersonalizzazioni === true;
        const selectedSpese = Array.isArray(options.selectedSpese) ? options.selectedSpese : [];

        if (format === 'csv' && selectedSpese.length === 0) {
            return fail('Seleziona almeno una spesa per esportare CSV custom.', 'empty-custom-selection');
        }

        if (format === 'json' && !includeData && !includeSettings && !includePersonalizzazioni) {
            return fail('Seleziona almeno un contenuto da esportare.', 'empty-custom-content');
        }

        if (includeData && selectedSpese.length === 0) {
            return fail('Seleziona almeno una spesa o usa Export Default per il backup completo.', 'empty-custom-selection');
        }

        let result;
        if (format === 'csv') {
            result = storage.exportCSV({ spese: selectedSpese });
        } else {
            result = storage.exportJSON({
                spese: includeData ? selectedSpese : [],
                includeData,
                includeSettings,
                includePersonalizzazioni
            });
        }

        if (!result.success) return result;

        return {
            success: true,
            count: result.count,
            download: getCustomExportDownloadSpec(format, result.content, options.dateStamp)
        };
    }

    function buildRawDownload(options = {}) {
        const { storage, dateStamp } = options;
        const result = storage.exportRaw();

        if (!result.success) return result;

        return {
            success: true,
            download: getRawDownloadSpec(result.content, dateStamp)
        };
    }

    function commitImport(options = {}) {
        const { preview = {}, content, mode, storage } = options;
        const result = preview.format === 'json'
            ? storage.importJSON(content, { mode })
            : storage.importCSV(content, { mode });

        if (!result.success) return result;

        return {
            success: true,
            result,
            toast: getImportSuccessMessage(result, mode)
        };
    }

    function updateTheme(options = {}) {
        const { theme, storage } = options;
        const result = storage.updateSettings({ tema: theme });

        if (!result.success) return result;

        return {
            success: true,
            theme,
            result
        };
    }

    function clearAll(options = {}) {
        const { storage } = options;
        const result = storage.clearAll({
            clearSnapshot: !!options.clearSnapshot
        });

        if (!result.success) return result;

        return {
            success: true,
            result,
            toast: options.clearSnapshot
                ? 'Dati e snapshot eliminati'
                : 'Dati eliminati'
        };
    }

    function restoreSnapshot(options = {}) {
        const { storage } = options;
        const result = storage.restoreSnapshot();

        if (!result.success) return result;

        return {
            success: true,
            result,
            toast: getSnapshotRestoreSuccessMessage(result)
        };
    }

    function createVersionChangeSnapshot(options = {}) {
        const { storage } = options;

        if (!storage || typeof storage.createSnapshot !== 'function') {
            return { success: true };
        }

        return storage.createSnapshot('version-change');
    }

    return {
        detectImportFormat,
        getExportChoices,
        getExportFormats,
        normalizeFilterSnapshot,
        createExportFilterSnapshot,
        normalizeExportPreferences,
        readExportPreferences,
        saveExportPreferences,
        getImportChoices,
        getExportDownloadSpec,
        getCustomExportDownloadSpec,
        getRawDownloadSpec,
        getImportSuccessMessage,
        getReleasesManifestUrl,
        getCurrentReleaseId,
        setLaunchTarget,
        getPreferredLaunchUrl,
        registerLaunchServiceWorker,
        shouldRegisterLaunchServiceWorker,
        getAppInfo,
        normalizeReleaseManifest,
        previewImportFile,
        buildExportDownload,
        buildCustomExportDownload,
        buildRawDownload,
        commitImport,
        updateTheme,
        clearAll,
        restoreSnapshot,
        createVersionChangeSnapshot
    };
})();
