/* ============================================
   SCHEMA NORMALIZER - Validazione e normalizzazione pura dati
   ============================================ */

const SchemaNormalizer = (() => {
    const SCHEMA_VERSION = 1;

    function ok(payload = {}) {
        return { success: true, ...payload };
    }

    function fail(error, code = 'storage-error', payload = {}) {
        return { success: false, error, code, ...payload };
    }

    function defaultSettings() {
        return {
            tema: 'auto',
            valuta: 'EUR',
            simbolo: '\u20ac',
            ultimoBackup: null
        };
    }

    function defaultData(schemaVersion = SCHEMA_VERSION) {
        return {
            schemaVersion,
            spese: [],
            impostazioni: defaultSettings()
        };
    }

    function cleanText(value, fallback) {
        if (value == null) return fallback;
        const text = String(value).trim();
        return text || fallback;
    }

    function cleanTag(value) {
        return String(value || '').replace(/^#/, '').trim();
    }

    function isValidDateParts(year, month, day) {
        if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
        const date = new Date(Date.UTC(year, month - 1, day));
        return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day
        );
    }

    function isValidDate(value) {
        if (value == null || value === '') return false;

        if (typeof value === 'string') {
            const isoParts = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
            if (isoParts && !isValidDateParts(Number(isoParts[1]), Number(isoParts[2]), Number(isoParts[3]))) {
                return false;
            }
        }

        const date = new Date(value);
        return !Number.isNaN(date.getTime());
    }

    function normalizeTags(value) {
        if (!Array.isArray(value)) {
            if (typeof value === 'string' && value.trim()) {
                return value.split('|').map(tag => cleanTag(tag)).filter(Boolean);
            }
            return [];
        }

        const seen = new Set();
        return value
            .map(tag => cleanTag(tag))
            .filter(tag => {
                if (!tag || seen.has(tag)) return false;
                seen.add(tag);
                return true;
            });
    }

    function normalizeRequiredDate(value, fieldName) {
        if (!isValidDate(value)) {
            return fail(`${fieldName} non valida.`, 'invalid-date');
        }
        return ok({ value: new Date(value).toISOString() });
    }

    function normalizeOptionalDate(value, fallback) {
        if (!value || !isValidDate(value)) return fallback;
        return new Date(value).toISOString();
    }

    function normalizeAmount(value) {
        let amount;

        if (typeof value === 'number') {
            amount = value;
        } else if (typeof value === 'string') {
            let text = value.trim();
            text = text.replace(/\s/g, '').replace(/\u20ac/g, '').replace(/euro/gi, '');

            const lastComma = text.lastIndexOf(',');
            const lastDot = text.lastIndexOf('.');

            if (lastComma !== -1 && lastDot !== -1) {
                if (lastComma > lastDot) {
                    text = text.replace(/\./g, '').replace(',', '.');
                } else {
                    text = text.replace(/,/g, '');
                }
            } else if (lastComma !== -1) {
                text = text.replace(',', '.');
            }

            amount = Number(text);
        } else {
            return fail('importo mancante o non numerico.', 'invalid-amount');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return fail('importo non valido.', 'invalid-amount');
        }

        return ok({ value: amount });
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    }

    function uniqueId(used) {
        let id = uid();
        while (used.has(id)) id = uid();
        return id;
    }

    function stableDuplicateId(baseId, used, index) {
        const base = String(baseId || `legacy-${index + 1}`).trim() || `legacy-${index + 1}`;
        let candidate = `${base}-dup-${index + 1}`;
        let counter = 2;

        while (used.has(candidate)) {
            candidate = `${base}-dup-${index + 1}-${counter}`;
            counter += 1;
        }

        return candidate;
    }

    function normalizeSettings(rawSettings = {}) {
        const warnings = [];
        const defaults = defaultSettings();
        const raw = rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)
            ? rawSettings
            : {};

        if (rawSettings && (typeof rawSettings !== 'object' || Array.isArray(rawSettings))) {
            warnings.push('Impostazioni non valide: usati i valori predefiniti.');
        }

        const tema = ['light', 'dark', 'auto'].includes(raw.tema) ? raw.tema : defaults.tema;
        const valuta = typeof raw.valuta === 'string' && raw.valuta.trim()
            ? raw.valuta.trim().slice(0, 12)
            : defaults.valuta;
        const simbolo = typeof raw.simbolo === 'string' && raw.simbolo.trim()
            ? raw.simbolo.trim().slice(0, 8)
            : defaults.simbolo;
        const ultimoBackup = raw.ultimoBackup && isValidDate(raw.ultimoBackup)
            ? new Date(raw.ultimoBackup).toISOString()
            : null;

        return {
            value: { tema, valuta, simbolo, ultimoBackup },
            warnings
        };
    }

    function normalizeSpesa(raw, options = {}) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return fail('record non valido.', 'invalid-expense-record');
        }

        const importo = normalizeAmount(raw.importo);
        if (!importo.success) return importo;

        const date = normalizeRequiredDate(raw.data, 'data');
        if (!date.success) return date;

        const now = new Date().toISOString();
        const creatoIl = normalizeOptionalDate(raw.creatoIl, now);
        const modificatoIl = normalizeOptionalDate(raw.modificatoIl, creatoIl);
        const fallbackId = Number.isInteger(options.index) ? `legacy-${options.index + 1}` : uid();
        const id = typeof raw.id === 'string' && raw.id.trim()
            ? raw.id.trim()
            : fallbackId;

        return ok({
            spesa: {
                id,
                importo: Math.round(importo.value * 100) / 100,
                descrizione: cleanText(raw.descrizione, 'Spesa'),
                categoria: cleanText(raw.categoria, 'altro'),
                metodo: cleanText(raw.metodo, 'carta'),
                data: date.value,
                tags: normalizeTags(raw.tags),
                nota: cleanText(raw.nota, ''),
                creatoIl,
                modificatoIl
            }
        });
    }

    function normalizeData(raw, options = {}) {
        const warnings = [];
        const schemaVersion = options.schemaVersion || SCHEMA_VERSION;

        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return fail('Formato dati non valido: radice JSON non valida.', 'invalid-root');
        }

        const rawVersion = raw.schemaVersion == null ? 1 : Number(raw.schemaVersion);
        if (!Number.isInteger(rawVersion) || rawVersion < 1) {
            return fail('schemaVersion non valido.', 'invalid-schema-version');
        }

        if (rawVersion > schemaVersion) {
            return fail(
                'Backup creato con una versione piu nuova dell app. Aggiorna l app prima di importare.',
                'future-schema-version'
            );
        }

        if (!Array.isArray(raw.spese)) {
            return fail('Formato dati non valido: spese deve essere un array.', 'invalid-expenses');
        }

        const settings = normalizeSettings(raw.impostazioni);
        warnings.push(...settings.warnings);

        const seenIds = new Set();
        const spese = [];

        for (let i = 0; i < raw.spese.length; i++) {
            const normalized = normalizeSpesa(raw.spese[i], { index: i });
            if (!normalized.success) {
                return fail(`Spesa ${i + 1}: ${normalized.error}`, normalized.code || 'invalid-expense', { warnings });
            }

            if (seenIds.has(normalized.spesa.id)) {
                normalized.spesa.id = stableDuplicateId(normalized.spesa.id, seenIds, i);
                warnings.push(`Spesa ${i + 1}: id duplicato rigenerato.`);
            }

            seenIds.add(normalized.spesa.id);
            spese.push(normalized.spesa);
        }

        return ok({
            data: {
                schemaVersion,
                spese,
                impostazioni: settings.value
            },
            warnings
        });
    }

    return {
        SCHEMA_VERSION,
        ok,
        fail,
        defaultSettings,
        defaultData,
        normalizeData,
        normalizeSettings,
        normalizeSpesa,
        normalizeAmount,
        normalizeRequiredDate,
        normalizeOptionalDate,
        normalizeTags,
        cleanText,
        cleanTag,
        isValidDate,
        isValidDateParts,
        uid,
        uniqueId,
        stableDuplicateId
    };
})();
