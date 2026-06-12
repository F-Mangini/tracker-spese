/* ============================================
   PARSER - Interpreta input in linguaggio naturale
   ============================================ */

const Parser = {
    parse(input) {
        input = String(input || '').trim();
        if (!input) return null;

        const amountMatch = this._extractAmount(input);
        if (!amountMatch) return null;

        let descrizione = `${input.slice(0, amountMatch.start)} ${input.slice(amountMatch.end)}`
            .replace(/\beuro\b/gi, '')
            .replace(/\u20ac/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const tags = [];
        const tagRegex = /#([\w\u00e0\u00e8\u00e9\u00ec\u00f2\u00f9]+)/gi;
        let tagMatch;

        while ((tagMatch = tagRegex.exec(descrizione)) !== null) {
            tags.push(tagMatch[1]);
        }

        descrizione = descrizione.replace(tagRegex, '').replace(/\s+/g, ' ').trim();

        const paymentInfo = this._detectPaymentInfo(descrizione.toLowerCase());
        const metodo = paymentInfo.id;

        if (paymentInfo.keyword) {
            descrizione = this._removeKeyword(descrizione, paymentInfo.keyword);
        }

        if (!descrizione) descrizione = 'Spesa';

        descrizione = descrizione.charAt(0).toUpperCase() + descrizione.slice(1);

        return {
            importo: Math.round(amountMatch.value * 100) / 100,
            descrizione,
            categoria: this._detectCategory(input.toLowerCase()),
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

    _detectCategory(text) {
        let firstMatchIndex = -1;
        let matchedCategory = 'altro';

        for (const cat of CATEGORIES) {
            if (cat.id === 'altro') continue;

            for (const keyword of cat.keywords) {
                const match = this._findKeywordMatch(text, keyword);
                if (match && (firstMatchIndex === -1 || match.index < firstMatchIndex)) {
                    firstMatchIndex = match.index;
                    matchedCategory = cat.id;
                }
            }
        }

        return matchedCategory;
    },

    _detectPaymentInfo(text) {
        for (const method of PAYMENT_METHODS) {
            if (method.id === 'altro_pag' || !method.keywords) continue;

            for (const keyword of method.keywords) {
                const match = this._findKeywordMatch(text, keyword);
                if (match) {
                    return { id: method.id, keyword: keyword };
                }
            }
        }

        return { id: 'carta', keyword: null };
    }
};
