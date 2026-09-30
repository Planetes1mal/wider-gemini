(function () {
    'use strict';

    // 共享的消息导航条：只负责渲染、滚动定位、键盘与清理。
    // 站点脚本提供已识别的用户消息、实际滚动容器和可用的窗格边界，这里不含任何站点选择器。
    if (window.widerMessageNavigation) return;

    const RAIL_WIDTH = 24;
    // 消息较少时每个刻度占 24px；超过窗格高度后整体压缩，所有刻度始终同时可见（不分页、不内部滚动）。
    const MAX_PITCH = 24;
    // 指针或键盘焦点附近的刻度按 Dock 方式展开，使目标间距回到 24px；半径以压缩后的坐标计。
    const MAGNIFY_RADIUS = 72;
    const OLDER_SIZE = 24;
    // 滚动到顶部后若在此时间内没有载入更早的消息，视为已到开头，隐藏“更早的消息”标记。
    const OLDER_SETTLE_MS = 1500;
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
     * @param {{ labels: { rail: string, message: (n: number, total: number) => string, attachment: string,
     *   older: string }, topInset?: (scrollRoot: Element) => number, onStale?: () => void }} options
     */
    function create(options) {
        const labels = options.labels;
        const rail = document.createElement('nav');
        rail.className = 'wg-nav';
        rail.setAttribute('aria-label', labels.rail);
        rail.hidden = true;
        const older = document.createElement('button');
        older.type = 'button';
        older.className = 'wg-nav-older';
        older.setAttribute('aria-label', labels.older);
        older.append(document.createElement('span'), document.createElement('span'), document.createElement('span'));
        older.hidden = true;
        const list = document.createElement('div');
        list.className = 'wg-nav-list';
        rail.append(older, list);
        const preview = document.createElement('div');
        preview.className = 'wg-nav-preview';
        preview.id = `wg-nav-preview-${Math.random().toString(36).slice(2)}`;
        preview.setAttribute('role', 'tooltip');
        preview.hidden = true;
        // 两行截断放在无内边距的内层元素上，避免第三行从外层的下内边距里露出。
        const previewText = document.createElement('span');
        previewText.className = 'wg-nav-preview-text';
        preview.append(previewText);

        let turns = [];
        let scrollRoot = null;
        let bounds = null;
        let pitch = MAX_PITCH;
        let activeIndex = -1;
        let focusIndex = 0;
        let hoverIndex = -1;
        let pointerY = null;
        let cancelActive = null;
        let offsets = null;
        let olderExhausted = false;
        let olderTimer = null;
        let destroyed = false;

        function topInset() {
            return scrollRoot && options.topInset ? options.topInset(scrollRoot) : 16;
        }

        function textOf(turn) {
            return turn.text ? turn.text : labels.attachment;
        }

        // ---- 刻度布局：压缩到窗格高度，指针/焦点附近展开 ----

        function magnifyCenter() {
            if (pointerY !== null) return pointerY;
            if (rail.contains(document.activeElement) && turns[focusIndex]) return MAX_PITCH / 2 + pitch * focusIndex;
            return null;
        }

        function tickPositions() {
            const n = turns.length;
            // 首尾刻度中心距边缘 12px，使每个 24px 命中框都完整落在导航条内。
            const base = turns.map((turn, i) => MAX_PITCH / 2 + pitch * i);
            const center = magnifyCenter();
            if (center === null || pitch >= MAX_PITCH || n < 2) return base;
            const weights = [];
            for (let i = 0; i < n - 1; i++) {
                const mid = MAX_PITCH / 2 + pitch * (i + 0.5);
                weights.push(Math.max(0, 1 - Math.abs(mid - center) / MAGNIFY_RADIUS));
            }
            const total = weights.reduce((sum, w) => sum + w, 0);
            const span = pitch * (n - 1);
            // 展开区间用 24px（空间不足时按比例缩小），其余间距均匀压缩，总长度不变。
            const spread = Math.min(MAX_PITCH, span / Math.max(total, 1));
            const rest = Math.max(0, (span - spread * total) / Math.max(n - 1 - total, 1e-6));
            const positions = [base[0]];
            for (let i = 0; i < n - 1; i++) positions.push(positions[i] + rest + (spread - rest) * weights[i]);
            return positions;
        }

        function layout() {
            if (!bounds || !turns.length) return;
            const olderShown = !older.hidden;
            const available = Math.max(0, bounds.bottom - bounds.top - (olderShown ? OLDER_SIZE : 0));
            const n = turns.length;
            pitch = n * MAX_PITCH <= available ? MAX_PITCH : Math.max(0, (available - MAX_PITCH) / Math.max(n - 1, 1));
            const height = pitch * (n - 1) + MAX_PITCH;
            const total = height + (olderShown ? OLDER_SIZE : 0);
            rail.style.left = `${bounds.right - RAIL_WIDTH}px`;
            rail.style.top = `${bounds.top + Math.max(0, (bounds.bottom - bounds.top - total) / 2)}px`;
            rail.style.height = `${total}px`;
            list.style.height = `${height}px`;
            rail.classList.toggle('wg-nav--dense', pitch < MAX_PITCH);
            tickPositions().forEach((y, i) => {
                turns[i].button.style.top = `${y - MAX_PITCH / 2}px`;
                turns[i].y = y;
            });
        }

        // ---- 当前位置：缓存各条消息在滚动内容中的偏移，滚动时二分查找 ----

        function readOffsets() {
            const rootRect = scrollRoot.getBoundingClientRect();
            offsets = {
                height: scrollRoot.scrollHeight,
                width: scrollRoot.clientWidth,
                values: turns.map(turn => turn.element.getBoundingClientRect().top - rootRect.top + scrollRoot.scrollTop)
            };
        }

        // 内容高度或宽度变化（字号、宽度、图片、流式输出、载入更早消息）时缓存失效。
        function currentOffsets() {
            if (!offsets || offsets.height !== scrollRoot.scrollHeight || offsets.width !== scrollRoot.clientWidth ||
                !turns.every(turn => turn.element.isConnected)) readOffsets();
            return offsets.values;
        }

        function setActive(index) {
            if (index === activeIndex) return;
            const previous = turns[activeIndex];
            if (previous) previous.button.removeAttribute('aria-current');
            activeIndex = index;
            if (turns[index]) turns[index].button.setAttribute('aria-current', 'location');
        }

        function updateActive() {
            cancelActive = null;
            if (!scrollRoot || !turns.length) return;
            const values = currentOffsets();
            const line = scrollRoot.scrollTop + topInset() + 8;
            let low = 0;
            let high = values.length - 1;
            let index = 0;
            while (low <= high) {
                const mid = (low + high) >> 1;
                if (values[mid] <= line) {
                    index = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            // 已滚到对话末尾时，最后一条消息即当前位置（它的顶部可能到不了标记线）。
            if (scrollRoot.scrollTop >= scrollRange()[1] - 1) index = values.length - 1;
            setActive(index);
            updateOlder();
        }

        function queueActive() {
            if (!cancelActive) cancelActive = schedule(updateActive);
        }

        // ---- 更早的消息：只显示已载入的消息；标记只负责滚到开头，让网站自己载入下一批 ----

        function scrollRange() {
            const range = scrollRoot.scrollHeight - scrollRoot.clientHeight;
            const reverse = getComputedStyle(scrollRoot).flexDirection === 'column-reverse';
            return reverse ? [-range, 0] : [0, range];
        }

        function atTop() {
            return scrollRoot.scrollTop <= scrollRange()[0] + 1;
        }

        function updateOlder() {
            const shown = options.olderHistory !== false && !olderExhausted && !atTop();
            if (atTop() && !olderExhausted && olderTimer === null) {
                const count = turns.length;
                olderTimer = setTimeout(() => {
                    olderTimer = null;
                    if (scrollRoot && atTop() && turns.length === count) olderExhausted = true;
                    updateOlder();
                }, OLDER_SETTLE_MS);
            }
            if (older.hidden === !shown) return;
            older.hidden = !shown;
            layout();
        }

        older.addEventListener('click', () => {
            if (!scrollRoot) return;
            scrollRoot.scrollTo({ top: scrollRange()[0], behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        });

        // ---- 跳转 ----

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
            const [min, max] = scrollRange();
            scrollRoot.scrollTo({ top: clamp(scrollRoot.scrollTop + delta, min, max), behavior: reducedMotion.matches ? 'auto' : 'smooth' });
            setActive(index);
        }

        // ---- 预览 ----

        function showPreview(index) {
            const turn = turns[index];
            if (!turn || !bounds) return;
            previewText.textContent = textOf(turn);
            preview.hidden = false;
            turns.forEach(item => item.button.removeAttribute('aria-describedby'));
            turn.button.setAttribute('aria-describedby', preview.id);
            const railRect = rail.getBoundingClientRect();
            const tickY = list.getBoundingClientRect().top + turn.y;
            const width = Math.min(280, Math.max(120, bounds.right - bounds.left - RAIL_WIDTH - 24));
            preview.style.maxWidth = `${width}px`;
            const rect = preview.getBoundingClientRect();
            preview.style.left = `${Math.max(bounds.left + 8, railRect.left - rect.width - 8)}px`;
            preview.style.top = `${clamp(tickY - rect.height / 2, bounds.top, Math.max(bounds.top, bounds.bottom - rect.height))}px`;
        }

        function hidePreview() {
            preview.hidden = true;
            turns.forEach(turn => turn.button.removeAttribute('aria-describedby'));
        }

        function setHover(index) {
            if (hoverIndex === index) return;
            if (turns[hoverIndex]) turns[hoverIndex].button.classList.remove('wg-nav-hover');
            hoverIndex = index;
            if (turns[index]) turns[index].button.classList.add('wg-nav-hover');
        }

        // ---- 指针：在整条导航上按最近刻度命中，压缩状态下同样可点 ----

        function nearestTick(clientY) {
            const y = clientY - list.getBoundingClientRect().top;
            let best = -1;
            let distance = Infinity;
            turns.forEach((turn, i) => {
                const d = Math.abs(turn.y - y);
                if (d < distance) {
                    best = i;
                    distance = d;
                }
            });
            return best;
        }

        list.addEventListener('pointermove', event => {
            const y = event.clientY - list.getBoundingClientRect().top;
            pointerY = clamp(y, 0, pitch * (turns.length - 1) + MAX_PITCH);
            layout();
            setHover(nearestTick(event.clientY));
            showPreview(hoverIndex);
        });
        list.addEventListener('pointerleave', () => {
            pointerY = null;
            setHover(-1);
            if (!rail.contains(document.activeElement)) hidePreview();
            layout();
        });
        list.addEventListener('click', event => {
            // 键盘触发的 click 没有坐标，由按钮自身处理。
            if (event.detail === 0) return;
            const index = nearestTick(event.clientY);
            if (index >= 0) scrollToTurn(index);
        });

        // ---- 键盘：一个 Tab 停靠点，方向键 / Home / End 在导航内移动 ----

        function focusTurn(index) {
            const next = turns[clamp(index, 0, turns.length - 1)];
            if (!next) return;
            turns.forEach(turn => { turn.button.tabIndex = -1; });
            next.button.tabIndex = 0;
            focusIndex = turns.indexOf(next);
            next.button.focus({ preventScroll: true });
        }

        function makeButton(turn) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'wg-nav-tick';
            button.tabIndex = -1;
            button.append(document.createElement('span'));
            button.addEventListener('click', event => {
                if (event.detail === 0) scrollToTurn(turns.indexOf(turn));
            });
            button.addEventListener('focus', () => {
                focusIndex = turns.indexOf(turn);
                layout();
                showPreview(focusIndex);
            });
            button.addEventListener('blur', event => {
                if (!rail.contains(event.relatedTarget) && pointerY === null) {
                    hidePreview();
                    layout();
                }
            });
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

        // ---- 颜色与字体取自宿主页面的实际表面：跟随 data-theme、系统主题与实时切换 ----

        function adoptHostStyle() {
            let background = '';
            for (let el = scrollRoot; el; el = el.parentElement) {
                const color = getComputedStyle(el).backgroundColor;
                if (color && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color)) {
                    background = color;
                    break;
                }
            }
            const style = getComputedStyle(scrollRoot);
            for (const target of [rail, preview]) {
                target.style.setProperty('--wg-nav-ink', style.color);
                target.style.setProperty('--wg-nav-surface', background || '#ffffff');
                target.style.setProperty('--wg-nav-font', style.fontFamily);
            }
        }

        function setScrollRoot(next) {
            if (next === scrollRoot) return;
            if (scrollRoot) scrollRoot.removeEventListener('scroll', queueActive);
            scrollRoot = next;
            offsets = null;
            olderExhausted = false;
            clearTimeout(olderTimer);
            olderTimer = null;
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
                // 更早的消息被插到开头时，可能还有更多，重新允许显示“更早的消息”。
                if (turns.length && source.turns[0].element !== turns[0].element) olderExhausted = false;
                const previous = new Map(turns.map(turn => [turn.element, turn]));
                const hadFocus = rail.contains(document.activeElement);
                turns = source.turns.map(turn => {
                    const kept = previous.get(turn.element);
                    if (kept) {
                        kept.text = turn.text;
                        return kept;
                    }
                    const created = { element: turn.element, text: turn.text, y: 0 };
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
                hoverIndex = -1;
                offsets = null;
                focusIndex = clamp(focusIndex, 0, turns.length - 1);
                if (hadFocus && !rail.contains(document.activeElement)) focusTurn(focusIndex);
            }
            turns.forEach((turn, i) => {
                turn.button.tabIndex = i === focusIndex ? 0 : -1;
                turn.button.setAttribute('aria-label', `${labels.message(i + 1, turns.length)}: ${textOf(turn).slice(0, 80)}`);
            });
            adoptHostStyle();
            rail.hidden = false;
            layout();
            updateActive();
        }

        function hide() {
            rail.hidden = true;
            hidePreview();
        }

        function destroy() {
            destroyed = true;
            if (cancelActive) cancelActive();
            clearTimeout(olderTimer);
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
