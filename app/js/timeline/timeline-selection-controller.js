/* ============================================
   TIMELINE SELECTION CONTROLLER - modalita selezione timeline
   ============================================ */

const TimelineSelectionController = (() => {
    const NAV_SET_ACTIONS = 'actions';
    const NAV_SET_MAIN = 'main';
    const NAV_SWIPE_THRESHOLD = 42;
    const NAV_WHEEL_THRESHOLD = 8;
    const TAP_MOVE_LIMIT = 10;
    const SYNTHETIC_CLICK_SUPPRESS_MS = 700;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getNavigatorLike(options) {
        if (options.navigatorLike) return options.navigatorLike;
        if (options.window && options.window.navigator) return options.window.navigator;
        if (typeof navigator !== 'undefined') return navigator;
        return null;
    }

    function toIdSet(value) {
        if (value instanceof Set) return value;
        if (
            value &&
            typeof value.size === 'number' &&
            typeof value.has === 'function' &&
            typeof value.forEach === 'function'
        ) {
            return new Set(Array.from(value).filter(Boolean));
        }
        if (Array.isArray(value)) return new Set(value.filter(Boolean));
        return new Set();
    }

    function getSelectedIds(options = {}) {
        const ids = typeof options.getSelectedIds === 'function'
            ? options.getSelectedIds()
            : options.selectedIds;

        return toIdSet(ids);
    }

    function setSelectedIds(options = {}, ids) {
        const next = toIdSet(ids);

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

    function bindImmediateTap(button, handler) {
        if (!button || typeof button.addEventListener !== 'function') return;

        let touchStart = null;
        let lastImmediateTap = 0;

        button.addEventListener('click', event => {
            if (
                event &&
                lastImmediateTap > 0 &&
                Date.now() - lastImmediateTap < SYNTHETIC_CLICK_SUPPRESS_MS
            ) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            handler(event);
        });

        button.addEventListener('touchstart', event => {
            const touch = event.touches && event.touches[0];
            touchStart = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null;
        }, { passive: true });

        button.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touchStart || !touch) return;

            const moved = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
            touchStart = null;
            if (moved > TAP_MOVE_LIMIT || button.disabled) return;

            lastImmediateTap = Date.now();
            if (typeof event.preventDefault === 'function') event.preventDefault();
            handler(event);
        }, { passive: false });

        button.addEventListener('touchcancel', () => {
            touchStart = null;
        }, { passive: true });
    }

    function rememberFiltersBeforeSelection(options = {}, wasActive = isActive(options)) {
        if (wasActive || typeof options.rememberFiltersBeforeSelection !== 'function') return;

        options.rememberFiltersBeforeSelection();
    }

    function restoreFiltersAfterSelection(options = {}) {
        if (typeof options.restoreFiltersAfterSelection === 'function') {
            options.restoreFiltersAfterSelection();
        }
    }

    function getSelectedSpese(options = {}, spese = null) {
        const ids = getSelectedIds(options);
        const list = Array.isArray(spese) ? spese : getAllSpese(options);

        return list.filter(item => item && ids.has(item.id));
    }

    function syncTitle(header) {
        if (!header || typeof header.querySelector !== 'function') return;

        const title = header.querySelector('h1');
        if (!title) return;

        const dataset = title.dataset || {};
        if (typeof dataset.defaultHtml !== 'string') {
            dataset.defaultHtml = title.innerHTML;
        }

        title.innerHTML = dataset.defaultHtml;
    }

    function setNavSetAccessibility(bottomNav, active, set) {
        if (!bottomNav || typeof bottomNav.querySelector !== 'function') return;

        const mainSet = bottomNav.querySelector('[data-nav-set="main"]');
        const selectionSet = bottomNav.querySelector('[data-nav-set="selection"]');
        const showMain = !active || set === NAV_SET_MAIN;

        if (mainSet && typeof mainSet.setAttribute === 'function') {
            mainSet.setAttribute('aria-hidden', showMain ? 'false' : 'true');
        }
        if (selectionSet && typeof selectionSet.setAttribute === 'function') {
            selectionSet.setAttribute('aria-hidden', active && !showMain ? 'false' : 'true');
        }
    }

    function setBottomNavSet(bottomNav, set = NAV_SET_ACTIONS) {
        if (!bottomNav) return false;

        const nextSet = set === NAV_SET_MAIN ? NAV_SET_MAIN : NAV_SET_ACTIONS;
        if (bottomNav.dataset) bottomNav.dataset.selectionSet = nextSet;
        if (bottomNav.classList && typeof bottomNav.classList.toggle === 'function') {
            bottomNav.classList.toggle('selection-show-main', nextSet === NAV_SET_MAIN);
        }
        setNavSetAccessibility(bottomNav, true, nextSet);
        return true;
    }

    function syncBottomNavSet(bottomNav, options = {}) {
        if (!bottomNav) return;

        const selectionModeActive = !!options.selectionModeActive;
        const navHighlighted = !!options.navHighlighted;
        const actionsAvailable = !!options.actionsAvailable;

        if (!selectionModeActive) {
            if (bottomNav.dataset) delete bottomNav.dataset.selectionSet;
            if (bottomNav.classList && typeof bottomNav.classList.remove === 'function') {
                bottomNav.classList.remove('selection-show-main');
            }
            setNavSetAccessibility(bottomNav, false, NAV_SET_MAIN);
            return;
        }

        if (!navHighlighted || !actionsAvailable) {
            setBottomNavSet(bottomNav, NAV_SET_MAIN);
            return;
        }

        const currentSet = bottomNav.dataset && bottomNav.dataset.selectionSet === NAV_SET_MAIN
            ? NAV_SET_MAIN
            : NAV_SET_ACTIONS;
        setBottomNavSet(bottomNav, currentSet);
    }

    function getSummary(options = {}, filtered = null, allSpese = null) {
        const all = Array.isArray(allSpese) ? allSpese : getAllSpese(options);
        const visible = Array.isArray(filtered) ? filtered : getFilterModel(options).filteredSpese || all;
        const selectedIds = getSelectedIds(options);
        const selected = all.filter(item => item && selectedIds.has(item.id));
        const selectedTotal = selected.reduce((sum, item) => sum + Number(item.importo || 0), 0);
        const visibleIds = visible.map(item => item && item.id).filter(Boolean);

        return {
            active: isActive(options),
            selectedIds,
            selectedCount: selected.length,
            selectedTotal,
            visibleCount: visible.length,
            visibleAllSelected: visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id)),
            deletePending: isDeletePending(options)
        };
    }

    function syncHeader(options = {}, summary = null) {
        const doc = getDocument(options);
        const currentPage = typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : 'timeline';
        const selectionModeActive = isActive(options);
        const active = selectionModeActive && currentPage !== 'settings';
        const actionsAvailable = selectionModeActive && currentPage === 'timeline';
        const model = summary || getSummary(options);
        const selectedCount = Number(model.selectedCount || 0);
        const visibleCount = Number(model.visibleCount || 0);
        const deletePending = active && !!model.deletePending;
        const header = doc.getElementById('app-header');
        const bottomNav = doc.getElementById('bottom-nav');
        const themeToggle = doc.getElementById('theme-toggle');
        const copyButton = doc.getElementById('btn-selection-copy');
        const exportButton = doc.getElementById('btn-selection-export');
        const deleteButton = doc.getElementById('btn-selection-delete');
        const selectAllButton = doc.getElementById('btn-selection-select-all');

        if (header) header.classList.toggle('selection-active', active);
        if (header) header.classList.toggle('delete-pending', deletePending);
        syncTitle(header);
        if (bottomNav) bottomNav.classList.toggle('selection-active', active);
        if (bottomNav) bottomNav.classList.toggle('delete-pending', deletePending);
        syncBottomNavSet(bottomNav, {
            selectionModeActive,
            navHighlighted: active,
            actionsAvailable
        });
        if (themeToggle) themeToggle.classList.toggle('hidden', actionsAvailable);
        if (selectAllButton) selectAllButton.classList.toggle('hidden', !actionsAvailable);

        if (selectAllButton) {
            selectAllButton.disabled = !actionsAvailable || visibleCount === 0;
            selectAllButton.textContent = model.visibleAllSelected ? '\u2705' : '\u2611\uFE0F';
            const selectAllLabel = model.visibleAllSelected
                ? 'Deseleziona spese filtrate'
                : 'Seleziona spese filtrate';
            if (typeof selectAllButton.setAttribute === 'function') {
                selectAllButton.setAttribute('aria-label', selectAllLabel);
            }
            selectAllButton.title = model.visibleAllSelected
                ? 'Deseleziona tutte le spese filtrate'
                : 'Seleziona tutte le spese filtrate';
        }

        [copyButton, exportButton, deleteButton].forEach(button => {
            if (!button) return;
            const disabled = !actionsAvailable || selectedCount === 0;
            button.disabled = disabled;
        });
        [copyButton, exportButton].forEach(button => {
            if (button && button.classList && typeof button.classList.toggle === 'function') {
                button.classList.toggle('disabled-empty-selection', selectedCount === 0);
            }
        });
    }

    function enter(options = {}, id = null) {
        const wasActive = isActive(options);
        const ids = new Set(getSelectedIds(options));

        if (id) ids.add(id);

        rememberFiltersBeforeSelection(options, wasActive);
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
        restoreFiltersAfterSelection(options);
        syncHeader(options, { active: false, selectedCount: 0, visibleCount: 0 });
        notifySelectionChanged(options);

        if (!fromPopstate && typeof options.consumeUiState === 'function') {
            options.consumeUiState(1);
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
            rememberFiltersBeforeSelection(options, false);
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

    function beginExportSelection(options = {}, config = {}) {
        const model = getFilterModel(options);
        const allIds = new Set(
            (model.allSpese || getAllSpese(options))
                .map(item => item && item.id)
                .filter(Boolean)
        );
        const selectedIds = toIdSet(config.selectedIds);
        const visibleIds = (
            (model.filteredSpese || [])
                .map(item => item && item.id)
                .filter(Boolean)
        );
        const nextIds = selectedIds.size > 0 || !config.selectFilteredWhenEmpty
            ? new Set(Array.from(selectedIds).filter(id => allIds.has(id)))
            : new Set(visibleIds);
        const wasActive = isActive(options);

        rememberFiltersBeforeSelection(options, wasActive);
        setActive(options, true);
        setSelectedIds(options, nextIds);
        setDeletePending(options, false);

        if (!wasActive && typeof options.pushUiState === 'function') {
            options.pushUiState({ panel: 'timeline-selection' });
        }

        notifySelectionChanged(options);

        return {
            selectedIds: Array.from(nextIds),
            selectedCount: nextIds.size
        };
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

    function afterFilterPanelClosed(options = {}, callback = noop) {
        if (typeof options.closeFiltersForSelectionAction !== 'function') {
            callback();
            return false;
        }

        const deferred = options.closeFiltersForSelectionAction(callback);
        if (!deferred) callback();
        return !!deferred;
    }

    function openExportChoices(options = {}, selected = []) {
        if (typeof options.openCustomExportModal === 'function') {
            options.openCustomExportModal();
            return;
        }

        (options.showChoices || noop)(
            `Esportare ${selected.length} spese selezionate?`,
            getExportChoices(options)
        );
    }

    function showExportChoices(options = {}) {
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return false;
        }

        afterFilterPanelClosed(options, () => openExportChoices(options, selected));

        return true;
    }

    function fallbackCopyText(options = {}, text = '') {
        const doc = getDocument(options);
        if (!doc || typeof doc.createElement !== 'function' || !doc.body) {
            return Promise.resolve(false);
        }

        const textarea = doc.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        doc.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let copied = false;
        try {
            copied = typeof doc.execCommand === 'function' && doc.execCommand('copy');
        } catch (_) {
            copied = false;
        }

        doc.body.removeChild(textarea);
        return Promise.resolve(!!copied);
    }

    function writeClipboardText(options = {}, text = '') {
        const navigatorLike = getNavigatorLike(options);
        const clipboard = navigatorLike && navigatorLike.clipboard;

        if (clipboard && typeof clipboard.writeText === 'function') {
            return Promise.resolve(clipboard.writeText(text))
                .then(() => true)
                .catch(() => fallbackCopyText(options, text));
        }

        return fallbackCopyText(options, text);
    }

    function copySelected(options = {}) {
        const storage = options.storage;
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return Promise.resolve(false);
        }

        if (!storage || typeof storage.exportCSV !== 'function') {
            (options.showToast || noop)('Copia non disponibile.', 'error');
            return Promise.resolve(false);
        }

        const result = storage.exportCSV({ spese: selected });
        if (!result.success) {
            (options.showToast || noop)(result.error || 'Copia non riuscita', 'error');
            return Promise.resolve(false);
        }

        return writeClipboardText(options, result.content)
            .then(copied => {
                if (!copied) {
                    (options.showToast || noop)('Copia negli appunti non disponibile.', 'error');
                    return false;
                }

                (options.showToast || noop)(`${selected.length} spese copiate negli appunti`, 'info');
                return true;
            });
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

    function openDeleteConfirm(options = {}, selected = []) {
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
    }

    function showDeleteConfirm(options = {}) {
        const selected = getSelectedSpese(options);
        if (selected.length === 0) {
            (options.showToast || noop)('Seleziona almeno una spesa.', 'error');
            return false;
        }

        afterFilterPanelClosed(options, () => openDeleteConfirm(options, selected));

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
            options.consumeUiState(1);
        }
        (options.refreshAfterDataChange || noop)();
        restoreFiltersAfterSelection(options);
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
        const copyButton = doc.getElementById('btn-selection-copy');
        const exportButton = doc.getElementById('btn-selection-export');
        const deleteButton = doc.getElementById('btn-selection-delete');

        if (selectAllButton && selectAllButton.dataset.selectionBound !== 'true') {
            selectAllButton.dataset.selectionBound = 'true';
            bindImmediateTap(selectAllButton, () => selectVisible(options));
        }

        if (copyButton && copyButton.dataset.selectionBound !== 'true') {
            copyButton.dataset.selectionBound = 'true';
            bindImmediateTap(copyButton, () => copySelected(options));
        }

        if (exportButton && exportButton.dataset.selectionBound !== 'true') {
            exportButton.dataset.selectionBound = 'true';
            bindImmediateTap(exportButton, () => showExportChoices(options));
        }

        if (deleteButton && deleteButton.dataset.selectionBound !== 'true') {
            deleteButton.dataset.selectionBound = 'true';
            bindImmediateTap(deleteButton, () => showDeleteConfirm(options));
        }

        bindBottomNavPager(options);
        syncHeader(options);
    }

    function bindBottomNavPager(options = {}) {
        const doc = getDocument(options);
        const bottomNav = doc.getElementById('bottom-nav');
        if (!bottomNav) return false;
        if (!bottomNav.dataset) bottomNav.dataset = {};
        if (bottomNav.dataset.selectionPagerBound === 'true') return false;

        bottomNav.dataset.selectionPagerBound = 'true';

        let startX = 0;
        let startY = 0;

        const canPage = () => (
            bottomNav.classList &&
            typeof bottomNav.classList.contains === 'function' &&
            bottomNav.classList.contains('selection-active') &&
            (
                typeof options.getCurrentPage !== 'function' ||
                options.getCurrentPage() === 'timeline'
            )
        );

        const applyDelta = (deltaX, deltaY = 0, threshold = NAV_SWIPE_THRESHOLD) => {
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);
            if (!canPage() || absX < threshold || absX < absY * 1.2) return false;

            setBottomNavSet(bottomNav, deltaX < 0 ? NAV_SET_MAIN : NAV_SET_ACTIONS);
            return true;
        };

        bottomNav.addEventListener('touchstart', event => {
            const touch = event.touches && event.touches[0];
            if (!touch) return;
            startX = touch.clientX;
            startY = touch.clientY;
        }, { passive: true });

        bottomNav.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touch) return;
            const applied = applyDelta(touch.clientX - startX, touch.clientY - startY);
            if (applied && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
        }, { passive: false });

        bottomNav.addEventListener('wheel', event => {
            const deltaX = Number(event.deltaX || 0);
            const deltaY = Number(event.deltaY || 0);
            const dominantDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
            const perpendicularDelta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaY : deltaX;
            const applied = applyDelta(dominantDelta, perpendicularDelta, NAV_WHEEL_THRESHOLD);
            if (applied && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
        }, { passive: false });

        return true;
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
        beginExportSelection,
        getExportChoices,
        showExportChoices,
        copySelected,
        exportSelected,
        showDeleteConfirm,
        deleteSelected,
        clearDeletePending,
        setBottomNavSet,
        bindHeader
    };
})();
