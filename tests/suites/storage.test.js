import {
    assert,
    loadStorage,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Storage aggiunge e normalizza una spesa prima del salvataggio', () => {
        const { Storage } = loadStorage();

        const result = Storage.addSpesa({
            importo: '1,50',
            descrizione: 'Caffe',
            categoria: 'bar',
            metodo: 'carta',
            data: '2026-05-16T10:00:00.000Z',
            tags: ['#colazione', 'colazione'],
            nota: ''
        });

        assert.equal(result.success, true);
        assert.equal(result.spesa.importo, 1.5);
        assert.deepEqual(result.spesa.tags, ['colazione']);

        const exported = Storage.exportJSON();
        assert.equal(exported.success, true);

        const data = JSON.parse(exported.content);
        assert.equal(data.schemaVersion, 1);
        assert.equal(data.spese.length, 1);
    });

    test('Storage blocca i salvataggi se il JSON locale e corrotto', () => {
        const { Storage, localStorage } = loadStorage();
        localStorage.setItem(Storage.KEY, '{"spese":');

        const result = Storage.addSpesa(expense({ id: undefined }));

        assert.equal(result.success, false);
        assert.equal(localStorage.getItem(Storage.KEY), '{"spese":');

        const raw = Storage.exportRaw();
        assert.equal(raw.success, true);
        assert.equal(raw.content, '{"spese":');
    });

    test('Import JSON in aggiunta rigenera id duplicati e conserva le impostazioni attuali', () => {
        const { Storage, localStorage } = loadStorage();
        const current = {
            schemaVersion: 1,
            spese: [expense({ id: 'same-id', descrizione: 'Esistente' })],
            impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
        };
        const backup = {
            schemaVersion: 1,
            spese: [expense({ id: 'same-id', descrizione: 'Importata' })],
            impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
        };

        localStorage.setItem(Storage.KEY, JSON.stringify(current));

        const result = Storage.importJSON(JSON.stringify(backup), { mode: 'append' });

        assert.equal(result.success, true);
        assert.equal(result.regeneratedIds, 1);

        const saved = JSON.parse(localStorage.getItem(Storage.KEY));
        const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

        assert.equal(saved.spese.length, 2);
        assert.equal(saved.spese[0].descrizione, 'Importata');
        assert.notEqual(saved.spese[0].id, 'same-id');
        assert.equal(saved.impostazioni.tema, 'dark');
        assert.equal(snapshot.reason, 'json-append');
        assert.equal(snapshot.data.spese[0].id, 'same-id');
    });

    test('Import JSON in sostituzione crea snapshot e importa le impostazioni del backup', () => {
        const { Storage, localStorage } = loadStorage();
        const current = {
            schemaVersion: 1,
            spese: [expense({ id: 'old-id', descrizione: 'Vecchia' })],
            impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
        };
        const backup = {
            schemaVersion: 1,
            spese: [expense({ id: 'new-id', descrizione: 'Nuova' })],
            impostazioni: { tema: 'light', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
        };

        localStorage.setItem(Storage.KEY, JSON.stringify(current));

        const result = Storage.importJSON(JSON.stringify(backup), { mode: 'replace' });

        assert.equal(result.success, true);

        const saved = JSON.parse(localStorage.getItem(Storage.KEY));
        const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

        assert.equal(saved.spese.length, 1);
        assert.equal(saved.spese[0].id, 'new-id');
        assert.equal(saved.impostazioni.tema, 'light');
        assert.equal(snapshot.reason, 'json-replace');
        assert.equal(snapshot.data.spese[0].id, 'old-id');
    });

    test('Storage ripristina lo snapshot e conserva undo dei dati correnti', () => {
        const { Storage, localStorage } = loadStorage();
        const current = {
            schemaVersion: 1,
            spese: [expense({ id: 'current-id', descrizione: 'Corrente' })],
            impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
        };
        const snapshotData = {
            schemaVersion: 1,
            spese: [expense({ id: 'snapshot-id', descrizione: 'Snapshot' })],
            impostazioni: { tema: 'light', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
        };
        const snapshot = {
            schemaVersion: 1,
            creatoIl: '2026-05-20T12:30:00.000Z',
            reason: 'clear-all',
            data: snapshotData
        };

        localStorage.setItem(Storage.KEY, JSON.stringify(current));
        localStorage.setItem(`${Storage.KEY}:snapshot`, JSON.stringify(snapshot));

        const info = Storage.getSnapshotInfo();
        const result = Storage.restoreSnapshot();

        assert.equal(info.exists, true);
        assert.equal(info.readable, true);
        assert.equal(info.count, 1);
        assert.equal(result.success, true);
        assert.equal(result.count, 1);

        const saved = JSON.parse(localStorage.getItem(Storage.KEY));
        const undoSnapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

        assert.equal(saved.spese[0].id, 'snapshot-id');
        assert.equal(saved.impostazioni.tema, 'light');
        assert.equal(undoSnapshot.reason, 'restore-before');
        assert.equal(undoSnapshot.data.spese[0].id, 'current-id');
    });

    test('Storage cancellazione completa puo eliminare anche lo snapshot locale', () => {
        const { Storage, localStorage } = loadStorage();
        const current = {
            schemaVersion: 1,
            spese: [expense({ id: 'current-id' })],
            impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: 'â‚¬', ultimoBackup: null }
        };

        localStorage.setItem(Storage.KEY, JSON.stringify(current));
        localStorage.setItem(`${Storage.KEY}:snapshot`, JSON.stringify({
            schemaVersion: 1,
            creatoIl: '2026-05-20T12:30:00.000Z',
            reason: 'clear-all',
            data: current
        }));

        const result = Storage.clearAll({
            createSnapshot: false,
            clearSnapshot: true
        });

        assert.equal(result.success, true);
        assert.equal(localStorage.getItem(Storage.KEY), null);
        assert.equal(localStorage.getItem(`${Storage.KEY}:snapshot`), null);
    });

    test('Storage esporta subset e cancella selezione multipla con snapshot', () => {
        const { Storage, localStorage } = loadStorage();
        const current = {
            schemaVersion: 1,
            spese: [
                expense({ id: 'a', descrizione: 'A', importo: 2 }),
                expense({ id: 'b', descrizione: 'B', importo: 3 }),
                expense({ id: 'c', descrizione: 'C', importo: 4 })
            ],
            impostazioni: { tema: 'dark', valuta: 'EUR', simbolo: '€', ultimoBackup: null }
        };

        localStorage.setItem(Storage.KEY, JSON.stringify(current));

        const json = Storage.exportJSON({ spese: [current.spese[1]] });
        const jsonDataOnly = Storage.exportJSON({
            spese: [current.spese[1]],
            includeSettings: false,
            includePersonalizzazioni: true
        });
        const csv = Storage.exportCSV({ spese: [current.spese[0], current.spese[2]] });
        const deleted = Storage.deleteSpese(['a', 'c']);

        assert.equal(json.success, true);
        assert.equal(JSON.parse(json.content).spese.length, 1);
        assert.equal(JSON.parse(json.content).spese[0].id, 'b');
        assert.equal(JSON.parse(json.content).impostazioni.tema, 'dark');
        assert.equal(JSON.parse(jsonDataOnly.content).spese[0].id, 'b');
        assert.equal(JSON.parse(jsonDataOnly.content).impostazioni, undefined);
        assert.deepEqual(JSON.parse(jsonDataOnly.content).personalizzazioni, {});
        assert.equal(csv.success, true);
        assert(csv.content.includes('\na,'));
        assert(csv.content.includes('\nc,'));
        assert(!csv.content.includes('\nb,'));
        assert.equal(deleted.success, true);
        assert.equal(deleted.count, 2);

        const saved = JSON.parse(localStorage.getItem(Storage.KEY));
        const snapshot = JSON.parse(localStorage.getItem(`${Storage.KEY}:snapshot`));

        assert.deepEqual(saved.spese.map(item => item.id), ['b']);
        assert.equal(snapshot.reason, 'bulk-delete');
        assert.deepEqual(snapshot.data.spese.map(item => item.id), ['a', 'b', 'c']);
        assert.equal(Storage.deleteSpese([]).success, false);
    });

    test('Import CSV valida decimali italiani, delimiter punto e virgola e campi quotati', () => {
        const { Storage } = loadStorage();
        const csv = [
            'data;ora;importo;descrizione;categoria;metodo;tags;nota',
            '16/05/2026;09:30;1,50;"Caffe, brioche";bar;carta;"colazione|lavoro";"nota su due',
            'righe"'
        ].join('\n');

        const preview = Storage.previewImportCSV(csv);

        assert.equal(preview.success, true);
        assert.equal(preview.count, 1);
        assert.equal(preview.data.spese[0].importo, 1.5);
        assert.equal(preview.data.spese[0].descrizione, 'Caffe, brioche');
        assert.deepEqual(preview.data.spese[0].tags, ['colazione', 'lavoro']);
        assert.equal(preview.data.spese[0].nota, 'nota su due\nrighe');
    });

    test('Import CSV rifiuta date impossibili invece di normalizzarle', () => {
        const { Storage } = loadStorage();
        const csv = [
            'data,ora,importo,descrizione,categoria,metodo',
            '31/02/2026,09:30,1.50,Caffe,bar,carta'
        ].join('\n');

        const preview = Storage.previewImportCSV(csv);

        assert.equal(preview.success, false);
        assert.equal(preview.code, 'invalid-date');
    });

    test('SchemaNormalizer normalizza dati, impostazioni, spese e id duplicati senza localStorage', () => {
        const { SchemaNormalizer } = loadStorage();

        const normalized = SchemaNormalizer.normalizeData({
            spese: [
                {
                    id: 'dup-1',
                    importo: '€ 12,50',
                    descrizione: '  Pranzo  ',
                    categoria: 'ristorante',
                    metodo: 'carta',
                    data: '2026-05-16T12:30:00.000Z',
                    tags: ['#lavoro', 'lavoro', 'trasferta']
                },
                {
                    id: 'dup-1',
                    importo: 4,
                    descrizione: '',
                    data: '2026-05-16T15:00:00.000Z',
                    tags: 'pausa|citta'
                }
            ],
            impostazioni: { tema: 'invalid', valuta: 'USD', simbolo: '$' }
        });

        assert.equal(normalized.success, true);
        assert.equal(normalized.data.schemaVersion, 1);
        assert.equal(normalized.data.impostazioni.tema, 'auto');
        assert.equal(normalized.data.impostazioni.valuta, 'USD');
        assert.equal(normalized.data.spese[0].importo, 12.5);
        assert.equal(normalized.data.spese[0].descrizione, 'Pranzo');
        assert.deepEqual(normalized.data.spese[0].tags, ['lavoro', 'trasferta']);
        assert.equal(normalized.data.spese[1].descrizione, 'Spesa');
        assert.deepEqual(normalized.data.spese[1].tags, ['pausa', 'citta']);
        assert.notEqual(normalized.data.spese[1].id, 'dup-1');
        assert(normalized.warnings.some(w => w.includes('id duplicato rigenerato')));

        const future = SchemaNormalizer.normalizeData({ schemaVersion: 99, spese: [] });
        assert.equal(future.success, false);
        assert.equal(future.code, 'future-schema-version');
    });

    test('CsvCodec serializza e reimporta spese senza localStorage', () => {
        const { CsvCodec, SchemaNormalizer } = loadStorage();
        const original = [
            expense({
                id: 'csv-1',
                importo: 18.75,
                descrizione: 'Pizza, birra',
                categoria: 'ristorante',
                metodo: 'contanti',
                data: '2026-05-16T19:30:00.000Z',
                tags: ['amici', 'sabato'],
                nota: 'Tavolo "fuori"\ncon vista'
            })
        ];

        const serialized = CsvCodec.serialize(original);
        assert.equal(serialized.count, 1);
        assert(serialized.content.includes('"Pizza, birra"'));

        const imported = CsvCodec.parseImport(serialized.content, { normalizer: SchemaNormalizer });
        assert.equal(imported.success, true);
        assert.equal(imported.spese.length, 1);
        assert.equal(imported.spese[0].id, 'csv-1');
        assert.equal(imported.spese[0].importo, 18.75);
        assert.equal(imported.spese[0].descrizione, 'Pizza, birra');
        assert.deepEqual(imported.spese[0].tags, ['amici', 'sabato']);
        assert.equal(imported.spese[0].nota, 'Tavolo "fuori"\ncon vista');
    });
};
