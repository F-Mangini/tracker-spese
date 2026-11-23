/* ============================================
   PARSER - Interpreta input in linguaggio naturale
   ============================================ */

const Parser = {
    _getCategories(options = {}) {
        if (options && Array.isArray(options.categories)) return options.categories;
        if (typeof Catalog !== 'undefined' && Catalog && typeof Catalog.getCategories === 'function') {
            return Catalog.getCategories();
        }
        return typeof CATEGORIES !== 'undefined' && Array.isArray(CATEGORIES) ? CATEGORIES : [];
    },

    _getPaymentMethods(options = {}) {
        if (options && Array.isArray(options.methods)) return options.methods;
        if (typeof Catalog !== 'undefined' && Catalog && typeof Catalog.getPaymentMethods === 'function') {
            return Catalog.getPaymentMethods();
        }
        return typeof PAYMENT_METHODS !== 'undefined' && Array.isArray(PAYMENT_METHODS) ? PAYMENT_METHODS : [];
    },

    parse(input, options = {}) {
        input = String(input || '').trim();
        if (!input) return null;

        const amountMatch = this._extractAmount(input);
        if (!amountMatch) return null;

        let descrizione = `${input.slice(0, amountMatch.start)} ${input.slice(amountMatch.end)}`
            .replace(/\beuro\b/gi, '')
            .replace(/\u20ac/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const forcedCategoryInfo = this._extractForcedCategory(descrizione, options);
        descrizione = forcedCategoryInfo.text;

        const tags = [];
        const tagRegex = /#([\w\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]+)/gi;
        let tagMatch;

        while ((tagMatch = tagRegex.exec(descrizione)) !== null) {
            tags.push(tagMatch[1]);
        }

        descrizione = descrizione.replace(tagRegex, '').replace(/\s+/g, ' ').trim();

        const paymentInfo = this._detectPaymentInfo(descrizione.toLowerCase(), options);
        const metodo = paymentInfo.id;

        if (paymentInfo.keyword) {
            descrizione = this._removeKeyword(descrizione, paymentInfo.keyword);
        }

        if (!descrizione) descrizione = 'Spesa';

        descrizione = descrizione.charAt(0).toUpperCase() + descrizione.slice(1);

        return {
            importo: Math.round(amountMatch.value * 100) / 100,
            descrizione,
            categoria: forcedCategoryInfo.category || this._detectCategory(input.toLowerCase(), options),
            metodo,
            data: new Date().toISOString(),
            tags,
            nota: ''
        };
    },

    _extractAmount(input) {
        const text = String(input || '');
        const amountRegex = /(?:\u20ac\s*)?(\d+(?:(?:[.,]\d{3})+)?(?:[.,]\d{1,2})?)(?:\s*(?:\u20ac|euro))?/gi;
        const candidates = [];
        let match;

        while ((match = amountRegex.exec(text)) !== null) {
            const value = this._normalizeAmount(match[1]);

            if (!Number.isFinite(value) || value <= 0) continue;

            candidates.push({
                value,
                start: match.index,
                end: match.index + match[0].length,
                score: this._scoreAmountCandidate(text, match)
            });
        }

        if (candidates.length === 0) return null;

        return candidates.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.start - a.start;
        })[0];
    },

    _normalizeAmount(value) {
        let text = String(value || '').trim().replace(/\s/g, '');
        const lastComma = text.lastIndexOf(',');
        const lastDot = text.lastIndexOf('.');

        if (lastComma !== -1 && lastDot !== -1) {
            if (lastComma > lastDot) {
                text = text.replace(/\./g, '').replace(',', '.');
            } else {
                text = text.replace(/,/g, '');
            }
        } else if (lastComma !== -1 || lastDot !== -1) {
            const separator = lastComma !== -1 ? ',' : '.';
            const parts = text.split(separator);
            const looksLikeThousands = parts.length > 1 &&
                parts[0].length <= 3 &&
                parts.slice(1).every(part => part.length === 3);

            if (looksLikeThousands) {
                text = parts.join('');
            } else if (separator === ',') {
                text = text.replace(',', '.');
            }
        }

        const amount = Number(text);
        return Number.isFinite(amount) ? amount : NaN;
    },

    _scoreAmountCandidate(input, match) {
        const rawAmount = match[1];
        const matchedText = match[0];
        const after = input.slice(match.index + matchedText.length).trim();
        const hasCurrency = /(?:\u20ac|euro)/i.test(matchedText);
        const hasDecimal = /[.,]\d{1,2}$/.test(rawAmount);
        const atEnd = after === '';

        let score = 0;
        if (hasCurrency) score += 100;
        if (hasDecimal) score += 50;
        if (atEnd) score += 30;

        return score;
    },

    _escapeRegExp(value) {
        return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    _keywordRegex(keyword) {
        const pattern = this._escapeRegExp(keyword).replace(/\s+/g, '\\s+');
        return new RegExp('(^|[^A-Za-z0-9À-ÖØ-öø-ÿ_])(' + pattern + ')(?=$|[^A-Za-z0-9À-ÖØ-öø-ÿ_])', 'i');
    },

    _findKeywordMatch(text, keyword) {
        const match = String(text || '').match(this._keywordRegex(keyword));
        if (!match) return null;

        return {
            index: match.index + match[1].length,
            text: match[2]
        };
    },

    _removeKeyword(text, keyword) {
        return String(text || '')
            .replace(this._keywordRegex(keyword), (match, prefix) => prefix)
            .replace(/\s+/g, ' ')
            .trim();
    },

    _normalizeCategoryToken(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    },

    _extractForcedCategory(text, options = {}) {
        const categoryByToken = new Map();

        for (const category of this._getCategories(options)) {
            [category.id, category.nome].forEach(token => {
                const normalized = this._normalizeCategoryToken(token);
                if (normalized) categoryByToken.set(normalized, category.id);
            });
        }

        let category = null;
        const categoryRegex = /\.([A-Za-z0-9\u00c0-\u00d6\u00d8-\u00f6\u00f8-\u00ff_-]+)/g;
        const cleaned = String(text || '').replace(categoryRegex, (match, token) => {
            const matchedCategory = categoryByToken.get(this._normalizeCategoryToken(token));
            if (!matchedCategory) return match;

            category = matchedCategory;
            return ' ';
        });

        return {
            category,
            text: cleaned.replace(/\s+/g, ' ').trim()
        };
    },

    _detectCategory(text, options = {}) {
        const defaultCategoryId = (typeof Catalog !== 'undefined' && Catalog && Catalog.DEFAULT_CATEGORY_ID)
            ? Catalog.DEFAULT_CATEGORY_ID
            : 'altro';
        let firstMatchIndex = -1;
        let matchedCategory = defaultCategoryId;

        for (const cat of this._getCategories(options)) {
            if (cat.id === defaultCategoryId) continue;

            for (const keyword of (cat.keywords || [])) {
                const match = this._findKeywordMatch(text, keyword);
                if (match && (firstMatchIndex === -1 || match.index < firstMatchIndex)) {
                    firstMatchIndex = match.index;
                    matchedCategory = cat.id;
                }
            }
        }

        return matchedCategory;
    },

    _detectPaymentInfo(text, options = {}) {
        const defaultMethodId = (typeof Catalog !== 'undefined' && Catalog && Catalog.DEFAULT_METHOD_ID)
            ? Catalog.DEFAULT_METHOD_ID
            : 'carta';
        const fallbackMethodId = (typeof Catalog !== 'undefined' && Catalog && Catalog.FALLBACK_METHOD_ID)
            ? Catalog.FALLBACK_METHOD_ID
            : 'altro_pag';

        for (const method of this._getPaymentMethods(options)) {
            if (method.id === fallbackMethodId || !method.keywords) continue;

            for (const keyword of method.keywords) {
                const match = this._findKeywordMatch(text, keyword);
                if (match) {
                    return { id: method.id, keyword: keyword };
                }
            }
        }

        return { id: defaultMethodId, keyword: null };
    }
};
