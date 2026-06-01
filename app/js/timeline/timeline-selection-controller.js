/* ============================================
   TIMELINE SELECTION CONTROLLER - modalita selezione timeline
   ============================================ */

const TimelineSelectionController = (() => {
    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getSelectedIds(options = {}) {
        const ids = typeof options.getSelectedIds === 'function'
            ? options.getSelectedIds()
            : options.selectedIds;

        return ids instanceof Set ? ids : new Set();
    }

    function setSelectedIds(options = {}, ids) {
        const next = ids instanceof Set ? ids : new Set(ids || []);

        if (typeof options.setSelectedIds === 'function') {
            options.setSelectedIds(next);
        } else {
            options.selectedIds = next;
        }

        return next;
    }

    function isActive(options = {}) {
        return typeof options.isActive === 'function'
            ? !!options.isActive()
            : !!options.active;
    }

    function setActive(options = {}, value) {
        if (typeof options.setActive === 'function') {
            options.setActive(!!value);
        } else {
            options.active = !!value;
        }
    }

    function isDeletePending(options = {}) {
        return typeof options.isDeletePending === 'function'
            ? !!options.isDeletePending()
            : !!options.deletePending;
    }

    function setDeletePending(options = {}, value) {
        if (typeof options.setDeletePending === 'function') {
            options.setDeletePending(!!value);
        } else {
            options.deletePending = !!value;
        }
    }

    function getAllSpese(options = {}) {
        return typeof options.getSpese === 'function'
            ? options.getSpese()
            : (Array.isArray(options.spese) ? options.spese : []);
    }

    function getFilterModel(options = {}) {
        if (typeof options.getFilterModel === 'function') {
            return options.getFilterModel();
        }

        const allSpese = getAllSpese(options);
        const filteredSpese = typeof options.applyFilters === 'function'
            ? options.applyFilters(allSpese)
            : allSpese;

        return {
            allSpese,
            filteredSpese
        };
    }

    function notifySelectionChanged(options = {}) {
        if (typeof options.onSelectionChange === 'function') {
            options.onSelectionChange();
            return;
        }

        (options.renderTimeline || noop)();
    }

    function getSelectedSpese(options = {}, spese = null) {
        const ids = getSelectedIds(options);
        const list = Array.isArray(spese) ? spese : getAllSpese(options);

        return list.filter(item => item && ids.has(item.id));
    }

    function getSummary(options = {}, filtered = null, allSpese = null) {
        const all = Array.isArray(allSpese) ? allSpese : getAllSpese(options);
        const visible = Array.isArray(filtered) ? filtered : getFilterModel(options).filteredSpese || all;
        const selected = getSelectedSpese(options, all);
        const selectedTotal = selected.reduce((sum, item) => sum + Number(item.importo || 0), 0);

        return {
            active: isActive(options),
            selectedIds: getSelectedIds(options),
            selectedCount: selected.length,
            selectedTotal,
            visibleCount: visible.length,
            deletePending: isDeletePending(options)
        };
    }

    function syncHeader(options = {}, summary = null) {
        const doc = getDocument(options);
        const currentPage = typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : 'timeline';
        const active = isActive(options) && currentPage === 'timeline';
        const model = summary || getSummary(options);
        const selectedCount = Number(model.selectedCount || 0);
        const visibleCount = Number(model.visibleCount || 0);
        const header = doc.getElementById('app-header');
        const bottomNav = doc.getElementById('bottom-nav');
        const themeToggle = doc.getElementById('theme-toggle');
        const selectionButtons = [
            doc.getElementById('btn-selection-select-all'),
            doc.getElementById('btn-selection-export'),
            doc.getElementById('btn-selection-delete')
        ].filter(Boolean);
        const exportButton = doc.getElementById('btn-selection-export');
        const deleteButton = doc.getElementById('btn-selection-delete');
        const selectAllButton = doc.getElementById('btn-selection-select-all');

        if (header) header.classList.toggle('selection-active', active);
        if (bottomNav) bottomNav.classList.toggle('selection-active', active);
        if (themeToggle) themeToggle.classList.toggle('hidden', active);

        selectionButtons.forEach(button => {
            button.classList.toggle('hidden', !active);
        });

        if (selectAllButton) {
            selectAllButton.disabled = !active || visibleCount === 0;
        }

        [exportButton, deleteButton].forEach(button => {
            if (button) button.disabled = !active || selectedCount === 0;
        });
    }

    function enter(options = {}, id = null) {
        const wasActive = isActive(options);
        const ids = new Set(getSelectedIds(options));

        if (id) ids.add(id);

        setActive(options, true);
        setSelectedIds(options, ids);
        setDeletePending(options, false);

        if (!wasActive && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'timeline-selection' });
        }

        notifySelectionChanged(options);
        return true;
    }

    function exit(options = {}, fromPopstate = false) {
        const wasActive = isActive(options);
        if (!wasActive) return false;

        setActive(options, false);
        setSelectedIds(options, new Set());
        setDeletePending(options, false);
        if (typeof options.setSelectedOnlyFilter === 'function') {
            options.setSelectedOnlyFilter(false);
        }
        syncHeader(options, { active: false, selectedCount: 0, visibleCount: 0 });
        notifySelectionChanged(options);

        if (!fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }

        return true;
    }

    function toggle(options = {}, id = null) {
        if (!id) return false;

        if (!isActive(options)) {
            return enter(options, id);
        }

        const ids = new Set(getSelectedIds(options));
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);

        setSelectedIds(options, ids);
        setDeletePending(options, false);
        notifySelectionChanged(options);
        return true;
    }

    function selectVisible(options = {}) {
        const model = getFilterModel(options);
        const visibleIds = (
            (model.filteredSpese || [])
                .map(item => item && item.id)
                .filter(Boolean)
        );
        const ids = new Set(getSelectedIds(options));
        const shouldDeselectVisible = visibleIds.length > 0 && visibleIds.every(id => ids.has(id));

        if (!isActive(options)) {
            setActive(options, true);
            if (typeof options.pushUiState === 'function') {
                options.pushUiState({ panel: 'timeline-selection' });
            }
        }

        visibleIds.forEach(id => {
            if (shouldDeselectVisible) ids.delete(id);
            else ids.add(id);
        });

        setSelectedIds(options, ids);
        setDeletePending(options, false);
        notifySelectionChanged(options);

        return visibleIds.length;
    }

    function getExportChoices(options = {}) {
        return [
            {
                text: 'Annulla',
                className: 'btn-secondary'
            },
            {
                text: 'JSON',
                className: 'btn-primary',
                onClick: () => exportSelected(options, 'json')
            },
            {
                text: 'CSV',
                className: 'btn-secondary',
                onClick: () => exportSelected(options, 'csv')
            }
        ];
    }

    function showExportChoices(options = {}) {
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return false;
        }

        (options.showChoices || noop)(
            `Esportare ${selected.length} spese selezionate?`,
            getExportChoices(options)
        );

        return true;
    }

    function exportSelected(options = {}, format = 'json') {
        const storage = options.storage;
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return false;
        }

        if (!storage) {
            (options.showToast || noop)('Export non disponibile.', 'error');
            return false;
        }

        const result = format === 'csv'
            ? storage.exportCSV({ spese: selected })
            : storage.exportJSON({ spese: selected });

        if (!result.success) {
            (options.showToast || noop)(result.error || 'Export non riuscito', 'error');
            return false;
        }

        const dateStamp = typeof options.dateStamp === 'function' ? options.dateStamp() : 'export';
        const filename = format === 'csv'
            ? `spese_selezionate_${dateStamp}.csv`
            : `spese_selezionate_${dateStamp}.json`;
        const mime = format === 'csv'
            ? 'text/csv;charset=utf-8'
            : 'application/json';
        const content = format === 'csv' ? '\uFEFF' + result.content : result.content;

        (options.download || noop)(content, filename, mime);
        (options.showToast || noop)(`Export ${format.toUpperCase()} selezione avviato...`, 'info');
        return true;
    }

    function showDeleteConfirm(options = {}) {
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return false;
        }

        setDeletePending(options, true);
        (options.renderTimeline || noop)();

        (options.showChoices || noop)(
            `Eliminare ${selected.length} spese selezionate?`,
            [
                {
                    text: 'Annulla',
                    className: 'btn-secondary',
                    onClick: () => clearDeletePending(options)
                },
                {
                    text: 'Elimina',
                    className: 'btn-danger',
                    onClick: () => deleteSelected(options)
                }
            ]
        );

        return true;
    }

    function deleteSelected(options = {}) {
        const storage = options.storage;
        const ids = Array.from(getSelectedIds(options));
        const wasActive = isActive(options);

        if (!storage || typeof storage.deleteSpese !== 'function') {
            (options.showToast || noop)('Eliminazione non disponibile.', 'error');
            clearDeletePending(options);
            return false;
        }

        const result = storage.deleteSpese(ids);
        if (!result.success) {
            (options.showToast || noop)(result.error || 'Eliminazione non riuscita', 'error');
            clearDeletePending(options);
            return false;
        }

        setActive(options, false);
        setSelectedIds(options, new Set());
        setDeletePending(options, false);
        if (typeof options.setSelectedOnlyFilter === 'function') {
            options.setSelectedOnlyFilter(false);
        }
        if (wasActive && typeof options.consumeUiState === 'function') {
            options.consumeUiState();
        }
        (options.refreshAfterDataChange || noop)();
        syncHeader(options, { active: false, selectedCount: 0, visibleCount: 0 });
        (options.showToast || noop)(`${result.count} spese eliminate`, 'info');
        return true;
    }

    function clearDeletePending(options = {}) {
        if (!isDeletePending(options)) return false;

        setDeletePending(options, false);
        (options.renderTimeline || noop)();
        return true;
    }

    function bindHeader(options = {}) {
        const doc = getDocument(options);
        const selectAllButton = doc.getElementById('btn-selection-select-all');
        const exportButton = doc.getElementById('btn-selection-export');
        const deleteButton = doc.getElementById('btn-selection-delete');

        if (selectAllButton && selectAllButton.dataset.selectionBound !== 'true') {
            selectAllButton.dataset.selectionBound = 'true';
            selectAllButton.addEventListener('click', () => selectVisible(options));
        }

        if (exportButton && exportButton.dataset.selectionBound !== 'true') {
            exportButton.dataset.selectionBound = 'true';
            exportButton.addEventListener('click', () => showExportChoices(options));
        }

        if (deleteButton && deleteButton.dataset.selectionBound !== 'true') {
            deleteButton.dataset.selectionBound = 'true';
            deleteButton.addEventListener('click', () => showDeleteConfirm(options));
        }

        syncHeader(options);
    }

    return {
        getSelectedIds,
        getSelectedSpese,
        getSummary,
        syncHeader,
        enter,
        exit,
        toggle,
        selectVisible,
        getExportChoices,
        showExportChoices,
        exportSelected,
        showDeleteConfirm,
        deleteSelected,
        clearDeletePending,
        bindHeader
    };
})();
