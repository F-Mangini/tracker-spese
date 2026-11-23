import {
    assert,
    loadUiViews
} from '../helpers.js';

export default function register(test) {
    test('Titolo header alterna nome app e data odierna con fade e accessibilita tastiera', () => {
        const { HeaderTitleController } = loadUiViews();
        const listeners = {};
        const attributes = {};
        const classes = new Set();
        const timers = [];
        const title = {
            innerHTML: "Where's My Money?",
            textContent: "Where's My Money?",
            dataset: {},
            classList: {
                add: value => classes.add(value),
                remove: value => classes.delete(value)
            },
            setAttribute: (name, value) => {
                attributes[name] = value;
            },
            addEventListener: (name, handler) => {
                listeners[name] = handler;
            }
        };
        const controller = HeaderTitleController.init({
            document: { querySelector: () => title },
            now: () => new Date('2026-07-12T12:00:00'),
            locale: 'it-IT',
            setTimeout: (callback, delay) => {
                timers.push({ callback, delay });
                return timers.length;
            }
        });

        listeners.click();
        assert.equal(HeaderTitleController.getState(title).showingDate, false);
        assert.equal(title.dataset.defaultHtml, undefined);
        assert.equal(title.dataset.showingDate, undefined);
        assert(classes.has('header-title-fade-out'));
        assert.equal(timers[0].delay, 90);

        timers.shift().callback();
        assert.equal(title.textContent, '12 luglio 2026');
        assert.equal(HeaderTitleController.getState(title).showingDate, true);
        assert.equal(title.dataset.showingDate, undefined);
        assert(!classes.has('header-title-fade-out'));
        timers.shift().callback();

        let prevented = false;
        listeners.keydown({
            key: 'Enter',
            preventDefault: () => {
                prevented = true;
            }
        });
        assert.equal(prevented, true);
        assert(classes.has('header-title-fade-out'));
        timers.shift().callback();
        assert.equal(title.innerHTML, "Where's My Money?");
        assert.equal(HeaderTitleController.getState(title).showingDate, false);
        assert.equal(title.dataset.showingDate, undefined);
        timers.shift().callback();
        assert.equal(attributes.role, 'button');
        assert.equal(controller.title, title);
    });

    test('Helper UI normalizzano importi e formattano denaro senza DOM', () => {
        const { AppUI } = loadUiViews();

        assert.equal(AppUI.parseAmountInput('€1,50'), 1.5);
        assert.equal(AppUI.parseAmountInput('1.234,56 euro'), 1234.56);
        assert.equal(AppUI.money(3), '€3');
        assert.equal(AppUI.money(27.00), '€27');
        assert.equal(AppUI.money(3.5), '€3.50');
        assert.equal(AppUI.money(51.34), '€51.34');
        assert.equal(AppUI.money(132.49), '€132');
        assert.equal(AppUI.money(132.59), '€133');
    });

    test('Controller download isola link temporaneo e revoca URL senza App', () => {
        const { DownloadController } = loadUiViews();
        const calls = [];
        const body = {
            appendChild(element) {
                calls.push(['append', element.tagName]);
                element.parentNode = body;
            },
            removeChild(element) {
                calls.push(['remove', element.tagName]);
                element.parentNode = null;
            }
        };
        const documentMock = {
            body,
            createElement(tagName) {
                calls.push(['create', tagName]);
                return {
                    tagName,
                    href: '',
                    download: '',
                    parentNode: null,
                    click() {
                        calls.push(['click', this.href, this.download]);
                    }
                };
            }
        };
        class FakeBlob {
            constructor(parts, options) {
                this.parts = parts;
                this.options = options;
            }
        }
        const urlApi = {
            createObjectURL(blob) {
                calls.push(['create-url', blob.parts, blob.options.type]);
                return 'blob:test-download';
            },
            revokeObjectURL(url) {
                calls.push(['revoke', url]);
            }
        };

        const result = DownloadController.download('contenuto', 'spese.txt', 'text/plain', {
            document: documentMock,
            URL: urlApi,
            Blob: FakeBlob
        });

        assert.deepEqual(result, {
            filename: 'spese.txt',
            mime: 'text/plain',
            url: 'blob:test-download'
        });
        assert.deepEqual(calls, [
            ['create-url', ['contenuto'], 'text/plain'],
            ['create', 'a'],
            ['append', 'a'],
            ['click', 'blob:test-download', 'spese.txt'],
            ['remove', 'a'],
            ['revoke', 'blob:test-download']
        ]);
    });

    test('Dialog conferma prepara scelte e rileva apertura senza dipendere da App', () => {
        const { ConfirmDialog } = loadUiViews();
        const yes = () => {};
        const choices = ConfirmDialog.getConfirmChoices(yes, 'Conferma', 'No', 'btn-warning');
        const hiddenDoc = {
            getElementById() {
                return {
                    classList: {
                        contains: cls => cls === 'hidden'
                    }
                };
            }
        };
        const openDoc = {
            getElementById() {
                return {
                    classList: {
                        contains: () => false
                    }
                };
            }
        };

        assert.deepEqual(
            choices.map(choice => [choice.text, choice.className]),
            [
                ['No', 'btn-secondary'],
                ['Conferma', 'btn-warning']
            ]
        );
        assert.equal(choices[1].onClick, yes);
        assert.equal(ConfirmDialog.isOpen(hiddenDoc), false);
        assert.equal(ConfirmDialog.isOpen(openDoc), true);
    });

    test('Controller conferma collega dialog e history senza dipendere da App', () => {
        const { ConfirmController, UIStack } = loadUiViews();
        const calls = [];
        let closeFromDialog = null;
        const fakeDocument = {};
        const dialog = {
            isOpen(doc) {
                calls.push(['is-open', doc === fakeDocument]);
                return true;
            },
            showChoices(options) {
                calls.push(['show-choices', options.document === fakeDocument, options.message, options.choices.length]);
                options.pushState({ panel: 'confirm' });
                closeFromDialog = options.close;
            },
            showConfirm(options) {
                calls.push(['show-confirm', options.message, options.yesText, options.noText, options.yesClass]);
                options.pushState({ panel: 'confirm' });
                closeFromDialog = options.close;
            },
            close(options) {
                calls.push(['close-dialog', options.document === fakeDocument, options.fromPopstate]);
                options.closeHistory(options.fromPopstate);
            }
        };
        const baseOptions = {
            document: fakeDocument,
            dialog,
            stack: UIStack,
            pushUiState: state => calls.push(['push', state]),
            runHistoryAction: action => calls.push(['history', action.type, action.delta, action.suppressPopstate])
        };

        assert.equal(ConfirmController.isOpen(baseOptions), true);
        assert.equal(ConfirmController.showChoices({
            ...baseOptions,
            message: 'Scegli formato',
            choices: [{ text: 'JSON' }, { text: 'CSV' }]
        }), true);
        closeFromDialog(false);

        assert.equal(ConfirmController.showConfirm({
            ...baseOptions,
            message: 'Eliminare?',
            yesText: 'Si',
            noText: 'No',
            yesClass: 'btn-danger'
        }), true);
        ConfirmController.close({
            ...baseOptions,
            fromPopstate: true
        });

        assert.deepEqual(calls, [
            ['is-open', true],
            ['show-choices', true, 'Scegli formato', 2],
            ['push', { panel: 'confirm' }],
            ['close-dialog', true, false],
            ['history', UIStack.HISTORY_ACTIONS.BACK, -1, true],
            ['show-confirm', 'Eliminare?', 'Si', 'No', 'btn-danger'],
            ['push', { panel: 'confirm' }],
            ['close-dialog', true, true],
            ['history', UIStack.HISTORY_ACTIONS.NONE, 0, false]
        ]);
    });

    test('Controller tema mantiene separati tema persistente e toggle temporaneo', () => {
        const { ThemeController } = loadUiViews();
        const attrs = {};
        const listeners = {};
        const doc = {
            documentElement: {
                setAttribute(name, value) {
                    attrs[name] = value;
                },
                getAttribute(name) {
                    return attrs[name];
                }
            },
            getElementById(id) {
                if (id !== 'theme-toggle') return null;
                return {
                    addEventListener(event, handler) {
                        listeners[event] = handler;
                    }
                };
            }
        };
        const win = {
            matchMedia: () => ({ matches: true })
        };
        const storage = {
            getSettings() {
                return { tema: 'auto' };
            }
        };
        const temporaryThemes = [];

        assert.equal(ThemeController.getSystemTheme(win), 'dark');

        ThemeController.init({
            storage,
            document: doc,
            window: win,
            onTemporaryThemeChange: theme => temporaryThemes.push(theme)
        });

        assert.equal(attrs['data-theme'], 'dark');
        listeners.click();
        assert.equal(attrs['data-theme'], 'light');
        assert.deepEqual(temporaryThemes, ['light']);

        ThemeController.applyTheme('dark', { document: doc, window: win });
        assert.equal(attrs['data-theme'], 'dark');
    });

    test('Controller toast posiziona notifica e resetta timer', () => {
        const { ToastController } = loadUiViews();
        const addedClasses = [];
        const clearedTimers = [];
        const callbacks = [];
        let nextTimerId = 0;

        const toast = {
            textContent: '',
            className: 'toast hidden',
            style: {},
            classList: {
                add(cls) {
                    addedClasses.push(cls);
                    toast.className += ' ' + cls;
                }
            }
        };
        const inputBar = {
            getBoundingClientRect() {
                return { top: 600 };
            }
        };
        const doc = {
            getElementById(id) {
                if (id === 'toast') return toast;
                if (id === 'input-bar') return inputBar;
                return null;
            }
        };
        const timers = {
            setTimeout(callback) {
                callbacks.push(callback);
                nextTimerId += 1;
                return nextTimerId;
            },
            clearTimeout(id) {
                clearedTimers.push(id);
            }
        };

        ToastController.show('Salvato', 'success', {
            document: doc,
            window: { innerHeight: 700 },
            expenseInputActive: true,
            setTimeout: timers.setTimeout,
            clearTimeout: timers.clearTimeout,
            duration: 10
        });

        assert.equal(toast.textContent, 'Salvato');
        assert.equal(toast.className, 'toast success');
        assert.equal(toast.style.bottom, '108px');
        assert.equal(toast.style.top, 'auto');

        ToastController.show('Normale', 'info', {
            document: doc,
            window: { innerHeight: 700 },
            expenseInputActive: false,
            setTimeout: timers.setTimeout,
            clearTimeout: timers.clearTimeout,
            duration: 10
        });

        assert.deepEqual(clearedTimers, [1]);
        assert.equal(toast.textContent, 'Normale');
        assert.equal(toast.className, 'toast info');
        assert.equal(toast.style.bottom, '');
        assert.equal(toast.style.top, '');

        callbacks[1]();

        assert.deepEqual(addedClasses, ['hidden']);
        assert.equal(toast.className, 'toast info hidden');
        assert.equal(toast.style.bottom, '');
        assert.equal(toast.style.top, '');

        ToastController.clear({ clearTimeout: timers.clearTimeout });
    });
};
