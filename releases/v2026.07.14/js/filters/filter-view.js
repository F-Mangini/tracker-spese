/* ============================================
   FILTER VIEW - rendering e micro-logica UI
   ============================================ */

const FilterView = (() => {
    function getSliderMax(spese) {
        const list = Array.isArray(spese) ? spese : [];
        if (list.length === 0) return 100;

        const maxAmount = Math.max(...list.map(spesa => Number(spesa.importo) || 0));

        if (maxAmount <= 5) return 10;
        if (maxAmount <= 10) return 25;
        if (maxAmount <= 25) return 50;
        if (maxAmount <= 50) return 100;
        if (maxAmount <= 100) return 200;
        if (maxAmount <= 250) return 500;
        if (maxAmount <= 500) return 750;
        if (maxAmount <= 1000) return 1500;

        return Math.ceil(maxAmount / 500) * 500 + 500;
    }

    function renderChips(items) {
        return (Array.isArray(items) ? items : []).map(item => {
            const id = AppUI.escapeHtml(item.id);
            const name = AppUI.escapeHtml(item.nome);

            return `<button type="button" class="filter-chip" data-id="${id}" data-label="${name}" aria-pressed="false" aria-label="${name}: neutro">${AppUI.escapeHtml(item.emoji)} ${name}</button>`;
        }).join('');
    }

    function renderFooterInfo(options = {}) {
        const count = Number(options.activeCount || 0);

        if (count > 0) {
            const filtered = Array.isArray(options.filtered) ? options.filtered : [];
            const total = filtered.reduce((sum, item) => sum + Number(item.importo || 0), 0);
            const filterLabel = `filtr${count === 1 ? 'o' : 'i'}`;
            const expenseLabel = `spes${filtered.length === 1 ? 'a' : 'e'}`;

            return `${count} ${filterLabel} \u00b7 ${filtered.length} ${expenseLabel} \u00b7 ${AppUI.money(total)}`;
        }

        const quickTotals = options.quickTotals || {};
        const monthName = quickTotals.monthNameCapitalized || '';

        return `Oggi: ${AppUI.money(quickTotals.todayTotal)} \u00b7 Settimana: ${AppUI.money(quickTotals.weekTotal)} \u00b7 ${monthName}: ${AppUI.money(quickTotals.monthTotal)}`;
    }

    return {
        getSliderMax,
        renderChips,
        renderFooterInfo
    };
})();
