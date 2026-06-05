/* ============================================
   SETTINGS VIEW - rendering pagina impostazioni
   ============================================ */

const SettingsView = (() => {
    function getDateRange(spese) {
        const list = Array.isArray(spese) ? spese : [];
        if (list.length === 0) return '\u2014';

        const dates = list
            .map(spesa => new Date(spesa.data))
            .filter(date => Number.isFinite(date.getTime()))
            .sort((a, b) => a - b);

        if (dates.length === 0) return '\u2014';

        return `${dates[0].toLocaleDateString('it-IT')} \u2014 ${dates[dates.length - 1].toLocaleDateString('it-IT')}`;
    }

    function renderStorageGuardSection(storageStatus = {}) {
        if (storageStatus.ok) return '';

        return `
            <div class="settings-section danger-zone">
                <h3>Guardrail dati</h3>
                <p class="settings-hint">I dati locali non sono leggibili. I nuovi salvataggi sono bloccati per evitare sovrascritture.</p>
                <button id="btn-export-raw" class="btn btn-warning btn-block">Esporta dati grezzi</button>
            </div>
        `;
    }

    function formatSnapshotDate(value) {
        if (!value) return 'data non disponibile';

        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return 'data non disponibile';

        return date.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getSnapshotReasonLabel(reason) {
        const labels = {
            'json-replace': 'prima di un import JSON in sostituzione',
            'csv-replace': 'prima di un import CSV in sostituzione',
            'clear-all': 'prima della cancellazione dati',
            'clear-all-raw': 'prima della cancellazione dati grezzi',
            'bulk-delete': 'prima di una cancellazione multipla',
            'restore-before': 'prima di un ripristino snapshot',
            'restore-before-raw': 'prima di un ripristino snapshot'
        };

        return labels[reason] || 'snapshot locale';
    }

    function renderSnapshotSection(snapshotInfo = {}) {
        if (!snapshotInfo.exists) {
            return `
                <div class="settings-section">
                    <h3>\uD83D\uDD04 Ripristino dati</h3>
                    <p class="settings-hint">Nessuno snapshot locale disponibile.</p>
                </div>
            `;
        }

        if (!snapshotInfo.readable) {
            return `
                <div class="settings-section danger-zone">
                    <h3>\uD83D\uDD04 Ripristino dati</h3>
                    <p class="settings-hint">Snapshot locale presente ma non leggibile. ${AppUI.escapeHtml(snapshotInfo.error || '')}</p>
                </div>
            `;
        }

        const countLabel = snapshotInfo.hasRawData
            ? 'dati grezzi'
            : `${Number(snapshotInfo.count || 0)} spese`;

        return `
            <div class="settings-section">
                <h3>\uD83D\uDD04 Ripristino dati</h3>
                <p class="settings-hint">Snapshot del ${AppUI.escapeHtml(formatSnapshotDate(snapshotInfo.creatoIl))}: ${AppUI.escapeHtml(countLabel)}, creato ${AppUI.escapeHtml(getSnapshotReasonLabel(snapshotInfo.reason))}.</p>
                <button id="btn-restore-snapshot" class="btn btn-secondary btn-block">Ripristina snapshot</button>
            </div>
        `;
    }

    function renderReleaseBadges(release = {}) {
        const badges = [];

        if (release.isCurrent) {
            badges.push('<span class="release-badge current">Installata</span>');
        }

        if (release.isRecommended) {
            badges.push('<span class="release-badge recommended">Consigliata</span>');
        }

        if (release.isChannel) {
            badges.push('<span class="release-badge channel">Canale</span>');
        }

        return badges.length ? `<div class="release-badges">${badges.join('')}</div>` : '';
    }

    function renderReleaseMeta(release = {}) {
        const items = [];

        if (release.date) {
            items.push(`Data ${AppUI.escapeHtml(release.date)}`);
        }

        if (release.schemaVersion != null) {
            items.push(`Schema dati ${AppUI.escapeHtml(String(release.schemaVersion))}`);
        }

        return items.length
            ? `<span class="release-meta">${items.join(' \u00b7 ')}</span>`
            : '';
    }

    function renderReleaseList(model = {}) {
        if (model.status === 'loading') {
            return '<p class="settings-hint">Caricamento versioni...</p>';
        }

        if (model.status === 'error') {
            return `<p class="settings-hint">Lista versioni non disponibile. ${AppUI.escapeHtml(model.message || '')}</p>`;
        }

        const releases = Array.isArray(model.releases) ? model.releases : [];
        if (releases.length === 0) {
            return '<p class="settings-hint">Nessuna release pubblicata disponibile.</p>';
        }

        return `
            <div class="release-list">
                ${releases.map(release => `
                    <div class="release-row">
                        <div class="release-main">
                            <div class="release-title">
                                <strong>${AppUI.escapeHtml(release.id)}</strong>
                                ${renderReleaseBadges(release)}
                            </div>
                            <p class="settings-hint">${AppUI.escapeHtml(release.notes || 'Release pubblicata.')}</p>
                            ${renderReleaseMeta(release)}
                        </div>
                        ${release.isCurrent ? '' : `<a class="btn btn-secondary release-install-link" href="${AppUI.escapeHtml(release.url)}" data-launch-path="${AppUI.escapeHtml(release.launchPath || '')}">Installa</a>`}
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderExportFormatDropdown(formats, selectedValue) {
        const selected = formats.find(format => format.value === selectedValue) || formats[0] || {};

        return `
            <input type="hidden" id="export-format" value="${AppUI.escapeHtml(selected.value || 'json')}">
            <div class="searchable-dropdown export-format-dropdown" id="export-format-dropdown">
                <textarea rows="1" class="sd-input" autocomplete="nope" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" enterkeyhint="done" readonly data-value="${AppUI.escapeHtml(selected.value || '')}">${AppUI.escapeHtml(selected.label || '')}</textarea>
                <span class="sd-arrow">▼</span>
                <div class="sd-list">
                    ${formats.map(format => `
                        <div class="sd-item" data-format="${AppUI.escapeHtml(format.value)}" data-current="${selected.value === format.value ? 'true' : 'false'}">
                            <span>${AppUI.escapeHtml(format.label)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function renderPage(options = {}) {
        const settings = options.settings || {};
        const spese = Array.isArray(options.spese) ? options.spese : [];
        const sizeKB = Number(options.sizeKB || 0);
        const dateRange = options.dateRange || getDateRange(spese);
        const appInfo = options.appInfo || {};
        const version = appInfo.version || 'stable/latest';
        const channelLabel = appInfo.label || 'Stabile';

        return `
            <div class="settings-section">
                <h3>\uD83C\uDFA8 Tema</h3>
                <div class="theme-selector">
                    <button class="theme-btn ${settings.tema === 'light' ? 'active' : ''}" data-theme="light">\u2600\uFE0F Chiaro</button>
                    <button class="theme-btn ${settings.tema === 'dark' ? 'active' : ''}" data-theme="dark">\uD83C\uDF19 Scuro</button>
                    <button class="theme-btn ${settings.tema === 'auto' ? 'active' : ''}" data-theme="auto">\uD83C\uDF13 Auto</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>\uD83D\uDCE4 Importa / Esporta dati</h3>
                <p class="settings-hint">Default crea un backup JSON completo. Custom permette di scegliere formato, contenuti e selezione.</p>
                <div class="settings-buttons">
                    <button id="btn-export-default" class="btn btn-primary btn-block">Default</button>
                    <button id="btn-export-custom" class="btn btn-secondary btn-block">Custom</button>
                </div>
                <p class="settings-hint">Prima del salvataggio puoi scegliere se aggiungere o sostituire.</p>
                <input type="file" id="import-file" accept=".json,application/json,.csv,text/csv,application/csv,text/comma-separated-values" hidden>
                <button id="btn-import" class="btn btn-secondary btn-block">\uD83D\uDCC1 Scegli file...</button>
            </div>

            ${renderStorageGuardSection(options.storageStatus)}

            ${renderSnapshotSection(options.snapshotInfo)}

            <div class="settings-section">
                <h3>\uD83D\uDCE6 Versioni</h3>
                <p class="settings-hint">Puoi cambiare la versione installata quando vuoi.</p>
                <button id="btn-release-chooser" class="btn btn-secondary btn-block">Scegli versione...</button>
            </div>

            <div class="settings-section">
                <h3>\uD83D\uDCCA Informazioni</h3>
                <div class="info-grid">
                    <div class="info-item"><span class="info-label">Spese registrate</span><span class="info-value">${spese.length}</span></div>
                    <div class="info-item"><span class="info-label">Periodo</span><span class="info-value">${AppUI.escapeHtml(dateRange)}</span></div>
                    <div class="info-item"><span class="info-label">Spazio usato</span><span class="info-value">${sizeKB.toFixed(1)} KB</span></div>
                </div>
            </div>

            <div class="settings-section danger-zone">
                <h3>\u26A0\uFE0F Zona pericolosa</h3>
                <p class="settings-hint">La cancellazione crea prima uno snapshot locale. Nella conferma puoi scegliere se eliminare anche lo snapshot.</p>
                <button id="btn-clear-all" class="btn btn-danger btn-block">\uD83D\uDDD1\uFE0F Cancella tutti i dati</button>
            </div>

            <div class="about-section">
                <p>\uD83D\uDCB0 Where's My Money? ${AppUI.escapeHtml(version)}</p>
                <p>${AppUI.escapeHtml(channelLabel)} \u00b7 Dati locali \u00b7 Nessun server</p>
            </div>
        `;
    }

    function renderExportModal(model = {}) {
        const prefs = SettingsActions.normalizeExportPreferences(model.preferences || {});
        const formats = SettingsActions.getExportFormats();
        const rawSelectedCount = Number(model.selectedCount || 0);
        const selectedCount = prefs.includeData ? rawSelectedCount : 0;
        const selectedLabel = selectedCount === 1
            ? '1 spesa selezionata'
            : `${selectedCount} spese selezionate`;
        const csvMode = prefs.format === 'csv';
        const memory = model.memory || {};
        const lastSelectionClass = memory.lastSelectionActive ? ' active' : '';
        const lastFiltersClass = memory.lastFiltersActive ? ' active' : '';
        const memoryDisabled = memory.hasLastExport ? '' : ' disabled';

        return `
            <div class="export-config-grid">
                <div class="form-group export-config-field">
                    <label>Contenuti</label>
                    <div class="export-checklist">
                        <label class="export-check-row">
                            <input type="checkbox" id="export-include-data" ${prefs.includeData ? 'checked' : ''} ${csvMode ? 'checked disabled' : ''}>
                            <span>Dati</span>
                        </label>
                        <label class="export-check-row ${csvMode ? 'disabled' : ''}">
                            <input type="checkbox" id="export-include-settings" ${prefs.includeSettings && !csvMode ? 'checked' : ''} ${csvMode ? 'disabled' : ''}>
                            <span>Impostazioni</span>
                        </label>
                        <label class="export-check-row ${csvMode ? 'disabled' : ''}">
                            <input type="checkbox" id="export-include-personalizzazioni" ${prefs.includePersonalizzazioni && !csvMode ? 'checked' : ''} ${csvMode ? 'disabled' : ''}>
                            <span>Personalizzazioni</span>
                        </label>
                    </div>
                </div>

                <div class="form-group export-config-field">
                    <label>Formato</label>
                    ${renderExportFormatDropdown(formats, prefs.format)}
                </div>
            </div>

            <div class="export-selection-summary">
                <strong>${AppUI.escapeHtml(selectedLabel)}</strong>
                <div class="export-memory-toggles" role="group">
                    <button
                        type="button"
                        id="export-toggle-last-selection"
                        class="export-memory-toggle${lastSelectionClass}"
                        aria-pressed="${memory.lastSelectionActive ? 'true' : 'false'}"${memoryDisabled}
                    >
                        Ultima Selezione
                    </button>
                    <button
                        type="button"
                        id="export-toggle-last-filters"
                        class="export-memory-toggle${lastFiltersClass}"
                        aria-pressed="${memory.lastFiltersActive ? 'true' : 'false'}"${memoryDisabled}
                    >
                        Ultimi Filtri
                    </button>
                </div>
            </div>
        `;
    }

    function renderImportPreviewMessage(preview = {}, hasSpese = false) {
        const format = preview.format === 'json' ? 'JSON' : 'CSV';
        const settings = preview.settingsIncluded ? ' con impostazioni' : '';
        const warnings = (preview.warnings || []).slice(0, 3);
        const warningsHtml = warnings.length
            ? `<br><span style="font-size: 0.85rem; color: var(--warning);">${warnings.map(warning => AppUI.escapeHtml(warning)).join('<br>')}</span>`
            : '';
        const modeHint = hasSpese
            ? '<br><span style="font-size: 0.85rem; color: var(--text-tertiary);">Aggiungi mantiene i dati attuali. Sostituisci crea prima uno snapshot locale.</span>'
            : '';

        return `Importare file ${format}?<br><span style="font-size: 0.9rem; color: var(--text-secondary);">${Number(preview.count || 0)} spese valide${settings}.</span>${modeHint}${warningsHtml}`;
    }

    return {
        getDateRange,
        renderPage,
        renderExportModal,
        renderReleaseList,
        renderImportPreviewMessage
    };
})();
