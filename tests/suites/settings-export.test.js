import {
    assert,
    createLocalStorage,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Controller impostazioni collega finestra export a history e selezione timeline', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const classes = new Set(['hidden']);
        const calls = [];
        const body = { innerHTML: '' };
        const filterBtn = { textContent: '', innerHTML: '' };
        const modal = {
            dataset: {},
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return body;
                if (selector === '#btn-export-filters') return filterBtn;
                return null;
            }
        };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage: { KEY: 'spese-test' },
            localStorage: createLocalStorage(),
            getSelectedSpese: () => [expense({ id: 'a' })],
            getSpese: () => [expense({ id: 'a' }), expense({ id: 'b' })],
            countActiveFilters: () => 2,
            beginExportSelection: config => calls.push(['begin-export-selection-open', config]),
            pushUiState: state => calls.push(['push', state]),
            consumeUiState: () => calls.push(['consume'])
        };

        SettingsController.openExportModal(options);
        assert.equal(SettingsController.isExportModalOpen(options), true);
        assert(body.innerHTML.includes('1 spesa selezionata'));
        assert(filterBtn.innerHTML.includes('Seleziona'));
        assert(!filterBtn.innerHTML.includes('Filtra \uD83D\uDD0D'));
        assert(filterBtn.innerHTML.includes('filter-badge'));
        assert(filterBtn.innerHTML.includes('2'));
        assert.deepEqual(calls, [
            ['begin-export-selection-open', { selectedIds: ['a', 'b'], selectFilteredWhenEmpty: false }],
            ['push', { panel: 'export-modal' }]
        ]);

        SettingsController.closeExportModal(options);
        assert.equal(SettingsController.isExportModalOpen(options), false);
        assert.deepEqual(calls, [
            ['begin-export-selection-open', { selectedIds: ['a', 'b'], selectFilteredWhenEmpty: false }],
            ['push', { panel: 'export-modal' }],
            ['consume']
        ]);

        let clickHandler = null;
        const fields = {
            '#export-format': { value: 'json' },
            '#export-include-data': { checked: true },
            '#export-include-settings': { checked: false },
            '#export-include-personalizzazioni': { checked: true },
            '#export-modal-close': null
        };
        const boundModal = {
            dataset: {},
            classList: {
                contains: () => false,
                add() {},
                remove() {}
            },
            querySelector(selector) {
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const filterOptions = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? boundModal : null;
                }
            },
            storage: { KEY: 'spese-test' },
            localStorage: createLocalStorage(),
            getTimelineSelectedIds: () => [],
            getSelectedSpese: () => [],
            beginExportSelection(config) {
                calls.push(['begin-export-selection', config]);
                return { selectedIds: ['b', 'c'] };
            },
            navigateToTimeline: () => calls.push(['navigate-timeline'])
        };

        SettingsController.bindExportModal(filterOptions);
        clickHandler({ target: { id: 'btn-export-filters' } });

        const savedPrefs = SettingsActions.readExportPreferences(
            filterOptions.localStorage,
            filterOptions.storage
        );
        assert.deepEqual(calls.slice(-2), [
            ['begin-export-selection', { selectedIds: [], selectFilteredWhenEmpty: false }],
            ['navigate-timeline']
        ]);
        assert.equal(savedPrefs.selectionInitialized, false);
        assert.deepEqual(savedPrefs.selectedIds, []);
        assert.equal(savedPrefs.includeSettings, false);
        assert.equal(savedPrefs.includePersonalizzazioni, true);
    });

    test('Controller impostazioni chiudendo export dalle impostazioni esce dalla selezione nascosta', () => {
        const { SettingsController } = loadUiViews();
        const classes = new Set(['hidden']);
        const calls = [];
        let selectionActive = false;
        const body = { innerHTML: '' };
        const modal = {
            dataset: {},
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return body;
                if (selector === '#btn-export-filters') return { innerHTML: '' };
                return null;
            }
        };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage: { KEY: 'spese-test' },
            localStorage: createLocalStorage(),
            getCurrentPage: () => 'settings',
            getSelectedSpese: () => (selectionActive ? [expense({ id: 'a' })] : []),
            getSpese: () => [expense({ id: 'a' }), expense({ id: 'b' })],
            countActiveFilters: () => 0,
            beginExportSelection: config => {
                selectionActive = true;
                calls.push(['begin-export-selection', config]);
            },
            isTimelineSelectionActive: () => selectionActive,
            exitTimelineSelection: fromPopstate => {
                selectionActive = false;
                calls.push(['exit-selection', fromPopstate]);
            },
            pushUiState: state => calls.push(['push', state]),
            consumeUiState: steps => calls.push(['consume', steps || 1])
        };

        SettingsController.openExportModal(options);
        assert.equal(selectionActive, true);

        SettingsController.closeExportModal(options);
        assert.equal(selectionActive, false);
        assert.deepEqual(calls.slice(-2), [
            ['exit-selection', true],
            ['consume', 2]
        ]);

        SettingsController.openExportModal(options);
        assert.equal(selectionActive, true);

        SettingsController.closeExportModal(options, true);
        assert.equal(selectionActive, false);
        assert.deepEqual(calls.slice(-2), [
            ['exit-selection', true],
            ['consume', 1]
        ]);

        SettingsController.openExportModal(options);
        assert.equal(selectionActive, true);

        SettingsController.closeExportModal(options, true, { preserveSelection: true });
        assert.equal(selectionActive, true);
        assert.deepEqual(calls.slice(-2), [
            ['begin-export-selection', { selectedIds: ['a', 'b'], selectFilteredWhenEmpty: false }],
            ['push', { panel: 'export-modal' }]
        ]);
    });

    test('Controller impostazioni apre export dalle impostazioni su ultimi filtri', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const localStorage = createLocalStorage();
        const storage = { KEY: 'spese-test' };
        const classes = new Set(['hidden']);
        const body = { innerHTML: '' };
        const filterBtn = { innerHTML: '' };
        const modal = {
            dataset: {},
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return body;
                if (selector === '#btn-export-filters') return filterBtn;
                return null;
            }
        };
        const spese = [
            expense({ id: 'a', descrizione: 'Pane' }),
            expense({ id: 'b', descrizione: 'Latte' }),
            expense({ id: 'c', descrizione: 'Pane integrale' })
        ];
        const calls = [];
        let currentIds = ['b'];
        let currentFilters = { query: '' };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage,
            localStorage,
            getSpese: () => spese,
            getTimelineSelectedIds: () => currentIds,
            getCurrentFilters: () => currentFilters,
            getSelectedSpese: () => spese.filter(spesa => currentIds.includes(spesa.id)),
            getFilteredIdsForExportFilters(filters) {
                const snapshot = SettingsActions.normalizeFilterSnapshot(filters);
                const query = snapshot.query.toLowerCase();
                return spese
                    .filter(spesa => !query || String(spesa.descrizione || '').toLowerCase().includes(query))
                    .map(spesa => spesa.id);
            },
            applyExportFilters(filters, selectedIds) {
                currentFilters = SettingsActions.normalizeFilterSnapshot(filters);
                calls.push(['apply-filters', filters, selectedIds]);
            },
            beginExportSelection(config) {
                currentIds = config.selectedIds.slice();
                calls.push(['begin-selection', config]);
            },
            countActiveFilters: () => 1,
            pushUiState: state => calls.push(['push', state])
        };

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['b'],
                filters: { query: 'pane' }
            }
        });

        SettingsController.openExportModal(options);

        assert.deepEqual(currentIds, ['a', 'c']);
        assert.deepEqual(currentFilters, {
            query: 'pane',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(calls, [
            ['apply-filters', { query: 'pane', categories: [], excludedCategories: [], methods: [], excludedMethods: [], amountMin: 0, amountMax: Infinity, dateFrom: '', dateTo: '', selectedOnly: false, excludedSelectedOnly: false }, ['a', 'c']],
            ['begin-selection', { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }],
            ['push', { panel: 'export-modal' }]
        ]);
        assert(body.innerHTML.includes('2 spese selezionate'));
        assert(body.innerHTML.includes('id="export-toggle-last-filters"\n                        class="export-memory-toggle active"'));
    });

    test('Controller impostazioni ricorda solo ultimo export custom riuscito', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const calls = [];
        let clickHandler = null;
        const localStorage = createLocalStorage();
        const storage = {
            KEY: 'spese-test',
            exportJSON(options) {
                calls.push(['export-json', options]);
                return { success: true, content: '{"ok":true}', count: 2 };
            }
        };
        const fields = {
            '#export-format': { value: 'json' },
            '#export-include-data': { checked: true },
            '#export-include-settings': { checked: false },
            '#export-include-personalizzazioni': { checked: true },
            '#export-modal-close': null
        };
        const boundModal = {
            dataset: {},
            classList: {
                contains: () => false,
                add() {},
                remove() {}
            },
            querySelector(selector) {
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const exportOptions = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? boundModal : null;
                }
            },
            storage,
            localStorage,
            getTimelineSelectedIds: () => new Set(['a', 'b']),
            getSelectedSpese: () => [expense({ id: 'a' }), expense({ id: 'b' })],
            getCurrentFilters: () => ({
                query: 'caffe',
                categories: new Set(['bar']),
                methods: new Set(['carta']),
                amountMin: 2,
                amountMax: 12,
                dateFrom: '2026-06-01',
                dateTo: '',
                selectedOnly: true
            }),
            dateStamp: () => '2026-06-04',
            download: (content, filename, mime) => calls.push(['download', filename, mime, content]),
            showToast: (message, type) => calls.push(['toast', type, message])
        };

        SettingsActions.saveExportPreferences(localStorage, storage, {
            selectedIds: ['draft-only'],
            selectionInitialized: true
        });

        SettingsController.bindExportModal(exportOptions);
        clickHandler({ target: { id: 'btn-export-run' } });

        const savedAfterExport = SettingsActions.readExportPreferences(localStorage, storage);
        assert.deepEqual(savedAfterExport.selectedIds, ['a', 'b']);
        assert.equal(savedAfterExport.selectionInitialized, true);
        assert.deepEqual(savedAfterExport.lastExport.selectedIds, ['a', 'b']);
        assert.equal(savedAfterExport.lastExport.filters.query, 'caffe');
        assert.deepEqual(savedAfterExport.lastExport.filters.categories, ['bar']);
        assert.deepEqual(savedAfterExport.lastExport.filters.methods, ['carta']);
        assert.equal(savedAfterExport.lastExport.filters.selectedOnly, true);
        assert.deepEqual(calls, [
            ['export-json', {
                spese: [expense({ id: 'a' }), expense({ id: 'b' })],
                includeData: true,
                includeSettings: false,
                includePersonalizzazioni: true
            }],
            ['download', 'spese_export_2026-06-04.json', 'application/json', '{"ok":true}'],
            ['toast', 'info', 'Export JSON custom avviato...']
        ]);

        const classes = new Set(['hidden']);
        const body = { innerHTML: '' };
        const filterBtn = { innerHTML: '' };
        const openModal = {
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return body;
                if (selector === '#btn-export-filters') return filterBtn;
                return null;
            }
        };
        const reopenCalls = [];
        SettingsController.openExportModal({
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? openModal : null;
                }
            },
            storage,
            localStorage,
            getSpese: () => [expense({ id: 'a' }), expense({ id: 'b' }), expense({ id: 'c' })],
            getSelectedSpese: () => [expense({ id: 'a' }), expense({ id: 'b' })],
            countActiveFilters: () => 5,
            getFilteredIdsForExportFilters: () => ['a', 'c'],
            applyExportFilters: (filters, selectedIds) => reopenCalls.push(['apply-filters', filters, selectedIds]),
            beginExportSelection: config => reopenCalls.push(['begin-selection', config]),
            pushUiState: state => reopenCalls.push(['push', state])
        });

        assert.deepEqual(reopenCalls, [
            ['apply-filters', savedAfterExport.lastExport.filters, ['a', 'c']],
            ['begin-selection', { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }],
            ['push', { panel: 'export-modal' }]
        ]);
        assert(filterBtn.innerHTML.includes('filter-badge'));
        assert(filterBtn.innerHTML.includes('5'));

        const timelineModalClasses = new Set(['hidden']);
        const timelineBody = { innerHTML: '' };
        const timelineModal = {
            dataset: {},
            classList: {
                contains: cls => timelineModalClasses.has(cls),
                add: cls => timelineModalClasses.add(cls),
                remove: cls => timelineModalClasses.delete(cls)
            },
            querySelector(selector) {
                if (selector === '#export-modal-body') return timelineBody;
                return null;
            }
        };
        const timelineOpenCalls = [];
        SettingsController.openExportModal({
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? timelineModal : null;
                }
            },
            storage,
            localStorage,
            getSpese: () => [expense({ id: 'a' }), expense({ id: 'b' }), expense({ id: 'c' })],
            getTimelineSelectedIds: () => new Set(['c']),
            getSelectedSpese: () => [expense({ id: 'c' })],
            countActiveFilters: () => 0,
            applyExportFilters: (filters, selectedIds) => timelineOpenCalls.push(['apply-filters', filters, selectedIds]),
            beginExportSelection: config => timelineOpenCalls.push(['begin-selection', config]),
            pushUiState: state => timelineOpenCalls.push(['push', state])
        }, {
            keepCurrentSelection: true
        });

        assert.deepEqual(timelineOpenCalls, [
            ['push', { panel: 'export-modal' }]
        ]);
        assert(timelineBody.innerHTML.includes('1 spesa selezionata'));
    });

    test('Controller impostazioni dopo export custom chiude modale ed esce dalla selezione', () => {
        const { SettingsController } = loadUiViews();
        const calls = [];
        let clickHandler = null;
        let selectionActive = true;
        const classes = new Set();
        const storage = {
            KEY: 'spese-test',
            exportJSON(options) {
                calls.push(['export-json', options.spese.map(spesa => spesa.id)]);
                return { success: true, content: '{"ok":true}', count: options.spese.length };
            }
        };
        const fields = {
            '#export-format': { value: 'json' },
            '#export-include-data': { checked: true },
            '#export-include-settings': { checked: true },
            '#export-include-personalizzazioni': { checked: false },
            '#export-modal-close': null
        };
        const modal = {
            dataset: {},
            classList: {
                contains: cls => classes.has(cls),
                add: cls => classes.add(cls),
                remove: cls => classes.delete(cls)
            },
            querySelector(selector) {
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage,
            localStorage: createLocalStorage(),
            getCurrentPage: () => 'timeline',
            getTimelineSelectedIds: () => new Set(['a']),
            getSelectedSpese: () => [expense({ id: 'a' })],
            getCurrentFilters: () => ({ query: '' }),
            isTimelineSelectionActive: () => selectionActive,
            exitTimelineSelection: fromPopstate => {
                selectionActive = false;
                calls.push(['exit-selection', fromPopstate]);
            },
            consumeUiState: steps => calls.push(['consume', steps]),
            dateStamp: () => '2026-06-11',
            download: (content, filename, mime) => calls.push(['download', filename, mime, content]),
            showToast: (message, type) => calls.push(['toast', type, message])
        };

        SettingsController.bindExportModal(options);
        clickHandler({ target: { id: 'btn-export-run' } });

        assert.equal(classes.has('hidden'), true);
        assert.equal(selectionActive, false);
        assert.deepEqual(calls, [
            ['export-json', ['a']],
            ['download', 'spese_export_2026-06-11.json', 'application/json', '{"ok":true}'],
            ['toast', 'info', 'Export JSON custom avviato...'],
            ['consume', 1],
            ['exit-selection', false]
        ]);
    });

    test('Controller impostazioni gestisce dropdown formato e ripristino contenuti dopo CSV', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const localStorage = createLocalStorage();
        const storage = { KEY: 'spese-test' };
        const classes = new Set();
        const calls = [];
        let clickHandler = null;
        let mouseDownHandler = null;
        let inputHandler = null;
        let activeElement = null;

        function classList(initial = []) {
            const set = new Set(initial);
            return {
                add(cls) { set.add(cls); },
                remove(cls) { set.delete(cls); },
                contains(cls) { return set.has(cls); },
                toggle(cls, value) {
                    const shouldAdd = value == null ? !set.has(cls) : !!value;
                    if (shouldAdd) set.add(cls);
                    else set.delete(cls);
                }
            };
        }

        const field = { value: 'json' };
        const input = {
            value: 'JSON',
            readOnly: true,
            dataset: { value: 'json' },
            focus: () => {
                activeElement = input;
                calls.push('focus');
            },
            closest(selector) {
                if (selector === '#export-format-dropdown .sd-input') return input;
                if (selector === '#export-format-dropdown .sd-item') return null;
                if (selector === '#export-format-dropdown') return dropdown;
                return null;
            }
        };
        const jsonItem = {
            textContent: 'JSON',
            dataset: { format: 'json' },
            classList: classList(['selected']),
            closest(selector) {
                if (selector === '#export-format-dropdown .sd-item') return jsonItem;
                if (selector === '#export-format-dropdown') return dropdown;
                return null;
            }
        };
        const csvItem = {
            textContent: 'CSV',
            dataset: { format: 'csv' },
            classList: classList(),
            closest(selector) {
                if (selector === '#export-format-dropdown .sd-item') return csvItem;
                if (selector === '#export-format-dropdown') return dropdown;
                return null;
            }
        };
        const exportBody = {
            scrollTop: 0,
            dataset: {},
            style: {},
            getBoundingClientRect() {
                return { top: 80, bottom: 360 };
            }
        };
        const dropdownList = {
            getBoundingClientRect() {
                return { top: 368, bottom: 488, height: 120 };
            }
        };
        const dropdown = {
            classList: {
                add(cls) { classes.add(cls); },
                remove(cls) { classes.delete(cls); },
                contains(cls) { return classes.has(cls); }
            },
            querySelector(selector) {
                if (selector === '.sd-input') return input;
                if (selector === '.sd-list') return dropdownList;
                if (selector === '.sd-item.selected') return jsonItem;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.sd-item' || selector === '.sd-item:not(.hidden)') {
                    return [jsonItem, csvItem];
                }
                return [];
            },
            closest(selector) {
                return selector === '.modal-body' ? exportBody : null;
            },
            getBoundingClientRect() {
                return { top: 320, bottom: 364 };
            }
        };
        const fields = {
            '#export-format': field,
            '#export-format-dropdown': dropdown,
            '#export-format-dropdown .sd-input': input,
            '#export-format-dropdown .sd-item[data-format="json"]': jsonItem,
            '#export-format-dropdown .sd-item[data-format="csv"]': csvItem,
            '#export-include-data': { checked: false },
            '#export-include-settings': { checked: true },
            '#export-include-personalizzazioni': { checked: true },
            '#export-modal-close': null
        };
        const exportPanel = {
            style: {},
            querySelector(selector) {
                if (selector === '#export-modal-body') return exportBody;
                return fields[selector] || null;
            }
        };
        const modal = {
            dataset: {},
            style: {},
            classList: {
                contains: () => false,
                add() {},
                remove() {}
            },
            querySelector(selector) {
                if (selector === '#export-modal') return exportPanel;
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
                if (event === 'mousedown') mouseDownHandler = handler;
                if (event === 'input') inputHandler = handler;
            }
        };
        const options = {
            document: {
                get activeElement() {
                    return activeElement;
                },
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage,
            localStorage,
            getTimelineSelectedIds: () => [],
            getSelectedSpese: () => [],
            getSpese: () => [],
            countActiveFilters: () => 0,
            pushUiState: state => calls.push(['push', state]),
            consumeUiState: () => calls.push('consume'),
            setTimeout: callback => callback()
        };

        SettingsController.bindExportModal(options);

        mouseDownHandler({
            target: input,
            preventDefault: () => calls.push('prevent-first')
        });
        assert(classes.has('open'));
        assert.equal(input.readOnly, true);
        assert(!jsonItem.classList.contains('highlighted'));
        assert.deepEqual(calls.slice(-2), ['focus', ['push', { panel: 'export-format' }]]);
        assert.equal(SettingsController.getExportModalState(options).formatInteraction, true);
        assert.equal(modal['__settingsExportOptions'], undefined);
        assert.equal(modal.dataset.bound, undefined);
        assert.equal(modal.dataset.exportFormatInteraction, undefined);
        assert.equal(SettingsController.isExportFormatDropdownOpen(options), true);
        assert.equal(modal.style.paddingBottom, undefined);
        assert.equal(exportPanel.style.maxHeight, undefined);
        assert.equal(exportBody.style.paddingBottom, undefined);
        assert.equal(exportBody.scrollTop, 0);

        SettingsController.clearExportModalInteraction(options, true);
        assert.equal(classes.has('open'), false);
        assert.equal(SettingsController.getExportModalState(options).formatInteraction, false);
        assert.equal(modal.dataset.exportFormatInteraction, undefined);
        assert.equal(exportBody.style.paddingBottom, undefined);
        assert(!calls.includes('consume'));

        mouseDownHandler({
            target: input,
            preventDefault: () => calls.push('prevent-reopen')
        });
        assert(classes.has('open'));

        mouseDownHandler({
            target: input,
            preventDefault: () => calls.push('prevent-second')
        });
        assert.equal(input.readOnly, false);
        assert.equal(input.value, '');
        assert.equal(exportBody.scrollTop, 0);

        input.value = 'cs';
        inputHandler({ target: input });
        assert(csvItem.classList.contains('highlighted'));
        assert(jsonItem.classList.contains('hidden'));

        clickHandler({ target: csvItem });
        let prefs = SettingsActions.readExportPreferences(localStorage, storage);
        assert.equal(prefs.format, 'csv');
        assert.equal(prefs.includeData, true);
        assert.equal(prefs.includeSettings, false);
        assert.equal(prefs.includePersonalizzazioni, false);
        assert.deepEqual(SettingsController.getExportModalState(options).preCsvContents, {
            includeData: false,
            includeSettings: true,
            includePersonalizzazioni: true
        });
        assert.equal(modal.dataset.exportPreCsvContents, undefined);
        assert(calls.includes('consume'));

        field.value = 'csv';
        fields['#export-include-data'].checked = true;
        fields['#export-include-settings'].checked = false;
        fields['#export-include-personalizzazioni'].checked = false;

        clickHandler({ target: jsonItem });
        prefs = SettingsActions.readExportPreferences(localStorage, storage);
        assert.equal(prefs.format, 'json');
        assert.equal(prefs.includeData, false);
        assert.equal(prefs.includeSettings, true);
        assert.equal(prefs.includePersonalizzazioni, true);
    });

    test('Controller impostazioni gestisce toggle memoria export custom', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const localStorage = createLocalStorage();
        const storage = { KEY: 'spese-test' };
        const spese = [
            expense({ id: 'a', descrizione: 'Pane' }),
            expense({ id: 'b', descrizione: 'Latte' }),
            expense({ id: 'c', descrizione: 'Pane integrale' }),
            expense({ id: 'manual', descrizione: 'Corrente' })
        ];
        const calls = [];
        let currentIds = ['manual'];
        let currentFilters = { query: '' };
        let clickHandler = null;
        const body = { innerHTML: '' };
        const fields = {
            '#export-modal-body': body,
            '#export-format': { value: 'json' },
            '#export-include-data': { checked: true },
            '#export-include-settings': { checked: true },
            '#export-include-personalizzazioni': { checked: false },
            '#export-modal-close': null
        };
        const modal = {
            dataset: {},
            classList: {
                contains: () => false,
                add() {},
                remove() {}
            },
            querySelector(selector) {
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const options = {
            document: {
                getElementById(id) {
                    return id === 'export-modal-overlay' ? modal : null;
                }
            },
            storage,
            localStorage,
            getSpese: () => spese,
            getTimelineSelectedIds: () => currentIds,
            getCurrentFilters: () => currentFilters,
            getSelectedSpese: () => spese.filter(spesa => currentIds.includes(spesa.id)),
            getFilteredIdsForExportFilters(filters) {
                const snapshot = SettingsActions.normalizeFilterSnapshot(filters);
                return spese
                    .filter(spesa => {
                        const query = snapshot.query.toLowerCase();
                        const matchesQuery = !query || String(spesa.descrizione || '').toLowerCase().includes(query);
                        const matchesCategory = snapshot.categories.length === 0 || snapshot.categories.includes(spesa.categoria);
                        const matchesMethod = snapshot.methods.length === 0 || snapshot.methods.includes(spesa.metodo);
                        const matchesMin = spesa.importo >= snapshot.amountMin;
                        const matchesMax = snapshot.amountMax === Infinity || spesa.importo <= snapshot.amountMax;
                        return matchesQuery && matchesCategory && matchesMethod && matchesMin && matchesMax;
                    })
                    .map(spesa => spesa.id);
            },
            applyExportFilters(filters, selectedIds) {
                currentFilters = { ...filters };
                calls.push(['apply-filters', filters, selectedIds]);
            },
            beginExportSelection(config) {
                currentIds = config.selectedIds.slice();
                calls.push(['begin-selection', config]);
            },
            navigateToTimeline: () => calls.push(['navigate-timeline']),
            countActiveFilters: () => 0
        };

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['a', 'b'],
                filters: { query: 'pane' }
            }
        });

        SettingsController.bindExportModal(options);

        clickHandler({ target: { id: 'export-toggle-last-selection' } });
        assert.deepEqual(currentIds, ['a', 'b']);
        assert.deepEqual(calls[calls.length - 1], [
            'begin-selection',
            { selectedIds: ['a', 'b'], selectFilteredWhenEmpty: false }
        ]);
        assert.deepEqual(SettingsController.getExportModalState(options).toggleBaseSelection, ['manual']);
        assert.equal(modal.dataset.exportToggleBaseSelection, undefined);
        assert(body.innerHTML.includes('export-toggle-last-selection'));
        assert(body.innerHTML.includes('export-memory-toggle active'));

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(currentIds, ['a', 'c']);
        assert.deepEqual(currentFilters, {
            query: 'pane',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(calls[calls.length - 2], [
            'apply-filters',
            { query: 'pane', categories: [], excludedCategories: [], methods: [], excludedMethods: [], amountMin: 0, amountMax: Infinity, dateFrom: '', dateTo: '', selectedOnly: false, excludedSelectedOnly: false },
            ['a', 'c']
        ]);
        assert.deepEqual(calls[calls.length - 1], [
            'begin-selection',
            { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }
        ]);
        assert.deepEqual(SettingsController.getExportModalState(options).toggleBaseSelection, ['manual']);
        assert.equal(modal.dataset.exportToggleBaseSelection, undefined);
        assert(body.innerHTML.includes('id="export-toggle-last-filters"'));
        assert(body.innerHTML.includes('id="export-toggle-last-filters"\n                        class="export-memory-toggle active"'));

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(currentIds, ['a', 'b']);
        assert.deepEqual(currentFilters, {
            query: '',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(calls[calls.length - 2], [
            'apply-filters',
            { query: '', categories: [], excludedCategories: [], methods: [], excludedMethods: [], amountMin: 0, amountMax: Infinity, dateFrom: '', dateTo: '', selectedOnly: false, excludedSelectedOnly: false },
            ['a', 'b']
        ]);
        assert.deepEqual(calls[calls.length - 1], [
            'begin-selection',
            { selectedIds: ['a', 'b'], selectFilteredWhenEmpty: false }
        ]);
        assert.equal(SettingsController.getExportModalState(options).toggleBaseFilterSelection, null);
        assert.equal(SettingsController.getExportModalState(options).toggleBaseFilters, null);
        assert.equal(modal.dataset.exportToggleBaseFilterSelection, undefined);
        assert.equal(modal.dataset.exportToggleBaseFilters, undefined);

        clickHandler({ target: { id: 'export-toggle-last-selection' } });
        assert.deepEqual(currentIds, ['manual']);
        assert.deepEqual(calls[calls.length - 1], [
            'begin-selection',
            { selectedIds: ['manual'], selectFilteredWhenEmpty: false }
        ]);
        assert.equal(SettingsController.getExportModalState(options).toggleBaseSelection, null);
        assert.equal(modal.dataset.exportToggleBaseSelection, undefined);

        currentIds = ['a', 'c'];
        currentFilters = {
            query: 'latte',
            categories: ['bar'],
            methods: ['card'],
            amountMin: 5,
            amountMax: 20,
            dateFrom: '2026-01-01',
            dateTo: '2026-02-01',
            selectedOnly: true
        };
        SettingsController.openExportModal(options, { keepCurrentSelection: true });
        assert(body.innerHTML.includes('id="export-toggle-last-filters"'));
        assert(!body.innerHTML.includes('id="export-toggle-last-filters"\n                        class="export-memory-toggle active"'));

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(currentFilters, {
            query: 'pane',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(currentIds, ['a', 'c']);
        assert.deepEqual(calls[calls.length - 2], [
            'apply-filters',
            { query: 'pane', categories: [], excludedCategories: [], methods: [], excludedMethods: [], amountMin: 0, amountMax: Infinity, dateFrom: '', dateTo: '', selectedOnly: false, excludedSelectedOnly: false },
            ['a', 'c']
        ]);
        assert.deepEqual(calls[calls.length - 1], [
            'begin-selection',
            { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }
        ]);
        assert.deepEqual(SettingsController.getExportModalState(options).toggleBaseFilterSelection, ['a', 'c']);
        assert.equal(modal.dataset.exportToggleBaseFilterSelection, undefined);

        clickHandler({ target: { id: 'btn-export-filters' } });
        assert.deepEqual(calls.slice(-2), [
            ['begin-selection', { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }],
            ['navigate-timeline']
        ]);

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['manual'],
                filters: {}
            }
        });
        currentIds = ['manual'];
        currentFilters = {
            query: 'latte',
            categories: ['bar'],
            methods: ['carta'],
            amountMin: 1,
            amountMax: 5,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false
        };
        SettingsController.openExportModal(options, { keepCurrentSelection: true });
        assert(!body.innerHTML.includes('id="export-toggle-last-filters"\n                        class="export-memory-toggle active"'));

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(currentFilters, {
            query: '',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(currentIds, ['a', 'b', 'c', 'manual']);
        assert(body.innerHTML.includes('id="export-toggle-last-filters"\n                        class="export-memory-toggle active"'));

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(currentFilters, {
            query: 'latte',
            categories: ['bar'],
            excludedCategories: [],
            methods: ['carta'],
            excludedMethods: [],
            amountMin: 1,
            amountMax: 5,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(currentIds, ['manual']);

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['a', 'c'],
                filters: { query: 'pane' }
            }
        });
        currentFilters = SettingsActions.normalizeFilterSnapshot({ query: 'pane' });
        clickHandler({ target: { id: 'export-toggle-last-selection' } });
        assert.deepEqual(currentIds, ['a', 'c']);
        assert.equal(
            (body.innerHTML.match(/aria-pressed="true"/g) || []).length,
            2
        );
    });

    test('Controller impostazioni usa le opzioni aggiornate quando riusa la modale export', () => {
        const { SettingsController, SettingsActions } = loadUiViews();
        const localStorage = createLocalStorage();
        const storage = { KEY: 'spese-test' };
        const spese = [
            expense({ id: 'a', descrizione: 'Pane' }),
            expense({ id: 'b', descrizione: 'Latte' }),
            expense({ id: 'c', descrizione: 'Pane integrale' }),
            expense({ id: 'manual', descrizione: 'Corrente' })
        ];
        const staleCalls = [];
        const calls = [];
        let currentIds = ['manual'];
        let currentFilters = { query: 'latte' };
        let clickHandler = null;
        const body = { innerHTML: '' };
        const fields = {
            '#export-modal-body': body,
            '#export-format': { value: 'json' },
            '#export-include-data': { checked: true },
            '#export-include-settings': { checked: true },
            '#export-include-personalizzazioni': { checked: false },
            '#export-modal-close': null
        };
        const modal = {
            dataset: {},
            classList: {
                contains: () => false,
                add() {},
                remove() {}
            },
            querySelector(selector) {
                return fields[selector] || null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const documentLike = {
            getElementById(id) {
                return id === 'export-modal-overlay' ? modal : null;
            }
        };
        const staleOptions = {
            document: documentLike,
            storage,
            localStorage,
            getSpese: () => spese,
            getTimelineSelectedIds: () => ['stale-manual'],
            getCurrentFilters: () => ({ query: 'stale' }),
            getSelectedSpese: () => [],
            getFilteredIdsForExportFilters: () => ['stale-target'],
            applyExportFilters: (filters, selectedIds) => {
                staleCalls.push(['apply-filters', filters, selectedIds]);
            },
            beginExportSelection: config => {
                staleCalls.push(['begin-selection', config]);
            },
            navigateToTimeline: () => staleCalls.push(['navigate-timeline']),
            countActiveFilters: () => 0
        };
        const currentOptions = {
            document: documentLike,
            storage,
            localStorage,
            getSpese: () => spese,
            getTimelineSelectedIds: () => currentIds,
            getCurrentFilters: () => currentFilters,
            getSelectedSpese: () => spese.filter(spesa => currentIds.includes(spesa.id)),
            getFilteredIdsForExportFilters(filters) {
                const snapshot = SettingsActions.normalizeFilterSnapshot(filters);
                return spese
                    .filter(spesa => {
                        const query = snapshot.query.toLowerCase();
                        return !query || String(spesa.descrizione || '').toLowerCase().includes(query);
                    })
                    .map(spesa => spesa.id);
            },
            applyExportFilters(filters, selectedIds) {
                currentFilters = { ...filters };
                calls.push(['apply-filters', filters, selectedIds]);
            },
            beginExportSelection(config) {
                currentIds = config.selectedIds.slice();
                calls.push(['begin-selection', config]);
            },
            navigateToTimeline: () => calls.push(['navigate-timeline']),
            countActiveFilters: () => 0
        };

        SettingsActions.saveExportPreferences(localStorage, storage, {
            lastExport: {
                selectedIds: ['a', 'c'],
                filters: { query: 'pane' }
            }
        });

        SettingsController.bindExportModal(staleOptions);
        SettingsController.bindExportModal(currentOptions);
        SettingsController.openExportModal(currentOptions, { keepCurrentSelection: true });

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(staleCalls, []);
        assert.deepEqual(currentFilters, {
            query: 'pane',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(currentIds, ['a', 'c']);

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        assert.deepEqual(staleCalls, []);
        assert.deepEqual(currentFilters, {
            query: 'latte',
            categories: [],
            excludedCategories: [],
            methods: [],
            excludedMethods: [],
            amountMin: 0,
            amountMax: Infinity,
            dateFrom: '',
            dateTo: '',
            selectedOnly: false,
            excludedSelectedOnly: false
        });
        assert.deepEqual(currentIds, ['manual']);

        clickHandler({ target: { id: 'export-toggle-last-filters' } });
        clickHandler({ target: { id: 'btn-export-filters' } });
        assert.deepEqual(staleCalls, []);
        assert.deepEqual(calls.slice(-2), [
            ['begin-selection', { selectedIds: ['a', 'c'], selectFilteredWhenEmpty: false }],
            ['navigate-timeline']
        ]);
    });

    test('Controller impostazioni crea snapshot e sostituisce pagina prima del cambio versione', () => {
        const { SettingsController } = loadUiViews();
        const calls = [];
        const launchStorage = createLocalStorage();
        let clickHandler = null;
        let prevented = false;
        let popstateHandler = null;
        let fallbackTimer = null;
        const modal = {
            dataset: {},
            querySelector() {
                return null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const storage = {
            createSnapshot(reason) {
                calls.push(['snapshot', reason]);
                return { success: true };
            }
        };
        const link = {
            href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/',
            dataset: { launchPath: 'releases/v2026.05.30/' },
            closest(selector) {
                return selector === '.release-install-link' ? link : null;
            }
        };
        const locationLike = {
            href: 'https://f-mangini.github.io/tracker-spese/stable/',
            replace(url) {
                calls.push(['replace', url]);
                this.href = url;
            }
        };
        const windowLike = {
            addEventListener(event, handler) {
                if (event === 'popstate') popstateHandler = handler;
            },
            removeEventListener(event, handler) {
                if (event === 'popstate' && popstateHandler === handler) popstateHandler = null;
            },
            setTimeout(callback, ms) {
                fallbackTimer = { callback, ms };
                return 1;
            }
        };

        SettingsController.bindReleaseModal({
            document: {
                getElementById(id) {
                    return id === 'release-modal-overlay' ? modal : null;
                }
            },
            storage,
            localStorage: launchStorage,
            locationLike,
            window: windowLike,
            setTimeout: windowLike.setTimeout,
            getCurrentPage: () => 'settings',
            consumeUiState: steps => {
                calls.push(['consume', steps]);
                return true;
            },
            showToast: (message, type) => calls.push(['toast', type, message])
        });

        clickHandler({
            target: link,
            preventDefault: () => { prevented = true; }
        });

        assert.equal(prevented, true);
        assert.deepEqual(calls, [
            ['snapshot', 'version-change'],
            ['consume', 2]
        ]);
        assert.equal(typeof popstateHandler, 'function');
        assert.equal(fallbackTimer.ms, 700);
        assert.equal(launchStorage.getItem('spesa-tracker-launch-target'), 'releases/v2026.05.30/');

        popstateHandler();

        assert.deepEqual(calls, [
            ['snapshot', 'version-change'],
            ['consume', 2],
            ['replace', 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/']
        ]);
        assert.equal(popstateHandler, null);

        fallbackTimer.callback();
        assert.equal(calls.filter(call => call[0] === 'replace').length, 1);
    });

    test('Controller impostazioni blocca cambio versione se lo snapshot fallisce', () => {
        const { SettingsController } = loadUiViews();
        const calls = [];
        const launchStorage = createLocalStorage();
        let clickHandler = null;
        let prevented = false;
        const modal = {
            dataset: {},
            querySelector() {
                return null;
            },
            addEventListener(event, handler) {
                if (event === 'click') clickHandler = handler;
            }
        };
        const link = {
            href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/',
            dataset: { launchPath: 'releases/v2026.05.30/' },
            closest(selector) {
                return selector === '.release-install-link' ? link : null;
            }
        };

        SettingsController.bindReleaseModal({
            document: {
                getElementById(id) {
                    return id === 'release-modal-overlay' ? modal : null;
                }
            },
            storage: {
                createSnapshot(reason) {
                    calls.push(['snapshot', reason]);
                    return { success: false, error: 'Snapshot fallito' };
                }
            },
            localStorage: launchStorage,
            locationLike: {
                replace(url) {
                    calls.push(['replace', url]);
                }
            },
            getCurrentPage: () => 'settings',
            consumeUiState: steps => calls.push(['consume', steps]),
            showToast: (message, type) => calls.push(['toast', type, message])
        });

        clickHandler({
            target: link,
            preventDefault: () => { prevented = true; }
        });

        assert.equal(prevented, true);
        assert.equal(launchStorage.getItem('spesa-tracker-launch-target'), null);
        assert.deepEqual(calls, [
            ['snapshot', 'version-change'],
            ['toast', 'error', 'Snapshot fallito']
        ]);
    });

    test('Controller impostazioni installa versioni sostituendo la pagina corrente', () => {
        const { SettingsController } = loadUiViews();
        const launchStorage = createLocalStorage();
        const calls = [];
        const locationLike = {
            href: 'https://f-mangini.github.io/tracker-spese/stable/',
            replace(url) {
                calls.push(['replace', url]);
                this.href = url;
            }
        };
        const link = {
            href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/',
            dataset: {
                launchPath: 'releases/v2026.05.30/'
            }
        };

        assert.equal(SettingsController.installReleaseFromLink(link, {
            localStorage: launchStorage,
            locationLike
        }), true);

        assert.equal(
            launchStorage.getItem('spesa-tracker-launch-target'),
            'releases/v2026.05.30/'
        );
        assert.deepEqual(calls, [
            ['replace', 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/']
        ]);

        const fallbackLocation = { href: 'https://f-mangini.github.io/tracker-spese/releases/v2026.05.30/' };
        SettingsController.installReleaseFromLink({
            href: 'https://f-mangini.github.io/tracker-spese/stable/',
            dataset: { launchPath: 'stable/' }
        }, {
            localStorage: launchStorage,
            locationLike: fallbackLocation
        });

        assert.equal(launchStorage.getItem('spesa-tracker-launch-target'), 'stable/');
        assert.equal(fallbackLocation.href, 'https://f-mangini.github.io/tracker-spese/stable/');
    });
};
