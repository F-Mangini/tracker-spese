/* ============================================
   SETTINGS CONTROLLER - wiring pagina impostazioni
   ============================================ */

const SettingsController = (() => {
    function normalizeOptions(optionsOrStorage = {}) {
        return optionsOrStorage.storage
            ? optionsOrStorage
            : { storage: optionsOrStorage };
    }

    function getSpese(options = {}) {
        if (typeof options.getSpese === 'function') return options.getSpese();
        return options.storage.getSpese();
    }

    function getRenderModel(optionsOrStorage) {
        const options = normalizeOptions(optionsOrStorage);
        const storage = options.storage;
        const settings = storage.getSettings();
        const spese = getSpese(options);

        return {
            settings,
            spese,
            sizeKB: storage.getStorageSizeKB(),
            storageStatus: storage.getStatus(),
            dateRange: SettingsView.getDateRange(spese),
            releaseModel: options.releaseModel,
            appInfo: SettingsActions.getAppInfo(
                options.appConfig || {},
                options.locationLike || {}
            )
        };
    }

    function renderReleaseModel(container, model) {
        const releaseList = container && container.querySelector('#release-list');
        if (!releaseList) return;

        releaseList.innerHTML = SettingsView.renderReleaseList(model);
    }

    function loadReleases(container, options = {}) {
        const fetchFn = options.fetchFn;
        const locationLike = options.locationLike || {};

        if (typeof fetchFn !== 'function') {
            renderReleaseModel(container, {
                status: 'error',
                message: 'Apri l app da server HTTP/HTTPS per leggere releases.json.'
            });
            return Promise.resolve();
        }

        const releasesUrl = SettingsActions.getReleasesManifestUrl(locationLike);
        const currentReleaseId = SettingsActions.getCurrentReleaseId(locationLike);

        renderReleaseModel(container, { status: 'loading' });

        return fetchFn(releasesUrl, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then(manifest => {
                const releaseModel = SettingsActions.normalizeReleaseManifest(manifest, {
                    releasesUrl,
                    currentReleaseId
                });

                renderReleaseModel(container, {
                    status: 'ready',
                    ...releaseModel
                });
            })
            .catch(error => {
                renderReleaseModel(container, {
                    status: 'error',
                    message: error && error.message ? error.message : 'Errore sconosciuto.'
                });
            });
    }

    function createExportChoices(options = {}) {
        return SettingsActions.getExportChoices().map(choice => ({
            ...choice,
            onClick: choice.format
                ? () => downloadExport(choice.format, options)
                : undefined
        }));
    }

    function createImportChoices(preview, content, hasSpese, options = {}) {
        return SettingsActions.getImportChoices(hasSpese).map(choice => ({
            ...choice,
            onClick: choice.mode
                ? () => commitImport(preview, content, choice.mode, options)
                : undefined
        }));
    }

    function showExportChoice(options = {}) {
        options.showChoices(
            'Esportare i dati in quale formato?',
            createExportChoices(options)
        );
    }

    function downloadExport(format, options = {}) {
        const result = SettingsActions.buildExportDownload({
            format,
            storage: options.storage,
            dateStamp: options.dateStamp()
        });

        if (!result.success) {
            options.showToast(result.error || 'Export non riuscito', 'error');
            return;
        }

        const spec = result.download;
        options.download(spec.content, spec.filename, spec.mime);
        options.showToast(spec.toast, 'info');
    }

    function downloadRawData(options = {}) {
        const result = SettingsActions.buildRawDownload({
            storage: options.storage,
            dateStamp: options.dateStamp()
        });

        if (!result.success) {
            options.showToast(result.error || 'Export grezzo non riuscito', 'error');
            return;
        }

        const spec = result.download;
        options.download(spec.content, spec.filename, spec.mime);
        options.showToast(spec.toast, 'info');
    }

    function showImportChoice(preview, content, options = {}) {
        const hasSpese = getSpese(options).length > 0;
        const msg = SettingsView.renderImportPreviewMessage(preview, hasSpese);
        const choices = createImportChoices(preview, content, hasSpese, options);

        options.showChoices(msg, choices);
    }

    function commitImport(preview, content, mode, options = {}) {
        const importResult = SettingsActions.commitImport({
            preview,
            content,
            mode,
            storage: options.storage
        });

        if (!importResult.success) {
            options.showToast('Errore: ' + importResult.error, 'error');
            return;
        }

        options.refreshAfterDataChange();
        options.showToast(importResult.toast, 'success');
    }

    function updateTheme(theme, options = {}) {
        const result = SettingsActions.updateTheme({
            theme,
            storage: options.storage
        });

        if (!result.success) {
            options.showToast(result.error || 'Salvataggio impostazioni non riuscito', 'error');
            return;
        }

        options.applyTheme(result.theme);
        options.refreshSettings();
    }

    function clearAll(options = {}) {
        const result = SettingsActions.clearAll({
            storage: options.storage
        });

        if (!result.success) {
            options.showToast(result.error || 'Cancellazione non riuscita', 'error');
            return;
        }

        options.refreshAfterDataChange();
        options.showToast(result.toast, 'info');
    }

    function handleImportFile(fileInput, file, options = {}) {
        const Reader = options.FileReaderClass || FileReader;
        const reader = new Reader();

        reader.onload = ev => {
            const content = ev.target.result;
            const preview = SettingsActions.previewImportFile({
                file,
                content,
                storage: options.storage
            });

            if (!preview.success) {
                options.showToast(preview.code === 'unsupported-import-format'
                    ? preview.error
                    : 'Errore: ' + preview.error, 'error');
            } else {
                showImportChoice(preview, content, options);
            }

            fileInput.value = '';
        };

        reader.readAsText(file);
    }

    function bindEvents(container, options = {}) {
        container.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', () => updateTheme(btn.dataset.theme, options));
        });

        container.querySelector('#btn-export')
            .addEventListener('click', () => showExportChoice(options));

        const rawBtn = container.querySelector('#btn-export-raw');
        if (rawBtn) {
            rawBtn.addEventListener('click', () => downloadRawData(options));
        }

        const fileInput = container.querySelector('#import-file');
        container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) handleImportFile(fileInput, file, options);
        });

        container.querySelector('#btn-clear-all').addEventListener('click', () => {
            options.showConfirm('Eliminare TUTTI i dati?', () => clearAll(options));
        });
    }

    function render(options = {}) {
        const { container, storage } = options;
        if (!container || !storage) return;

        container.innerHTML = SettingsView.renderPage(getRenderModel(options));
        bindEvents(container, options);
        loadReleases(container, options);
    }

    return {
        getRenderModel,
        createExportChoices,
        createImportChoices,
        loadReleases,
        render
    };
})();
