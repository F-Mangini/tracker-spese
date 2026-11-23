/* ============================================
   STORAGE - Gestione dati in localStorage
   ============================================ */

import { SchemaNormalizer } from './schema-normalizer.js';
import { CsvCodec } from './csv-codec.js';

export function createStorage(runtimeOptions = {}) {
    const resolvedKey = runtimeOptions.key || (
        typeof globalThis !== 'undefined' &&
        globalThis.window &&
        globalThis.window.SPESA_TRACKER_CONFIG &&
        globalThis.window.SPESA_TRACKER_CONFIG.storageKey
    ) || (
        typeof globalThis !== 'undefined' &&
        globalThis.SPESA_TRACKER_CONFIG &&
        globalThis.SPESA_TRACKER_CONFIG.storageKey
    ) || 'spesa-tracker-data';

    return {
        SCHEMA_VERSION: 1,

        KEY: resolvedKey,

        _lastStatus: { ok: true, error: null, warnings: [] },

        _getLocalStorage() {
            if (runtimeOptions.localStorage) return runtimeOptions.localStorage;
            if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
                return globalThis.localStorage;
            }
            return null;
        },

    /* --- Struttura dati predefinita --- */
    _defaultSettings() {
        return SchemaNormalizer.defaultSettings();
    },

    _defaultData() {
        return SchemaNormalizer.defaultData(this.SCHEMA_VERSION);
    },

    _snapshotKey() {
        return `${this.KEY}:snapshot`;
    },

    _readSnapshot() {
        let raw = '';

        try {
            raw = this._getLocalStorage().getItem(this._snapshotKey());
        } catch (e) {
            return this._fail('Snapshot locale non leggibile.', 'snapshot-read-failed', { cause: e });
        }

        if (!raw) {
            return this._fail('Nessuno snapshot locale disponibile.', 'snapshot-missing');
        }

        let snapshot;
        try {
            snapshot = JSON.parse(raw);
        } catch (e) {
            return this._fail('Snapshot locale non leggibile.', 'snapshot-corrupt', { raw, cause: e });
        }

        if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
            return this._fail('Snapshot locale non valido.', 'snapshot-invalid', { raw });
        }

        const data = snapshot.data;
        if (data && typeof data === 'object' && !Array.isArray(data) && typeof data.raw === 'string') {
            return this._ok({
                snapshot,
                raw,
                rawData: data.raw,
                hasRawData: true,
                count: null
            });
        }

        const normalized = this._normalizeData(data, { source: 'snapshot' });
        if (!normalized.success) {
            return this._fail(
                normalized.error,
                normalized.code || 'invalid-snapshot-data',
                { raw, warnings: normalized.warnings || [] }
            );
        }

        return this._ok({
            snapshot,
            raw,
            data: normalized.data,
            hasRawData: false,
            count: normalized.data.spese.length,
            warnings: normalized.warnings || []
        });
    },

    /* --- Risultati espliciti --- */
    _ok(payload = {}) {
        return SchemaNormalizer.ok(payload);
    },

    _fail(error, code = 'storage-error', payload = {}) {
        return SchemaNormalizer.fail(error, code, payload);
    },

    _setStatus(result) {
        this._lastStatus = {
            ok: !!result.success,
            error: result.success ? null : result.error,
            code: result.code || null,
            warnings: result.warnings || []
        };
    },

    getStatus() {
        const result = this._readStoredData();
        return {
            ok: result.success,
            error: result.success ? null : result.error,
            code: result.code || null,
            warnings: result.warnings || [],
            storageKey: this.KEY,
            snapshotKey: this._snapshotKey(),
            schemaVersion: this.SCHEMA_VERSION
        };
    },

    getSnapshotInfo() {
        const result = this._readSnapshot();

        if (result.code === 'snapshot-missing') {
            return { exists: false };
        }

        if (!result.success) {
            return {
                exists: true,
                readable: false,
                error: result.error,
                code: result.code || 'snapshot-error'
            };
        }

        return {
            exists: true,
            readable: true,
            creatoIl: result.snapshot.creatoIl || null,
            reason: result.snapshot.reason || '',
            count: result.count,
            hasRawData: !!result.hasRawData,
            schemaVersion: result.snapshot.schemaVersion || null,
            warnings: result.warnings || []
        };
    },

    getRawData() {
        try {
            return this._getLocalStorage().getItem(this.KEY) || '';
        } catch (_) {
            return '';
        }
    },

    exportRaw() {
        const raw = this.getRawData();
        if (!raw) {
            return this._fail('Non ci sono dati grezzi da esportare.', 'empty-raw');
        }
        return this._ok({ content: raw });
    },

    /* --- Lettura / Scrittura --- */
    _readStoredData() {
        let raw = '';

        try {
            raw = this._getLocalStorage().getItem(this.KEY);
        } catch (e) {
            const result = this._fail('localStorage non leggibile.', 'read-failed', { cause: e });
            this._setStatus(result);
            return result;
        }

        if (!raw) {
            const result = this._ok({ data: this._defaultData(), warnings: [] });
            this._setStatus(result);
            return result;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            const result = this._fail(
                'I dati locali non sono JSON leggibile. Esporta i dati grezzi prima di salvare.',
                'corrupt-json',
                { raw, cause: e }
            );
            this._setStatus(result);
            return result;
        }

        const normalized = this._normalizeData(parsed, { source: 'storage' });
        if (!normalized.success) {
            const result = this._fail(
                normalized.error,
                normalized.code || 'invalid-storage-data',
                { raw, warnings: normalized.warnings || [] }
            );
            this._setStatus(result);
            return result;
        }

        this._setStatus(normalized);
        return normalized;
    },

    _load() {
        const result = this._readStoredData();
        return result.success ? result.data : this._defaultData();
    },

    _loadForWrite() {
        const result = this._readStoredData();
        if (!result.success) {
            return this._fail(
                'Salvataggio bloccato: i dati locali non sono leggibili. Esporta i dati grezzi prima di continuare.',
                result.code || 'write-blocked',
                { raw: result.raw || this.getRawData() }
            );
        }
        return result;
    },

    _save(data) {
        const normalized = this._normalizeData(data, { source: 'save' });
        if (!normalized.success) {
            this._setStatus(normalized);
            return normalized;
        }

        try {
            this._getLocalStorage().setItem(this.KEY, JSON.stringify(normalized.data));
            this._setStatus(normalized);
            return this._ok({ data: normalized.data, warnings: normalized.warnings || [] });
        } catch (e) {
            const result = this._fail(
                'Errore nel salvataggio. Lo spazio del browser potrebbe essere esaurito: esporta i dati.',
                'save-failed',
                { cause: e }
            );
            this._setStatus(result);
            return result;
        }
    },

    _saveSnapshot(data, reason) {
        const snapshot = {
            schemaVersion: this.SCHEMA_VERSION,
            creatoIl: new Date().toISOString(),
            reason,
            data
        };

        try {
            this._getLocalStorage().setItem(this._snapshotKey(), JSON.stringify(snapshot));
            return this._ok();
        } catch (e) {
            return this._fail(
                'Non sono riuscito a creare uno snapshot locale. Esporta manualmente prima di sostituire o cancellare i dati.',
                'snapshot-failed',
                { cause: e }
            );
        }
    },

    _saveCurrentSnapshot(reason) {
        const current = this._readStoredData();
        if (current.success) {
            return this._saveSnapshot(current.data, reason);
        }

        const raw = this.getRawData();
        if (raw) {
            return this._saveSnapshot({ raw }, `${reason}-raw`);
        }

        return this._ok();
    },

    createSnapshot(reason = 'manual') {
        return this._saveCurrentSnapshot(reason);
    },

    /* --- CRUD Spese --- */
    getSpese() {
        return this._clone(this._load().spese);
    },

    addSpesa(spesa) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const now = new Date().toISOString();
        const normalized = this._normalizeSpesa(
            {
                ...spesa,
                id: this._uid(),
                creatoIl: now,
                modificatoIl: now
            },
            { index: 0 }
        );

        if (!normalized.success) return normalized;

        const data = current.data;
        data.spese.unshift(normalized.spesa);

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ spesa: normalized.spesa, warnings: saved.warnings || [] });
    },

    updateSpesa(id, updates) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const i = data.spese.findIndex(s => s.id === id);
        if (i === -1) return this._fail('Spesa non trovata.', 'expense-not-found');

        const normalized = this._normalizeSpesa(
            {
                ...data.spese[i],
                ...updates,
                id: data.spese[i].id,
                creatoIl: data.spese[i].creatoIl,
                modificatoIl: new Date().toISOString()
            },
            { index: i }
        );

        if (!normalized.success) return normalized;

        data.spese[i] = normalized.spesa;

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ spesa: normalized.spesa, warnings: saved.warnings || [] });
    },

    deleteSpesa(id) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const initialCount = data.spese.length;
        data.spese = data.spese.filter(s => s.id !== id);

        if (data.spese.length === initialCount) {
            return this._fail('Spesa non trovata.', 'expense-not-found');
        }

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ count: initialCount - data.spese.length, warnings: saved.warnings || [] });
    },

    deleteSpese(ids, options = {}) {
        const idSet = new Set(
            (Array.isArray(ids) ? ids : [])
                .map(id => String(id || '').trim())
                .filter(Boolean)
        );

        if (idSet.size === 0) {
            return this._fail('Nessuna spesa selezionata.', 'empty-selection');
        }

        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const initialCount = data.spese.length;
        const nextSpese = data.spese.filter(spesa => !idSet.has(spesa.id));
        const deletedCount = initialCount - nextSpese.length;

        if (deletedCount === 0) {
            return this._fail('Nessuna spesa selezionata trovata.', 'selection-not-found');
        }

        if (options.createSnapshot !== false) {
            const snapshot = this._saveSnapshot(data, 'bulk-delete');
            if (!snapshot.success) return snapshot;
        }

        data.spese = nextSpese;

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ count: deletedCount, warnings: saved.warnings || [] });
    },

    /* --- Impostazioni --- */
    getSettings() {
        return this._clone(this._load().impostazioni);
    },

    updateSettings(updates) {
        const current = this._loadForWrite();
        if (!current.success) return current;

        const data = current.data;
        const settings = this._normalizeSettings({ ...data.impostazioni, ...updates });
        data.impostazioni = settings.value;

        const saved = this._save(data);
        if (!saved.success) return saved;

        return this._ok({ impostazioni: data.impostazioni, warnings: settings.warnings.concat(saved.warnings || []) });
    },

    /* --- Export --- */
    _resolveExportData(options = {}) {
        const current = this._readStoredData();
        if (!current.success) return current;

        if (!Array.isArray(options.spese)) {
            return current;
        }

        return this._normalizeData({
            schemaVersion: this.SCHEMA_VERSION,
            spese: options.spese,
            impostazioni: current.data.impostazioni
        }, { source: 'export' });
    },

    _serializeCSV(spese) {
        return CsvCodec.serialize(spese);
    },

    exportCSV(options = {}) {
        const current = this._resolveExportData(options);
        if (!current.success) return current;

        return this._ok(this._serializeCSV(current.data.spese));
    },

    exportJSON(options = {}) {
        const current = this._resolveExportData(options);
        if (!current.success) return current;

        const includeSettings = options.includeSettings !== false;
        const includePersonalizzazioni = options.includePersonalizzazioni === true;
        const data = {
            schemaVersion: this.SCHEMA_VERSION,
            spese: options.includeData === false ? [] : current.data.spese
        };

        if (includeSettings) {
            data.impostazioni = current.data.impostazioni;
        }

        if (includePersonalizzazioni) {
            data.personalizzazioni = {};
        }

        return this._ok({
            content: JSON.stringify(data, null, 2),
            count: data.spese.length
        });
    },

    /* --- Import preview / commit --- */
    previewImportJSON(jsonString) {
        let parsed;

        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            return this._fail('JSON non leggibile.', 'invalid-json', { cause: e });
        }

        const normalized = this._normalizeData(parsed, { source: 'json' });
        if (!normalized.success) return normalized;

        return this._ok({
            format: 'json',
            data: normalized.data,
            count: normalized.data.spese.length,
            settingsIncluded: !!parsed.impostazioni,
            warnings: normalized.warnings || []
        });
    },

    previewImportCSV(csvString) {
        const parsed = this._parseCSVImport(csvString);
        if (!parsed.success) return parsed;

        return this._ok({
            format: 'csv',
            data: {
                schemaVersion: this.SCHEMA_VERSION,
                spese: parsed.spese,
                impostazioni: this._defaultSettings()
            },
            count: parsed.spese.length,
            settingsIncluded: false,
            warnings: parsed.warnings || []
        });
    },

    importJSON(jsonString, options = {}) {
        const preview = this.previewImportJSON(jsonString);
        if (!preview.success) return preview;
        return this._commitImport(preview, {
            mode: options.mode || 'replace',
            source: 'json'
        });
    },

    importCSV(csvString, options = {}) {
        const preview = this.previewImportCSV(csvString);
        if (!preview.success) return preview;
        return this._commitImport(preview, {
            mode: options.mode || 'append',
            source: 'csv'
        });
    },

    _commitImport(preview, options) {
        const mode = options.mode === 'replace' ? 'replace' : 'append';
        const current = this._loadForWrite();
        if (!current.success) return current;

        const warnings = [...(preview.warnings || [])];
        const data = current.data;
        const existingIds = mode === 'append' ? new Set(data.spese.map(s => s.id)) : new Set();
        const prepared = this._prepareImportedSpese(preview.data.spese, existingIds);
        warnings.push(...prepared.warnings);
        const snapshot = this._saveSnapshot(data, `${options.source}-${mode}`);
        if (!snapshot.success) return snapshot;

        let nextData;
        if (mode === 'replace') {
            nextData = {
                schemaVersion: this.SCHEMA_VERSION,
                spese: prepared.spese,
                impostazioni: options.source === 'json'
                    ? preview.data.impostazioni
                    : data.impostazioni
            };
        } else {
            if (options.source === 'json' && preview.settingsIncluded) {
                warnings.push('Le impostazioni del backup JSON sono state ignorate in modalita aggiungi.');
            }

            nextData = {
                ...data,
                spese: [...prepared.spese, ...data.spese]
            };
        }

        const saved = this._save(nextData);
        if (!saved.success) return saved;

        return this._ok({
            count: prepared.spese.length,
            mode,
            regeneratedIds: prepared.regeneratedIds,
            warnings: warnings.concat(saved.warnings || [])
        });
    },

    _prepareImportedSpese(spese, existingIds) {
        const seen = new Set(existingIds);
        const prepared = [];
        const warnings = [];
        let regeneratedIds = 0;

        spese.forEach(spesa => {
            const next = { ...spesa };
            if (!next.id || seen.has(next.id)) {
                next.id = this._uniqueId(seen);
                regeneratedIds += 1;
            }
            seen.add(next.id);
            prepared.push(next);
        });

        if (regeneratedIds > 0) {
            warnings.push(`${regeneratedIds} id duplicati o mancanti sono stati rigenerati.`);
        }

        return { spese: prepared, regeneratedIds, warnings };
    },

    /* --- Utility distruttive --- */
    restoreSnapshot() {
        const snapshot = this._readSnapshot();
        if (!snapshot.success) return snapshot;

        const currentSnapshot = this._saveCurrentSnapshot('restore-before');
        if (!currentSnapshot.success) return currentSnapshot;

        try {
            if (snapshot.hasRawData) {
                this._getLocalStorage().setItem(this.KEY, snapshot.rawData);
                this._setStatus(this._readStoredData());
                return this._ok({ restoredRaw: true, count: null });
            }

            this._getLocalStorage().setItem(this.KEY, JSON.stringify(snapshot.data));
            this._setStatus(this._ok({ data: snapshot.data, warnings: snapshot.warnings || [] }));
            return this._ok({
                restoredRaw: false,
                count: snapshot.data.spese.length,
                warnings: snapshot.warnings || []
            });
        } catch (e) {
            const result = this._fail(
                'Ripristino non riuscito. Lo spazio del browser potrebbe essere esaurito.',
                'snapshot-restore-failed',
                { cause: e }
            );
            this._setStatus(result);
            return result;
        }
    },

    clearAll(options = {}) {
        const createSnapshot = options.createSnapshot !== false;
        const clearSnapshot = options.clearSnapshot === true;

        if (createSnapshot) {
            const snapshot = this._saveCurrentSnapshot('clear-all');
            if (!snapshot.success) return snapshot;
        }

        try {
            this._getLocalStorage().removeItem(this.KEY);
            if (clearSnapshot) {
                this._getLocalStorage().removeItem(this._snapshotKey());
            }
            this._setStatus(this._ok({ data: this._defaultData(), warnings: [] }));
            return this._ok();
        } catch (e) {
            return this._fail('Non sono riuscito a cancellare i dati locali.', 'clear-failed', { cause: e });
        }
    },

    getStorageSizeKB() {
        const raw = this.getRawData();
        return (raw.length * 2) / 1024;
    },

    isAvailable() {
        try {
            const t = '__test__';
            this._getLocalStorage().setItem(t, t);
            this._getLocalStorage().removeItem(t);
            return true;
        } catch (e) {
            return false;
        }
    },

    /* --- Normalizzazione dati --- */
    _normalizeData(raw, options = {}) {
        return SchemaNormalizer.normalizeData(raw, {
            schemaVersion: this.SCHEMA_VERSION,
            ...options
        });
    },

    _normalizeSettings(rawSettings = {}) {
        return SchemaNormalizer.normalizeSettings(rawSettings);
    },

    _normalizeSpesa(raw, options = {}) {
        return SchemaNormalizer.normalizeSpesa(raw, options);
    },

    /* --- CSV --- */
    _parseCSVImport(csvString) {
        return CsvCodec.parseImport(csvString, { normalizer: SchemaNormalizer });
    },

    /* --- Utility --- */
    _clone(value) {
        return JSON.parse(JSON.stringify(value));
    },

    _uniqueId(used) {
        return SchemaNormalizer.uniqueId(used);
    },

    _stableDuplicateId(baseId, used, index) {
        return SchemaNormalizer.stableDuplicateId(baseId, used, index);
    },

    _uid() {
        return SchemaNormalizer.uid();
    }
    };
}

export const Storage = createStorage();
