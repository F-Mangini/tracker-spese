/* ============================================
   TIMELINE VIEW - rendering puro della timeline
   ============================================ */

const TimelineView = (() => {
    function renderSummary(options = {}) {
        const filtered = Array.isArray(options.filtered) ? options.filtered : [];
        const isFiltered = !!options.isFiltered;
        const quickTotals = options.quickTotals || {};
        const selection = options.selection || {};

        let firstLabel;
        let firstValue;
        let secondLabel;
        let secondValue;
        let thirdLabel;
        let thirdValue;

        if (selection.active) {
            firstLabel = 'Selezione';
            firstValue = selection.deletePending ? '\u00d7' : '\u2713';
            secondLabel = 'N. spese';
            secondValue = Number(selection.selectedCount || 0);
            thirdLabel = 'Totale';
            thirdValue = AppUI.money(selection.selectedTotal);
        } else if (isFiltered) {
            const filteredTotal = filtered.reduce((sum, item) => sum + Number(item.importo || 0), 0);
            firstLabel = 'Filtro Attivo';
            firstValue = '\uD83D\uDD0D';
            secondLabel = 'N. spese';
            secondValue = filtered.length;
            thirdLabel = 'Totale';
            thirdValue = AppUI.money(filteredTotal);
        } else {
            firstLabel = 'Oggi';
            firstValue = AppUI.money(quickTotals.todayTotal);
            secondLabel = 'Settimana';
            secondValue = AppUI.money(quickTotals.weekTotal);
            thirdLabel = quickTotals.monthName || '';
            thirdValue = AppUI.money(quickTotals.monthTotal);
        }

        return `
            <div class="summary-row">
                <div class="summary-item">
                    <div class="summary-label">${AppUI.escapeHtml(firstLabel)}</div>
                    <div class="summary-value">${AppUI.escapeHtml(firstValue)}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">${AppUI.escapeHtml(secondLabel)}</div>
                    <div class="summary-value">${AppUI.escapeHtml(secondValue)}</div>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-item">
                    <div class="summary-label">${AppUI.escapeHtml(thirdLabel)}</div>
                    <div class="summary-value">${AppUI.escapeHtml(thirdValue)}</div>
                </div>
            </div>
        `;
    }

    function renderFilteredEmpty() {
        return '<div class="stats-empty">\uD83D\uDD0D<br>Nessuna spesa trovata con questi filtri</div>';
    }

    function renderExpenseCard(spesa, options = {}) {
        const category = options.category || {};
        const method = options.method || {};
        const date = new Date(spesa.data);
        const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const isNew = !!options.isNew;
        const hasTags = Array.isArray(spesa.tags) && spesa.tags.length > 0;
        const selectionActive = !!options.selectionActive;
        const isSelected = !!options.isSelected;
        const deletePending = !!options.deletePending;
        const cardClasses = [
            'expense-card',
            isNew ? 'new-card' : '',
            selectionActive ? 'selection-mode' : '',
            isSelected ? 'selected' : '',
            deletePending && isSelected ? 'delete-pending' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${cardClasses}" data-id="${AppUI.escapeHtml(spesa.id)}" aria-selected="${isSelected ? 'true' : 'false'}">
                ${selectionActive ? `<div class="expense-select-mark" aria-hidden="true">${isSelected ? (deletePending ? '\u00d7' : '\u2713') : ''}</div>` : ''}
                <div class="expense-emoji">${AppUI.escapeHtml(category.emoji || '')}</div>
                <div class="expense-info">
                    <div class="expense-desc"><span class="expense-met-icon">${AppUI.escapeHtml(method.emoji || '')}</span>${AppUI.escapeHtml(spesa.descrizione)}</div>
                    <div class="expense-meta">
                        <span>${AppUI.escapeHtml(time)}</span><span class="dot"></span>
                        <span>${AppUI.escapeHtml(category.nome || '')}</span>
                        ${hasTags ? '<span class="dot"></span><span>\uD83C\uDFF7\uFE0F</span>' : ''}
                        ${spesa.nota ? '<span class="dot"></span><span>\uD83D\uDCDD</span>' : ''}
                    </div>
                </div>
                <div class="expense-amount">${AppUI.money(spesa.importo)}</div>
            </div>
        `;
    }

    function renderGroups(groups, options = {}) {
        return (Array.isArray(groups) ? groups : []).map(group => {
            const expenses = Array.isArray(group.spese) ? group.spese : [];
            const dayTotal = expenses.reduce((sum, item) => sum + Number(item.importo || 0), 0);
            const label = typeof options.formatDayLabel === 'function'
                ? options.formatDayLabel(group.date)
                : group.date;

            return `
                <div class="day-group">
                    <div class="day-header">
                        <span class="day-date">${AppUI.escapeHtml(label)}</span>
                        <span class="day-total">${AppUI.money(dayTotal)}</span>
                    </div>
                    ${expenses.map(spesa => renderExpenseCard(spesa, {
                category: options.getCategory ? options.getCategory(spesa.categoria) : {},
                method: options.getMethod ? options.getMethod(spesa.metodo) : {},
                isNew: spesa.id === options.newCardId,
                selectionActive: !!options.selectionActive,
                isSelected: options.selectedIds instanceof Set && options.selectedIds.has(spesa.id),
                deletePending: !!options.deletePending
            })).join('')}
                </div>
            `;
        }).join('');
    }

    return {
        renderSummary,
        renderFilteredEmpty,
        renderExpenseCard,
        renderGroups
    };
})();
