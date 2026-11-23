import {
    assert,
    loadCatalog,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Catalog espone default immutabili con 22 categorie, 8 metodi e colori stabili', () => {
        const { Catalog, CATEGORIES, PAYMENT_METHODS } = loadCatalog();
        const palette = Catalog.getColorPalette();
        const categories = Catalog.getCategories();
        const methods = Catalog.getPaymentMethods();

        assert.equal(categories.length, 22);
        assert.equal(methods.length, 8);
        assert.equal(categories, CATEGORIES);
        assert.equal(methods, PAYMENT_METHODS);

        assert.equal(Object.isFrozen(palette), true);
        assert.equal(Object.isFrozen(categories), true);
        assert.equal(Object.isFrozen(methods), true);
        assert.equal(Object.isFrozen(categories[0]), true);
        assert.equal(Object.isFrozen(categories[0].keywords), true);
        assert.equal(Object.isFrozen(methods[0]), true);
        assert.equal(Object.isFrozen(methods[0].keywords), true);

        assert.equal(Catalog.getCategoryColor('abbigliamento'), '#10b981');
        assert.equal(Catalog.getCategoryColor('bar'), '#f59e0b');
        assert.equal(Catalog.getCategoryColor('bollette'), '#2dd4bf');
        assert.equal(Catalog.getCategoryColor('trasporti'), '#ef4444');
        assert.equal(Catalog.getCategoryColor('viaggi'), '#2563eb');
        assert.equal(Catalog.getCategoryColor('altro'), '#3b82f6');
    });

    test('Catalog risolve fallback sicuri, liste custom e palette override', () => {
        const { Catalog } = loadCatalog();
        const palette = Catalog.getColorPalette();

        assert.equal(Catalog.getCategory('bar').nome, 'Bar');
        assert.equal(Catalog.getCategory('inesistente').id, 'altro');
        assert.equal(Catalog.getMethod('paypal').nome, 'PayPal');
        assert.equal(Catalog.getMethod('inesistente').id, 'altro_pag');

        const customList = [
            { id: 'ufficio', nome: 'Ufficio', emoji: '📎' },
            { id: 'altro', nome: 'Altro custom', emoji: '📦' }
        ];
        assert.equal(Catalog.getCategory('ufficio', customList).nome, 'Ufficio');
        assert.equal(Catalog.getCategory('mancante', customList).nome, 'Altro custom');

        const customMethods = [
            { id: 'crypto', nome: 'Crypto', emoji: '🪙' },
            { id: 'altro_pag', nome: 'Altro', emoji: '💰' }
        ];
        assert.equal(Catalog.getMethod('crypto', customMethods).nome, 'Crypto');
        assert.equal(Catalog.getMethod('mancante', customMethods).id, 'altro_pag');

        const customPalette = ['#111111', '#222222', '#333333'];
        assert.equal(Catalog.getCategoryColor('bar', customPalette), '#333333');

        const unknownId = 'categoria_nuova_test';
        const expectedHash = Array.from(unknownId).reduce((sum, ch) => sum + ch.codePointAt(0), 0);
        assert.equal(Catalog.getCategoryColor(unknownId), palette[expectedHash % palette.length]);
    });

    test('Catalog supporta configure e reset mantenendo storiche le voci disattivate', () => {
        const { Catalog } = loadCatalog();

        const configured = Catalog.configure({
            categories: [
                ...Catalog.getDefaultCategories().map(cat => (
                    cat.id === 'tabacchi' ? { ...cat, active: false } : cat
                )),
                {
                    id: 'animali',
                    nome: 'Animali',
                    emoji: '🐶',
                    color: '#ff00aa',
                    keywords: ['veterinario', ' croccantini ', 'veterinario']
                }
            ],
            methods: [
                ...Catalog.getDefaultPaymentMethods().map(method => (
                    method.id === 'welfare' ? { ...method, active: false } : method
                )),
                {
                    id: 'revolut',
                    nome: 'Revolut',
                    emoji: '💳',
                    keywords: ['revolut']
                }
            ]
        });

        assert.equal(configured.categories.some(cat => cat.id === 'animali'), true);
        assert.equal(Catalog.getCategories().some(cat => cat.id === 'tabacchi'), false);
        assert.equal(Catalog.getCategories({ includeInactive: true }).some(cat => cat.id === 'tabacchi'), true);
        assert.equal(Catalog.getCategory('tabacchi').nome, 'Tabacchi');
        assert.equal(Catalog.getCategoryColor('tabacchi'), '#22c55e');

        const animals = Catalog.getCategory('animali');
        assert.deepEqual(animals.keywords, ['veterinario', 'croccantini']);
        assert.equal(Catalog.getCategoryColor('animali'), '#ff00aa');

        assert.equal(Catalog.getPaymentMethods().some(method => method.id === 'welfare'), false);
        assert.equal(Catalog.getPaymentMethods({ includeInactive: true }).some(method => method.id === 'welfare'), true);
        assert.equal(Catalog.getPaymentMethods().some(method => method.id === 'revolut'), true);
        assert.equal(Catalog.getMethod('welfare').nome, 'Welfare');

        Catalog.reset();
        assert.equal(Catalog.getCategories().length, 22);
        assert.equal(Catalog.getPaymentMethods().length, 8);
        assert.equal(Catalog.getCategory('animali').id, 'altro');
    });

    test('Parser e StatsCharts leggono dinamicamente categorie, metodi e colori da Catalog', () => {
        const { Catalog, Parser, StatsCharts } = loadUiViews();

        Catalog.configure({
            categories: [
                ...Catalog.getDefaultCategories(),
                {
                    id: 'animali',
                    nome: 'Animali domestici',
                    emoji: '🐶',
                    color: '#123456',
                    keywords: ['croccantini']
                }
            ],
            methods: [
                ...Catalog.getDefaultPaymentMethods(),
                {
                    id: 'revolut',
                    nome: 'Revolut',
                    emoji: '💳',
                    keywords: ['revolut']
                }
            ]
        });

        const parsedByKeyword = Parser.parse('croccantini 14 revolut');
        assert.equal(parsedByKeyword.categoria, 'animali');
        assert.equal(parsedByKeyword.metodo, 'revolut');

        const parsedByDirective = Parser.parse('visita 35 .animali-domestici');
        assert.equal(parsedByDirective.categoria, 'animali');

        assert.equal(StatsCharts.getCategoryColor('animali'), '#123456');

        const doughnut = StatsCharts.buildDoughnutConfig([
            expense({ importo: 20, categoria: 'animali' }),
            expense({ importo: 10, categoria: 'bar' })
        ], {
            getCategory: id => Catalog.getCategory(id)
        });
        assert.deepEqual(doughnut.data.datasets[0].backgroundColor, ['#123456', '#f59e0b']);

        const overridden = StatsCharts.buildDoughnutConfig([
            expense({ importo: 20, categoria: 'animali' })
        ], {
            chartColors: ['#abcdef'],
            getCategory: id => Catalog.getCategory(id)
        });
        assert.deepEqual(overridden.data.datasets[0].backgroundColor, ['#abcdef']);

        Catalog.reset();
    });

    test('AppUI e AppWiring propagano Catalog dinamicamente rispettando gli override dei test', () => {
        const { Catalog, AppUI, AppWiring, AppState } = loadUiViews();

        Catalog.configure({
            categories: [
                ...Catalog.getDefaultCategories(),
                {
                    id: 'hobby',
                    nome: 'Hobby',
                    emoji: '🎨',
                    color: '#778899',
                    keywords: ['acquerelli']
                }
            ],
            methods: [
                ...Catalog.getDefaultPaymentMethods(),
                {
                    id: 'satispay_biz',
                    nome: 'Satispay Biz',
                    emoji: '📱',
                    keywords: ['satispaybiz']
                }
            ]
        });

        assert.equal(AppUI.getCategory('hobby').nome, 'Hobby');
        assert.equal(AppUI.getMethod('satispay_biz').nome, 'Satispay Biz');

        const app = {
            ...AppState.create(),
            renderTimeline: () => {},
            renderStats: () => {},
            renderSettings: () => {},
            showToast: () => {},
            submitExpense: () => {},
            refreshExpenseViews: () => {}
        };
        const fakeDocument = {
            body: {},
            getElementById: () => null
        };
        const wiring = AppWiring.create(app, {
            document: fakeDocument,
            window: {},
            history: {}
        });

        assert.equal(wiring.filterOptions().categories.some(cat => cat.id === 'hobby'), true);
        assert.equal(wiring.filterOptions().methods.some(method => method.id === 'satispay_biz'), true);
        assert.equal(wiring.modalOptions().categories.some(cat => cat.id === 'hobby'), true);
        assert.equal(wiring.modalOptions().methods.some(method => method.id === 'satispay_biz'), true);
        assert.equal(wiring.expenseSubmitOptions().getCategory('hobby').emoji, '🎨');
        assert.equal(wiring.timelineOptions().getCategory('hobby').nome, 'Hobby');
        assert.equal(wiring.timelineOptions().getMethod('satispay_biz').nome, 'Satispay Biz');
        assert.equal(wiring.timelineOptions().getCategoryColor('hobby'), '#778899');
        assert.equal(wiring.statsOptions().getCategory('hobby').nome, 'Hobby');
        assert.equal(wiring.statsOptions().getCategoryColor('hobby'), '#778899');

        const overriddenWiring = AppWiring.create(app, {
            document: fakeDocument,
            window: {},
            history: {},
            CATEGORIES: [{ id: 'solo', nome: 'Solo Test', emoji: '🧪' }],
            PAYMENT_METHODS: [{ id: 'only_pay', nome: 'Only Pay', emoji: '💵' }]
        });
        assert.deepEqual(overriddenWiring.filterOptions().categories.map(c => c.id), ['solo']);
        assert.deepEqual(overriddenWiring.filterOptions().methods.map(m => m.id), ['only_pay']);
        assert.equal(overriddenWiring.timelineOptions().getCategory('solo').nome, 'Solo Test');
        assert.equal(overriddenWiring.timelineOptions().getMethod('only_pay').nome, 'Only Pay');

        Catalog.reset();
    });
};
