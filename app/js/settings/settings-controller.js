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
        if (options.storage && typeof options.storage.getSpese === 'function') {
            return options.storage.getSpese();
        }
        return [];
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
            snapshotInfo: typeof storage.getSnapshotInfo === 'function'
                ? storage.getSnapshotInfo()
                : { exists: false },
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

    function getExportModal(options = {}) {
        const doc = options.document || (typeof document === 'undefined' ? null : document);
        if (!doc || typeof doc.getElementById !== 'function') return null;

        return doc.getElementById('export-modal-overlay');
    }

    function getExportPreferences(options = {}) {
        return SettingsActions.readExportPreferences(options.localStorage, options.storage);
    }

    function saveExportPreferences(options = {}, preferences = {}) {
        return SettingsActions.saveExportPreferences(
            options.localStorage,
            options.storage,
            preferences
        );
    }

    function getCurrentSelectedIds(options = {}) {
        const ids = typeof options.getTimelineSelectedIds === 'function'
            ? options.getTimelineSelectedIds()
            : [];

        if (ids instanceof Set) return Array.from(ids).filter(Boolean);
        if (Array.isArray(ids)) return ids.filter(Boolean);
        return [];
    }

    function getAllExpenseIds(options = {}) {
        return getSpese(options)
            .map(spesa => spesa && spesa.id)
            .filter(Boolean);
    }

    function getCurrentFilterSnapshot(options = {}) {
        return typeof options.getCurrentFilterSnapshot === 'function'
            ? SettingsActions.normalizeFilterSnapshot(options.getCurrentFilterSnapshot())
            : SettingsActions.normalizeFilterSnapshot();
    }

    function getExportFilterCount(options = {}, prefs = null) {
        const preferences = prefs || getExportPreferences(options);

        return typeof options.countExportFilters === 'function'
            ? options.countExportFilters(preferences.filterSnapshot)
            : SettingsActions.countActiveFilterSnapshot(preferences.filterSnapshot);
    }

    function getEffectiveSelectedIds(options = {}, prefs = null) {
        const currentSelectedIds = getCurrentSelectedIds(options);
        if (currentSelectedIds.length > 0) return currentSelectedIds;

        const preferences = prefs || getExportPreferences(options);
        if (preferences.selectedIds.length > 0) return preferences.selectedIds;

        return preferences.selectionInitialized ? [] : getAllExpenseIds(options);
    }

    function getSelectedSpese(options = {}) {
        if (typeof options.getSelectedSpese === 'function') {
            return options.getSelectedSpese();
        }

        const selectedIds = new Set(getCurrentSelectedIds(options));
        return getSpese(options).filter(spesa => spesa && selectedIds.has(spesa.id));
    }

    function getExportSelectedSpese(options = {}, prefs = null) {
        const selectedIds = new Set(getEffectiveSelectedIds(options, prefs));
        const spese = getSpese(options);

        if (spese.length === 0 && typeof options.getSelectedSpese === 'function') {
            return options.getSelectedSpese();
        }

        return spese.filter(spesa => spesa && selectedIds.has(spesa.id));
    }

    function getExportModalModel(options = {}) {
        const preferences = getExportPreferences(options);

        return {
            preferences,
            selectedCount: getExportSelectedSpese(options, preferences).length,
            filterCount: getExportFilterCount(options, preferences)
        };
    }

    function initExportFormatDropdown(options = {}, prefs = null) {
        const modal = getExportModal(options);
        if (!modal || typeof modal.querySelector !== 'function') return;
        if (typeof ModalInteractions === 'undefined' || !ModalInteractions.createSearchableDropdown) return;

        const container = modal.querySelector('#sd-export-format');
        if (!container) return;

        ModalInteractions.createSearchableDropdown({
            container,
            items: SettingsActions.getExportFormats(),
            currentValue: (prefs || getExportPreferences(options)).format,
            modalSelector: '#export-modal',
            onChange: () => syncExportModalFromDraft(options)
        });
    }

    function renderExportModal(options = {}) {
        const modal = getExportModal(options);
        if (!modal || typeof modal.querySelector !== 'function') return;

        const model = getExportModalModel(options);
        const body = modal.querySelector('#export-modal-body');
        if (body) {
            body.innerHTML = SettingsView.renderExportModal(model);
        }

        initExportFormatDropdown(options, model.preferences);

        const filterBtn = modal.querySelector('#btn-export-filters');
        if (filterBtn) {
            const label = typeof filterBtn.querySelector === 'function'
                ? filterBtn.querySelector('.export-filter-label')
                : null;
            const badge = typeof filterBtn.querySelector === 'function'
                ? filterBtn.querySelector('#export-filter-badge')
                : null;
            const filterCount = model.filterCount;

            if (label) label.textContent = 'Filtra \uD83D\uDD0D';
            if (badge) {
                badge.textContent = String(filterCount);
                badge.classList.toggle('hidden', filterCount <= 0);
            } else {
                filterBtn.textContent = 'Filtra \uD83D\uDD0D';
            }
        }
    }

    function prepareExportModalState(options = {}, config = {}) {
        const prefs = getExportPreferences(options);
        const selectedIds = Object.prototype.hasOwnProperty.call(config, 'selectedIds')
            ? SettingsActions.normalizeExportPreferences({ selectedIds: config.selectedIds }).selectedIds
            : null;
        const nextPrefs = {
            ...prefs,
            selectedIds: selectedIds || (prefs.selectionInitialized ? prefs.selectedIds : getAllExpenseIds(options)),
            filterSnapshot: selectedIds ? getCurrentFilterSnapshot(options) : prefs.filterSnapshot,
            selectionInitialized: true
        };
        const savedPrefs = saveExportPreferences(options, nextPrefs);

        if (typeof options.applyExportFilterSnapshot === 'function') {
            options.applyExportFilterSnapshot(savedPrefs.filterSnapshot);
        }

        return savedPrefs;
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

    function openExportModal(options = {}, config = {}) {
        const modal = getExportModal(options);
        if (!modal) return;

        prepareExportModalState(options, config);
        renderExportModal(options);

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.remove('hidden');

        if (!wasOpen && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'export-modal' });
        }
    }

    function closeExportModal(options = {}, fromPopstate = false) {
        const modal = getExportModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.add('hidden');

        if (wasOpen && !fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function isExportModalOpen(options = {}) {
        const modal = getExportModal(options);

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

    function showDefaultExportConfirm(options = {}) {
        options.showConfirm(
            'Esportare un backup JSON completo?',
            () => downloadExport('json', options),
            {
                yesText: 'Esporta',
                yesClass: 'btn-primary'
            }
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

    function readExportModalDraft(options = {}) {
        const modal = getExportModal(options);
        if (!modal || typeof modal.querySelector !== 'function') {
            return getExportPreferences(options);
        }

        const prefs = getExportPreferences(options);
        const formatField = modal.querySelector('#sd-export-format .sd-input') ||
            modal.querySelector('#export-format');
        const dataField = modal.querySelector('#export-include-data');
        const settingsField = modal.querySelector('#export-include-settings');
        const personalizzazioniField = modal.querySelector('#export-include-personalizzazioni');
        const format = formatField
            ? (formatField.dataset && formatField.dataset.value ? formatField.dataset.value : formatField.value)
            : prefs.format;
        const csvMode = format === 'csv';

        return SettingsActions.normalizeExportPreferences({
            ...prefs,
            format,
            includeData: csvMode || !dataField || dataField.checked,
            includeSettings: !csvMode && (!settingsField || settingsField.checked),
            includePersonalizzazioni: !csvMode && !!(personalizzazioniField && personalizzazioniField.checked),
            selectedIds: getEffectiveSelectedIds(options, prefs)
        });
    }

    function persistExportModalDraft(options = {}) {
        return saveExportPreferences(options, readExportModalDraft(options));
    }

    function syncExportModalFromDraft(options = {}) {
        const prefs = persistExportModalDraft(options);
        renderExportModal(options);
    }

    function downloadCustomExport(options = {}) {
        const draftPrefs = persistExportModalDraft(options);
        const prefs = saveExportPreferences(options, {
            ...draftPrefs,
            filterSnapshot: getCurrentFilterSnapshot(options),
            selectedIds: getEffectiveSelectedIds(options, draftPrefs),
            selectionInitialized: true
        });
        const result = SettingsActions.buildCustomExportDownload({
            ...prefs,
            storage: options.storage,
            selectedSpese: getExportSelectedSpese(options, prefs),
            dateStamp: options.dateStamp()
        });

        if (!result.success) {
            options.showToast(result.error || 'Export custom non riuscito', 'error');
            return;
        }

        saveExportPreferences(options, {
            ...prefs,
            selectedIds: getEffectiveSelectedIds(options, prefs)
        });

        const spec = result.download;
        options.download(spec.content, spec.filename, spec.mime);
        options.showToast(spec.toast, 'info');
    }

    function openExportFilters(options = {}) {
        const prefs = persistExportModalDraft(options);
        const currentSelectedIds = getCurrentSelectedIds(options);
        const selectedIds = currentSelectedIds.length > 0
            ? currentSelectedIds
            : prefs.selectedIds;
        const initialized = prefs.selectionInitialized || selectedIds.length > 0;

        if (typeof options.applyExportFilterSnapshot === 'function') {
            options.applyExportFilterSnapshot(prefs.filterSnapshot);
        }

        if (typeof options.beginExportSelection === 'function') {
            const result = options.beginExportSelection({
                selectedIds: initialized ? selectedIds : [],
                selectFilteredWhenEmpty: !initialized
            });

            saveExportPreferences(options, {
                ...prefs,
                selectionInitialized: true,
                selectedIds: result && Array.isArray(result.selectedIds)
                    ? result.selectedIds
                    : getCurrentSelectedIds(options)
            });
        } else {
            saveExportPreferences(options, {
                ...prefs,
                selectionInitialized: true
            });
        }

        closeExportModal(options, true);

        if (typeof options.navigateToTimeline === 'function') {
            options.navigateToTimeline();
        }
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

    function clearAll(options = {}, clearSnapshot = false) {
        const result = SettingsActions.clearAll({
            storage: options.storage,
            clearSnapshot
        });

        if (!result.success) {
            options.showToast(result.error || 'Cancellazione non riuscita', 'error');
            return;
        }

        options.refreshAfterDataChange();
        options.showToast(result.toast, 'info');
    }

    function restoreSnapshot(options = {}) {
        const result = SettingsActions.restoreSnapshot({
            storage: options.storage
        });

        if (!result.success) {
            options.showToast(result.error || 'Ripristino snapshot non riuscito', 'error');
            return;
        }

        options.refreshAfterDataChange();
        options.showToast(result.toast, result.result.restoredRaw ? 'info' : 'success');
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

        const defaultExportBtn = container.querySelector('#btn-export-default');
        if (defaultExportBtn) {
            defaultExportBtn.addEventListener('click', () => showDefaultExportConfirm(options));
        }

        const customExportBtn = container.querySelector('#btn-export-custom');
        if (customExportBtn) {
            customExportBtn.addEventListener('click', () => openExportModal(options));
        }

        const rawBtn = container.querySelector('#btn-export-raw');
        if (rawBtn) {
            rawBtn.addEventListener('click', () => downloadRawData(options));
        }

        const restoreBtn = container.querySelector('#btn-restore-snapshot');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => {
                options.showConfirm(
                    'Ripristinare lo snapshot locale? I dati attuali verranno sostituiti.',
                    () => restoreSnapshot(options),
                    {
                        yesText: 'Ripristina',
                        yesClass: 'btn-warning'
                    }
                );
            });
        }

        const fileInput = container.querySelector('#import-file');
        container.querySelector('#btn-import').addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) handleImportFile(fileInput, file, options);
        });

        container.querySelector('#btn-clear-all').addEventListener('click', () => {
            options.showConfirm(
                'Eliminare TUTTI i dati?',
                state => clearAll(options, !!(state && state.clearSnapshot)),
                {
                    checkbox: {
                        key: 'clearSnapshot',
                        label: 'Elimina anche lo snapshot locale',
                        checked: false
                    }
                }
            );
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

        if (typeof SettingsActions.createVersionChangeSnapshot === 'function') {
            const snapshot = SettingsActions.createVersionChangeSnapshot({
                storage: options.storage
            });

            if (!snapshot.success) {
                if (typeof options.showToast === 'function') {
                    options.showToast(
                        snapshot.error || 'Snapshot prima del cambio versione non riuscito',
                        'error'
                    );
                }
                return false;
            }
        }

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

    function bindExportModal(options = {}) {
        const modal = getExportModal(options);
        if (!modal || modal.dataset.bound === 'true') return;

        modal.dataset.bound = 'true';

        const closeBtn = modal.querySelector('#export-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeExportModal(options));
        }

        modal.addEventListener('click', event => {
            if (event.target.id === 'export-modal-overlay') {
                closeExportModal(options);
                return;
            }

            const filterButton = event.target.id === 'btn-export-filters' ||
                (event.target.closest && event.target.closest('#btn-export-filters'));
            if (filterButton) {
                openExportFilters(options);
                return;
            }

            const exportButton = event.target.id === 'btn-export-run' ||
                (event.target.closest && event.target.closest('#btn-export-run'));
            if (exportButton) {
                downloadCustomExport(options);
            }
        });

        modal.addEventListener('change', event => {
            const target = event.target;
            if (!target || !target.id || !/^export-(format|include-)/.test(target.id)) return;

            syncExportModalFromDraft(options);
        });
    }

    function render(options = {}) {
        const { container, storage } = options;
        if (!container || !storage) return;

        container.innerHTML = SettingsView.renderPage(getRenderModel(options));
        bindEvents(container, options);
        bindReleaseModal(options);
        bindExportModal(options);
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
        openExportModal,
        closeExportModal,
        isExportModalOpen,
        bindReleaseModal,
        bindExportModal,
        installReleaseFromLink,
        render
    };
})();
