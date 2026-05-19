/* ============================================
   TIMELINE CONTROLLER - wiring timeline
   ============================================ */

const TimelineController = (() => {
    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function render(options = {}) {
        const doc = getDocument(options);
        const allSpese = Array.isArray(options.spese) ? options.spese : [];
        const isFiltered = typeof options.hasActiveFilters === 'function'
            ? options.hasActiveFilters()
            : false;
        const filtered = isFiltered && typeof options.applyFilters === 'function'
            ? options.applyFilters(allSpese)
            : allSpese;
        const content = options.content || doc.getElementById('timeline-content');
        const empty = options.empty || doc.getElementById('timeline-empty');
        const summary = options.summary || doc.getElementById('timeline-summary');

        if (!content || !empty || !summary) {
            return { allSpese, filtered, isFiltered, groups: [] };
        }

        if (allSpese.length === 0) {
            content.innerHTML = '';
            summary.innerHTML = '';
            empty.classList.remove('hidden');
            return { allSpese, filtered, isFiltered, groups: [] };
        }

        empty.classList.add('hidden');

        summary.innerHTML = TimelineView.renderSummary({
            isFiltered,
            filtered,
            quickTotals: typeof options.getQuickTotals === 'function'
                ? options.getQuickTotals(allSpese)
                : StatsData.getQuickTotals(allSpese)
        });

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
            formatDayLabel: options.formatDayLabel
        });

        if (newCardId && filtered.some(spesa => spesa.id === newCardId)) {
            (options.clearNewCardId || noop)();
        }

        content.querySelectorAll('.expense-card').forEach(card => {
            card.addEventListener('click', () => {
                (options.openEditModal || noop)(card.dataset.id);
            });
        });

        return { allSpese, filtered, isFiltered, groups };
    }

    function renderCard(spesa, options = {}) {
        const isNew = spesa && spesa.id === options.newCardId;
        const html = TimelineView.renderExpenseCard(spesa, {
            category: typeof options.getCategory === 'function' ? options.getCategory(spesa.categoria) : {},
            method: typeof options.getMethod === 'function' ? options.getMethod(spesa.metodo) : {},
            isNew
        });

        if (isNew) (options.clearNewCardId || noop)();

        return {
            html,
            isNew
        };
    }

    return {
        render,
        renderCard
    };
})();
