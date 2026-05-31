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

    function renderReleaseBadges(release = {}) {
        const badges = [];

        if (release.isCurrent) {
            badges.push('<span class="release-badge current">Corrente</span>');
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
                        <a class="btn btn-secondary release-open-link" href="${AppUI.escapeHtml(release.url)}" data-launch-path="${AppUI.escapeHtml(release.launchPath || '')}">Apri</a>
                    </div>
                `).join('')}
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
                <h3>\uD83D\uDCE4 Esporta dati</h3>
                <p class="settings-hint">Scegli JSON per backup completo o CSV per fogli di calcolo.</p>
                <div class="settings-buttons">
                    <button id="btn-export" class="btn btn-secondary btn-block">Scegli formato...</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>\uD83D\uDCE5 Importa dati</h3>
                <p class="settings-hint">Prima del salvataggio puoi scegliere se aggiungere o sostituire.</p>
                <input type="file" id="import-file" accept=".json,application/json,.csv,text/csv,application/csv,text/comma-separated-values" hidden>
                <button id="btn-import" class="btn btn-secondary btn-block">\uD83D\uDCC1 Scegli file...</button>
            </div>

            ${renderStorageGuardSection(options.storageStatus)}

            <div class="settings-section">
                <h3>\uD83D\uDCE6 Versioni</h3>
                <p class="settings-hint">Apri una release pubblicata per installarla o provarla. Nessun aggiornamento viene applicato automaticamente.</p>
                <div id="release-list" class="release-list-container">
                    ${renderReleaseList(options.releaseModel || { status: 'loading' })}
                </div>
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
                <p class="settings-hint">Azione irreversibile. Esporta prima!</p>
                <button id="btn-clear-all" class="btn btn-danger btn-block">\uD83D\uDDD1\uFE0F Cancella tutti i dati</button>
            </div>

            <div class="about-section">
                <p>\uD83D\uDCB0 Where's My Money? ${AppUI.escapeHtml(version)}</p>
                <p>${AppUI.escapeHtml(channelLabel)} \u00b7 Dati locali \u00b7 Nessun server</p>
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
        renderReleaseList,
        renderImportPreviewMessage
    };
})();
