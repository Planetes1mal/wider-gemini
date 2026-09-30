(function () {
    'use strict';

    // 共享的消息导航条：只负责渲染、滚动定位、键盘与清理。
    // 站点脚本提供已识别的用户消息、实际滚动容器和可用的窗格边界，这里不含任何站点选择器。
    if (window.widerMessageNavigation) return;

    const RAIL_WIDTH = 24;
    const TICK_PITCH = 24;
    const MIN_TURNS = 2;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // rAF 在后台标签页与无头环境中可能暂停；以短定时器兜底，二者先到者执行一次。
    function schedule(callback) {
        let done = false;
        let frame = 0;
        let timer = 0;
        const run = () => {
            if (done) return;
            done = true;
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            callback();
        };
        frame = requestAnimationFrame(run);
        timer = setTimeout(run, 120);
        return () => {
            done = true;
            cancelAnimationFrame(frame);
            clearTimeout(timer);
        };
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * @param {{ labels: { rail: string, message: (n: number, total: number) => string, attachment: string },
     *   topInset?: (scrollRoot: Element) => number, onStale?: () => void }} options
     */
    function create(options) {
        const labels = options.labels;
        const rail = document.createElement('nav');
        rail.className = 'wg-nav';
        rail.setAttribute('aria-label', labels.rail);
        rail.hidden = true;
        const list = document.createElement('div');
        list.className = 'wg-nav-list';
        rail.append(list);
        const preview = document.createElement('div');
        preview.className = 'wg-nav-preview';
        preview.id = `wg-nav-preview-${Math.random().toString(36).slice(2)}`;
        preview.setAttribute('role', 'tooltip');
        preview.hidden = true;

        let turns = [];
        let scrollRoot = null;
        let bounds = null;
        let activeIndex = -1;
        let focusIndex = 0;
        let cancelActive = null;
        let browsing = false;
        let destroyed = false;

        function topInset() {
            return scrollRoot && options.topInset ? options.topInset(scrollRoot) : 16;
        }

        function textOf(turn) {
            return turn.text ? turn.text : labels.attachment;
        }

        function setActive(index) {
            if (index === activeIndex) return;
            const previous = turns[activeIndex];
            if (previous) previous.button.removeAttribute('aria-current');
            activeIndex = index;
            const current = turns[index];
            if (!current) return;
            current.button.setAttribute('aria-current', 'location');
            // 用户正在浏览导航条时不把它拉回当前项；只调整导航条自身的 scrollTop。
            if (!browsing) revealInRail(current.button);
        }

        function revealInRail(button) {
            const top = button.offsetTop;
            const bottom = top + button.offsetHeight;
            if (top < list.scrollTop) list.scrollTop = top;
            else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
        }

        // 当前位置：顶部越过（滚动容器顶部 + 顶部遮挡）的最后一条用户消息。
        function updateActive() {
            cancelActive = null;
            if (!scrollRoot || !turns.length) return;
            const line = scrollRoot.getBoundingClientRect().top + topInset() + 8;
            let index = 0;
            for (let i = 0; i < turns.length; i++) {
                if (turns[i].element.getBoundingClientRect().top <= line) index = i;
                else break;
            }
            setActive(index);
        }

        function queueActive() {
            if (!cancelActive) cancelActive = schedule(updateActive);
        }

        function place() {
            if (!bounds) return;
            const available = Math.max(0, bounds.bottom - bounds.top);
            const height = Math.min(turns.length * TICK_PITCH, available);
            rail.style.left = `${bounds.right - RAIL_WIDTH}px`;
            rail.style.top = `${bounds.top + (available - height) / 2}px`;
            rail.style.height = `${height}px`;
        }

        // 按实际滚动方向计算有效范围：column-reverse 的 scrollTop 为负值。
        function scrollToTurn(index) {
            const turn = turns[index];
            if (!turn || !scrollRoot) return;
            if (!turn.element.isConnected) {
                if (options.onStale) options.onStale();
                return;
            }
            const rootRect = scrollRoot.getBoundingClientRect();
            const delta = turn.element.getBoundingClientRect().top - rootRect.top - topInset();
            const range = scrollRoot.scrollHeight - scrollRoot.clientHeight;
            const reverse = getComputedStyle(scrollRoot).flexDirection === 'column-reverse';
            const top = clamp(scrollRoot.scrollTop + delta, reverse ? -range : 0, reverse ? 0 : range);
            scrollRoot.scrollTo({ top, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
            setActive(index);
        }

        function showPreview(index) {
            const turn = turns[index];
            if (!turn || !bounds) return;
            preview.textContent = textOf(turn);
            preview.hidden = false;
            turn.button.setAttribute('aria-describedby', preview.id);
            const tick = turn.button.getBoundingClientRect();
            const width = Math.min(280, Math.max(120, bounds.right - bounds.left - RAIL_WIDTH - 24));
            preview.style.maxWidth = `${width}px`;
            const rect = preview.getBoundingClientRect();
            preview.style.left = `${Math.max(bounds.left + 8, tick.left - rect.width - 8)}px`;
            preview.style.top = `${clamp(tick.top + tick.height / 2 - rect.height / 2, bounds.top,
                Math.max(bounds.top, bounds.bottom - rect.height))}px`;
        }

        function hidePreview() {
            preview.hidden = true;
            turns.forEach(turn => turn.button.removeAttribute('aria-describedby'));
        }

        function focusTurn(index) {
            const next = turns[clamp(index, 0, turns.length - 1)];
            if (!next) return;
            turns.forEach(turn => { turn.button.tabIndex = -1; });
            next.button.tabIndex = 0;
            focusIndex = turns.indexOf(next);
            revealInRail(next.button);
            next.button.focus({ preventScroll: true });
        }

        function makeButton(turn) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'wg-nav-tick';
            button.tabIndex = -1;
            button.append(document.createElement('span'));
            button.addEventListener('click', () => scrollToTurn(turns.indexOf(turn)));
            button.addEventListener('pointerenter', () => showPreview(turns.indexOf(turn)));
            button.addEventListener('pointerleave', hidePreview);
            button.addEventListener('focus', () => {
                focusIndex = turns.indexOf(turn);
                showPreview(focusIndex);
            });
            button.addEventListener('blur', hidePreview);
            return button;
        }

        list.addEventListener('keydown', event => {
            const keys = { ArrowUp: focusIndex - 1, ArrowDown: focusIndex + 1, Home: 0, End: turns.length - 1 };
            if (event.key === 'Escape') {
                hidePreview();
                return;
            }
            if (!Object.hasOwn(keys, event.key)) return;
            event.preventDefault();
            focusTurn(keys[event.key]);
        });
        rail.addEventListener('pointerenter', () => { browsing = true; });
        rail.addEventListener('pointerleave', () => { browsing = rail.contains(document.activeElement); });
        rail.addEventListener('focusin', () => { browsing = true; });
        rail.addEventListener('focusout', event => {
            browsing = rail.contains(event.relatedTarget) || rail.matches(':hover');
        });

        function setScrollRoot(next) {
            if (next === scrollRoot) return;
            if (scrollRoot) scrollRoot.removeEventListener('scroll', queueActive);
            scrollRoot = next;
            if (scrollRoot) scrollRoot.addEventListener('scroll', queueActive, { passive: true });
        }

        /**
         * 每次站点识别结果变化时调用。只有用户消息集合或顺序变化才重建按钮，
         * 流式输出回复时不会丢失焦点。
         * @param {{ turns: {element: Element, text: string}[], scrollRoot: Element,
         *   bounds: {left: number, top: number, right: number, bottom: number} } | null} source
         */
        function update(source) {
            if (destroyed) return;
            if (!source || source.turns.length < MIN_TURNS || !source.scrollRoot) {
                hide();
                return;
            }
            if (!rail.isConnected) document.documentElement.append(rail, preview);
            setScrollRoot(source.scrollRoot);
            bounds = source.bounds;
            const same = source.turns.length === turns.length &&
                source.turns.every((turn, i) => turn.element === turns[i].element);
            if (same) {
                source.turns.forEach((turn, i) => { turns[i].text = turn.text; });
            } else {
                const previous = new Map(turns.map(turn => [turn.element, turn]));
                const hadFocus = rail.contains(document.activeElement);
                turns = source.turns.map(turn => {
                    const kept = previous.get(turn.element);
                    if (kept) {
                        kept.text = turn.text;
                        return kept;
                    }
                    const created = { element: turn.element, text: turn.text };
                    created.button = makeButton(created);
                    return created;
                });
                const keep = new Set(turns.map(turn => turn.button));
                [...list.children].forEach(button => { if (!keep.has(button)) button.remove(); });
                // 只插入顺序不对的按钮，保留焦点所在的已有节点。
                turns.forEach((turn, i) => {
                    if (list.children[i] !== turn.button) list.insertBefore(turn.button, list.children[i] || null);
                });
                activeIndex = -1;
                focusIndex = clamp(focusIndex, 0, turns.length - 1);
                if (hadFocus && !rail.contains(document.activeElement)) focusTurn(focusIndex);
            }
            turns.forEach((turn, i) => {
                turn.button.tabIndex = i === focusIndex ? 0 : -1;
                turn.button.setAttribute('aria-label', `${labels.message(i + 1, turns.length)}: ${textOf(turn).slice(0, 80)}`);
            });
            rail.classList.toggle('wg-nav--dark', Boolean(source.dark));
            preview.classList.toggle('wg-nav--dark', Boolean(source.dark));
            rail.hidden = false;
            place();
            updateActive();
        }

        function hide() {
            rail.hidden = true;
            hidePreview();
        }

        function destroy() {
            destroyed = true;
            if (cancelActive) cancelActive();
            setScrollRoot(null);
            rail.remove();
            preview.remove();
            turns = [];
        }

        return {
            update, destroy,
            get visible() { return !rail.hidden; },
            get count() { return rail.hidden ? 0 : turns.length; }
        };
    }

    window.widerMessageNavigation = { create, RAIL_WIDTH, MIN_TURNS };
})();
