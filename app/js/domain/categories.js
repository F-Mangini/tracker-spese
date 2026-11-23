/* ============================================
   CATALOG - Registro unico categorie, metodi e colori
   ============================================ */

const Catalog = (() => {
    const DEFAULT_CATEGORY_ID = 'altro';
    const DEFAULT_METHOD_ID = 'carta';
    const FALLBACK_METHOD_ID = 'altro_pag';

    const COLOR_PALETTE = Object.freeze([
        '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
        '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#eab308',
        '#22c55e', '#d946ef', '#64748b', '#fb923c', '#2dd4bf',
        '#2563eb'
    ]);

    const RAW_DEFAULT_CATEGORIES = [
        { id: 'abbigliamento', nome: 'Abbigliamento', emoji: '👕', color: '#10b981', keywords: ['maglietta', 'maglia', 'maglione', 'pantaloni', 'scarpe', 'stivali', 'giacca', 'vestito', 'zara', 'h&m', 'nike', 'adidas', 'felpa', 'jeans', 'camicia', 'cappotto', 'calze', 'intimo', 'gonna', 'top', 'cappello', 'sciarpa', 'guanti', 'body', 'pantaloncini', 'shorts', 'mutande', 'reggiseno', 'boxer', 'slip', 'calzini', 'collant', 'cravatta', 'blazer', 'costume', 't-shirt', 'corsetto', 'coprispalla'] },
        { id: 'accessori', nome: 'Accessori', emoji: '⌚', color: '#3b82f6', keywords: ['orologio', 'borsa', 'accessori', 'collana', 'orecchini', 'anello', 'bracciale', 'portafoglio', 'zaino', 'portachiavi', 'occhiali da sole', 'custodia', 'cover'] },
        { id: 'bar', nome: 'Bar', emoji: '☕', color: '#f59e0b', keywords: ['caffè', 'caffe', 'acqua', 'cappuccino', 'cornetto', 'brioche', 'brioches', 'espresso', 'bar', 'colazione', 'latte', 'tè', 'the', 'thè', 'gelato', 'biscotto', 'pasticciotto', 'granita', 'espressino', 'cioccolata', 'ginseng', 'crepes', 'waffle', 'yogurt', 'torta', 'coca cola', 'focaccia'] },
        { id: 'bollette', nome: 'Bollette', emoji: '💡', color: '#2dd4bf', keywords: ['bolletta', 'luce', 'gas', 'acqua', 'enel', 'eni', 'a2a', 'internet', 'wifi', 'fibra', 'utenze'] },
        { id: 'casa', nome: 'Casa', emoji: '🏠', color: '#8b5cf6', keywords: ['affitto', 'mutuo', 'condominio', 'casa', 'arredamento', 'ikea'] },
        { id: 'cura', nome: 'Cura personale', emoji: '💇', color: '#ec4899', keywords: ['barbiere', 'parrucchiere', 'estetista', 'profumo', 'crema', 'shampoo', 'lenti', 'sapone', 'trucco', 'makeup', 'smalto', 'rossetto', 'eyeliner', 'matita', 'mascara', 'blush', 'fondotinta', 'cipria', 'ombretto', 'capelli', 'taglio', 'unghie', 'manicure', 'pedicure', 'sopracciglia', 'ceretta', 'depilazione', 'tinta', 'lucidalabbra', 'rasoio', 'lametta', 'pennello', 'spazzolino', 'dentifricio', 'collutorio', 'deodorante', 'bagnoschiuma', 'doccia', 'dopobarba'] },
        { id: 'drink', nome: 'Drink', emoji: '🍺', color: '#06b6d4', keywords: ['birra', 'vino', 'cocktail', 'aperitivo', 'spritz', 'drink', 'shot', 'mojito', 'gin', 'rum', 'vodka', 'amaro', 'negroni', 'campari', 'camparino', 'limoncello'] },
        { id: 'formazione', nome: 'Formazione', emoji: '🎓', color: '#f97316', keywords: ['libro', 'corso', 'università', 'scuola', 'master', 'udemy', 'lezione', 'formazione', 'workshop', 'certificazione'] },
        { id: 'intrattenimento', nome: 'Intrattenimento', emoji: '🎬', color: '#84cc16', keywords: ['cinema', 'netflix', 'spotify', 'disney', 'prime video', 'concerto', 'teatro', 'museo', 'mostra', 'evento', 'playstation', 'xbox', 'nintendo', 'gioco', 'videogioco', 'steam', 'bowling', 'biliardo', 'ice hockey', 'biliardino', 'sala giochi', 'spettacolo', 'pungiball'] },
        { id: 'produttività', nome: 'Produttività', emoji: '🤖', color: '#6366f1', keywords: ['produttività', 'produttivita', 'chatgpt', 'claude', 'gemini', 'kimi', 'copilot', 'claude code', 'codex', 'perplexity', 'colab', 'server', 'gpu'] },
        { id: 'regali', nome: 'Regali', emoji: '🎁', color: '#14b8a6', keywords: ['regalo', 'fiori', 'pensiero', 'compleanno', 'natale', 'anniversario', 'san valentino'] },
        { id: 'ristorante', nome: 'Ristorante', emoji: '🍝', color: '#e11d48', keywords: ['pizza', 'sushi', 'ristorante', 'trattoria', 'hamburger', 'panino', 'pranzo', 'cena', 'pizzeria', 'kebab', 'poke', 'mcdonald', 'mcd', 'burger', 'macelleria', 'braceria'] },
        { id: 'salute', nome: 'Salute', emoji: '💊', color: '#0ea5e9', keywords: ['farmacia', 'medicina', 'dottore', 'medico', 'dentista', 'visita', 'analisi', 'ospedale', 'ottico', 'occhiali', 'integratore', 'integratori', 'vitamina', 'vitamine', 'cerotti', 'psicologo', 'psicologa'] },
        { id: 'supermercato', nome: 'Supermercato', emoji: '🛒', color: '#a855f7', keywords: ['spesa', 'supermercato', 'esselunga', 'conad', 'coop', 'lidl', 'eurospin', 'carrefour', 'pam', 'despar', 'md', 'aldi', 'penny', 'famila', 'casa del detersivo', 'acqua e sapone'] },
        { id: 'sport', nome: 'Sport', emoji: '🏋️', color: '#eab308', keywords: ['palestra', 'piscina', 'partita', 'calcetto', 'tennis', 'padel', 'beach', 'kart', 'pallavolo', 'paintball', 'decathlon', 'sport', 'yoga', 'pilates'] },
        { id: 'tabacchi', nome: 'Tabacchi', emoji: '🏪', color: '#22c55e', keywords: ['sigarette', 'tabacchi', 'tabacchino', 'gratta', 'lotto', 'francobollo', 'gomme'] },
        { id: 'takeaway', nome: 'Delivery', emoji: '🥡', color: '#d946ef', keywords: ['deliveroo', 'glovo', 'just eat', 'justeat', 'uber eats', 'ubereats', 'takeaway', 'asporto', 'delivery', 'consegna', 'spedizione'] },
        { id: 'tech', nome: 'Tech', emoji: '💻', color: '#64748b', keywords: ['computer', 'pc', 'laptop', 'tablet', 'cuffie', 'caricatore', 'amazon', 'elettronica', 'monitor', 'tastiera', 'mouse', 'cavo', 'usb', 'hard disk', 'ssd', 'iphone', 'samsung', 'apple', 'telefono nuovo'] },
        { id: 'telefono', nome: 'Telefono', emoji: '📱', color: '#fb923c', keywords: ['ricarica', 'iliad', 'vodafone', 'tim', 'wind', 'ho mobile', 'fastweb', 'sim'] },
        { id: 'trasporti', nome: 'Trasporti', emoji: '🚗', color: '#ef4444', keywords: ['carburante', 'benzina', 'diesel', 'treno', 'bus', 'metro', 'taxi', 'uber', 'autostrada', 'parcheggio', 'bollo', 'assicurazione', 'meccanico', 'gomme', 'italo', 'trenitalia', 'flixbus', 'monopattino'] },
        { id: 'viaggi', nome: 'Viaggi', emoji: '✈️', color: '#2563eb', keywords: ['volo', 'voli', 'aereo', 'hotel', 'albergo', 'airbnb', 'booking', 'vacanza', 'viaggio', 'ostello'] },
        { id: 'altro', nome: 'Altro', emoji: '📦', color: '#3b82f6', keywords: [] }
    ];

    const RAW_DEFAULT_PAYMENT_METHODS = [
        { id: 'bonifico', nome: 'Bonifico', emoji: '🏦', keywords: ['bonifico'] },
        { id: 'buoni_pasto', nome: 'Buoni Pasto', emoji: '🍔', keywords: ['buoni pasto', 'buono pasto', 'buonopasto', 'buonipasto'] },
        { id: 'carta', nome: 'Carta', emoji: '💳', keywords: ['carta'] },
        { id: 'contanti', nome: 'Contanti', emoji: '💵', keywords: ['contanti', 'cash'] },
        { id: 'paypal', nome: 'PayPal', emoji: '🅿️', keywords: ['paypal'] },
        { id: 'satispay', nome: 'Satispay', emoji: '📱', keywords: ['satispay'] },
        { id: 'welfare', nome: 'Welfare', emoji: '🌟', keywords: ['welfare'] },
        { id: 'altro_pag', nome: 'Altro', emoji: '💰', keywords: [] }
    ];

    function hashColor(id, palette = COLOR_PALETTE) {
        const colors = Array.isArray(palette) && palette.length > 0 ? palette : COLOR_PALETTE;
        const text = String(id || DEFAULT_CATEGORY_ID);
        const hash = Array.from(text).reduce((total, char) => total + char.codePointAt(0), 0);
        return colors[hash % colors.length];
    }

    function normalizeKeywords(keywords) {
        if (!Array.isArray(keywords)) return Object.freeze([]);

        const seen = new Set();
        const normalized = [];

        keywords.forEach(item => {
            if (typeof item !== 'string') return;
            const trimmed = item.trim();
            if (!trimmed || seen.has(trimmed)) return;
            seen.add(trimmed);
            normalized.push(trimmed);
        });

        return Object.freeze(normalized);
    }

    function normalizeCategory(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

        const id = typeof raw.id === 'string' ? raw.id.trim() : String(raw.id || '').trim();
        if (!id) return null;

        const nome = typeof raw.nome === 'string' && raw.nome.trim() ? raw.nome.trim() : id;
        const emoji = typeof raw.emoji === 'string' ? raw.emoji : '';
        const color = typeof raw.color === 'string' && raw.color.trim()
            ? raw.color.trim()
            : hashColor(id, COLOR_PALETTE);

        return Object.freeze({
            id,
            nome,
            emoji,
            color,
            keywords: normalizeKeywords(raw.keywords),
            active: raw.active !== false
        });
    }

    function normalizeMethod(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

        const id = typeof raw.id === 'string' ? raw.id.trim() : String(raw.id || '').trim();
        if (!id) return null;

        const nome = typeof raw.nome === 'string' && raw.nome.trim() ? raw.nome.trim() : id;
        const emoji = typeof raw.emoji === 'string' ? raw.emoji : '';

        return Object.freeze({
            id,
            nome,
            emoji,
            keywords: normalizeKeywords(raw.keywords),
            active: raw.active !== false
        });
    }

    function buildCatalogList(rawList, normalizer) {
        const orderedIds = [];
        const byId = new Map();

        (Array.isArray(rawList) ? rawList : []).forEach(raw => {
            const item = normalizer(raw);
            if (!item) return;

            if (!byId.has(item.id)) {
                orderedIds.push(item.id);
            }
            byId.set(item.id, item);
        });

        const all = Object.freeze(orderedIds.map(id => byId.get(id)));
        const active = all.every(item => item.active)
            ? all
            : Object.freeze(all.filter(item => item.active));

        return { all, active, byId };
    }

    const DEFAULT_CATEGORY_BUNDLE = buildCatalogList(RAW_DEFAULT_CATEGORIES, normalizeCategory);
    const DEFAULT_METHOD_BUNDLE = buildCatalogList(RAW_DEFAULT_PAYMENT_METHODS, normalizeMethod);
    const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_BUNDLE.all;
    const DEFAULT_PAYMENT_METHODS = DEFAULT_METHOD_BUNDLE.all;

    let allCategories = DEFAULT_CATEGORIES;
    let activeCategories = DEFAULT_CATEGORIES;
    let categoryById = DEFAULT_CATEGORY_BUNDLE.byId;

    let allMethods = DEFAULT_PAYMENT_METHODS;
    let activeMethods = DEFAULT_PAYMENT_METHODS;
    let methodById = DEFAULT_METHOD_BUNDLE.byId;

    function applyState(rawCategories, rawMethods) {
        let nextCategories = rawCategories === DEFAULT_CATEGORIES
            ? DEFAULT_CATEGORY_BUNDLE
            : buildCatalogList(rawCategories, normalizeCategory);
        if (nextCategories.all.length === 0) {
            nextCategories = DEFAULT_CATEGORY_BUNDLE;
        }

        let nextMethods = rawMethods === DEFAULT_PAYMENT_METHODS
            ? DEFAULT_METHOD_BUNDLE
            : buildCatalogList(rawMethods, normalizeMethod);
        if (nextMethods.all.length === 0) {
            nextMethods = DEFAULT_METHOD_BUNDLE;
        }

        allCategories = nextCategories.all;
        activeCategories = nextCategories.active;
        categoryById = nextCategories.byId;

        allMethods = nextMethods.all;
        activeMethods = nextMethods.active;
        methodById = nextMethods.byId;

        return {
            categories: activeCategories,
            methods: activeMethods
        };
    }

    function configure(options = {}) {
        const opts = options && typeof options === 'object' ? options : {};
        const nextRawCategories = opts.categories !== undefined
            ? (Array.isArray(opts.categories) && opts.categories.length > 0 ? opts.categories : DEFAULT_CATEGORIES)
            : allCategories;
        const nextRawMethods = opts.methods !== undefined
            ? (Array.isArray(opts.methods) && opts.methods.length > 0 ? opts.methods : DEFAULT_PAYMENT_METHODS)
            : allMethods;

        return applyState(nextRawCategories, nextRawMethods);
    }

    function reset() {
        return applyState(DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS);
    }

    function getColorPalette() {
        return COLOR_PALETTE;
    }

    function getDefaultCategories() {
        return DEFAULT_CATEGORIES;
    }

    function getDefaultPaymentMethods() {
        return DEFAULT_PAYMENT_METHODS;
    }

    function getCategories(options = {}) {
        return options && options.includeInactive ? allCategories : activeCategories;
    }

    function getPaymentMethods(options = {}) {
        return options && options.includeInactive ? allMethods : activeMethods;
    }

    function getCategory(id, customList = null) {
        if (Array.isArray(customList)) {
            return customList.find(category => category && category.id === id) ||
                customList.find(category => category && category.id === DEFAULT_CATEGORY_ID) ||
                customList[customList.length - 1] ||
                {};
        }

        return categoryById.get(id) ||
            categoryById.get(DEFAULT_CATEGORY_ID) ||
            allCategories[allCategories.length - 1] ||
            {};
    }

    function getMethod(id, customList = null) {
        if (Array.isArray(customList)) {
            return customList.find(method => method && method.id === id) ||
                customList.find(method => method && method.id === FALLBACK_METHOD_ID) ||
                customList[0] ||
                {};
        }

        return methodById.get(id) ||
            methodById.get(FALLBACK_METHOD_ID) ||
            methodById.get(DEFAULT_METHOD_ID) ||
            allMethods[0] ||
            {};
    }

    function getCategoryColor(categoryId, colors = null) {
        const id = String(categoryId || DEFAULT_CATEGORY_ID);
        const hasCustomPalette = Array.isArray(colors) && colors.length > 0 && colors !== COLOR_PALETTE;
        const palette = hasCustomPalette ? colors : COLOR_PALETTE;
        const category = categoryById.get(id);

        if (category && category.color) {
            if (!hasCustomPalette) {
                return category.color;
            }

            const paletteIndex = COLOR_PALETTE.indexOf(category.color);
            if (paletteIndex !== -1) {
                return palette[paletteIndex % palette.length];
            }

            return hashColor(id, palette);
        }

        return hashColor(id, palette);
    }

    reset();

    return {
        DEFAULT_CATEGORY_ID,
        DEFAULT_METHOD_ID,
        FALLBACK_METHOD_ID,
        COLOR_PALETTE,
        getColorPalette,
        getDefaultCategories,
        getDefaultPaymentMethods,
        getCategories,
        getPaymentMethods,
        getCategory,
        getMethod,
        getCategoryColor,
        configure,
        reset
    };
})();

const CATEGORIES = Catalog.getDefaultCategories();
const PAYMENT_METHODS = Catalog.getDefaultPaymentMethods();
