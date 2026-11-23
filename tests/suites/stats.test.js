import {
    assert,
    loadStats,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Statistiche aggregano dati giornalieri includendo giorni vuoti', () => {
        const StatsData = loadStats();
        const spese = [
            expense({ id: 'a', importo: 10.25, data: '2026-05-01T10:00:00' }),
            expense({ id: 'b', importo: 4.75, data: '2026-05-03T10:00:00' })
        ];

        const result = StatsData.buildDailyBarData(
            spese,
            new Date('2026-05-01T00:00:00'),
            new Date('2026-05-03T23:59:59'),
            { now: new Date('2026-05-03T12:00:00') }
        );

        assert.deepEqual(result.data, [10.25, 0, 4.75]);
    });

    test('Statistiche aggregano dati settimanali dal lunedi alla domenica', () => {
        const StatsData = loadStats();
        const spese = [
            expense({ id: 'a', importo: 10, data: '2026-04-28T10:00:00' }),
            expense({ id: 'b', importo: 5, data: '2026-05-05T10:00:00' }),
            expense({ id: 'c', importo: 2, data: '2026-05-17T10:00:00' })
        ];

        const result = StatsData.buildWeeklyBarData(
            spese,
            new Date('2026-04-28T00:00:00'),
            new Date('2026-05-17T23:59:59'),
            { now: new Date('2026-05-17T12:00:00') }
        );

        assert.deepEqual(result.data, [10, 5, 2]);
    });

    test('Statistiche aggregano dati mensili e riepilogo categorie/top spese', () => {
        const StatsData = loadStats();
        const spese = [
            expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-01-10T10:00:00' }),
            expense({ id: 'b', importo: 7, categoria: 'ristorante', data: '2026-03-10T10:00:00' }),
            expense({ id: 'c', importo: 3, categoria: 'bar', data: '2026-03-11T10:00:00' })
        ];
        const start = new Date('2026-01-01T00:00:00');
        const end = new Date('2026-03-31T23:59:59');

        const bars = StatsData.buildMonthlyBarData(spese, start, end, {
            now: new Date('2026-03-31T12:00:00')
        });
        const summary = StatsData.summarizeExpenses(spese, start, end, {
            now: new Date('2026-03-31T12:00:00'),
            topLimit: 2
        });

        assert.deepEqual(bars.data, [10, 0, 10]);
        assert.equal(summary.total, 20);
        assert.deepEqual(summary.categoryTotals, [['bar', 13], ['ristorante', 7]]);
        assert.deepEqual(summary.topExpenses.map(s => s.id), ['a', 'b']);
    });

    test('Vista statistiche separa template da dati e conserva gli stati vuoti', () => {
        const { StatsView } = loadUiViews();

        assert(StatsView.renderEmptyState().includes('stats-empty-initial'));

        const html = StatsView.renderPage({
            period: 'month',
            periodLabel: 'maggio 2026',
            canGoNext: false,
            isCustom: false,
            filtered: [expense({ importo: 10 })],
            summary: {
                total: 10,
                avg: 1,
                categoryTotals: [['bar', 10]],
                maxCategory: 10,
                topExpenses: [expense({ importo: 10 })]
            },
            barChartTitle: 'Andamento giornaliero',
            chartColors: ['#10b981'],
            getCategory: () => ({ emoji: '☕', nome: 'Bar' })
        });

        assert(html.includes('data-period="month"'));
        assert(html.includes('chart-doughnut'));
        assert(html.includes('Dettaglio categorie'));
    });

    test('Colori categoria restano fissi indipendentemente dai totali', () => {
        const { StatsCharts } = loadUiViews();
        const transportColor = StatsCharts.getCategoryColor('trasporti');
        const barColor = StatsCharts.getCategoryColor('bar');
        const clothingColor = StatsCharts.getCategoryColor('abbigliamento');
        const travelColor = StatsCharts.getCategoryColor('viaggi');

        assert.equal(transportColor, StatsCharts.COLORS[3]);
        assert.equal(barColor, StatsCharts.COLORS[2]);
        assert.equal(travelColor, StatsCharts.COLORS[20]);
        assert.notEqual(travelColor, clothingColor);

        const config = StatsCharts.buildDoughnutConfig([
            expense({ importo: 100, categoria: 'bar' }),
            expense({ importo: 10, categoria: 'trasporti' })
        ], {
            getCategory: id => ({ nome: id })
        });

        assert.deepEqual(config.data.labels, ['bar', 'trasporti']);
        assert.deepEqual(config.data.datasets[0].backgroundColor, [barColor, transportColor]);
    });

    test('Configurazione grafici statistiche separa Chart.js da app.js', () => {
        const { StatsCharts } = loadUiViews();
        const spese = [
            expense({ id: 'a', importo: 10, categoria: 'bar', data: '2026-05-01T10:00:00' }),
            expense({ id: 'b', importo: 0, categoria: 'bar', data: '2026-05-02T10:00:00' })
        ];
        const themeColors = {
            text: '#111111',
            textMuted: '#666666',
            accent: '#10b981',
            cardBg: '#ffffff',
            grid: '#dddddd'
        };

        const doughnut = StatsCharts.buildDoughnutConfig(spese, {
            themeColors,
            chartColors: ['#111111'],
            getCategory: () => ({ emoji: '☕', nome: 'Bar' })
        });
        const bar = StatsCharts.buildBarConfig(
            spese,
            new Date('2026-05-01T00:00:00'),
            new Date('2026-05-02T23:59:59'),
            { themeColors, aggregation: 'day', now: new Date('2026-05-02T12:00:00') }
        );

        assert.equal(doughnut.type, 'doughnut');
        assert.deepEqual(doughnut.data.labels, ['☕ Bar']);
        assert.deepEqual(doughnut.data.datasets[0].data, [10]);
        assert.equal(doughnut.options.plugins.legend.labels.color, '#111111');
        assert.equal(bar.type, 'bar');
        assert.deepEqual(bar.data.datasets[0].data, [10, 0]);
        assert.deepEqual(bar.data.datasets[0].backgroundColor, ['#10b981cc', '#10b98133']);
        assert.equal(bar.options.scales.y.grid.color, '#dddddd');
        assert.equal(
            doughnut.options.plugins.tooltip.callbacks.label({
                parsed: 132.59,
                dataset: { data: [132.59] }
            }),
            ' €133 (100.0%)'
        );
        assert.equal(
            bar.options.plugins.tooltip.callbacks.label({ parsed: { y: 51.34 } }),
            ' €51.34'
        );
    });

    test('Controller statistiche riusa modello precomputato', () => {
        const { StatsController } = loadUiViews();
        const filtered = [
            expense({
                id: 'ready',
                importo: 12,
                descrizione: 'Pronta',
                categoria: 'bar',
                data: '2026-05-20T10:00:00.000Z'
            })
        ];
        const container = {
            innerHTML: '',
            querySelectorAll() {
                return [];
            },
            querySelector() {
                return null;
            }
        };

        const result = StatsController.render({
            document: {
                getElementById() {
                    return null;
                }
            },
            container,
            spese: [
                ...filtered,
                expense({ id: 'ignored', importo: 99, descrizione: 'Ignorata' })
            ],
            statsModel: {
                filteredSpese: filtered,
                start: new Date('2026-05-20T00:00:00.000Z'),
                end: new Date('2026-05-20T23:59:59.999Z'),
                label: 'Periodo pronto',
                summary: {
                    total: 12,
                    avg: 12,
                    days: 1,
                    categoryTotals: [['bar', 12]],
                    maxCategory: 12,
                    topExpenses: filtered
                },
                barChartTitle: 'Titolo pronto',
                canGoNext: true,
                isCustom: false
            },
            period: 'month',
            offset: -1,
            filters: {},
            charts: {},
            ChartClass: null,
            getCategory: () => ({ emoji: 'x', nome: 'Bar' }),
            applyNonDateFilters: () => {
                throw new Error('applyNonDateFilters non deve essere chiamato');
            }
        });

        assert.equal(result.filtered, filtered);
        assert(container.innerHTML.includes('Periodo pronto'));
        assert(container.innerHTML.includes('Titolo pronto'));
        assert(container.innerHTML.includes('Pronta'));
        assert(!container.innerHTML.includes('Ignorata'));
    });

    test('Controller statistiche coordina render, periodo e grafici senza App', () => {
        const { StatsController } = loadUiViews();
        const calls = [];
        const periodButtons = [
            {
                dataset: { period: 'year' },
                addEventListener(event, handler) {
                    calls.push(['bind-period', event, this.dataset.period]);
                    this.handler = handler;
                }
            }
        ];
        const prevBtn = {
            addEventListener(event, handler) {
                calls.push(['bind-prev', event]);
                this.handler = handler;
            }
        };
        const nextBtn = {
            addEventListener(event, handler) {
                calls.push(['bind-next', event]);
                this.handler = handler;
            }
        };
        const container = {
            innerHTML: '',
            querySelectorAll(selector) {
                return selector === '.period-btn' ? periodButtons : [];
            },
            querySelector(selector) {
                if (selector === '#period-prev') return prevBtn;
                if (selector === '#period-next') return nextBtn;
                return null;
            }
        };
        const destroyed = [];
        const oldChart = {
            destroy() {
                destroyed.push('old');
            }
        };
        const chartCalls = [];
        function FakeChart(ctx, config) {
            this.ctx = ctx;
            this.config = config;
            this.destroy = () => chartCalls.push(['destroy', ctx]);
            chartCalls.push(['create', ctx, config.type]);
        }

        let period = 'month';
        const now = new Date();
        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10, 10).toISOString();
        const olderMonth = new Date(now.getFullYear(), now.getMonth() - 2, 10, 10).toISOString();
        let offset = -1;
        let rerenderCount = 0;
        const result = StatsController.render({
            document: {
                getElementById(id) {
                    if (id === 'chart-doughnut') return 'doughnut-canvas';
                    if (id === 'chart-bar') return 'bar-canvas';
                    return null;
                }
            },
            container,
            spese: [
                expense({ id: 'old', data: olderMonth, importo: 100 }),
                expense({ id: 'current', data: previousMonth, importo: 12 })
            ],
            period,
            offset,
            filters: {
                query: '',
                categories: new Set(),
                methods: new Set(),
                amountMin: 0,
                amountMax: Infinity,
                dateFrom: '',
                dateTo: '',
                selectedOnly: false,
                selectedOnlyIds: new Set()
            },
            charts: {
                doughnut: oldChart,
                bar: null
            },
            ChartClass: FakeChart,
            getCategory: () => ({ emoji: 'x', nome: 'Categoria' }),
            applyNonDateFilters: spese => spese,
            setPeriod: value => { period = value; },
            setOffset: value => { offset = value; },
            rerender: () => { rerenderCount += 1; }
        });

        assert(container.innerHTML.includes('stats-period-selector'));
        assert.equal(result.filtered.length, 1);
        assert.deepEqual(destroyed, ['old']);
        assert.deepEqual(chartCalls.map(call => call.slice(0, 3)), [
            ['create', 'doughnut-canvas', 'doughnut'],
            ['create', 'bar-canvas', 'bar']
        ]);
        assert.equal(result.charts.doughnut.ctx, 'doughnut-canvas');
        assert.equal(result.charts.bar.ctx, 'bar-canvas');

        periodButtons[0].handler();
        assert.equal(period, 'year');
        assert.equal(offset, 0);
        assert.equal(rerenderCount, 1);

        offset = -1;
        prevBtn.handler();
        assert.equal(offset, -2);
        assert.equal(rerenderCount, 2);

        nextBtn.handler();
        assert.equal(offset, 0);
        assert.equal(rerenderCount, 3);
    });
};
