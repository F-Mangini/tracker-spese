/* ============================================
   SETTINGS ACTIONS - decisioni pure impostazioni
   ============================================ */

const SettingsActions = (() => {
    function detectImportFormat(file = {}) {
        const fileName = String(file.name || '').toLowerCase();
        const fileType = String(file.type || '').toLowerCase();

        if (fileName.endsWith('.json') || fileType.includes('json')) {
            return 'json';
        }

        if (
            fileName.endsWith('.csv') ||
            fileType.includes('csv') ||
            fileType.includes('comma-separated-values')
        ) {
            return 'csv';
        }

        return null;
    }

    function getExportChoices() {
        return [
            { text: 'Annulla', className: 'btn-secondary' },
            { text: 'JSON backup', className: 'btn-primary', format: 'json' },
            { text: 'CSV tabella', className: 'btn-secondary', format: 'csv' }
        ];
    }

    function getImportChoices(hasSpese) {
        const choices = [{ text: 'Annulla', className: 'btn-secondary' }];

        if (hasSpese) {
            choices.push(
                { text: 'Aggiungi', className: 'btn-primary', mode: 'append' },
                { text: 'Sostituisci', className: 'btn-warning', mode: 'replace' }
            );
        } else {
            choices.push({ text: 'Importa', className: 'btn-primary', mode: 'replace' });
        }

        return choices;
    }

    function getExportDownloadSpec(format, content, dateStamp) {
        if (format === 'json') {
            return {
                content,
                filename: `spese_backup_${dateStamp}.json`,
                mime: 'application/json',
                toast: 'Download JSON avviato...'
            };
        }

        return {
            content: '\uFEFF' + content,
            filename: `spese_${dateStamp}.csv`,
            mime: 'text/csv;charset=utf-8',
            toast: 'Download CSV avviato...'
        };
    }

    function getRawDownloadSpec(content, dateStamp) {
        return {
            content,
            filename: `spese_raw_${dateStamp}.txt`,
            mime: 'text/plain;charset=utf-8',
            toast: 'Download dati grezzi avviato...'
        };
    }

    function getImportSuccessMessage(result = {}, mode) {
        const suffix = result.regeneratedIds
            ? `, ${result.regeneratedIds} id rigenerati`
            : '';
        const modeLabel = mode === 'replace' ? 'sostituite' : 'aggiunte';

        return `${Number(result.count || 0)} spese ${modeLabel}${suffix} \u2713`;
    }

    function fail(error, code) {
        return {
            success: false,
            error,
            code
        };
    }

    function previewImportFile(options = {}) {
        const { file, content, storage } = options;
        const format = detectImportFormat(file);

        if (format === 'json') {
            return storage.previewImportJSON(content);
        }

        if (format === 'csv') {
            return storage.previewImportCSV(content);
        }

        return fail('Usa .json o .csv', 'unsupported-import-format');
    }

    function buildExportDownload(options = {}) {
        const { format, storage, dateStamp } = options;

        let result;
        if (format === 'json') {
            result = storage.exportJSON();
        } else if (format === 'csv') {
            result = storage.exportCSV();
        } else {
            return fail('Formato export non valido', 'unsupported-export-format');
        }

        if (!result.success) return result;

        return {
            success: true,
            download: getExportDownloadSpec(format, result.content, dateStamp)
        };
    }

    function buildRawDownload(options = {}) {
        const { storage, dateStamp } = options;
        const result = storage.exportRaw();

        if (!result.success) return result;

        return {
            success: true,
            download: getRawDownloadSpec(result.content, dateStamp)
        };
    }

    function commitImport(options = {}) {
        const { preview = {}, content, mode, storage } = options;
        const result = preview.format === 'json'
            ? storage.importJSON(content, { mode })
            : storage.importCSV(content, { mode });

        if (!result.success) return result;

        return {
            success: true,
            result,
            toast: getImportSuccessMessage(result, mode)
        };
    }

    return {
        detectImportFormat,
        getExportChoices,
        getImportChoices,
        getExportDownloadSpec,
        getRawDownloadSpec,
        getImportSuccessMessage,
        previewImportFile,
        buildExportDownload,
        buildRawDownload,
        commitImport
    };
})();
