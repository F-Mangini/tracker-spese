/* ============================================
   STATS CONTROLLER - wiring pagina statistiche
   ============================================ */

const StatsController = (() => {
    function destroyCharts(charts = {}) {
        return {
            doughnut: StatsCharts.destroy(charts.doughnut),
            bar: StatsCharts.destroy(charts.bar)
        };
    }

    function getPeriodDates(options = {}) {
        return StatsData.getPeriodDates({
            period: options.period,
            offset: options.offset,
            filters: options.filters,
            spese: options.spese
        });
    }

    function getBarAggregation(options = {}) {
        return StatsData.getBarAggregation({
            period: options.period,
            start: options.start,
            end: options.end
        });
    }

    function getBarChartTitle(options = {}) {
        return StatsData.getBarChartTitle({
            period: options.period,
            start: options.start,
            end: options.end
        });
    }

    function renderCharts(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const ChartClass = options.ChartClass || (typeof Chart !== 'undefined' ? Chart : null);
        const charts = options.charts || {};

        if (!activeDocument || !ChartClass) return charts;

        const themeColors = StatsCharts.getThemeColors();
        const nextCharts = { ...charts };
        const getCategory = typeof options.getCategory === 'function'
            ? options.getCategory
            : () => ({});

        const ctxD = activeDocument.getElementById('chart-doughnut');
        if (ctxD) {
            nextCharts.doughnut = new ChartClass(ctxD, StatsCharts.buildDoughnutConfig(options.filtered, {
                themeColors,
                chartColors: StatsCharts.COLORS,
                getCategory
            }));
        }

        const ctxB = activeDocument.getElementById('chart-bar');
        if (ctxB) {
            nextCharts.bar = new ChartClass(ctxB, StatsCharts.buildBarConfig(
                options.filtered,
                options.start,
                options.end,
                {
                    aggregation: getBarAggregation(options),
                    themeColors
                }
            ));
        }

        return nextCharts;
    }

    function bindPeriodControls(options = {}) {
        const container = options.container;
        if (!container) return;

        const period = options.period || 'month';
        const offset = Number.isFinite(options.offset) ? options.offset : 0;
        const isCustom = period === 'custom';
        const canGoNext = offset < 0;
        const rerender = typeof options.rerender === 'function' ? options.rerender : () => {};

        container.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (typeof options.setPeriod === 'function') {
                    options.setPeriod(btn.dataset.period);
                }
                if (typeof options.setOffset === 'function') {
                    options.setOffset(0);
                }
                rerender();
            });
        });

        const prevBtn = container.querySelector('#period-prev');
        const nextBtn = container.querySelector('#period-next');

        if (!isCustom && prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (typeof options.setOffset === 'function') {
                    options.setOffset(offset - 1);
                }
                rerender();
            });
        }

        if (!isCustom && canGoNext && nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (typeof options.setOffset === 'function') {
                    options.setOffset(offset + 1);
                }
                rerender();
            });
        }
    }

    function render(options = {}) {
        const activeDocument = options.document || (typeof document !== 'undefined' ? document : null);
        const container = options.container;
        const period = options.period || 'month';
        const offset = Number.isFinite(options.offset) ? options.offset : 0;
        const filters = options.filters || {};
        const allSpese = Array.isArray(options.spese) ? options.spese : [];
        const statsModel = options.statsModel || null;
        const getCategory = typeof options.getCategory === 'function'
            ? options.getCategory
            : () => ({});

        let charts = destroyCharts(options.charts);

        if (!container) {
            return { charts, filtered: [] };
        }

        if (allSpese.length === 0) {
            container.innerHTML = StatsView.renderEmptyState();
            return { charts, filtered: [] };
        }

        const { start, end, label } = statsModel || getPeriodDates({
            period,
            offset,
            filters,
            spese: allSpese
        });

        let filtered = statsModel
            ? (statsModel.filteredSpese || [])
            : allSpese.filter(spesa => {
                const date = new Date(spesa.data);
                return date >= start && date <= end;
            });

        if (!statsModel && typeof options.applyNonDateFilters === 'function') {
            filtered = options.applyNonDateFilters(filtered);
        }

        const summary = statsModel
            ? statsModel.summary
            : StatsData.summarizeExpenses(filtered, start, end);
        const canGoNext = statsModel
            ? !!statsModel.canGoNext
            : offset < 0;
        const isCustom = statsModel
            ? !!statsModel.isCustom
            : period === 'custom';
        const barChartTitle = statsModel
            ? statsModel.barChartTitle
            : getBarChartTitle({ period, start, end });

        container.innerHTML = StatsView.renderPage({
            period,
            periodLabel: label,
            canGoNext,
            isCustom,
            filtered,
            summary,
            barChartTitle,
            chartColors: StatsCharts.COLORS,
            getCategoryColor: categoryId => StatsCharts.getCategoryColor(categoryId),
            getCategory
        });

        bindPeriodControls({
            container,
            period,
            offset,
            setPeriod: options.setPeriod,
            setOffset: options.setOffset,
            rerender: options.rerender
        });

        if (filtered.length > 0) {
            charts = renderCharts({
                document: activeDocument,
                ChartClass: options.ChartClass,
                charts,
                filtered,
                start,
                end,
                period,
                getCategory
            });
        }

        return {
            charts,
            filtered,
            start,
            end,
            label
        };
    }

    return {
        destroyCharts,
        getPeriodDates,
        getBarAggregation,
        getBarChartTitle,
        renderCharts,
        bindPeriodControls,
        render
    };
})();
