/* ============================================
   STATS CHARTS - configurazione Chart.js
   ============================================ */

const StatsCharts = (() => {
    const COLORS = [
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
        '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308',
        '#22c55e', '#d946ef', '#64748b', '#fb923c', '#2dd4bf'
    ];

    const DEFAULT_THEME = {
        text: '#0f172a',
        textMuted: '#64748b',
        accent: '#10b981',
        cardBg: '#ffffff',
        grid: '#e2e8f0'
    };

    function formatMoney(value) {
        if (typeof AppUI !== 'undefined' && AppUI && typeof AppUI.money === 'function') {
            return AppUI.money(value);
        }

        const amount = Number(value || 0);
        const safeAmount = Number.isFinite(amount) ? amount : 0;
        return `\u20ac${safeAmount.toFixed(2)}`;
    }

    function getThemeColors(root) {
        if (typeof getComputedStyle !== 'function') {
            return { ...DEFAULT_THEME };
        }

        const target = root || document.documentElement;
        const style = getComputedStyle(target);
        const read = (name, fallback) => style.getPropertyValue(name).trim() || fallback;

        return {
            text: read('--text-primary', DEFAULT_THEME.text),
            textMuted: read('--text-tertiary', DEFAULT_THEME.textMuted),
            accent: read('--accent', DEFAULT_THEME.accent),
            cardBg: read('--bg-card', DEFAULT_THEME.cardBg),
            grid: read('--border', DEFAULT_THEME.grid)
        };
    }

    function buildDoughnutConfig(spese, options = {}) {
        const themeColors = options.themeColors || DEFAULT_THEME;
        const chartColors = options.chartColors || COLORS;
        const getCategory = typeof options.getCategory === 'function'
            ? options.getCategory
            : () => ({ emoji: '', nome: '' });
        const categoryTotals = StatsData.getSortedCategoryTotals(spese);

        return {
            type: 'doughnut',
            data: {
                labels: categoryTotals.map(([id]) => {
                    const category = getCategory(id);
                    return `${category.emoji || ''} ${category.nome || ''}`.trim();
                }),
                datasets: [{
                    data: categoryTotals.map(([, value]) => Math.round(value * 100) / 100),
                    backgroundColor: categoryTotals.map((_, index) => chartColors[index % chartColors.length]),
                    borderColor: themeColors.cardBg,
                    borderWidth: 3,
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: themeColors.text,
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 10,
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                                const percent = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
                                return ` ${formatMoney(context.parsed)} (${percent}%)`;
                            }
                        }
                    }
                }
            }
        };
    }

    function buildBarConfig(spese, start, end, options = {}) {
        const themeColors = options.themeColors || DEFAULT_THEME;
        const aggregation = options.aggregation || StatsData.getBarAggregation({
            period: options.period,
            start,
            end,
            now: options.now
        });
        const bar = StatsData.buildBarData(spese, start, end, { aggregation, now: options.now });
        const numBars = bar.labels.length;

        return {
            type: 'bar',
            data: {
                labels: bar.labels,
                datasets: [{
                    label: 'Spese \u20ac',
                    data: bar.data,
                    backgroundColor: bar.data.map(value => value > 0 ? themeColors.accent + 'cc' : themeColors.accent + '33'),
                    borderColor: themeColors.accent,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: numBars <= 7 ? 1.8 : 2,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => ` ${formatMoney(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: themeColors.textMuted,
                            font: { size: 9 },
                            maxRotation: numBars > 14 ? 45 : 0,
                            autoSkip: true,
                            maxTicksLimit: numBars > 60 ? 15 : undefined
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: themeColors.textMuted,
                            font: { size: 10 },
                            callback: value => '\u20ac' + value
                        },
                        grid: { color: themeColors.grid }
                    }
                }
            }
        };
    }

    function destroy(chart) {
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }

        return null;
    }

    return {
        COLORS,
        getThemeColors,
        buildDoughnutConfig,
        buildBarConfig,
        destroy
    };
})();
