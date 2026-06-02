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

    function renderReleaseModel(container, model, options = {}) {
        const doc = options.document || null;
        const releaseList = (container && container.querySelector('#release-modal-list')) ||
            (doc && doc.getElementById('release-modal-list'));
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
            }, options);
            return Promise.resolve();
        }

        const releasesUrl = SettingsActions.getReleasesManifestUrl(locationLike);
        const currentReleaseId = SettingsActions.getCurrentReleaseId(locationLike);

        renderReleaseModel(container, { status: 'loading' }, options);

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
                    currentReleaseId,
                    channel: (options.appConfig || {}).channel
                });

                renderReleaseModel(container, {
                    status: 'ready',
                    ...releaseModel
                }, options);
            })
            .catch(error => {
                renderReleaseModel(container, {
                    status: 'error',
                    message: error && error.message ? error.message : 'Errore sconosciuto.'
                }, options);
            });
    }

    function getReleaseModal(options = {}) {
        const doc = options.document || (typeof document === 'undefined' ? null : document);
        if (!doc || typeof doc.getElementById !== 'function') return null;

        return doc.getElementById('release-modal-overlay');
    }

    function openReleaseModal(options = {}) {
        const modal = getReleaseModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.remove('hidden');

        if (!wasOpen && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'release-modal' });
        }
    }

    function closeReleaseModal(options = {}, fromPopstate = false) {
        const modal = getReleaseModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.add('hidden');

        if (wasOpen && !fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function isReleaseModalOpen(options = {}) {
        const modal = getReleaseModal(options);

        return !!(modal && !modal.classList.contains('hidden'));
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

        const releaseChooser = container.querySelector('#btn-release-chooser');
        if (releaseChooser) {
            releaseChooser.addEventListener('click', () => openReleaseModal(options));
        }
    }

    function getCurrentPage(options = {}) {
        return typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : '';
    }

    function getVersionSwitchHistorySteps(options = {}) {
        if (Number.isFinite(options.historySteps)) {
            return Math.max(0, Number(options.historySteps));
        }

        const currentPage = getCurrentPage(options);
        const pageStep = currentPage && currentPage !== 'timeline' ? 1 : 0;

        return 1 + pageStep;
    }

    function replaceLocation(url, options = {}) {
        const locationLike = options.locationLike;
        if (locationLike && typeof locationLike.replace === 'function') {
            locationLike.replace(url);
            return true;
        }

        if (locationLike) {
            locationLike.href = url;
            return true;
        }

        return false;
    }

    function replaceLocationAfterHistoryCleanup(url, options = {}) {
        const steps = getVersionSwitchHistorySteps(options);
        const canConsumeHistory = steps > 0 && typeof options.consumeUiState === 'function';

        if (!canConsumeHistory) {
            return replaceLocation(url, options);
        }

        const win = options.window || (typeof window === 'undefined' ? null : window);
        const setTimer = options.setTimeout ||
            (win && typeof win.setTimeout === 'function' ? win.setTimeout.bind(win) : null);
        let done = false;
        let removeListener = null;
        const finish = () => {
            if (done) return;
            done = true;
            if (removeListener) removeListener();
            replaceLocation(url, options);
        };

        if (win && typeof win.addEventListener === 'function') {
            const onPopstate = () => finish();
            win.addEventListener('popstate', onPopstate, { once: true });
            removeListener = () => {
                if (typeof win.removeEventListener === 'function') {
                    win.removeEventListener('popstate', onPopstate);
                }
            };
        }

        const consumed = options.consumeUiState(steps);
        if (!consumed) {
            finish();
            return true;
        }

        if (setTimer) {
            setTimer(finish, 700);
        } else if (!win) {
            finish();
        }

        return true;
    }

    function installReleaseFromLink(link, options = {}) {
        if (!link) return false;

        SettingsActions.setLaunchTarget(
            link.dataset.launchPath || '',
            options.localStorage
        );

        return replaceLocationAfterHistoryCleanup(link.href, options);
    }

    function bindReleaseModal(options = {}) {
        const modal = getReleaseModal(options);
        if (!modal || modal.dataset.bound === 'true') return;

        modal.dataset.bound = 'true';

        const closeBtn = modal.querySelector('#release-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeReleaseModal(options));
        }

        modal.addEventListener('click', event => {
            if (event.target.id === 'release-modal-overlay') {
                closeReleaseModal(options);
                return;
            }

            const link = event.target.closest('.release-install-link');
            if (!link) return;

            event.preventDefault();
            installReleaseFromLink(link, options);
        });
    }

    function render(options = {}) {
        const { container, storage } = options;
        if (!container || !storage) return;

        container.innerHTML = SettingsView.renderPage(getRenderModel(options));
        bindEvents(container, options);
        bindReleaseModal(options);
        loadReleases(container, options);
    }

    return {
        getRenderModel,
        createExportChoices,
        createImportChoices,
        loadReleases,
        openReleaseModal,
        closeReleaseModal,
        isReleaseModalOpen,
        installReleaseFromLink,
        render
    };
})();
