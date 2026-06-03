/* ============================================
   STATS VIEW - rendering puro della pagina statistiche
   ============================================ */

const StatsView = (() => {
    function renderEmptyState() {
        return '<div class="stats-empty stats-empty-initial">\uD83D\uDCCA<br>Aggiungi qualche spesa per vedere le statistiche</div>';
    }

    function renderPeriodSelector(period) {
        const periods = [
            ['week', 'Settimana'],
            ['month', 'Mese'],
            ['year', 'Anno'],
            ['custom', 'Custom']
        ];

        return periods.map(([id, label]) =>
            `<button class="period-btn ${period === id ? 'active' : ''}" data-period="${id}">${label}</button>`
        ).join('');
    }

    function renderStatsCards(summary, count) {
        return `
            <div class="stats-cards">
                <div class="stat-card">
                    <div class="stat-card-value">${AppUI.money(summary.avg)}</div>
                    <div class="stat-card-label">Media/giorno</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${count}</div>
                    <div class="stat-card-label">Spese</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-value">${AppUI.money(summary.total)}</div>
                    <div class="stat-card-label">Totale</div>
                </div>
            </div>
        `;
    }

    function renderChartsShell(barChartTitle) {
        return `
            <div class="chart-container">
                <div class="chart-title">\uD83E\uDD67 Per categoria</div>
                <div class="chart-wrap chart-wrap-doughnut"><canvas id="chart-doughnut"></canvas></div>
            </div>
            <div class="chart-container">
                <div class="chart-title">\uD83D\uDCCA ${AppUI.escapeHtml(barChartTitle)}</div>
                <div class="chart-wrap"><canvas id="chart-bar"></canvas></div>
            </div>
        `;
    }

    function renderCategoryDetails(summary, options = {}) {
        const totals = Array.isArray(summary.categoryTotals) ? summary.categoryTotals : [];
        if (totals.length === 0) return '';

        const colors = Array.isArray(options.chartColors) ? options.chartColors : [];
        const getCategory = typeof options.getCategory === 'function' ? options.getCategory : () => ({});

        return `
            <div class="stats-section">
                <div class="stats-section-title">\uD83D\uDCC2 Dettaglio categorie</div>
                ${totals.map(([categoryId, amount], index) => {
            const category = getCategory(categoryId);
            const percent = summary.total > 0 ? ((amount / summary.total) * 100).toFixed(0) : 0;
            const width = summary.maxCategory > 0 ? ((amount / summary.maxCategory) * 100).toFixed(1) : 0;
            const color = colors.length ? colors[index % colors.length] : 'var(--accent)';

            return `
                    <div class="cat-bar-item">
                        <div class="cat-bar-header">
                            <span class="cat-bar-name">${AppUI.escapeHtml(category.emoji || '')} ${AppUI.escapeHtml(category.nome || '')}</span>
                            <span class="cat-bar-amount">${AppUI.money(amount)} (${percent}%)</span>
                        </div>
                        <div class="cat-bar-track">
                            <div class="cat-bar-fill" style="width:${width}%;background:${AppUI.escapeHtml(color)}"></div>
                        </div>
                    </div>
                `;
        }).join('')}
            </div>
        `;
    }

    function renderTopExpenses(summary, options = {}) {
        const expenses = Array.isArray(summary.topExpenses) ? summary.topExpenses : [];
        if (expenses.length === 0) return '';

        const getCategory = typeof options.getCategory === 'function' ? options.getCategory : () => ({});

        return `
            <div class="stats-section">
                <div class="stats-section-title">\uD83C\uDFC6 Top 5 spese</div>
                ${expenses.map(spesa => {
            const category = getCategory(spesa.categoria);
            const date = new Date(spesa.data);
            const label = date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });

            return `
                    <div class="expense-card" style="cursor:default">
                        <div class="expense-emoji">${AppUI.escapeHtml(category.emoji || '')}</div>
                        <div class="expense-info">
                            <div class="expense-desc">${AppUI.escapeHtml(spesa.descrizione)}</div>
                            <div class="expense-meta">
                                <span>${AppUI.escapeHtml(label)}</span>
                            </div>
                        </div>
                        <div class="expense-amount">${AppUI.money(spesa.importo)}</div>
                    </div>
                `;
        }).join('')}
            </div>
        `;
    }

    function renderPage(options = {}) {
        const period = options.period || 'month';
        const filtered = Array.isArray(options.filtered) ? options.filtered : [];
        const summary = options.summary || {};
        const isCustom = !!options.isCustom;
        const canGoNext = !!options.canGoNext;

        return `
            <div class="stats-sticky-header">
                <div class="stats-period-selector">
                    ${renderPeriodSelector(period)}
                </div>

                <div class="stats-period-nav">
                    <button class="period-nav-btn" id="period-prev" title="Precedente" ${isCustom ? 'disabled' : ''}>\u25c0</button>
                    <span class="period-nav-label">${AppUI.escapeHtml(options.periodLabel || '')}</span>
                    <button class="period-nav-btn" id="period-next" title="Successivo" ${(!canGoNext || isCustom) ? 'disabled' : ''}>\u25b6</button>
                </div>
            </div>

            ${renderStatsCards(summary, filtered.length)}

            ${filtered.length > 0
                ? renderChartsShell(options.barChartTitle || '')
                : '<div class="stats-empty">Nessuna spesa in questo periodo</div>'}

            ${renderCategoryDetails(summary, options)}
            ${renderTopExpenses(summary, options)}
        `;
    }

    return {
        renderEmptyState,
        renderPage
    };
})();
