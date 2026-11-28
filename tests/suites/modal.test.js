import {
    assert,
    loadUiViews,
    expense
} from '../helpers.js';

export default function register(test) {
    test('Vista modale ordina dropdown cercabili privilegiando match iniziali', () => {
        const { ModalView, ModalInteractions } = loadUiViews();
        const items = [
            { id: 'abbigliamento', emoji: '👕', nome: 'Abbigliamento' },
            { id: 'bar', emoji: '☕', nome: 'Bar' },
            { id: 'supermercato', emoji: '🛒', nome: 'Supermercato' }
        ];

        const filtered = ModalView.getDropdownItems(items, 'b');
        const html = ModalView.renderDropdownList(filtered, 'bar');

        assert.equal(typeof ModalInteractions.createSearchableDropdown, 'function');
        assert.equal(typeof ModalInteractions.createTagInput, 'function');
        assert.deepEqual(filtered.map(item => item.id), ['bar', 'abbigliamento']);
        assert(html.includes('selected'));
        assert(html.includes('data-id="bar"'));
    });

    test('Interazioni dropdown modale aprono e filtrano senza auto scroll', () => {
        const timeouts = [];
        const classes = new Set();
        let activeElement = null;
        const input = {
            dataset: {},
            readOnly: true,
            value: '',
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            focus() {
                activeElement = input;
                if (this.listeners.focus) this.listeners.focus();
            },
            blur() {
                activeElement = null;
            }
        };
        const list = {
            innerHTML: '',
            querySelectorAll() {
                return [];
            }
        };
        const container = {
            innerHTML: '',
            classList: {
                add(cls) { classes.add(cls); },
                remove(cls) { classes.delete(cls); },
                contains(cls) { return classes.has(cls); }
            },
            querySelector(selector) {
                if (selector === '.sd-input') return input;
                if (selector === '.sd-list') return list;
                return null;
            }
        };
        const documentLike = {
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                return id === 'sd-categoria' ? container : null;
            }
        };
        const { ModalInteractions } = loadUiViews();

        ModalInteractions.createSearchableDropdown({
            containerId: 'sd-categoria',
            items: [
                { id: 'bar', emoji: 'x', nome: 'Bar' },
                { id: 'casa', emoji: 'y', nome: 'Casa' }
            ],
            currentValue: 'bar',
            document: documentLike,
            setTimeout(callback, ms) {
                timeouts.push({ callback, ms });
            }
        });

        input.listeners.mousedown({ preventDefault() {} });

        assert(classes.has('open'));
        assert(!timeouts.some(item => item.ms > 0));

        timeouts.length = 0;
        input.listeners.mousedown({ preventDefault() {} });

        assert.equal(input.readOnly, false);
        assert(!timeouts.some(item => item.ms > 0));

        input.value = 'ca';
        input.listeners.input();

        assert(list.innerHTML.includes('Casa'));
        assert(!timeouts.some(item => item.ms > 0));
    });

    test('Interazioni dropdown modale ignorano blur transitorie nei tap successivi', () => {
        const timeouts = [];
        const classes = new Set();
        let activeElement = null;
        const input = {
            dataset: {},
            readOnly: true,
            value: '',
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            focus() {
                activeElement = input;
            },
            blur() {
                activeElement = null;
                if (this.listeners.blur) this.listeners.blur();
            }
        };
        const list = {
            innerHTML: '',
            querySelectorAll() {
                return [];
            },
            getBoundingClientRect() {
                return { top: 368, bottom: 512 };
            }
        };
        const modalBody = {
            scrollTop: 0,
            getBoundingClientRect() {
                return { top: 80, bottom: 360 };
            }
        };
        const container = {
            innerHTML: '',
            classList: {
                add(cls) { classes.add(cls); },
                remove(cls) { classes.delete(cls); },
                contains(cls) { return classes.has(cls); }
            },
            querySelector(selector) {
                if (selector === '.sd-input') return input;
                if (selector === '.sd-list') return list;
                return null;
            },
            closest(selector) {
                return selector === '.modal-body' ? modalBody : null;
            },
            getBoundingClientRect() {
                return { top: 320, bottom: 364 };
            }
        };
        const documentLike = {
            documentElement: { clientHeight: 640 },
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                return id === 'sd-categoria' ? container : null;
            }
        };
        const { ModalInteractions } = loadUiViews();

        ModalInteractions.createSearchableDropdown({
            containerId: 'sd-categoria',
            items: [
                { id: 'bar', emoji: 'x', nome: 'Bar' },
                { id: 'casa', emoji: 'y', nome: 'Casa' }
            ],
            currentValue: 'bar',
            document: documentLike,
            window: { innerHeight: 640, visualViewport: { height: 360 } },
            setTimeout(callback, ms) {
                timeouts.push({ callback, ms });
            }
        });

        input.listeners.mousedown({ preventDefault() {} });
        assert(classes.has('open'));

        timeouts.length = 0;
        input.listeners.mousedown({ preventDefault() {} });
        assert.equal(input.readOnly, false);

        activeElement = null;
        input.listeners.blur();
        activeElement = input;
        timeouts[timeouts.length - 1].callback();

        assert(classes.has('open'));
        assert.equal(input.readOnly, false);

        timeouts.length = 0;
        input.listeners.mousedown({ preventDefault() {} });
        input.listeners.click();

        assert(classes.has('open'));

        timeouts[0].callback();
        activeElement = null;
        input.listeners.blur();
        timeouts[timeouts.length - 1].callback();

        assert(!classes.has('open'));
        assert.equal(input.readOnly, true);
    });

    test('Interazioni dropdown modale non riposizionano input gia attivo', () => {
        const timeouts = [];
        const classes = new Set();
        let activeElement = null;
        const input = {
            dataset: {},
            readOnly: true,
            value: '',
            listeners: {},
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            focus() {
                activeElement = input;
                if (this.listeners.focus) this.listeners.focus();
            },
            blur() {
                activeElement = null;
            }
        };
        const list = {
            innerHTML: '',
            querySelectorAll() {
                return [];
            },
            getBoundingClientRect() {
                return { top: 368, bottom: 548 };
            }
        };
        const modalBody = {
            scrollTop: 0,
            getBoundingClientRect() {
                return { top: 80, bottom: 360 };
            }
        };
        const container = {
            innerHTML: '',
            classList: {
                add(cls) { classes.add(cls); },
                remove(cls) { classes.delete(cls); },
                contains(cls) { return classes.has(cls); }
            },
            querySelector(selector) {
                if (selector === '.sd-input') return input;
                if (selector === '.sd-list') return list;
                return null;
            },
            closest(selector) {
                return selector === '.modal-body' ? modalBody : null;
            },
            getBoundingClientRect() {
                return { top: 320, bottom: 364 };
            }
        };
        const documentLike = {
            documentElement: { clientHeight: 640 },
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                return id === 'sd-categoria' ? container : null;
            }
        };
        const { ModalInteractions } = loadUiViews();
        const runZeroTimers = () => {
            timeouts
                .filter(item => item.ms === 0)
                .forEach(item => item.callback());
        };

        ModalInteractions.createSearchableDropdown({
            containerId: 'sd-categoria',
            items: [
                { id: 'bar', emoji: 'x', nome: 'Bar' },
                { id: 'casa', emoji: 'y', nome: 'Casa' }
            ],
            currentValue: 'bar',
            document: documentLike,
            setTimeout(callback, ms) {
                timeouts.push({ callback, ms });
            }
        });

        input.listeners.mousedown({ preventDefault() {} });
        runZeroTimers();
        input.listeners.mousedown({ preventDefault() {} });
        runZeroTimers();

        assert.equal(input.readOnly, false);
        assert.equal(activeElement, input);

        timeouts.length = 0;
        let prevented = false;
        input.listeners.mousedown({ preventDefault() { prevented = true; } });
        input.listeners.click();

        assert.equal(prevented, false);
        assert.deepEqual(timeouts.map(item => item.ms), [0, 0]);
        assert(!timeouts.some(item => item.ms > 0));

        runZeroTimers();
        timeouts.length = 0;
        input.listeners.click();

        assert.deepEqual(timeouts.map(item => item.ms), []);
    });

    test('Interazioni dropdown e tag modale sbloccano tastiera touch al secondo tap senza chiudersi', () => {
        const { ModalInteractions } = loadUiViews();

        function createMockField({ id, withChips = false }) {
            const timeouts = [];
            const classes = new Set();
            const attributes = new Map([['readonly', '']]);
            const events = [];
            let activeElement = null;

            const input = {
                dataset: {},
                readOnly: true,
                value: '',
                listeners: {},
                setAttribute(name, val) {
                    attributes.set(name, String(val));
                },
                removeAttribute(name) {
                    attributes.delete(name);
                },
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                },
                focus() {
                    events.push('focus');
                    activeElement = input;
                    if (this.listeners.focus) this.listeners.focus();
                },
                blur() {
                    events.push('blur');
                    activeElement = null;
                    if (this.listeners.blur) this.listeners.blur();
                }
            };
            const list = {
                innerHTML: '',
                querySelectorAll() {
                    return [];
                }
            };
            const chipsEl = withChips
                ? {
                    innerHTML: '',
                    querySelectorAll() {
                        return [];
                    }
                }
                : null;
            const container = {
                innerHTML: '',
                classList: {
                    add(cls) { classes.add(cls); },
                    remove(cls) { classes.delete(cls); },
                    contains(cls) { return classes.has(cls); }
                },
                querySelector(selector) {
                    if (selector === '.sd-input') return input;
                    if (selector === '.sd-list') return list;
                    return null;
                }
            };
            const documentLike = {
                get activeElement() {
                    return activeElement;
                },
                getElementById(targetId) {
                    if (targetId === id) return container;
                    if (withChips && targetId === 'tag-chips') return chipsEl;
                    return null;
                }
            };
            const runZeroTimers = () => {
                while (timeouts.some(item => item.ms === 0)) {
                    const pending = timeouts.splice(0, timeouts.length);
                    pending.forEach(item => {
                        if (item.ms === 0) item.callback();
                    });
                }
            };
            const touchEvent = (x, y, onPrevent) => ({
                touches: [{ clientX: x, clientY: y }],
                preventDefault() {
                    if (onPrevent) onPrevent();
                }
            });

            return {
                input,
                classes,
                attributes,
                events,
                documentLike,
                runZeroTimers,
                getActiveElement: () => activeElement,
                setTimeout: (callback, ms) => {
                    timeouts.push({ callback, ms });
                },
                touchEvent
            };
        }

        // 1. Dropdown ricercabile: 1° tap apre readonly, drag > 10px non sblocca, 2° tap fa blur -> focus sbloccando input
        const dd = createMockField({ id: 'sd-categoria' });
        ModalInteractions.createSearchableDropdown({
            containerId: 'sd-categoria',
            items: [
                { id: 'bar', emoji: 'x', nome: 'Bar' },
                { id: 'casa', emoji: 'y', nome: 'Casa' }
            ],
            currentValue: 'bar',
            document: dd.documentLike,
            setTimeout: dd.setTimeout
        });
        dd.input.value = 'x Bar';

        let touchPrevented = false;
        let mousePrevented = false;
        dd.input.listeners.touchstart(dd.touchEvent(100, 300, () => { touchPrevented = true; }));
        assert.equal(dd.input.readOnly, true);
        assert.equal(dd.attributes.has('readonly'), true);
        dd.input.listeners.touchend(dd.touchEvent(100, 300, () => { touchPrevented = true; }));
        dd.input.listeners.mousedown({ preventDefault() { mousePrevented = true; } });
        dd.input.listeners.click();
        dd.runZeroTimers();

        assert.equal(touchPrevented, false);
        assert.equal(mousePrevented, true);
        assert(dd.classes.has('open'));
        assert.equal(dd.input.readOnly, true);
        assert.equal(dd.attributes.has('readonly'), true);
        assert.equal(dd.getActiveElement(), dd.input);

        // Drag verticale (> 10px) deve annullare la preparazione edit e ripristinare readonly
        dd.events.length = 0;
        dd.input.listeners.touchstart(dd.touchEvent(100, 300));
        assert.equal(dd.input.readOnly, false);
        dd.input.listeners.touchmove(dd.touchEvent(100, 320));
        assert.equal(dd.input.readOnly, true);
        assert.equal(dd.attributes.has('readonly'), true);
        dd.input.listeners.touchend(dd.touchEvent(100, 320));
        assert.equal(dd.input.readOnly, true);
        assert.deepEqual(dd.events, []);
        assert.notEqual(dd.input.value, '');

        // 2° tap vero: touchstart rimuove readonly, touchend esegue blur -> focus senza preventDefault
        dd.events.length = 0;
        mousePrevented = false;
        dd.input.listeners.touchstart(dd.touchEvent(100, 300, () => { touchPrevented = true; }));
        assert.equal(dd.input.readOnly, false);
        assert.equal(dd.attributes.has('readonly'), false);

        dd.input.listeners.touchend(dd.touchEvent(100, 300, () => { touchPrevented = true; }));
        assert.equal(touchPrevented, false);
        assert.equal(dd.events[0], 'blur');
        assert.equal(dd.events[1], 'focus');
        assert.equal(dd.input.readOnly, false);
        assert.equal(dd.attributes.has('readonly'), false);
        assert.equal(dd.input.value, '');
        assert(dd.classes.has('open'));
        assert.equal(dd.getActiveElement(), dd.input);

        // Compatibility mousedown/click dopo touchend non richiama preventDefault ne chiude il menu
        dd.input.listeners.mousedown({ preventDefault() { mousePrevented = true; } });
        dd.input.listeners.click();
        dd.runZeroTimers();
        assert.equal(mousePrevented, false);
        assert(dd.classes.has('open'));
        assert.equal(dd.input.readOnly, false);
        assert.equal(dd.getActiveElement(), dd.input);

        // 2a. Tag con suggerimenti disponibili: 1° tap readonly, 2° tap editabile
        const tagWithList = createMockField({ id: 'sd-tags', withChips: true });
        let currentTags = [];
        ModalInteractions.createTagInput({
            containerId: 'sd-tags',
            chipsId: 'tag-chips',
            getTags: () => currentTags,
            setTags: tags => { currentTags = tags; },
            getAllTags: () => ['lavoro', 'casa'],
            document: tagWithList.documentLike,
            setTimeout: tagWithList.setTimeout
        });

        let tagMousePrevented = false;
        tagWithList.input.listeners.touchstart(tagWithList.touchEvent(80, 420));
        assert.equal(tagWithList.input.readOnly, true);
        tagWithList.input.listeners.touchend(tagWithList.touchEvent(80, 420));
        tagWithList.input.listeners.mousedown({ preventDefault() { tagMousePrevented = true; } });
        tagWithList.input.listeners.click();
        tagWithList.runZeroTimers();
        assert.equal(tagMousePrevented, true);
        assert(tagWithList.classes.has('open'));
        assert.equal(tagWithList.input.readOnly, true);

        tagMousePrevented = false;
        tagWithList.events.length = 0;
        tagWithList.input.listeners.touchstart(tagWithList.touchEvent(80, 420));
        assert.equal(tagWithList.input.readOnly, false);
        assert.equal(tagWithList.attributes.has('readonly'), false);
        tagWithList.input.listeners.touchend(tagWithList.touchEvent(80, 420));
        assert.equal(tagWithList.events[0], 'blur');
        assert.equal(tagWithList.events[1], 'focus');
        tagWithList.input.listeners.mousedown({ preventDefault() { tagMousePrevented = true; } });
        tagWithList.input.listeners.click();
        tagWithList.runZeroTimers();
        assert.equal(tagMousePrevented, false);
        assert(tagWithList.classes.has('open'));
        assert.equal(tagWithList.input.readOnly, false);
        assert.equal(tagWithList.getActiveElement(), tagWithList.input);

        // 2b. Tag senza suggerimenti disponibili: 1° tap entra subito in edit senza preventDefault
        const tagEmpty = createMockField({ id: 'sd-tags', withChips: true });
        ModalInteractions.createTagInput({
            containerId: 'sd-tags',
            chipsId: 'tag-chips',
            getTags: () => [],
            setTags: () => {},
            getAllTags: () => [],
            document: tagEmpty.documentLike,
            setTimeout: tagEmpty.setTimeout
        });

        let emptyMousePrevented = false;
        tagEmpty.input.listeners.touchstart(tagEmpty.touchEvent(80, 420));
        assert.equal(tagEmpty.input.readOnly, false);
        assert.equal(tagEmpty.attributes.has('readonly'), false);
        tagEmpty.input.listeners.touchend(tagEmpty.touchEvent(80, 420));
        assert(tagEmpty.classes.has('open'));
        assert.equal(tagEmpty.input.readOnly, false);
        tagEmpty.input.listeners.mousedown({ preventDefault() { emptyMousePrevented = true; } });
        tagEmpty.input.listeners.click();
        tagEmpty.runZeroTimers();
        assert.equal(emptyMousePrevented, false);
        assert(tagEmpty.classes.has('open'));
        assert.equal(tagEmpty.getActiveElement(), tagEmpty.input);
    });

    test('Interazioni dropdown e tag modale su iPhone lasciano nativo il secondo tap senza perdere lo scroll', () => {
        const { ModalInteractions } = loadUiViews();
        const iphoneWindow = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1'
            }
        };

        function createAppleField({ id, withChips = false }) {
            const timeouts = [];
            const classes = new Set();
            const attributes = new Map([['readonly', '']]);
            const docListeners = {};
            let activeElement = null;

            const input = {
                dataset: {},
                readOnly: true,
                value: '',
                listeners: {},
                setAttribute(name, val) {
                    attributes.set(name, String(val));
                },
                removeAttribute(name) {
                    attributes.delete(name);
                },
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                },
                focus() {
                    activeElement = input;
                    if (this.listeners.focus) this.listeners.focus();
                },
                blur() {
                    activeElement = null;
                    if (this.listeners.blur) this.listeners.blur();
                }
            };
            const list = {
                innerHTML: '',
                querySelectorAll() {
                    return [];
                }
            };
            const chipsEl = withChips
                ? {
                    innerHTML: '',
                    contains(node) {
                        return node === chipsEl;
                    },
                    querySelectorAll() {
                        return [];
                    }
                }
                : null;
            const container = {
                innerHTML: '',
                classList: {
                    add(cls) { classes.add(cls); },
                    remove(cls) { classes.delete(cls); },
                    contains(cls) { return classes.has(cls); }
                },
                contains(node) {
                    return node === container || node === input || node === list;
                },
                querySelector(selector) {
                    if (selector === '.sd-input') return input;
                    if (selector === '.sd-list') return list;
                    return null;
                }
            };
            const documentLike = {
                get activeElement() {
                    return activeElement;
                },
                getElementById(targetId) {
                    if (targetId === id) return container;
                    if (withChips && targetId === 'tag-chips') return chipsEl;
                    return null;
                },
                addEventListener(event, handler) {
                    if (!docListeners[event]) docListeners[event] = [];
                    docListeners[event].push(handler);
                },
                removeEventListener(event, handler) {
                    if (!docListeners[event]) return;
                    docListeners[event] = docListeners[event].filter(fn => fn !== handler);
                }
            };
            const emitDoc = (event, payload) => {
                (docListeners[event] || []).forEach(fn => fn(payload));
            };
            const runZeroTimers = () => {
                while (timeouts.some(item => item.ms === 0)) {
                    const pending = timeouts.splice(0, timeouts.length);
                    pending.forEach(item => {
                        if (item.ms === 0) item.callback();
                    });
                }
            };

            return {
                container,
                input,
                classes,
                attributes,
                documentLike,
                emitDoc,
                runZeroTimers,
                getActiveElement: () => activeElement,
                setTimeout: (callback, ms) => {
                    timeouts.push({ callback, ms });
                }
            };
        }

        const dd = createAppleField({ id: 'sd-categoria' });
        ModalInteractions.createSearchableDropdown({
            containerId: 'sd-categoria',
            items: [
                { id: 'bar', emoji: 'x', nome: 'Bar' },
                { id: 'casa', emoji: 'y', nome: 'Casa' }
            ],
            currentValue: 'bar',
            document: dd.documentLike,
            window: iphoneWindow,
            setTimeout: dd.setTimeout
        });
        dd.input.value = 'x Bar';

        // 1° tap: apre la tendina senza focus su input e poi sblocca readonly
        let firstPrevented = false;
        dd.input.listeners.touchstart();
        dd.input.listeners.mousedown({ preventDefault() { firstPrevented = true; } });
        dd.input.listeners.click();
        assert.equal(firstPrevented, true);
        assert(dd.classes.has('open'));
        assert.equal(dd.getActiveElement(), null);

        dd.runZeroTimers();
        assert(dd.classes.has('open'));
        assert.equal(dd.getActiveElement(), null);
        assert.equal(dd.input.readOnly, false);
        assert.equal(dd.attributes.has('readonly'), false);

        // Scroll verticale (> 10px) fuori dal dropdown non deve chiudere la tendina
        const outsideTarget = {};
        dd.emitDoc('touchstart', { target: outsideTarget, touches: [{ clientX: 120, clientY: 200 }] });
        dd.emitDoc('touchmove', { touches: [{ clientX: 120, clientY: 224 }] });
        dd.emitDoc('touchend', { target: outsideTarget });
        assert(dd.classes.has('open'));

        // 2° tap nativo: nessun preventDefault, il focus nativo attiva edit e svuota il testo
        let secondPrevented = false;
        dd.input.listeners.touchstart();
        dd.input.listeners.mousedown({ preventDefault() { secondPrevented = true; } });
        dd.input.focus();
        dd.input.listeners.click();
        dd.runZeroTimers();
        assert.equal(secondPrevented, false);
        assert.equal(dd.getActiveElement(), dd.input);
        assert.equal(dd.input.value, '');
        assert(dd.classes.has('open'));
        assert.equal(dd.input.readOnly, false);

        // Tap esterno senza trascinamento chiude il dropdown e ripristina readonly
        dd.emitDoc('touchstart', { target: outsideTarget, touches: [{ clientX: 50, clientY: 100 }] });
        dd.emitDoc('touchend', { target: outsideTarget });
        dd.runZeroTimers();
        assert(!dd.classes.has('open'));
        assert.equal(dd.input.readOnly, true);
        assert.equal(dd.attributes.has('readonly'), true);
        assert.equal(dd.getActiveElement(), null);

        // Chiusura programmatica via closeDropdown (es. back button modale con tendina non focalizzata)
        dd.input.listeners.mousedown({ preventDefault() {} });
        dd.runZeroTimers();
        assert(dd.classes.has('open'));
        assert.equal(dd.getActiveElement(), null);
        ModalInteractions.closeDropdown(dd.container);
        assert(!dd.classes.has('open'));
        assert.equal(dd.input.readOnly, true);

        // Tag senza suggerimenti disponibili su iPhone parte gia sbloccato per il 1° tap nativo
        const tagEmpty = createAppleField({ id: 'sd-tags', withChips: true });
        ModalInteractions.createTagInput({
            containerId: 'sd-tags',
            chipsId: 'tag-chips',
            getTags: () => [],
            setTags: () => {},
            getAllTags: () => [],
            document: tagEmpty.documentLike,
            window: iphoneWindow,
            setTimeout: tagEmpty.setTimeout
        });

        assert.equal(tagEmpty.input.readOnly, false);
        assert.equal(tagEmpty.attributes.has('readonly'), false);

        let emptyPrevented = false;
        tagEmpty.input.listeners.touchstart();
        tagEmpty.input.listeners.mousedown({ preventDefault() { emptyPrevented = true; } });
        tagEmpty.input.focus();
        tagEmpty.input.listeners.click();
        tagEmpty.runZeroTimers();
        assert.equal(emptyPrevented, false);
        assert(tagEmpty.classes.has('open'));
        assert.equal(tagEmpty.getActiveElement(), tagEmpty.input);
        assert.equal(tagEmpty.input.readOnly, false);
    });

    test('Vista modale calcola suggerimenti tag per ultimo uso, frequenza e creazione', () => {
        const { ModalView } = loadUiViews();
        const spese = [
            expense({ id: 'a', data: '2026-05-10T10:00:00.000Z', tags: ['casa', 'lavoro'] }),
            expense({ id: 'b', data: '2026-05-12T10:00:00.000Z', tags: ['casa', 'viaggio'] }),
            expense({ id: 'c', data: '2026-05-14T10:00:00.000Z', tags: ['salute'] })
        ];
        const allTags = ModalView.getAllTags(spese);
        const stats = ModalView.getTagStats(spese);
        const suggestions = ModalView.getTagSuggestions({ allTags, currentTags: [], filter: '', stats });
        const filteredHtml = ModalView.renderTagList({
            allTags,
            currentTags: ['casa'],
            filter: 'via',
            stats
        });
        const createHtml = ModalView.renderTagList({
            allTags,
            currentTags: [],
            filter: '#nuovo tag',
            stats
        });

        assert.deepEqual(allTags, ['casa', 'lavoro', 'salute', 'viaggio']);
        assert.equal(suggestions[0].tag, 'salute');
        assert(filteredHtml.includes('data-tag="viaggio"'));
        assert(createHtml.includes('data-tag="nuovotag"'));
    });

    test('Controller form modale popola campi, legge dati e collega micro-eventi', () => {
        const { ModalFormController, AppUI } = loadUiViews();
        const calls = [];

        function makeElement(id) {
            const classes = new Set(['picker-open']);
            return {
                id,
                value: '',
                listeners: {},
                classList: {
                    add(cls) {
                        classes.add(cls);
                    },
                    remove(cls) {
                        classes.delete(cls);
                        calls.push(['remove-class', id, cls]);
                    },
                    contains(cls) {
                        return classes.has(cls);
                    }
                },
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                },
                blur() {
                    calls.push(['blur', id]);
                }
            };
        }

        const elements = {
            'edit-importo': makeElement('edit-importo'),
            'edit-descrizione': makeElement('edit-descrizione'),
            'edit-data': makeElement('edit-data'),
            'edit-ora': makeElement('edit-ora'),
            'edit-nota': makeElement('edit-nota')
        };
        const doc = {
            activeElement: elements['edit-data'],
            getElementById(id) {
                return elements[id] || null;
            }
        };

        ModalFormController.fillForm({
            document: doc,
            spesa: expense({
                importo: 12.345,
                descrizione: 'Pranzo',
                data: '2026-05-19T13:45:00.000Z',
                nota: 'nota'
            }),
            toInputDate: date => AppUI.toInputDate(date),
            toInputTime: date => AppUI.toInputTime(date)
        });

        assert.equal(elements['edit-importo'].value, 12.345);
        assert.equal(elements['edit-descrizione'].value, 'Pranzo');
        assert.equal(elements['edit-data'].value, AppUI.toInputDate(new Date('2026-05-19T13:45:00.000Z')));
        assert.equal(elements['edit-ora'].value, AppUI.toInputTime(new Date('2026-05-19T13:45:00.000Z')));
        assert.equal(elements['edit-nota'].value, 'nota');

        elements['edit-importo'].value = '12,35';
        elements['edit-descrizione'].value = '';

        const form = ModalFormController.readForm({
            document: doc,
            parseAmountInput: value => AppUI.parseAmountInput(value),
            getDropdownValue: (id, fallback) => ({ 'sd-categoria': 'ristorante', 'sd-metodo': 'carta' }[id] || fallback),
            getTags: () => ['lavoro']
        });

        assert.equal(form.success, true);
        assert.equal(form.data.importo, 12.35);
        assert.equal(form.data.descrizione, 'Spesa');
        assert.equal(form.data.categoria, 'ristorante');
        assert.equal(form.data.metodo, 'carta');
        assert.equal(form.data.data, '2026-05-19T13:45:00.000Z');
        assert.deepEqual(form.data.tags, ['lavoro']);

        elements['edit-importo'].value = '0';
        assert.equal(
            ModalFormController.readForm({
                document: doc,
                parseAmountInput: value => AppUI.parseAmountInput(value)
            }).error,
            'Importo non valido'
        );

        let viewportHeight = 0;
        const deferred = [];
        ModalFormController.bindPickerFields({
            document: doc,
            bindPicker: el => calls.push(['bind-picker', el.id]),
            getViewportHeight: () => 700,
            setLastViewportHeight: value => { viewportHeight = value; },
            defer: callback => deferred.push(callback)
        });

        elements['edit-data'].listeners.focus();
        elements['edit-data'].listeners.change();
        deferred[0]();

        assert.equal(viewportHeight, 700);

        let enterPrevented = false;
        ModalFormController.bindPlainFieldEnterBlur({ document: doc });
        elements['edit-descrizione'].listeners.keydown({
            key: 'Enter',
            preventDefault() {
                enterPrevented = true;
            }
        });

        ModalFormController.clearPickerVisuals(doc);

        assert.equal(enterPrevented, true);
        assert(calls.some(call => call[0] === 'bind-picker' && call[1] === 'edit-data'));
        assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-data'));
        assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
    });

    test('Picker data e ora modale su iPhone restano nativi senza showPicker ne blur automatico', () => {
        const { ModalFormController, ModalMobileController } = loadUiViews();
        const calls = [];
        const deferred = [];
        const iphoneWindow = {
            navigator: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1'
            },
            addEventListener() {}
        };
        const classes = new Set(['picker-open']);
        let activeElement = null;
        const editData = {
            id: 'edit-data',
            listeners: {},
            classList: {
                add(cls) { classes.add(cls); },
                remove(cls) { classes.delete(cls); },
                contains(cls) { return classes.has(cls); }
            },
            addEventListener(event, handler) {
                this.listeners[event] = handler;
            },
            showPicker() {
                calls.push('showPicker');
            },
            blur() {
                calls.push('blur');
                activeElement = null;
            }
        };
        activeElement = editData;
        const doc = {
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                return id === 'edit-data' ? editData : null;
            },
            addEventListener() {}
        };

        ModalFormController.bindPickerFields({
            document: doc,
            window: iphoneWindow,
            bindPicker: el => ModalMobileController.bindNonStickyNativePicker(el, {
                document: doc,
                window: iphoneWindow
            }),
            defer: callback => deferred.push(callback)
        });

        assert.equal(editData.listeners.pointerdown, undefined);

        editData.listeners.change();
        deferred.forEach(cb => cb());

        assert.deepEqual(calls, []);
        assert.equal(classes.has('picker-open'), false);
        assert.equal(activeElement, editData);

        classes.add('picker-open');
        editData.listeners.blur();
        assert.equal(classes.has('picker-open'), false);
    });

    test('Controller mobile modale isola focus, picker e viewport da App', () => {
        const { ModalMobileController } = loadUiViews();
        const calls = [];
        const timeouts = [];
        const intervals = [];
        const clearedIntervals = [];
        const pushedStates = [];
        const consumedStates = [];
        const docListeners = {};
        const winListeners = {};

        function classList(id, initial = []) {
            const classes = new Set(initial);
            return {
                add(cls) {
                    classes.add(cls);
                    calls.push(['add-class', id, cls]);
                },
                remove(cls) {
                    classes.delete(cls);
                    calls.push(['remove-class', id, cls]);
                },
                contains(cls) {
                    return classes.has(cls);
                }
            };
        }

        function makeElement(id, options = {}) {
            const el = {
                id,
                type: options.type || 'text',
                tagName: options.tagName || 'INPUT',
                inModal: !!options.inModal,
                inDropdown: !!options.inDropdown,
                listeners: {},
                classList: classList(id, options.classes || []),
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                },
                blur() {
                    calls.push(['blur', id]);
                    if (activeElement === el) activeElement = null;
                },
                focus() {
                    calls.push(['focus', id]);
                    activeElement = el;
                },
                matches(selector) {
                    if (selector === 'input[type="date"], input[type="time"]') {
                        return this.tagName === 'INPUT' && ['date', 'time'].includes(this.type);
                    }
                    if (selector === 'input, textarea, select') {
                        return ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName);
                    }
                    return false;
                },
                closest(selector) {
                    return selector === '.searchable-dropdown' && this.inDropdown ? {} : null;
                },
                showPicker() {
                    calls.push(['show-picker', id]);
                }
            };
            return el;
        }

        const sdInput = makeElement('sd-input', { inModal: true, inDropdown: true });
        const modalBody = {
            scrollTop: 0,
            dataset: {},
            style: {},
            getBoundingClientRect() {
                return { top: 80, bottom: 360 };
            }
        };
        const dropdownList = {
            getBoundingClientRect() {
                return { top: 368, bottom: 548 };
            }
        };
        const dropdown = {
            classList: classList('dropdown', ['open']),
            querySelector(selector) {
                if (selector === '.sd-input') return sdInput;
                if (selector === '.sd-list') return dropdownList;
                return null;
            },
            closest(selector) {
                return selector === '.modal-body' ? modalBody : null;
            },
            getBoundingClientRect() {
                return { top: 320, bottom: 364 };
            }
        };
        const modal = {
            style: {},
            contains: el => !!(el && el.inModal),
            querySelector(selector) {
                return selector === '.modal-body' ? modalBody : null;
            }
        };
        const editDesc = makeElement('edit-descrizione', { inModal: true, tagName: 'TEXTAREA' });
        const editData = makeElement('edit-data', { inModal: true, type: 'date', classes: ['picker-open'] });
        const editOra = makeElement('edit-ora', { inModal: true, type: 'time', classes: ['picker-open'] });
        const searchInput = makeElement('search-input');
        const expenseInput = makeElement('expense-input');
        let activeElement = editDesc;
        let modalOpen = true;
        let filterOpen = false;
        let currentPage = 'timeline';
        let lastViewportHeight = 400;
        let timerId = null;
        let interactionActive = false;
        let nextIntervalId = 0;
        const selection = {
            rangeCount: 1,
            removeAllRanges() {
                calls.push('remove-ranges');
                this.rangeCount = 0;
            }
        };
        const elements = {
            'modal-overlay': { style: {} },
            'edit-modal': modal,
            'edit-data': editData,
            'edit-ora': editOra,
            'search-input': searchInput,
            'expense-input': expenseInput
        };
        const doc = {
            documentElement: { clientHeight: 620 },
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                return elements[id] || null;
            },
            querySelector(selector) {
                return selector === '#edit-modal .searchable-dropdown.open' ? dropdown : null;
            },
            addEventListener(event, handler) {
                docListeners[event] = handler;
            }
        };
        const win = {
            innerHeight: 640,
            visualViewport: { height: 500 },
            getSelection: () => selection,
            addEventListener(event, handler) {
                winListeners[event] = handler;
            }
        };
        const options = {
            document: doc,
            window: win,
            isModalOpen: () => modalOpen,
            isFilterOpen: () => filterOpen,
            getCurrentPage: () => currentPage,
            getLastViewportHeight: () => lastViewportHeight,
            setLastViewportHeight: value => { lastViewportHeight = value; },
            getKeyboardWatchTimer: () => timerId,
            setKeyboardWatchTimer: value => { timerId = value; },
            isInteractionActive: () => interactionActive,
            setInteractionActive: value => { interactionActive = value; },
            pushUiState: state => pushedStates.push(state),
            consumeUiState: () => consumedStates.push('consume'),
            clearSelection: () => calls.push('clear-selection'),
            setTimeout: (callback, ms) => {
                timeouts.push({ callback, ms });
                return timeouts.length;
            },
            setInterval: (callback, ms) => {
                intervals.push({ callback, ms });
                nextIntervalId += 1;
                return nextIntervalId;
            },
            clearInterval: id => clearedIntervals.push(id)
        };

        assert.equal(ModalMobileController.getViewportHeight(options), 500);
        assert.equal(ModalMobileController.getOpenDropdown(options), dropdown);
        assert.equal(ModalMobileController.getActivePlainField(options), editDesc);

        ModalMobileController.clearSelection(options);

        assert(calls.some(call => call[0] === 'blur' && call[1] === 'sd-input'));
        assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
        assert(calls.some(call => call[0] === 'remove-class' && call[1] === 'edit-data' && call[2] === 'picker-open'));
        assert(calls.includes('remove-ranges'));

        activeElement = editDesc;
        lastViewportHeight = 300;
        win.visualViewport.height = 450;
        ModalMobileController.handleViewportChange(options);

        assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-descrizione'));
        assert.equal(lastViewportHeight, 450);

        modalBody.scrollTop = 0;
        activeElement = sdInput;
        lastViewportHeight = 650;
        win.visualViewport.height = 360;
        ModalMobileController.handleViewportChange(options);
        assert.equal(modalBody.scrollTop, 0);

        modalOpen = false;
        filterOpen = true;
        activeElement = searchInput;
        lastViewportHeight = 300;
        win.visualViewport.height = 450;
        ModalMobileController.handleViewportChange(options);
        assert(calls.some(call => call[0] === 'blur' && call[1] === 'search-input'));

        filterOpen = false;
        activeElement = expenseInput;
        lastViewportHeight = 300;
        ModalMobileController.handleViewportChange(options);
        assert(calls.some(call => call[0] === 'blur' && call[1] === 'expense-input'));

        modalOpen = true;
        ModalMobileController.pushHistoryState(options);
        ModalMobileController.ensureInteractionState(options);
        assert.equal(interactionActive, true);
        assert.deepEqual(pushedStates, [
            { panel: 'modal' },
            { panel: 'modal-interaction' }
        ]);

        ModalMobileController.releaseInteractionState(options);
        assert.equal(interactionActive, false);
        assert.deepEqual(consumedStates, ['consume']);

        ModalMobileController.startViewportWatch(options);
        assert.equal(timerId, 1);
        assert.equal(intervals[0].ms, 120);
        ModalMobileController.stopViewportWatch(options);
        assert.equal(timerId, null);
        assert.deepEqual(clearedIntervals, [1]);

        timeouts.length = 0;
        activeElement = editData;
        ModalMobileController.bindNonStickyNativePicker(editData, options);
        let pointerPrevented = false;
        let pointerStopped = false;
        editData.listeners.pointerdown({
            preventDefault() {
                pointerPrevented = true;
            },
            stopPropagation() {
                pointerStopped = true;
            }
        });

        assert.equal(pointerPrevented, true);
        assert.equal(pointerStopped, true);
        assert(calls.some(call => call[0] === 'show-picker' && call[1] === 'edit-data'));
        assert.equal(timeouts[0].ms, 0);
        timeouts[0].callback();

        let enterPrevented = false;
        activeElement = editData;
        editData.listeners.keydown({
            key: 'Enter',
            preventDefault() {
                enterPrevented = true;
            }
        });

        assert.equal(enterPrevented, true);
        assert(calls.includes('clear-selection'));

        editData.listeners.keydown({
            key: 'Escape',
            preventDefault() { }
        });

        assert(calls.some(call => call[0] === 'blur' && call[1] === 'edit-data'));
        assert.equal(typeof docListeners.pointerdown, 'function');
        assert.equal(typeof winListeners.focus, 'function');
    });

    test('Controller mobile modale non applica auto scroll o layout alla finestra', () => {
        const { ModalMobileController } = loadUiViews();
        let activeElement = null;
        let lastViewportHeight = 640;
        const modalBody = {
            scrollTop: 120,
            dataset: {},
            style: {},
            getBoundingClientRect() {
                return { top: 80, bottom: 360 };
            }
        };
        const field = {
            inModal: true,
            tagName: 'TEXTAREA',
            type: 'text',
            matches(selector) {
                return selector === 'input, textarea, select';
            },
            closest() {
                return null;
            },
            blur() {
                activeElement = null;
            }
        };
        const overlay = { style: {} };
        const modal = {
            style: {},
            contains(el) {
                return !!(el && el.inModal);
            },
            querySelector(selector) {
                return selector === '.modal-body' ? modalBody : null;
            }
        };
        const doc = {
            get activeElement() {
                return activeElement;
            },
            getElementById(id) {
                if (id === 'modal-overlay') return overlay;
                if (id === 'edit-modal') return modal;
                return null;
            },
            querySelector() {
                return null;
            }
        };
        const win = {
            innerHeight: 640,
            visualViewport: { height: 360, offsetTop: 0 }
        };
        const options = {
            document: doc,
            window: win,
            isModalOpen: () => true,
            getLastViewportHeight: () => lastViewportHeight,
            setLastViewportHeight(value) {
                lastViewportHeight = value;
            }
        };

        activeElement = field;
        ModalMobileController.handleViewportChange(options);

        assert.equal(modalBody.scrollTop, 120);
        assert.equal(modalBody.style.paddingBottom, undefined);
        assert.equal(overlay.style.paddingBottom, undefined);
        assert.equal(modal.style.maxHeight, undefined);
        assert.equal(activeElement, field);
    });

    test('Controller modale coordina apertura, salvataggio e chiusura fuori da App', () => {
        const { ModalController } = loadUiViews();
        const calls = [];
        const docListeners = {};
        const winListeners = {};
        const timers = [];

        function classList(id, initial = []) {
            const classes = new Set(initial);
            return {
                add(cls) {
                    classes.add(cls);
                    calls.push(['add-class', id, cls]);
                },
                remove(cls) {
                    classes.delete(cls);
                    calls.push(['remove-class', id, cls]);
                },
                contains(cls) {
                    return classes.has(cls);
                }
            };
        }

        function element(id, initialClasses = []) {
            return {
                id,
                listeners: {},
                classList: classList(id, initialClasses),
                addEventListener(event, handler) {
                    this.listeners[event] = handler;
                }
            };
        }

        const elements = {
            'modal-close': element('modal-close'),
            'modal-overlay': element('modal-overlay', ['hidden']),
            'btn-save': element('btn-save'),
            'btn-delete': element('btn-delete')
        };
        const body = {
            classList: classList('body')
        };
        const doc = {
            body,
            visibilityState: 'visible',
            getElementById(id) {
                return elements[id] || null;
            },
            addEventListener(event, handler) {
                docListeners[event] = handler;
            }
        };
        const win = {
            matchMedia: () => ({ matches: true }),
            visualViewport: {
                addEventListener(event, handler) {
                    winListeners[`vv:${event}`] = handler;
                }
            },
            addEventListener(event, handler) {
                winListeners[event] = handler;
            }
        };
        const spese = [
            expense({
                id: 'expense-a',
                descrizione: 'Pranzo',
                categoria: 'ristorante',
                metodo: 'carta',
                tags: ['lavoro']
            })
        ];
        let editingId = null;
        let editTags = [];
        let interactionActive = false;
        let suspended = false;
        let currentPage = 'stats';
        let filterOpen = true;
        let readResult = {
            success: true,
            data: { descrizione: 'Pranzo corretto', importo: 12.5 }
        };
        let updateResult = { success: true };
        let deleteResult = { success: true };
        let confirmCallback = null;

        const formController = {
            fillForm(payload) {
                calls.push(['fill-form', payload.spesa.id]);
            },
            readForm(payload) {
                calls.push(['read-form', payload.getTags().join('|')]);
                return readResult;
            },
            bindPickerFields(payload) {
                calls.push('bind-picker-fields');
                payload.bindPicker({ id: 'edit-data' });
            },
            bindPlainFieldEnterBlur() {
                calls.push('bind-plain-fields');
            }
        };
        const mobileController = {
            blurPickerOnReturn(payload) {
                calls.push(['blur-picker-return', !!payload]);
            }
        };
        const options = {
            document: doc,
            window: win,
            formController,
            mobileController,
            getModalMobileOptions: () => ({ from: 'modal-mobile' }),
            getEditingId: () => editingId,
            setEditingId: id => {
                editingId = id;
                calls.push(['editing', id]);
            },
            getExpenses: () => spese,
            categories: [{ id: 'ristorante' }],
            methods: [{ id: 'carta' }],
            setEditTags: tags => {
                editTags = tags;
                calls.push(['tags', tags.join('|')]);
            },
            getEditTags: () => editTags,
            initSearchableDropdown: (containerId, items, currentValue) => {
                calls.push(['dropdown', containerId, currentValue, items.length]);
            },
            initTagInput: () => calls.push('tag-input'),
            releaseFilterSearchBeforeModal: () => calls.push('release-filter-search'),
            isModalInteractionActive: () => interactionActive,
            setModalInteractionActive: value => {
                interactionActive = value;
                calls.push(['interaction', value]);
            },
            setModalInteractionReleaseSuspended: value => {
                suspended = value;
                calls.push(['suspend', value]);
            },
            getViewportHeight: () => 700,
            setLastViewportHeight: value => calls.push(['viewport', value]),
            startModalViewportWatch: () => calls.push('start-watch'),
            stopModalViewportWatch: () => calls.push('stop-watch'),
            pushModalHistoryState: () => calls.push('push-modal-history'),
            clearModalSelection: () => calls.push('clear-selection'),
            runHistoryAction: action => calls.push(['history', action]),
            getCloseHistoryAction: payload => ({ type: 'close-history', payload }),
            parseAmountInput: value => Number(value),
            getDropdownValue: (_id, fallback) => fallback,
            updateExpense: data => {
                calls.push(['update-expense', data.descrizione]);
                return updateResult;
            },
            deleteExpense: () => {
                calls.push(['delete-expense', editingId]);
                return deleteResult;
            },
            isFilterOpen: () => filterOpen,
            recalcSliderMax: () => calls.push('recalc-slider'),
            closeModal: fromPopstate => calls.push(['close-modal', fromPopstate]),
            saveEdit: () => calls.push('save-edit'),
            showConfirm: (_message, onYes) => {
                confirmCallback = onYes;
                calls.push('confirm');
            },
            closeConfirm: () => calls.push('close-confirm'),
            showToast: (message, type) => calls.push(['toast', type, message]),
            renderTimeline: () => calls.push('render-timeline'),
            getCurrentPage: () => currentPage,
            renderStats: () => calls.push('render-stats'),
            bindNonStickyNativePicker: el => calls.push(['bind-picker', el.id]),
            handleModalViewportChange: () => calls.push('viewport-change'),
            handlePopstate: () => calls.push('popstate'),
            toInputDate: () => '2026-05-20',
            toInputTime: () => '12:00',
            setTimeout: (callback, ms) => {
                timers.push({ callback, ms });
                return timers.length;
            }
        };

        assert.equal(ModalController.isOpen(options), false);

        ModalController.init(options);

        assert.equal(typeof elements['modal-close'].listeners.click, 'function');
        assert.equal(typeof elements['modal-overlay'].listeners.click, 'function');
        assert.equal(typeof elements['btn-save'].listeners.click, 'function');
        assert.equal(typeof elements['btn-delete'].listeners.click, 'function');
        assert.equal(typeof docListeners.keydown, 'function');
        assert.equal(typeof winListeners.resize, 'function');
        assert.equal(typeof winListeners['vv:resize'], 'function');
        assert(calls.includes('bind-picker-fields'));
        assert(calls.includes('bind-plain-fields'));

        let enterPrevented = false;
        editingId = 'expense-a';
        elements['modal-overlay'].classList.remove('hidden');
        docListeners.keydown({
            key: 'Enter',
            target: {
                tagName: 'TEXTAREA',
                closest(selector) {
                    return selector === '#edit-modal' ? {} : null;
                }
            },
            preventDefault() {
                enterPrevented = true;
            }
        });

        assert.equal(enterPrevented, true);
        assert(calls.includes('save-edit'));

        elements['btn-delete'].listeners.click();
        assert.equal(typeof confirmCallback, 'function');
        confirmCallback();

        assert(calls.includes('confirm'));
        assert(calls.some(call => call[0] === 'delete-expense'));
        assert(calls.includes('recalc-slider'));
        assert(calls.some(call => call[0] === 'close-modal'));
        assert(calls.includes('render-timeline'));
        assert(calls.includes('render-stats'));

        assert.equal(ModalController.open(options, 'missing'), false);
        assert.equal(ModalController.open(options, 'expense-a'), true);
        assert.equal(editingId, 'expense-a');
        assert.deepEqual(editTags, ['lavoro']);
        assert.equal(ModalController.isOpen(options), true);
        assert(calls.some(call => call[0] === 'fill-form' && call[1] === 'expense-a'));
        assert(calls.includes('release-filter-search'));
        assert(calls.some(call => call[0] === 'dropdown' && call[1] === 'sd-categoria'));
        assert(calls.some(call => call[0] === 'dropdown' && call[1] === 'sd-metodo'));
        assert(calls.includes('tag-input'));
        assert(calls.includes('start-watch'));
        assert(calls.includes('push-modal-history'));

        assert.equal(ModalController.save(options), true);
        assert(calls.some(call => call[0] === 'read-form'));
        assert(calls.some(call => call[0] === 'update-expense' && call[1] === 'Pranzo corretto'));

        readResult = { success: false, error: 'Importo non valido' };
        assert.equal(ModalController.save(options), false);
        assert(calls.some(call => call[0] === 'toast' && call[2] === 'Importo non valido'));

        readResult = {
            success: true,
            data: { descrizione: 'Errore', importo: 1 }
        };
        updateResult = { success: false, error: 'Nope' };
        assert.equal(ModalController.save(options), false);
        assert(calls.some(call => call[0] === 'toast' && call[2] === 'Nope'));

        interactionActive = true;
        editingId = 'expense-a';
        ModalController.close(options, false);

        assert.equal(editingId, null);
        assert.equal(interactionActive, false);
        assert.equal(suspended, false);
        assert(calls.includes('clear-selection'));
        assert(calls.includes('stop-watch'));
        assert.equal(timers[timers.length - 1].ms, 280);
        assert(calls.some(call =>
            call[0] === 'history' &&
            call[1].payload.steps === 2 &&
            call[1].payload.fromPopstate === false
        ));

        timers[timers.length - 1].callback();
        assert(elements['modal-overlay'].classList.contains('hidden'));
    });

    test('Controller mobile modale blocca lo scroll orizzontale sugli overlay preservando scroll verticale e campi editabili', () => {
        const { ModalMobileController } = loadUiViews();

        function makeOverlay() {
            const listeners = {};
            return {
                listeners,
                addEventListener(event, handler) {
                    listeners[event] = handler;
                }
            };
        }

        const editOverlay = makeOverlay();
        const exportOverlay = makeOverlay();
        const boundCount = ModalMobileController.bindOverlayTouchLock({
            document: {
                querySelectorAll: selector => (selector === '.overlay' ? [editOverlay, exportOverlay] : [])
            }
        });

        assert.equal(boundCount, 2);

        const modalBody = { scrollHeight: 500, clientHeight: 300 };
        const sdList = { scrollHeight: 220, clientHeight: 144 };

        function targetWith(matches) {
            return {
                closest(selector) {
                    const parts = String(selector).split(',').map(part => part.trim());
                    for (const part of parts) {
                        if (matches[part]) return matches[part];
                    }
                    return null;
                }
            };
        }

        function runMove(overlay, target, start, end) {
            let prevented = false;
            overlay.listeners.touchstart({ touches: [{ clientX: start[0], clientY: start[1] }] });
            overlay.listeners.touchmove({
                target,
                touches: [{ clientX: end[0], clientY: end[1] }],
                preventDefault() { prevented = true; }
            });
            overlay.listeners.touchend({});
            return prevented;
        }

        const backdropTarget = targetWith({});
        assert.equal(runMove(editOverlay, backdropTarget, [100, 100], [100, 130]), true);

        const bodyTarget = targetWith({ '.modal-body': modalBody });
        assert.equal(runMove(editOverlay, bodyTarget, [100, 100], [122, 102]), true);
        assert.equal(runMove(editOverlay, bodyTarget, [100, 100], [102, 128]), false);

        modalBody.scrollHeight = 280;
        assert.equal(runMove(editOverlay, bodyTarget, [100, 100], [102, 128]), true);
        modalBody.scrollHeight = 500;

        const editableTextarea = { tagName: 'TEXTAREA', readOnly: false, scrollWidth: 240, clientWidth: 160 };
        const editableTarget = targetWith({
            'textarea': editableTextarea,
            '.modal-body': modalBody
        });
        assert.equal(runMove(editOverlay, editableTarget, [100, 100], [130, 100]), false);

        const closedDropdownInput = { tagName: 'TEXTAREA', readOnly: true, scrollWidth: 160, clientWidth: 160 };
        const closedDropdownTarget = targetWith({
            'textarea': closedDropdownInput,
            '.modal-body': modalBody
        });
        assert.equal(runMove(editOverlay, closedDropdownTarget, [100, 100], [130, 100]), true);
        assert.equal(runMove(editOverlay, closedDropdownTarget, [100, 100], [100, 130]), false);

        const listTarget = targetWith({ '.sd-list': sdList });
        assert.equal(runMove(exportOverlay, listTarget, [50, 50], [70, 52]), true);
        assert.equal(runMove(exportOverlay, listTarget, [50, 50], [52, 80]), false);
    });
};
