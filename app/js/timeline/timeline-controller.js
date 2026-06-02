/* ============================================
   TIMELINE CONTROLLER - wiring timeline
   ============================================ */

const TimelineController = (() => {
    let suppressedLongPressClickId = null;
    let suppressedLongPressClickTimer = null;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getTimer(options) {
        return options.setTimeout || (typeof setTimeout === 'function' ? setTimeout : null);
    }

    function clearTimer(options, timerId) {
        const clear = options.clearTimeout || (typeof clearTimeout === 'function' ? clearTimeout : null);
        if (clear && timerId) clear(timerId);
    }

    function suppressNextLongPressClick(options, id) {
        if (!id) return;

        clearTimer(options, suppressedLongPressClickTimer);
        suppressedLongPressClickId = id;

        const setTimer = getTimer(options);
        suppressedLongPressClickTimer = setTimer
            ? setTimer(() => {
                suppressedLongPressClickId = null;
                suppressedLongPressClickTimer = null;
            }, 700)
            : null;
    }

    function consumeSuppressedLongPressClick(id) {
        if (!id || suppressedLongPressClickId !== id) return false;

        suppressedLongPressClickId = null;
        return true;
    }

    function toggleClass(element, className, active) {
        if (element && element.classList && typeof element.classList.toggle === 'function') {
            element.classList.toggle(className, !!active);
        }
    }

    function getSelectionSummary(options = {}, allSpese = [], filtered = []) {
        const selection = options.selection || {};

        if (!selection.active) return selection;

        if (typeof options.getSelectionSummary === 'function') {
            return options.getSelectionSummary(filtered, allSpese);
        }

        const selectedIds = selection.selectedIds instanceof Set
            ? selection.selectedIds
            : new Set();
        const selected = allSpese.filter(item => selectedIds.has(item.id));
        const selectedTotal = selected.reduce((sum, item) => sum + Number(item.importo || 0), 0);

        return {
            active: true,
            selectedIds,
            selectedCount: selected.length,
            selectedTotal,
            visibleCount: filtered.length,
            deletePending: !!selection.deletePending
        };
    }

    function bindExpenseCard(card, options = {}) {
        let longPressTimer = null;
        let longPressFired = false;
        let startPoint = null;
        const longPressMs = Number(options.longPressMs || 450);

        function cancelLongPress() {
            clearTimer(options, longPressTimer);
            longPressTimer = null;
        }

        card.addEventListener('pointerdown', event => {
            if (event && event.button && event.button !== 0) return;

            longPressFired = false;
            startPoint = event
                ? { x: Number(event.clientX || 0), y: Number(event.clientY || 0) }
                : null;

            const setTimer = getTimer(options);
            if (!setTimer) return;

            longPressTimer = setTimer(() => {
                longPressTimer = null;
                longPressFired = true;
                suppressNextLongPressClick(options, card.dataset.id);
                (options.enterSelection || noop)(card.dataset.id);
            }, longPressMs);
        });

        card.addEventListener('pointermove', event => {
            if (!startPoint || !event || !longPressTimer) return;

            const dx = Math.abs(Number(event.clientX || 0) - startPoint.x);
            const dy = Math.abs(Number(event.clientY || 0) - startPoint.y);

            if (dx > 8 || dy > 8) cancelLongPress();
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(eventName => {
            card.addEventListener(eventName, cancelLongPress);
        });

        card.addEventListener('contextmenu', event => {
            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }

            if (!(options.isSelectionActive || noop)()) {
                (options.enterSelection || noop)(card.dataset.id);
            }
        });

        card.addEventListener('click', event => {
            if (longPressFired || consumeSuppressedLongPressClick(card.dataset.id)) {
                longPressFired = false;
                if (event && typeof event.preventDefault === 'function') {
                    event.preventDefault();
                }
                return;
            }

            if ((options.isSelectionActive || noop)()) {
                (options.toggleSelection || noop)(card.dataset.id);
                return;
            }

            (options.openEditModal || noop)(card.dataset.id);
        });
    }

    function render(options = {}) {
        const doc = getDocument(options);
        const filterModel = options.filterModel || null;
        const allSpese = filterModel
            ? (filterModel.allSpese || [])
            : (Array.isArray(options.spese) ? options.spese : []);
        const isFiltered = filterModel
            ? !!filterModel.hasActiveFilters
            : (typeof options.hasActiveFilters === 'function'
                ? options.hasActiveFilters()
                : false);
        const filtered = filterModel
            ? (filterModel.filteredSpese || [])
            : (isFiltered && typeof options.applyFilters === 'function'
                ? options.applyFilters(allSpese)
                : allSpese);
        const quickTotals = filterModel
            ? filterModel.quickTotals
            : (typeof options.getQuickTotals === 'function'
                ? options.getQuickTotals(allSpese)
                : StatsData.getQuickTotals(allSpese));
        const content = options.content || doc.getElementById('timeline-content');
        const empty = options.empty || doc.getElementById('timeline-empty');
        const summary = options.summary || doc.getElementById('timeline-summary');
        const selectionSummary = getSelectionSummary(options, allSpese, filtered);

        if (!content || !empty || !summary) {
            return { allSpese, filtered, isFiltered, groups: [] };
        }

        if (allSpese.length === 0) {
            content.innerHTML = '';
            summary.innerHTML = '';
            toggleClass(content, 'delete-pending', false);
            toggleClass(summary, 'delete-pending', false);
            empty.classList.remove('hidden');
            return { allSpese, filtered, isFiltered, groups: [] };
        }

        empty.classList.add('hidden');
        toggleClass(content, 'delete-pending', !!(selectionSummary.active && selectionSummary.deletePending));
        toggleClass(summary, 'delete-pending', !!(selectionSummary.active && selectionSummary.deletePending));

        summary.innerHTML = TimelineView.renderSummary({
            isFiltered,
            filtered,
            quickTotals,
            selection: selectionSummary
        });

        if (typeof options.onSelectionSummary === 'function') {
            options.onSelectionSummary(selectionSummary);
        }

        if (filtered.length === 0 && isFiltered) {
            content.innerHTML = TimelineView.renderFilteredEmpty();
            return { allSpese, filtered, isFiltered, groups: [] };
        }

        const groups = typeof options.groupByDay === 'function'
            ? options.groupByDay(filtered)
            : StatsData.groupByDay(filtered);
        const newCardId = options.newCardId;

        content.innerHTML = TimelineView.renderGroups(groups, {
            newCardId,
            getCategory: options.getCategory,
            getMethod: options.getMethod,
            formatDayLabel: options.formatDayLabel,
            selectionActive: !!selectionSummary.active,
            selectedIds: selectionSummary.selectedIds,
            deletePending: !!selectionSummary.deletePending
        });

        if (newCardId && filtered.some(spesa => spesa.id === newCardId)) {
            (options.clearNewCardId || noop)();
        }

        content.querySelectorAll('.expense-card').forEach(card => {
            bindExpenseCard(card, options);
        });

        return { allSpese, filtered, isFiltered, groups };
    }

    function renderCard(spesa, options = {}) {
        const isNew = spesa && spesa.id === options.newCardId;
        const html = TimelineView.renderExpenseCard(spesa, {
            category: typeof options.getCategory === 'function' ? options.getCategory(spesa.categoria) : {},
            method: typeof options.getMethod === 'function' ? options.getMethod(spesa.metodo) : {},
            isNew,
            selectionActive: !!options.selectionActive,
            isSelected: !!options.isSelected,
            deletePending: !!options.deletePending
        });

        if (isNew) (options.clearNewCardId || noop)();

        return {
            html,
            isNew
        };
    }

    return {
        render,
        renderCard,
        bindExpenseCard
    };
})();
