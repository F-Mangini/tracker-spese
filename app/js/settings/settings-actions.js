/* ============================================
   SETTINGS ACTIONS - decisioni pure impostazioni
   ============================================ */

const SettingsActions = (() => {
    const LAUNCH_TARGET_KEY = 'spesa-tracker-launch-target';

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
            { text: 'JSON backup', className: 'btn-primary', format: 'json' },
            { text: 'CSV tabella', className: 'btn-secondary', format: 'csv' }
        ];
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

        return /^releases\/[^/]+\/$/.test(value) ? value : '';
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
        const currentReleaseId = getCurrentReleaseId(locationLike);

        if (channel === 'dev' || !targetPath || currentReleaseId) {
            return '';
        }

        const targetUrl = new URL(targetPath, getLaunchBaseUrl(locationLike)).href;
        const currentUrl = new URL(locationLike.href || 'http://localhost/').href;

        return targetUrl === currentUrl ? '' : targetUrl;
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
            notes: 'Entrypoint stabile aggiornato dal maintainer. Non installarlo se vuoi restare su una release immutabile.',
            schemaVersion: null,
            isRecommended: false,
            isCurrent: !currentReleaseId && channel !== 'dev',
            isChannel: true,
            launchPath: ''
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
        const result = storage.clearAll();

        if (!result.success) return result;

        return {
            success: true,
            result,
            toast: 'Dati eliminati'
        };
    }

    return {
        detectImportFormat,
        getExportChoices,
        getImportChoices,
        getExportDownloadSpec,
        getRawDownloadSpec,
        getImportSuccessMessage,
        getReleasesManifestUrl,
        getCurrentReleaseId,
        setLaunchTarget,
        getPreferredLaunchUrl,
        getAppInfo,
        normalizeReleaseManifest,
        previewImportFile,
        buildExportDownload,
        buildRawDownload,
        commitImport,
        updateTheme,
        clearAll
    };
})();
