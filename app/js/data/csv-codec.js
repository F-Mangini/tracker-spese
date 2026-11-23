/* ============================================
   CSV CODEC - Serializzazione e parsing CSV puro
   ============================================ */

import { SchemaNormalizer } from './schema-normalizer.js';

export const CsvCodec = (() => {
    function getNormalizer(options = {}) {
        if (options && options.normalizer) return options.normalizer;
        return typeof SchemaNormalizer !== 'undefined' ? SchemaNormalizer : null;
    }

    function escapeCell(value) {
        const text = String(value == null ? '' : value);
        if (/[",\r\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }

    function serialize(spese) {
        const header = [
            'id',
            'data',
            'ora',
            'importo',
            'descrizione',
            'categoria',
            'metodo',
            'tags',
            'nota',
            'creatoIl',
            'modificatoIl'
        ];

        const rows = (Array.isArray(spese) ? spese : []).map(s => {
            const d = new Date(s.data);
            const data = d.toLocaleDateString('it-IT');
            const ora = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

            return [
                s.id,
                data,
                ora,
                s.importo.toFixed(2),
                s.descrizione || '',
                s.categoria || '',
                s.metodo || '',
                (s.tags || []).join('|'),
                s.nota || '',
                s.creatoIl || '',
                s.modificatoIl || ''
            ].map(value => escapeCell(value)).join(',');
        });

        return { content: header.join(',') + '\n' + rows.join('\n'), count: rows.length };
    }

    function getCell(row, headerMap, name) {
        const index = headerMap[name];
        if (index == null || index >= row.length) return '';
        return String(row[index] || '').trim();
    }

    function normalizeHeader(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '')
            .replace(/_/g, '');
    }

    function countDelimiterOutsideQuotes(line, delimiter) {
        let count = 0;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' && line[i + 1] === '"') {
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                count += 1;
            }
        }

        return count;
    }

    function detectDelimiter(text) {
        const firstLine = text.split(/\r?\n/).find(line => line.trim()) || '';
        const counts = [',', ';', '\t'].map(delimiter => ({
            delimiter,
            count: countDelimiterOutsideQuotes(firstLine, delimiter)
        }));

        counts.sort((a, b) => b.count - a.count);
        return counts[0].count > 0 ? counts[0].delimiter : ',';
    }

    function parseDelimited(text, delimiter) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];

            if (ch === '"' && inQuotes && text[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
                row.push(cell);
                cell = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && text[i + 1] === '\n') i += 1;
                row.push(cell);
                rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += ch;
            }
        }

        row.push(cell);
        rows.push(row);
        return rows;
    }

    function parseDate(dateText, timeText, normalizer = getNormalizer()) {
        const date = String(dateText || '').trim();
        const time = String(timeText || '12:00').trim();

        if (!date) return normalizer.fail('data mancante.', 'invalid-date');

        if (date.includes('T') && normalizer.isValidDate(date)) {
            return normalizer.ok({ value: new Date(date).toISOString() });
        }

        const timeMatch = time.match(/^(\d{1,2}):(\d{2})/);
        const hh = timeMatch ? timeMatch[1].padStart(2, '0') : '12';
        const mm = timeMatch ? timeMatch[2] : '00';

        let isoDate = null;
        const isoMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        const itMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

        if (isoMatch) {
            if (!normalizer.isValidDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))) {
                return normalizer.fail('data non valida.', 'invalid-date');
            }
            isoDate = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}T${hh}:${mm}:00`;
        } else if (itMatch) {
            if (!normalizer.isValidDateParts(Number(itMatch[3]), Number(itMatch[2]), Number(itMatch[1]))) {
                return normalizer.fail('data non valida.', 'invalid-date');
            }
            isoDate = `${itMatch[3]}-${itMatch[2].padStart(2, '0')}-${itMatch[1].padStart(2, '0')}T${hh}:${mm}:00`;
        }

        if (!isoDate || !normalizer.isValidDate(isoDate)) {
            return normalizer.fail('data non valida.', 'invalid-date');
        }

        return normalizer.ok({ value: new Date(isoDate).toISOString() });
    }

    function parseImport(csvString, options = {}) {
        const normalizer = getNormalizer(options);
        const text = String(csvString || '').replace(/^\uFEFF/, '');
        if (!text.trim()) return normalizer.fail('File CSV vuoto.', 'empty-csv');

        const delimiter = detectDelimiter(text);
        const rows = parseDelimited(text, delimiter)
            .filter(row => row.some(cell => String(cell).trim() !== ''));

        if (rows.length < 2) return normalizer.fail('File CSV senza righe dati.', 'empty-csv');

        const headers = rows[0].map(h => normalizeHeader(h));
        const headerMap = {};
        headers.forEach((header, index) => {
            if (header) headerMap[header] = index;
        });

        if (headerMap.importo == null || headerMap.descrizione == null) {
            return normalizer.fail('CSV non valido: servono almeno importo e descrizione.', 'invalid-csv-header');
        }

        const spese = [];
        const warnings = [];
        const now = new Date().toISOString();

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rawDate = getCell(row, headerMap, 'data');
            const rawTime = getCell(row, headerMap, 'ora') || '12:00';
            const date = parseDate(rawDate, rawTime, normalizer);
            if (!date.success) {
                return normalizer.fail(`Riga ${i + 1}: ${date.error}`, date.code || 'invalid-csv-date', { warnings });
            }

            const rawSpesa = {
                id: getCell(row, headerMap, 'id') || normalizer.uid(),
                data: date.value,
                importo: getCell(row, headerMap, 'importo'),
                descrizione: getCell(row, headerMap, 'descrizione') || 'Spesa',
                categoria: getCell(row, headerMap, 'categoria') || 'altro',
                metodo: getCell(row, headerMap, 'metodo') || 'carta',
                tags: getCell(row, headerMap, 'tags'),
                nota: getCell(row, headerMap, 'nota') || '',
                creatoIl: getCell(row, headerMap, 'creatoil') || now,
                modificatoIl: getCell(row, headerMap, 'modificatoil') || now
            };

            const normalized = normalizer.normalizeSpesa(rawSpesa, { index: i - 1 });
            if (!normalized.success) {
                return normalizer.fail(`Riga ${i + 1}: ${normalized.error}`, normalized.code || 'invalid-csv-row', { warnings });
            }

            spese.push(normalized.spesa);
        }

        return normalizer.ok({ spese, warnings });
    }

    return {
        serialize,
        parseImport,
        getCell,
        parseDate,
        detectDelimiter,
        countDelimiterOutsideQuotes,
        parseDelimited,
        normalizeHeader,
        escapeCell
    };
})();
