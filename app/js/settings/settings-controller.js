/* ============================================
   SETTINGS CONTROLLER - wiring pagina impostazioni
   ============================================ */

import { ExportModalController } from './export-modal-controller.js';
import { ReleaseModalController } from './release-modal-controller.js';
import { SettingsActions } from './settings-actions.js';
import { SettingsView } from './settings-view.js';

export const SettingsController = (() => {
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
            customExportBtn.addEventListener('click', () => ExportModalController.open(options));
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
            releaseChooser.addEventListener('click', () => ReleaseModalController.open(options));
        }
    }

    function render(options = {}) {
        const { container, storage } = options;
        if (!container || !storage) return;

        container.innerHTML = SettingsView.renderPage(getRenderModel(options));
        bindEvents(container, options);
        ReleaseModalController.bind(options);
        ExportModalController.bind(options);
        ReleaseModalController.loadReleases(container, options);
    }

    function resetState() {
        ExportModalController.resetState();
        ReleaseModalController.resetState();
    }

    return {
        getRenderModel,
        createExportChoices,
        createImportChoices,
        loadReleases: ReleaseModalController.loadReleases,
        openReleaseModal: ReleaseModalController.open,
        closeReleaseModal: ReleaseModalController.close,
        isReleaseModalOpen: ReleaseModalController.isOpen,
        openExportModal: ExportModalController.open,
        closeExportModal: ExportModalController.close,
        isExportModalOpen: ExportModalController.isOpen,
        isExportFormatDropdownOpen: ExportModalController.isFormatDropdownOpen,
        clearExportModalInteraction: ExportModalController.clearInteraction,
        bindReleaseModal: ReleaseModalController.bind,
        bindExportModal: ExportModalController.bind,
        installReleaseFromLink: ReleaseModalController.installReleaseFromLink,
        getExportModalState: ExportModalController.getState,
        resetState,
        render
    };
})();
