/* ============================================
   NAVIGATION CONTROLLER - wiring pagine e scroll
   ============================================ */

const NavigationController = (() => {
    const TAP_MOVE_LIMIT = 10;
    const SYNTHETIC_CLICK_SUPPRESS_MS = 700;

    const PAGE_ORDER = ['timeline', 'stats', 'settings'];
    const SWIPE_MIN_DISTANCE = 60;
    const SWIPE_AXIS_RATIO = 1.25;
    const SWIPE_FLICK_MIN_DISTANCE = 24;
    const SWIPE_FLICK_MIN_VELOCITY = 0.45;
    const SWIPE_FLICK_MAX_DURATION_MS = 220;
    const SWIPE_TRANSITION_MS = 180;

    function noop() { }

    function getDocument(options) {
        return options.document || document;
    }

    function getCurrentPage(options) {
        return typeof options.getCurrentPage === 'function'
            ? options.getCurrentPage()
            : options.currentPage;
    }

    function setCurrentPage(options, page) {
        if (typeof options.setCurrentPage === 'function') {
            options.setCurrentPage(page);
        } else {
            options.currentPage = page;
        }
    }

    function getPageScrollTop(options) {
        return options.pageScrollTop || {};
    }

    function setRestoringPageScroll(options, value) {
        if (typeof options.setRestoringPageScroll === 'function') {
            options.setRestoringPageScroll(value);
        } else {
            options.restoringPageScroll = value;
        }
    }

    function isRestoringPageScroll(options) {
        return typeof options.isRestoringPageScroll === 'function'
            ? options.isRestoringPageScroll()
            : !!options.restoringPageScroll;
    }

    function deferFrame(options, callback) {
        const frame = options.requestAnimationFrame ||
            (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

        if (frame) frame(callback);
        else callback();
    }

    function deferTick(options, callback) {
        const defer = options.defer || (callback => setTimeout(callback, 0));
        defer(callback);
    }

    function getEventTime(event) {
        const eventTime = Number(event && event.timeStamp);
        return Number.isFinite(eventTime) && eventTime >= 0
            ? eventTime
            : Date.now();
    }

    function getNavigationHistoryAction(options, payload) {
        if (typeof options.getNavigationHistoryAction === 'function') {
            return options.getNavigationHistoryAction(payload);
        }
        return UIStack.getNavigationHistoryAction(payload);
    }

    function bindImmediateTap(button, handler) {
        if (!button || typeof button.addEventListener !== 'function') return;

        let touchStart = null;
        let lastImmediateTap = 0;

        button.addEventListener('click', event => {
            if (
                event &&
                lastImmediateTap > 0 &&
                Date.now() - lastImmediateTap < SYNTHETIC_CLICK_SUPPRESS_MS
            ) {
                if (typeof event.preventDefault === 'function') event.preventDefault();
                return;
            }

            handler(event);
        });

        button.addEventListener('touchstart', event => {
            const touch = event.touches && event.touches[0];
            touchStart = touch
                ? { x: touch.clientX, y: touch.clientY }
                : null;
        }, { passive: true });

        button.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!touchStart || !touch) return;

            const moved = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
            touchStart = null;
            if (moved > TAP_MOVE_LIMIT || button.disabled) return;

            lastImmediateTap = Date.now();
            if (typeof event.preventDefault === 'function') event.preventDefault();
            handler(event);
        }, { passive: false });

        button.addEventListener('touchcancel', () => {
            touchStart = null;
        }, { passive: true });
    }

    function init(options = {}) {
        const doc = getDocument(options);

        doc.querySelectorAll('.nav-btn').forEach(btn => {
            bindImmediateTap(btn, () => navigateTo(options, btn.dataset.page));
        });

        setupPageScrollTracking(options);
        setupPageSwipe(options);
    }

    function getAdjacentPage(currentPage, deltaX) {
        const currentIndex = PAGE_ORDER.indexOf(currentPage);
        if (currentIndex === -1 || deltaX === 0) return null;

        const targetIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
        return PAGE_ORDER[targetIndex] || null;
    }

    function getSwipeTargetPage(currentPage, deltaX, deltaY) {
        if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE) return null;
        if (Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_AXIS_RATIO) return null;
        return getAdjacentPage(currentPage, deltaX);
    }

    function shouldCompleteSwipeGesture(deltaX, deltaY, durationMs, width = 360) {
        const horizontalDistance = Math.abs(Number(deltaX) || 0);
        const verticalDistance = Math.abs(Number(deltaY) || 0);
        const distanceThreshold = Math.max(SWIPE_MIN_DISTANCE, width * 0.18);

        if (horizontalDistance >= distanceThreshold) return true;

        const duration = Number(durationMs);
        if (!Number.isFinite(duration) || duration <= 0 ||
            duration > SWIPE_FLICK_MAX_DURATION_MS) return false;

        return horizontalDistance >= SWIPE_FLICK_MIN_DISTANCE &&
            horizontalDistance >= verticalDistance * SWIPE_AXIS_RATIO &&
            horizontalDistance / duration >= SWIPE_FLICK_MIN_VELOCITY;
    }

    function shouldIgnoreSwipeTarget(target) {
        if (!target || typeof target.closest !== 'function') return false;
        return !!target.closest('input, textarea, select, button, a, canvas, [data-page-swipe-ignore]');
    }

    function setSwipeTransform(element, x, animate = false) {
        if (!element || !element.style) return;
        element.style.transition = animate
            ? `transform ${SWIPE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : 'none';
        element.style.transform = `translate3d(${x}px, 0, 0)`;
    }

    function resetSwipeElement(element) {
        if (!element) return;
        element.classList.remove('page-swipe-layer', 'page-swipe-current', 'page-swipe-preview');
        if (!element.style) return;
        ['transform', 'transition', 'top', 'left', 'width', 'height', 'minHeight'].forEach(property => {
            element.style[property] = '';
        });
    }

    function setStyleProperty(element, name, value) {
        if (!element || !element.style) return;
        if (typeof element.style.setProperty === 'function') {
            element.style.setProperty(name, value);
        } else {
            element.style[name] = value;
        }
    }

    function clearStyleProperty(element, name) {
        if (!element || !element.style) return;
        if (typeof element.style.removeProperty === 'function') {
            element.style.removeProperty(name);
        } else {
            element.style[name] = '';
        }
    }

    function setElementHidden(element, hidden) {
        if (!element || !element.classList) return;
        if (hidden) element.classList.add('hidden');
        else element.classList.remove('hidden');
    }

    function resetSwipeBanners(state) {
        (state.bannerRecords || []).forEach(record => {
            const { element, pageElement, transform, transition } = record;
            if (element && element.style) {
                element.classList.remove('page-swipe-banner');
                element.style.transform = transform;
                element.style.transition = transition;
            }
            if (pageElement) {
                pageElement.classList.remove('page-swipe-mask-aligned');
                clearStyleProperty(pageElement, '--page-swipe-banner-y');
            }
        });
        state.bannerRecords = [];
    }

    function finalizeSwipeState(state) {
        state.touchStart = null;
        state.currentElement = null;
        state.targetElement = null;
        state.targetPage = null;
        state.horizontal = false;
        state.vertical = false;
        state.deltaX = 0;
        state.deltaY = 0;
        state.gestureDurationMs = 0;
        state.transitioning = false;
        state.transitionTimer = null;
        state.settleTransition = null;
        if (state.preparedPages && typeof state.preparedPages.clear === 'function') {
            state.preparedPages.clear();
        }
    }

    function settleSwipeBanners(options, state, main, onSettled, attempt = 0,
        transitionToken = state.transitionToken) {
        if (transitionToken !== state.transitionToken) return;

        const mainRect = typeof main.getBoundingClientRect === 'function'
            ? main.getBoundingClientRect()
            : { top: 0 };
        const targetTop = (Number(mainRect.top) || 0) + 12;
        let needsAnotherFrame = false;

        (state.bannerRecords || []).forEach(record => {
            const { element, pageElement, transform, bannerHidden } = record;
            if (bannerHidden || !element || !element.style ||
                !pageElement || pageElement.classList.contains('hidden') ||
                typeof element.getBoundingClientRect !== 'function') return;

            // Misura la quota naturale senza mostrare il frame intermedio. Se
            // Chromium conserva per un frame il vecchio calcolo sticky, riapplica
            // subito una compensazione e riprova al frame successivo.
            element.style.transform = transform;
            const naturalRect = element.getBoundingClientRect();
            const offsetY = targetTop - (Number(naturalRect.top) || 0);

            if (Math.abs(offsetY) > 0.5) {
                element.style.transform = 'translate3d(0, ' + offsetY + 'px, 0)';
                setStyleProperty(pageElement, '--page-swipe-banner-y', offsetY + 'px');
                needsAnotherFrame = true;
            }
        });

        if (needsAnotherFrame && attempt < 3) {
            deferFrame(options, () => {
                settleSwipeBanners(
                    options,
                    state,
                    main,
                    onSettled,
                    attempt + 1,
                    transitionToken
                );
            });
            return;
        }

        resetSwipeBanners(state);
        onSettled();
    }

    function getElementPaddingTop(options, element) {
        const doc = getDocument(options);
        const view = options.window || doc.defaultView ||
            (typeof window !== 'undefined' ? window : null);
        if (!view || typeof view.getComputedStyle !== 'function') return 0;

        const paddingTop = Number.parseFloat(view.getComputedStyle(element).paddingTop);
        return Number.isFinite(paddingTop) ? paddingTop : 0;
    }

    function alignSwipeBanner(options, state, main, pageElement) {
        if (!pageElement || typeof pageElement.querySelector !== 'function') return;

        const banner = pageElement.querySelector('#timeline-summary, .stats-sticky-header');
        if (!banner || !banner.style || typeof banner.getBoundingClientRect !== 'function') return;
        if ((state.bannerRecords || []).some(record => record.element === banner)) return;

        const mainRect = typeof main.getBoundingClientRect === 'function'
            ? main.getBoundingClientRect()
            : { top: 0 };
        const bannerRect = banner.getBoundingClientRect();
        const bannerHidden = banner.classList.contains('hidden') ||
            (Number(bannerRect.height) || 0) <= 0;
        const record = {
            element: banner,
            pageElement,
            transform: banner.style.transform || '',
            transition: banner.style.transition || '',
            bannerHidden
        };

        state.bannerRecords.push(record);
        pageElement.classList.add('page-swipe-mask-aligned');

        if (bannerHidden) {
            const isPreview = pageElement.classList.contains('page-swipe-preview');
            const pageRect = isPreview &&
                typeof pageElement.getBoundingClientRect === 'function'
                ? pageElement.getBoundingClientRect()
                : mainRect;
            const pagePaddingTop = isPreview
                ? getElementPaddingTop(options, pageElement)
                : 0;
            const maskOffsetY = isPreview
                ? Math.max(
                    0,
                    (Number(mainRect.top) || 0) -
                        (Number(pageRect.top) || 0) -
                        pagePaddingTop
                )
                : 0;

            setStyleProperty(
                pageElement,
                '--page-swipe-banner-y',
                maskOffsetY + 'px'
            );
            return;
        }

        const offsetY = (Number(mainRect.top) || 0) + 12 - (Number(bannerRect.top) || 0);
        banner.classList.add('page-swipe-banner');
        banner.style.transition = 'none';
        setStyleProperty(pageElement, '--page-swipe-banner-y', offsetY + 'px');
        banner.style.transform = 'translate3d(0, ' + offsetY + 'px, 0)';
    }

    function resetSwipeInput(state, keepNavigationVisibility = false) {
        const inputBar = state.inputBar;
        if (!inputBar) return;

        inputBar.classList.remove('page-swipe-input');
        clearStyleProperty(inputBar, '--page-swipe-input-x');
        clearStyleProperty(inputBar, '--page-swipe-input-transition');

        if (!keepNavigationVisibility) {
            setElementHidden(inputBar, !!state.inputWasHidden);
        }

        state.inputBar = null;
        state.inputWasHidden = false;
        state.inputRole = null;
    }

    function updateSwipeInput(options, state, currentPage, targetPage, currentX, targetX) {
        const inputBar = getDocument(options).getElementById('input-bar');
        if (!inputBar) return;

        if (!state.inputBar) {
            state.inputBar = inputBar;
            state.inputWasHidden = inputBar.classList.contains('hidden');
        }

        const timelineInputVisible = !(
            typeof options.shouldHideTimelineInputBar === 'function' &&
            options.shouldHideTimelineInputBar()
        );
        const role = timelineInputVisible && currentPage === 'timeline'
            ? 'current'
            : (timelineInputVisible && targetPage === 'timeline' ? 'target' : null);

        if (!role) {
            inputBar.classList.remove('page-swipe-input');
            clearStyleProperty(inputBar, '--page-swipe-input-x');
            clearStyleProperty(inputBar, '--page-swipe-input-transition');
            setElementHidden(inputBar, !!state.inputWasHidden);
            state.inputRole = null;
            return;
        }

        state.inputRole = role;
        inputBar.classList.remove('hidden');
        inputBar.classList.add('page-swipe-input');
        setStyleProperty(inputBar, '--page-swipe-input-transition', 'none');
        setStyleProperty(inputBar, '--page-swipe-input-x', `${role === 'current' ? currentX : targetX}px`);
    }

    function finishSwipeInput(state, width, shouldComplete) {
        if (!state.inputBar || !state.inputRole) return;

        const currentEnd = shouldComplete
            ? (state.deltaX < 0 ? -width : width)
            : 0;
        const targetEnd = shouldComplete
            ? 0
            : (state.deltaX < 0 ? width : -width);

        setStyleProperty(
            state.inputBar,
            '--page-swipe-input-x',
            `${state.inputRole === 'current' ? currentEnd : targetEnd}px`
        );
        setStyleProperty(
            state.inputBar,
            '--page-swipe-input-transition',
            `transform ${SWIPE_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        );
    }

    function hidePreview(state) {
        resetSwipeBanners(state);
        if (!state.targetElement) return;
        resetSwipeElement(state.targetElement);
        state.targetElement.classList.add('hidden');
        state.targetElement = null;
        state.targetPage = null;
    }

    function cleanupSwipe(options, main, state, keepTargetVisible = false,
        beforeBannerReset = null, settleVisibleBanner = false,
        transitionToken = state.transitionToken) {
        if (main.classList) main.classList.remove('page-swipe-active');
        resetSwipeInput(state, keepTargetVisible);
        resetSwipeElement(state.currentElement);

        if (state.targetElement) {
            const targetElement = state.targetElement;
            resetSwipeElement(targetElement);
            if (!keepTargetVisible) targetElement.classList.add('hidden');
        }
        if (typeof beforeBannerReset === 'function') beforeBannerReset();

        if (settleVisibleBanner) {
            settleSwipeBanners(
                options,
                state,
                main,
                () => finalizeSwipeState(state),
                0,
                transitionToken
            );
            return;
        }

        resetSwipeBanners(state);
        finalizeSwipeState(state);
    }

    function prepareSwipePreview(options, main, state, targetPage) {
        if (state.targetPage === targetPage && state.targetElement) return;
        hidePreview(state);

        const doc = getDocument(options);
        const currentPage = getCurrentPage(options);
        const currentElement = doc.getElementById(`page-${currentPage}`);
        const targetElement = doc.getElementById(`page-${targetPage}`);
        if (!currentElement || !targetElement) return;

        currentElement.classList.remove('page-nav-enter');
        targetElement.classList.remove('page-nav-enter');
        targetElement.classList.remove('hidden');
        currentElement.classList.add('page-swipe-layer', 'page-swipe-current');
        targetElement.classList.add('page-swipe-layer', 'page-swipe-preview');

        if (targetElement.style) {
            const targetScrollTop = getPageScrollTop(options)[targetPage] || 0;
            const previewTop = (main.scrollTop || 0) - targetScrollTop;
            const previewHeight = (main.clientHeight || 0) + targetScrollTop;

            targetElement.style.top = `${previewTop}px`;
            targetElement.style.left = '0';
            targetElement.style.width = '100%';
            targetElement.style.height = `${previewHeight}px`;
            targetElement.style.minHeight = `${previewHeight}px`;
        }

        if (!state.preparedPages.has(targetPage)) {
            syncPageContent(options, targetPage);
            state.preparedPages.add(targetPage);
        }

        if (main.classList) main.classList.add('page-swipe-active');
        state.currentElement = currentElement;
        state.targetElement = targetElement;
        state.targetPage = targetPage;
        alignSwipeBanner(options, state, main, currentElement);
        alignSwipeBanner(options, state, main, targetElement);
    }

    function updateSwipePreview(options, main, state, deltaX, deltaY, event) {
        if (state.vertical || state.transitioning) return false;

        if (!state.horizontal) {
            if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 10) return false;
            if (Math.abs(deltaY) >= Math.abs(deltaX)) {
                state.vertical = true;
                return false;
            }
            state.horizontal = true;
        }

        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        state.deltaX = deltaX;
        state.deltaY = deltaY;

        const targetPage = getAdjacentPage(getCurrentPage(options), deltaX);
        if (!targetPage) {
            hidePreview(state);
            const currentElement = getDocument(options).getElementById(`page-${getCurrentPage(options)}`);
            state.currentElement = currentElement;
            if (currentElement) currentElement.classList.add('page-swipe-layer', 'page-swipe-current');
            const resistedX = deltaX * 0.18;
            setSwipeTransform(currentElement, resistedX);
            alignSwipeBanner(options, state, main, currentElement);
            updateSwipeInput(
                options,
                state,
                getCurrentPage(options),
                null,
                resistedX,
                resistedX
            );
            return true;
        }

        prepareSwipePreview(options, main, state, targetPage);
        const width = main.clientWidth || 360;
        const targetX = deltaX + (deltaX < 0 ? width : -width);
        setSwipeTransform(state.currentElement, deltaX);
        setSwipeTransform(state.targetElement, targetX);
        updateSwipeInput(
            options,
            state,
            getCurrentPage(options),
            targetPage,
            deltaX,
            targetX
        );
        return true;
    }

    function finishSwipe(options, main, state, forceCancel = false) {
        if (!state.horizontal || state.vertical) {
            cleanupSwipe(options, main, state);
            return;
        }

        const width = main.clientWidth || 360;
        const targetPage = state.targetPage;
        const shouldComplete = !forceCancel && !!targetPage &&
            shouldCompleteSwipeGesture(
                state.deltaX,
                state.deltaY,
                state.gestureDurationMs,
                width
            );
        state.transitioning = true;
        const transitionToken = ++state.transitionToken;

        setSwipeTransform(state.currentElement, shouldComplete
            ? (state.deltaX < 0 ? -width : width)
            : 0, true);
        setSwipeTransform(state.targetElement, shouldComplete
            ? 0
            : (state.deltaX < 0 ? width : -width), true);
        finishSwipeInput(state, width, shouldComplete);

        const setTimer = options.setTimeout ||
            (typeof setTimeout === 'function' ? setTimeout : (callback => callback()));

        const settleTransition = () => {
            if (!state.transitioning || transitionToken !== state.transitionToken) return;

            const clearTimer = options.clearTimeout ||
                (typeof clearTimeout === 'function' ? clearTimeout : null);
            if (clearTimer && state.transitionTimer != null) {
                clearTimer(state.transitionTimer);
            }
            state.transitionTimer = null;
            state.settleTransition = null;

            let navigated = false;
            if (shouldComplete) {
                navigateTo(options, targetPage, false, {
                    animatePage: false,
                    skipPageRender: true,
                    skipScrollRestore: true
                });
                navigated = getCurrentPage(options) === targetPage;
            }
            cleanupSwipe(options, main, state, navigated, navigated ? () => {
                restorePageScroll(options, targetPage, { immediate: true });
            } : null, navigated, transitionToken);
        };

        state.settleTransition = settleTransition;
        const timerId = setTimer(settleTransition, SWIPE_TRANSITION_MS);
        if (state.transitioning && state.settleTransition === settleTransition) {
            state.transitionTimer = timerId;
        }
    }

    function interruptSwipeTransition(options, main, state) {
        if (!state.transitioning) return;

        const settleTransition = state.settleTransition;
        if (typeof settleTransition === 'function') settleTransition();
        if (!state.transitioning) return;

        state.transitionToken += 1;
        resetSwipeBanners(state);
        finalizeSwipeState(state);
    }

    function setupPageSwipe(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main || typeof main.addEventListener !== 'function') return;

        const state = {
            touchStart: null,
            currentElement: null,
            targetElement: null,
            targetPage: null,
            horizontal: false,
            vertical: false,
            deltaX: 0,
            deltaY: 0,
            gestureDurationMs: 0,
            transitioning: false,
            transitionToken: 0,
            transitionTimer: null,
            settleTransition: null,
            bannerRecords: [],
            preparedPages: new Set(),
            inputBar: null,
            inputWasHidden: false,
            inputRole: null
        };

        main.addEventListener('touchstart', event => {
            interruptSwipeTransition(options, main, state);
            const touch = event.touches && event.touches[0];
            if (!touch || shouldIgnoreSwipeTarget(event.target)) {
                state.touchStart = null;
                return;
            }

            state.touchStart = {
                x: touch.clientX,
                y: touch.clientY,
                time: getEventTime(event)
            };
            state.horizontal = false;
            state.vertical = false;
            state.deltaX = 0;
            state.deltaY = 0;
            state.gestureDurationMs = 0;
        }, { passive: true });

        main.addEventListener('touchmove', event => {
            const touch = event.touches && event.touches[0];
            if (!state.touchStart || !touch) return;

            updateSwipePreview(
                options,
                main,
                state,
                touch.clientX - state.touchStart.x,
                touch.clientY - state.touchStart.y,
                event
            );
        }, { passive: false });

        main.addEventListener('touchend', event => {
            const touch = event.changedTouches && event.changedTouches[0];
            if (!state.touchStart || !touch) return;

            state.gestureDurationMs = Math.max(
                0,
                getEventTime(event) - state.touchStart.time
            );
            updateSwipePreview(
                options,
                main,
                state,
                touch.clientX - state.touchStart.x,
                touch.clientY - state.touchStart.y,
                event
            );
            finishSwipe(options, main, state);
        }, { passive: false });

        main.addEventListener('touchcancel', () => {
            if (!state.touchStart) return;
            finishSwipe(options, main, state, true);
        }, { passive: true });
    }

    function setupPageScrollTracking(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        main.addEventListener('scroll', () => {
            if (isRestoringPageScroll(options)) return;

            const currentPage = getCurrentPage(options);
            if (currentPage) getPageScrollTop(options)[currentPage] = main.scrollTop;
        }, { passive: true });
    }

    function rememberCurrentPageScroll(options = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        const currentPage = getCurrentPage(options);
        if (!main || !currentPage) return;

        getPageScrollTop(options)[currentPage] = main.scrollTop;
    }

    function restorePageScroll(options = {}, page, config = {}) {
        const doc = getDocument(options);
        const main = doc.getElementById('app-main');
        if (!main) return;

        const top = getPageScrollTop(options)[page] || 0;
        const applyScroll = () => {
            setRestoringPageScroll(options, true);
            main.scrollTop = top;

            deferTick(options, () => {
                setRestoringPageScroll(options, false);
            });
        };

        if (config.immediate) applyScroll();
        else deferFrame(options, applyScroll);
    }

    function syncPageDom(options = {}, page, config = {}) {
        const doc = getDocument(options);

        doc.querySelectorAll('.page').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('page-nav-enter');
        });

        const pageEl = doc.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.remove('hidden');
            if (config.animatePage !== false) {
                void pageEl.offsetWidth;
                pageEl.classList.add('page-nav-enter');
            }
        }

        doc.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        const activeBtn = doc.querySelector(`.nav-btn[data-page="${page}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const inputBar = doc.getElementById('input-bar');
        const main = doc.getElementById('app-main');

        if (inputBar && main) {
            const shouldHideTimelineInputBar =
                page === 'timeline' &&
                typeof options.shouldHideTimelineInputBar === 'function' &&
                options.shouldHideTimelineInputBar();

            if (page === 'timeline' && !shouldHideTimelineInputBar) {
                inputBar.classList.remove('hidden');
                main.classList.remove('no-input-bar');
            } else {
                inputBar.classList.add('hidden');
                main.classList.add('no-input-bar');
            }
        }

        const filterToggle = doc.getElementById('btn-filter-toggle');
        if (filterToggle) filterToggle.style.display = page === 'settings' ? 'none' : '';

        (options.syncTimelineSelectionHeader || noop)();
    }

    function syncPageContent(options = {}, page) {
        if (page === 'timeline') (options.renderTimeline || noop)();
        if (page === 'stats') (options.renderStats || noop)();
        if (page === 'settings') (options.renderSettings || noop)();
    }

    function updateNavigationHistory(options = {}, page, fromPopstate = false) {
        const action = getNavigationHistoryAction(options, {
            fromPopstate,
            currentPage: getCurrentPage(options),
            nextPage: page
        });

        (options.runHistoryAction || noop)(action);
        return action;
    }

    function shouldConfirmSettingsNavigation(options = {}, page, fromPopstate = false, config = {}) {
        if (config.skipSelectionConfirm) return false;
        if (fromPopstate || page !== 'settings') return false;
        if (page === getCurrentPage(options)) return false;

        return typeof options.shouldConfirmSettingsNavigation === 'function' &&
            options.shouldConfirmSettingsNavigation(page);
    }

    function navigateTo(options = {}, page, fromPopstate = false, config = {}) {
        if (!page) return null;

        if (shouldConfirmSettingsNavigation(options, page, fromPopstate, config)) {
            if (typeof options.confirmSettingsNavigation === 'function') {
                options.confirmSettingsNavigation(() => navigateTo(options, page, fromPopstate, {
                    ...config,
                    skipSelectionConfirm: true
                }));
            }
            return null;
        }

        rememberCurrentPageScroll(options);
        const action = updateNavigationHistory(options, page, fromPopstate);
        setCurrentPage(options, page);
        syncPageDom(options, page, config);

        const shouldCloseFilter = page === 'settings' &&
            typeof options.isFilterOpen === 'function' &&
            options.isFilterOpen();
        if (shouldCloseFilter) (options.closeFilterPanel || noop)();

        (options.updateAppMainPadding || noop)();
        if (!config.skipPageRender) {
            syncPageContent(options, page);
        }
        if (!config.skipScrollRestore) {
            restorePageScroll(options, page);
        }

        return action;
    }

    return {
        init,
        setupPageScrollTracking,
        getSwipeTargetPage,
        shouldCompleteSwipeGesture,
        setupPageSwipe,
        rememberCurrentPageScroll,
        restorePageScroll,
        syncPageDom,
        syncPageContent,
        updateNavigationHistory,
        navigateTo
    };
})();
