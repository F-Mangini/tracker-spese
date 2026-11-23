/* ============================================
   EXPORT MODAL CONTROLLER - finestra esportazione custom
   ============================================ */

const ExportModalController = (() => {
    const EXPORT_MODAL_OPTIONS_KEY = '__settingsExportOptions';

    function getSpese(options = {}) {
        if (typeof options.getSpese === 'function') return options.getSpese();
        return options.storage.getSpese();
    }

    function getExportModal(options = {}) {
        const doc = options.document || (typeof document === 'undefined' ? null : document);
        if (!doc || typeof doc.getElementById !== 'function') return null;

        return doc.getElementById('export-modal-overlay');
    }

    function setExportModalOptions(modal, options = {}) {
        if (!modal) return;
        modal[EXPORT_MODAL_OPTIONS_KEY] = options;
    }

    function getBoundExportModalOptions(modal, fallback = {}) {
        return modal && modal[EXPORT_MODAL_OPTIONS_KEY]
            ? modal[EXPORT_MODAL_OPTIONS_KEY]
            : fallback;
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
        if (
            ids &&
            typeof ids.size === 'number' &&
            typeof ids.has === 'function' &&
            typeof ids.forEach === 'function'
        ) {
            return Array.from(ids).filter(Boolean);
        }
        if (Array.isArray(ids)) return ids.filter(Boolean);
        return [];
    }

    function getSelectedSpese(options = {}) {
        if (typeof options.getSelectedSpese === 'function') {
            return options.getSelectedSpese();
        }

        const selectedIds = new Set(getCurrentSelectedIds(options));
        return getSpese(options).filter(spesa => spesa && selectedIds.has(spesa.id));
    }

    function getAllExpenseIds(options = {}) {
        return getSpese(options)
            .map(spesa => spesa && spesa.id)
            .filter(Boolean);
    }

    function normalizeSelectionIds(ids) {
        if (
            SettingsActions &&
            typeof SettingsActions.normalizeIdList === 'function'
        ) {
            return SettingsActions.normalizeIdList(ids);
        }

        if (ids instanceof Set) return Array.from(ids).filter(Boolean);
        if (Array.isArray(ids)) return ids.filter(Boolean);
        return [];
    }

    function getExistingSelectionIds(ids, options = {}) {
        const existingIds = new Set(getAllExpenseIds(options));
        return normalizeSelectionIds(ids).filter(id => existingIds.has(id));
    }

    function areSameSelection(left = [], right = []) {
        const leftIds = Array.from(new Set(normalizeSelectionIds(left))).sort();
        const rightIds = Array.from(new Set(normalizeSelectionIds(right))).sort();

        return leftIds.length === rightIds.length &&
            leftIds.every((id, index) => id === rightIds[index]);
    }

    function selectionContainsAll(currentIds = [], requiredIds = []) {
        const current = new Set(normalizeSelectionIds(currentIds));
        return normalizeSelectionIds(requiredIds).every(id => current.has(id));
    }

    function areSameFilterSnapshots(left = {}, right = {}) {
        if (!SettingsActions || typeof SettingsActions.normalizeFilterSnapshot !== 'function') {
            return false;
        }

        const normalize = snapshot => {
            const filters = SettingsActions.normalizeFilterSnapshot(snapshot);
            return {
                ...filters,
                categories: normalizeSelectionIds(filters.categories).sort(),
                excludedCategories: normalizeSelectionIds(filters.excludedCategories).sort(),
                methods: normalizeSelectionIds(filters.methods).sort(),
                excludedMethods: normalizeSelectionIds(filters.excludedMethods).sort(),
                amountMax: filters.amountMax === Infinity ? 'Infinity' : filters.amountMax
            };
        };
        const leftFilters = normalize(left);
        const rightFilters = normalize(right);

        return JSON.stringify(leftFilters) === JSON.stringify(rightFilters);
    }

    function getLastExportFilteredIds(prefs, options = {}) {
        const lastExport = prefs && prefs.lastExport;
        if (!lastExport || !lastExport.filters) return [];

        if (typeof options.getFilteredIdsForExportFilters === 'function') {
            return getExistingSelectionIds(
                options.getFilteredIdsForExportFilters(lastExport.filters, lastExport.selectedIds),
                options
            );
        }

        return [];
    }

    function getCurrentFilterSnapshot(options = {}) {
        const filters = typeof options.getCurrentFilters === 'function'
            ? options.getCurrentFilters()
            : {};

        return SettingsActions.createExportFilterSnapshot(filters);
    }

    function getExportMemoryState(options = {}, prefs = getExportPreferences(options)) {
        const lastExport = prefs.lastExport;
        const currentIds = getExistingSelectionIds(getCurrentSelectedIds(options), options);
        const lastSelectionIds = lastExport
            ? getExistingSelectionIds(lastExport.selectedIds, options)
            : [];
        const lastFilterIds = lastExport
            ? getLastExportFilteredIds(prefs, options)
            : [];
        const hasLastExport = !!lastExport;
        const currentFilters = getCurrentFilterSnapshot(options);
        const lastFiltersMatch = hasLastExport &&
            lastExport.filters &&
            areSameFilterSnapshots(currentFilters, lastExport.filters);

        return {
            hasLastExport,
            currentIds,
            lastSelectionIds,
            lastFilterIds,
            lastSelectionActive: hasLastExport && areSameSelection(currentIds, lastSelectionIds),
            lastFiltersActive: lastFiltersMatch && selectionContainsAll(currentIds, lastFilterIds),
            lastSelectionCount: lastSelectionIds.length,
            lastFiltersCount: lastFilterIds.length
        };
    }

    function getExportModalModel(options = {}) {
        const prefs = getExportPreferences(options);

        return {
            preferences: prefs,
            selectedCount: getSelectedSpese(options).length,
            filterCount: typeof options.countActiveFilters === 'function'
                ? options.countActiveFilters()
                : 0,
            memory: getExportMemoryState(options, prefs)
        };
    }

    function clearExportMemoryBase(modal) {
        if (!modal || !modal.dataset) return;
        delete modal.dataset.exportToggleBaseSelection;
        delete modal.dataset.exportToggleBaseFilterSelection;
        delete modal.dataset.exportToggleBaseFilters;
    }

    function readExportMemoryBase(modal) {
        if (!modal || !modal.dataset || !modal.dataset.exportToggleBaseSelection) {
            return null;
        }

        try {
            return normalizeSelectionIds(JSON.parse(modal.dataset.exportToggleBaseSelection));
        } catch (_) {
            return null;
        }
    }

    function writeExportMemoryBase(modal, selectedIds) {
        if (!modal || !modal.dataset) return;
        modal.dataset.exportToggleBaseSelection = JSON.stringify(normalizeSelectionIds(selectedIds));
    }

    function clearExportFilterMemoryBase(modal) {
        if (!modal || !modal.dataset) return;
        delete modal.dataset.exportToggleBaseFilterSelection;
        delete modal.dataset.exportToggleBaseFilters;
    }

    function readExportFilterSelectionBase(modal) {
        if (!modal || !modal.dataset || !modal.dataset.exportToggleBaseFilterSelection) {
            return null;
        }

        try {
            return normalizeSelectionIds(JSON.parse(modal.dataset.exportToggleBaseFilterSelection));
        } catch (_) {
            return null;
        }
    }

    function readExportFilterSnapshotBase(modal) {
        if (!modal || !modal.dataset || !modal.dataset.exportToggleBaseFilters) {
            return null;
        }

        try {
            return SettingsActions.normalizeFilterSnapshot(JSON.parse(modal.dataset.exportToggleBaseFilters));
        } catch (_) {
            return null;
        }
    }

    function writeExportFilterMemoryBase(modal, selectedIds, filters) {
        if (!modal || !modal.dataset) return;
        modal.dataset.exportToggleBaseFilterSelection = JSON.stringify(normalizeSelectionIds(selectedIds));
        modal.dataset.exportToggleBaseFilters = JSON.stringify(
            SettingsActions.normalizeFilterSnapshot(filters)
        );
    }

    function syncExportMemoryBaseState(modal, memory = {}) {
        if (!modal || !modal.dataset) return;

        if (modal.dataset.exportToggleBaseFilterSelection && !memory.lastFiltersActive) {
            clearExportFilterMemoryBase(modal);
        }

        if (
            modal.dataset.exportToggleBaseSelection &&
            !memory.lastSelectionActive &&
            !memory.lastFiltersActive
        ) {
            delete modal.dataset.exportToggleBaseSelection;
        }
    }

    function renderExportModal(options = {}) {
        const modal = getExportModal(options);
        if (!modal || typeof modal.querySelector !== 'function') return;

        const model = getExportModalModel(options);
        syncExportMemoryBaseState(modal, model.memory);

        const body = modal.querySelector('#export-modal-body');
        if (body) {
            body.innerHTML = SettingsView.renderExportModal(model);
        }

        const filterBtn = modal.querySelector('#btn-export-filters');
        if (filterBtn) {
            const filterCount = typeof options.countActiveFilters === 'function'
                ? options.countActiveFilters()
                : 0;
            const filterLabel = 'Seleziona';
            filterBtn.innerHTML = filterCount > 0
                ? `${filterLabel}<span class="filter-badge">${filterCount}</span>`
                : filterLabel;
        }
    }

    function applyExportSelection(selectedIds, options = {}) {
        if (typeof options.beginExportSelection !== 'function') return;

        options.beginExportSelection({
            selectedIds: normalizeSelectionIds(selectedIds),
            selectFilteredWhenEmpty: false
        });
    }

    function toggleExportMemorySelection(kind, options = {}) {
        const modal = getExportModal(options);
        const prefs = getExportPreferences(options);
        const memory = getExportMemoryState(options, prefs);
        const selectingLastFilters = kind === 'filters';
        const isActive = selectingLastFilters
            ? memory.lastFiltersActive
            : memory.lastSelectionActive;
        const targetIds = selectingLastFilters
            ? memory.lastFilterIds
            : memory.lastSelectionIds;
        const lastExportFilters = prefs.lastExport && prefs.lastExport.filters
            ? prefs.lastExport.filters
            : null;

        if (!memory.hasLastExport) return;

        if (isActive) {
            if (selectingLastFilters) {
                const baseIds = readExportFilterSelectionBase(modal);
                const baseFilters = readExportFilterSnapshotBase(modal);

                if (baseFilters && typeof options.applyExportFilters === 'function') {
                    options.applyExportFilters(baseFilters, baseIds || []);
                }

                if (baseIds) {
                    applyExportSelection(baseIds, options);
                }

                clearExportFilterMemoryBase(modal);
                renderExportModal(options);
                return;
            }

            const baseIds = readExportMemoryBase(modal);
            if (baseIds) {
                applyExportSelection(baseIds, options);
            }
            if (modal && modal.dataset) {
                delete modal.dataset.exportToggleBaseSelection;
            }
            renderExportModal(options);
            return;
        }

        if (selectingLastFilters) {
            writeExportFilterMemoryBase(modal, memory.currentIds, getCurrentFilterSnapshot(options));
        } else if (!readExportMemoryBase(modal)) {
            writeExportMemoryBase(modal, memory.currentIds);
        }

        if (
            selectingLastFilters &&
            lastExportFilters &&
            typeof options.applyExportFilters === 'function'
        ) {
            options.applyExportFilters(lastExportFilters, targetIds);
        }

        applyExportSelection(targetIds, options);
        renderExportModal(options);
    }

    function initializeExportModalSelection(options = {}, config = {}) {
        const prefs = getExportPreferences(options);
        const lastExport = prefs.lastExport;
        const lastFilterIds = lastExport
            ? getLastExportFilteredIds(prefs, options)
            : [];
        const selectedIds = config.keepCurrentSelection
            ? getCurrentSelectedIds(options)
            : lastExport
            ? lastFilterIds
            : getAllExpenseIds(options);

        if (config.keepCurrentSelection) {
            return {
                selectedIds,
                restoredLastExport: false
            };
        }

        if (
            typeof options.beginExportSelection === 'function' &&
            typeof options.rememberFiltersBeforeSelection === 'function'
        ) {
            options.rememberFiltersBeforeSelection();
        }

        if (!config.keepCurrentSelection && lastExport && lastExport.filters && typeof options.applyExportFilters === 'function') {
            options.applyExportFilters(lastExport.filters, selectedIds);
        }

        if (typeof options.beginExportSelection === 'function') {
            options.beginExportSelection({
                selectedIds,
                selectFilteredWhenEmpty: !config.keepCurrentSelection && !lastExport && selectedIds.length === 0
            });
        }

        return {
            selectedIds,
            restoredLastExport: !!lastExport
        };
    }

    function open(options = {}, config = {}) {
        const modal = getExportModal(options);
        if (!modal) return;

        setExportModalOptions(modal, options);
        clearExportMemoryBase(modal);
        const baseIds = getCurrentSelectedIds(options);
        const baseFilters = getCurrentFilterSnapshot(options);
        const initState = initializeExportModalSelection(options, config);

        if (initState.restoredLastExport) {
            const memory = getExportMemoryState(options);
            if (memory.lastSelectionActive) {
                writeExportMemoryBase(modal, baseIds);
            }
            if (memory.lastFiltersActive) {
                writeExportFilterMemoryBase(modal, baseIds, baseFilters);
            }
        }

        renderExportModal(options);

        const wasOpen = !modal.classList.contains('hidden');
        modal.classList.remove('hidden');

        if (!wasOpen && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'export-modal' });
        }
    }

    function shouldExitSelectionAfterExportClose(options = {}, wasOpen, config = {}) {
        if (!wasOpen || config.preserveSelection) return false;
        if (typeof options.getCurrentPage !== 'function' || options.getCurrentPage() !== 'settings') {
            return false;
        }
        if (typeof options.isTimelineSelectionActive === 'function' && !options.isTimelineSelectionActive()) {
            return false;
        }

        return typeof options.exitTimelineSelection === 'function';
    }

    function close(options = {}, fromPopstate = false, config = {}) {
        const modal = getExportModal(options);
        if (!modal) return;

        const wasOpen = !modal.classList.contains('hidden');
        const shouldExitSelection = shouldExitSelectionAfterExportClose(options, wasOpen, config);
        modal.classList.add('hidden');
        clearExportMemoryBase(modal);

        if (shouldExitSelection) {
            options.exitTimelineSelection(true);
        }

        if (wasOpen && !fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState(shouldExitSelection ? 2 : 1);
        } else if (wasOpen && fromPopstate && shouldExitSelection && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function isOpen(options = {}) {
        const modal = getExportModal(options);

        return !!(modal && !modal.classList.contains('hidden'));
    }

    function closest(target, selector) {
        return target && typeof target.closest === 'function'
            ? target.closest(selector)
            : null;
    }

    function getExportFormatDropdown(modal) {
        return modal && typeof modal.querySelector === 'function'
            ? modal.querySelector('#export-format-dropdown')
            : null;
    }

    function isFormatDropdownOpen(options = {}) {
        const modal = getExportModal(options);
        const dropdown = getExportFormatDropdown(modal);

        return !!(dropdown && dropdown.classList && dropdown.classList.contains('open'));
    }

    function ensureExportFormatInteraction(modal, options = {}) {
        if (!modal || !modal.dataset || modal.dataset.exportFormatInteraction === 'true') return;

        modal.dataset.exportFormatInteraction = 'true';
        if (typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'export-format' });
        }
    }

    function releaseExportFormatInteraction(modal, options = {}, config = {}) {
        if (!modal || !modal.dataset || modal.dataset.exportFormatInteraction !== 'true') return;

        delete modal.dataset.exportFormatInteraction;
        if (!config.fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
    }

    function filterExportFormatDropdown(dropdown, query = '') {
        if (!dropdown || typeof dropdown.querySelectorAll !== 'function') return;

        const normalizedQuery = String(query || '').trim().toLowerCase();
        const items = Array.from(dropdown.querySelectorAll('.sd-item'));
        let highlighted = false;

        items.forEach(item => {
            const label = String(item.textContent || '').trim().toLowerCase();
            const matches = !normalizedQuery || label.includes(normalizedQuery);
            item.classList.toggle('hidden', !matches);
            item.classList.toggle('highlighted', false);

            if (normalizedQuery && matches && !highlighted) {
                item.classList.toggle('highlighted', true);
                highlighted = true;
            }
        });
    }

    function closeExportFormatDropdown(modal, options = {}, config = {}) {
        const dropdown = getExportFormatDropdown(modal);
        const wasOpen = !!(dropdown && dropdown.classList && dropdown.classList.contains('open'));
        if (dropdown && dropdown.classList && typeof dropdown.classList.remove === 'function') {
            dropdown.classList.remove('open');
        }

        const input = dropdown && typeof dropdown.querySelector === 'function'
            ? dropdown.querySelector('.sd-input')
            : null;
        if (input) {
            input.readOnly = true;
            const selected = dropdown.querySelector('.sd-item.selected');
            input.value = selected ? selected.textContent.trim() : input.value;
            if (config.blur !== false && typeof input.blur === 'function') {
                try { input.blur(); } catch (_) { }
            }
        }

        if (wasOpen) releaseExportFormatInteraction(modal, options, config);
    }

    function clearInteraction(options = {}, fromPopstate = false) {
        const modal = getExportModal(options);
        if (!modal) return;

        closeExportFormatDropdown(modal, options, {
            fromPopstate,
            blur: true
        });
    }

    function toggleExportFormatDropdown(modal, openState, options = {}) {
        const dropdown = getExportFormatDropdown(modal);
        if (!dropdown || !dropdown.classList) return;

        const wasOpen = dropdown.classList.contains('open');
        const shouldOpen = openState == null
            ? !wasOpen
            : !!openState;
        const method = shouldOpen ? 'add' : 'remove';

        if (typeof dropdown.classList[method] === 'function') {
            dropdown.classList[method]('open');
        }

        if (shouldOpen) {
            if (!wasOpen) ensureExportFormatInteraction(modal, options);
            filterExportFormatDropdown(dropdown);
        } else if (wasOpen) {
            releaseExportFormatInteraction(modal, options);
        }
    }

    function readExportModalDraft(options = {}) {
        const modal = getExportModal(options);
        if (!modal || typeof modal.querySelector !== 'function') {
            return getExportPreferences(options);
        }

        const formatField = modal.querySelector('#export-format');
        const dataField = modal.querySelector('#export-include-data');
        const settingsField = modal.querySelector('#export-include-settings');
        const personalizzazioniField = modal.querySelector('#export-include-personalizzazioni');
        const format = formatField ? (formatField.value || formatField.dataset.value) : 'json';
        const csvMode = format === 'csv';

        return SettingsActions.normalizeExportPreferences({
            ...getExportPreferences(options),
            format,
            includeData: csvMode || !dataField || dataField.checked,
            includeSettings: !csvMode && (!settingsField || settingsField.checked),
            includePersonalizzazioni: !csvMode && !!(personalizzazioniField && personalizzazioniField.checked)
        });
    }

    function persistExportModalDraft(options = {}) {
        return saveExportPreferences(options, readExportModalDraft(options));
    }

    function syncExportModalFromDraft(options = {}) {
        const prefs = persistExportModalDraft(options);
        saveExportPreferences(options, prefs);
        renderExportModal(options);
    }

    function downloadCustomExport(options = {}) {
        const prefs = persistExportModalDraft(options);
        const result = SettingsActions.buildCustomExportDownload({
            ...prefs,
            storage: options.storage,
            selectedSpese: getSelectedSpese(options),
            dateStamp: options.dateStamp()
        });

        if (!result.success) {
            options.showToast(result.error || 'Export custom non riuscito', 'error');
            return;
        }

        saveExportPreferences(options, {
            ...prefs,
            selectedIds: getCurrentSelectedIds(options),
            selectionInitialized: true,
            lastExport: {
                selectedIds: getCurrentSelectedIds(options),
                filters: getCurrentFilterSnapshot(options)
            }
        });

        const spec = result.download;
        options.download(spec.content, spec.filename, spec.mime);
        options.showToast(spec.toast, 'info');

        const currentPage = typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : '';
        close(options);
        if (
            currentPage !== 'settings' &&
            typeof options.isTimelineSelectionActive === 'function' &&
            options.isTimelineSelectionActive() &&
            typeof options.exitTimelineSelection === 'function'
        ) {
            options.exitTimelineSelection(false);
        }
    }

    function openExportFilters(options = {}) {
        persistExportModalDraft(options);
        const currentSelectedIds = getCurrentSelectedIds(options);

        if (typeof options.beginExportSelection === 'function') {
            options.beginExportSelection({
                selectedIds: currentSelectedIds,
                selectFilteredWhenEmpty: false
            });
        }

        close(options, true, { preserveSelection: true });

        if (typeof options.navigateToTimeline === 'function') {
            options.navigateToTimeline();
        }
    }

    function getExportContentDraft(modal) {
        const dataField = modal.querySelector('#export-include-data');
        const settingsField = modal.querySelector('#export-include-settings');
        const personalizzazioniField = modal.querySelector('#export-include-personalizzazioni');

        return {
            includeData: !dataField || dataField.checked,
            includeSettings: !settingsField || settingsField.checked,
            includePersonalizzazioni: !!(personalizzazioniField && personalizzazioniField.checked)
        };
    }

    function readPreCsvContentDraft(modal) {
        if (!modal || !modal.dataset || !modal.dataset.exportPreCsvContents) return null;

        try {
            const draft = JSON.parse(modal.dataset.exportPreCsvContents);
            return draft && typeof draft === 'object' && !Array.isArray(draft)
                ? draft
                : null;
        } catch (_) {
            return null;
        }
    }

    function saveFormatDraft(modal, value, options = {}) {
        const currentPrefs = getExportPreferences(options);
        const field = modal.querySelector('#export-format');
        const previousFormat = field ? (field.value || field.dataset.value || currentPrefs.format) : currentPrefs.format;
        const enteringCsv = value === 'csv' && previousFormat !== 'csv';
        const leavingCsv = value !== 'csv' && previousFormat === 'csv';
        let contentDraft = getExportContentDraft(modal);

        if (enteringCsv && modal.dataset) {
            modal.dataset.exportPreCsvContents = JSON.stringify(contentDraft);
        }

        if (leavingCsv) {
            contentDraft = readPreCsvContentDraft(modal) || {
                includeData: currentPrefs.includeData,
                includeSettings: currentPrefs.includeSettings,
                includePersonalizzazioni: currentPrefs.includePersonalizzazioni
            };
        }

        return saveExportPreferences(options, {
            ...currentPrefs,
            ...contentDraft,
            format: value
        });
    }

    function selectExportFormat(modal, value, options = {}) {
        const field = modal.querySelector('#export-format');
        const input = modal.querySelector('#export-format-dropdown .sd-input');
        const item = modal.querySelector(`#export-format-dropdown .sd-item[data-format="${value}"]`);

        saveFormatDraft(modal, value, options);

        if (field) field.value = value;
        if (input) {
            input.dataset.value = value;
            input.value = item ? item.textContent.trim() : value.toUpperCase();
        }

        closeExportFormatDropdown(modal, options);
        renderExportModal(options);
    }

    function handleExportFormatKeydown(event, modal, options = {}) {
        const dropdown = closest(event.target, '#export-format-dropdown');
        if (!dropdown) return;

        const items = Array.from(dropdown.querySelectorAll('.sd-item:not(.hidden)'));
        if (items.length === 0) return;

        let currentIndex = items.findIndex(item => item.classList.contains('highlighted'));
        if (currentIndex < 0) {
            currentIndex = items.findIndex(item => item.classList.contains('selected'));
        }
        currentIndex = Math.max(0, currentIndex);
        const setHighlight = index => {
            items.forEach((item, itemIndex) => {
                item.classList.toggle('highlighted', itemIndex === index);
            });
        };

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            toggleExportFormatDropdown(modal, true, options);
            setHighlight(Math.min(currentIndex + 1, items.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            toggleExportFormatDropdown(modal, true, options);
            setHighlight(Math.max(currentIndex - 1, 0));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const highlighted = dropdown.querySelector('.sd-item.highlighted') ||
                dropdown.querySelector('.sd-item.selected') ||
                items[0];
            selectExportFormat(modal, highlighted.dataset.format, options);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            closeExportFormatDropdown(modal, options);
        }
    }

    function handleExportFormatMousedown(event, modal, options = {}) {
        if (closest(event.target, '#export-format-dropdown .sd-item')) return;

        const dropdown = closest(event.target, '#export-format-dropdown');
        if (!dropdown) return;

        const input = typeof dropdown.querySelector === 'function'
            ? dropdown.querySelector('.sd-input')
            : null;
        if (!input) return;

        if (!dropdown.classList.contains('open')) {
            event.preventDefault();
            if (typeof input.focus === 'function') input.focus();
            toggleExportFormatDropdown(modal, true, options);
            return;
        }

        if (input.readOnly) {
            event.preventDefault();
            input.readOnly = false;
            input.value = '';
            if (typeof input.focus === 'function') input.focus();
            filterExportFormatDropdown(dropdown);
        }
    }

    function bind(options = {}) {
        const modal = getExportModal(options);
        if (!modal) return;

        setExportModalOptions(modal, options);

        if (modal.dataset.bound === 'true') return;

        modal.dataset.bound = 'true';

        const closeBtn = modal.querySelector('#export-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                close(getBoundExportModalOptions(modal, options));
            });
        }

        modal.addEventListener('click', event => {
            const activeOptions = getBoundExportModalOptions(modal, options);

            if (event.target.id === 'export-modal-overlay') {
                close(activeOptions);
                return;
            }

            const formatItem = closest(event.target, '#export-format-dropdown .sd-item');
            if (formatItem) {
                selectExportFormat(modal, formatItem.dataset.format, activeOptions);
                return;
            }

            if (closest(event.target, '#export-format-dropdown')) {
                return;
            }

            if (event.target.id === 'btn-export-filters') {
                openExportFilters(activeOptions);
                return;
            }

            if (event.target.id === 'export-toggle-last-selection') {
                toggleExportMemorySelection('selection', activeOptions);
                return;
            }

            if (event.target.id === 'export-toggle-last-filters') {
                toggleExportMemorySelection('filters', activeOptions);
                return;
            }

            if (event.target.id === 'btn-export-run') {
                downloadCustomExport(activeOptions);
                return;
            }

            closeExportFormatDropdown(modal, activeOptions);
        });

        modal.addEventListener('mousedown', event => {
            handleExportFormatMousedown(event, modal, getBoundExportModalOptions(modal, options));
        });

        modal.addEventListener('focusin', event => {
            if (closest(event.target, '#export-format-dropdown')) {
                toggleExportFormatDropdown(
                    modal,
                    true,
                    getBoundExportModalOptions(modal, options)
                );
            }
        });

        modal.addEventListener('keydown', event => {
            handleExportFormatKeydown(event, modal, getBoundExportModalOptions(modal, options));
        });

        modal.addEventListener('input', event => {
            const input = closest(event.target, '#export-format-dropdown .sd-input');
            if (!input) return;

            const dropdown = closest(input, '#export-format-dropdown');
            if (!dropdown) return;

            toggleExportFormatDropdown(modal, true, getBoundExportModalOptions(modal, options));
            filterExportFormatDropdown(dropdown, input.value);
        });

        modal.addEventListener('change', event => {
            const target = event.target;
            if (!target || !target.id || !/^export-include-/.test(target.id)) return;

            syncExportModalFromDraft(getBoundExportModalOptions(modal, options));
        });
    }

    return {
        open,
        close,
        isOpen,
        isFormatDropdownOpen,
        clearInteraction,
        bind
    };
})();
