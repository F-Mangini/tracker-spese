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

    return {
        detectImportFormat,
        getExportChoices,
        getImportChoices,
        getExportDownloadSpec,
        getRawDownloadSpec,
        getImportSuccessMessage
    };
})();
