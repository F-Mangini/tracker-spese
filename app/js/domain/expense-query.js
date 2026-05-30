/* ============================================
   EXPENSE QUERY - modelli dati derivati per UI
   ============================================ */

const ExpenseQuery = (() => {
    function list(spese) {
        return Array.isArray(spese) ? spese : [];
    }

    function filterByPeriod(spese, start, end) {
        return list(spese).filter(spesa => {
            const date = new Date(spesa.data);
            return date >= start && date <= end;
        });
    }

    function buildFilterModel(options = {}) {
        const allSpese = list(options.spese);
        const filters = options.filters || {};
        const activeFilterCount = ExpenseFilters.countActive(filters);
        const hasActiveFilters = activeFilterCount > 0;
        const filteredSpese = hasActiveFilters
            ? ExpenseFilters.apply(allSpese, filters)
            : allSpese;

        return {
            allSpese,
            filteredSpese,
            activeFilterCount,
            hasActiveFilters,
            quickTotals: StatsData.getQuickTotals(allSpese, options.now)
        };
    }

    function buildStatsModel(options = {}) {
        const allSpese = list(options.spese);
        const filters = options.filters || {};
        const period = options.period || 'month';
        const offset = Number.isFinite(Number(options.offset)) ? Number(options.offset) : 0;
        const { start, end, label } = StatsData.getPeriodDates({
            period,
            offset,
            filters,
            spese: allSpese,
            now: options.now
        });
        const periodSpese = filterByPeriod(allSpese, start, end);
        const filteredSpese = ExpenseFilters.applyNonDate(periodSpese, filters);
        const summary = StatsData.summarizeExpenses(filteredSpese, start, end, {
            now: options.now,
            topLimit: options.topLimit
        });
        const aggregation = StatsData.getBarAggregation({
            period,
            start,
            end,
            now: options.now
        });

        return {
            allSpese,
            periodSpese,
            filteredSpese,
            start,
            end,
            label,
            period,
            offset,
            aggregation,
            summary,
            barChartTitle: StatsData.getBarChartTitle({ aggregation }),
            canGoNext: offset < 0,
            isCustom: period === 'custom'
        };
    }

    return {
        buildFilterModel,
        buildStatsModel
    };
})();
