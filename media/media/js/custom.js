// Keep a stable notion of the "center" slide.
// UIkit may report "item show" events for the first visible item, not necessarily the center.
// So we derive the center from UIkit's applied classes.

function resolveCenterItem(sliderEl) {
	if (!sliderEl) return null;

	// Best case: UIkit marks exactly one element as the centered slide.
	const slideActive = sliderEl.querySelector('.uk-slider-items > .hikashop-card-carousel.uk-slide-active');
	if (slideActive) return slideActive;

	// Fallback: choose the middle element among visible actives.
	const actives = Array.from(sliderEl.querySelectorAll('.uk-slider-items > .hikashop-card-carousel.uk-active'));
	if (actives.length) return actives[Math.floor(actives.length / 2)];

	// Final fallback.
	return sliderEl.querySelector('.uk-slider-items > .hikashop-card-carousel');
}

function getCenterCandidateFromEvent(e) {
	if (!e) return null;
	const d = e.detail;
	let element = null;

	if (d instanceof Element) element = d;
	else if (d && d.item instanceof Element) element = d.item;
	else if (Array.isArray(d)) {
		for (const entry of d) {
			if (entry instanceof Element) { element = entry; break; }
			if (entry && entry.item instanceof Element) { element = entry.item; break; }
		}
	}

	if (!element) return null;
	return element.classList && element.classList.contains('hikashop-card-carousel')
		? element
		: element.closest && element.closest('.hikashop-card-carousel');
}

function setCenterItem(sliderEl, itemEl) {
	if (!sliderEl || !itemEl) return;
	const items = sliderEl.querySelectorAll('.uk-slider-items > .hikashop-card-carousel');
	items.forEach((el) => el.classList.remove('is-center'));
	itemEl.classList.add('is-center');
}

function syncCenter(sliderEl) {
	const center = resolveCenterItem(sliderEl);
	if (center) setCenterItem(sliderEl, center);
}

function getTranslateX(el) {
	const style = window.getComputedStyle(el);
	const transform = style.transform || style.webkitTransform;
	if (!transform || transform === 'none') return 0;

	// matrix(a, b, c, d, tx, ty)
	const m2d = transform.match(/^matrix\((.+)\)$/);
	if (m2d) {
		const parts = m2d[1].split(',').map((p) => parseFloat(p.trim()));
		return Number.isFinite(parts[4]) ? parts[4] : 0;
	}

	// matrix3d(..., tx, ty, tz)
	const m3d = transform.match(/^matrix3d\((.+)\)$/);
	if (m3d) {
		const parts = m3d[1].split(',').map((p) => parseFloat(p.trim()));
		return Number.isFinite(parts[12]) ? parts[12] : 0;
	}

	return 0;
}

function getViewportCenterX(sliderEl) {
	const viewport = sliderEl.querySelector('.uk-slider-container')
		|| sliderEl.querySelector('.uk-slider-container-offset')
		|| sliderEl;
	const r = viewport.getBoundingClientRect();
	return r.left + (r.width / 2);
}

function resolveCenterByGeometry(sliderEl) {
	const list = Array.from(sliderEl.querySelectorAll('.uk-slider-items > .hikashop-card-carousel'));
	if (!list.length) return null;
	const centerX = getViewportCenterX(sliderEl);
	let best = null;
	let bestDist = Infinity;
	for (const el of list) {
		const r = el.getBoundingClientRect();
		const elCenter = r.left + (r.width / 2);
		const dist = Math.abs(elCenter - centerX);
		if (dist < bestDist) {
			bestDist = dist;
			best = el;
		}
	}
	return best;
}

function startMovementWatcher(sliderEl) {
	const itemsContainer = sliderEl.querySelector('.uk-slider-items');
	if (!itemsContainer) return;

	const items = () => Array.from(sliderEl.querySelectorAll('.uk-slider-items > .hikashop-card-carousel'));
	let lastX = getTranslateX(itemsContainer);
	let moving = false;
	let stableFrames = 0;
	let rafId = 0;
	let lastCenter = null;

	const tick = () => {
		rafId = window.requestAnimationFrame(tick);
		if (document.hidden) return;

		const x = getTranslateX(itemsContainer);
		const delta = x - lastX;
		const absDelta = Math.abs(delta);

		// Movement start
		if (!moving && absDelta > 0.05) {
			moving = true;
			stableFrames = 0;

			const list = items();
			if (list.length) {
				const current = sliderEl.querySelector('.uk-slider-items > .hikashop-card-carousel.is-center') || resolveCenterItem(sliderEl);
				const idx = Math.max(0, list.indexOf(current));
				// Heuristic: when translateX decreases (more negative), we move to next item.
				const dir = delta < 0 ? 1 : -1;
				const nextIdx = (idx + dir + list.length) % list.length;
				setCenterItem(sliderEl, list[nextIdx]);
			}
		}

		// While moving: continuously keep the closest-to-center item marked.
		if (moving) {
			const geomCenter = resolveCenterByGeometry(sliderEl);
			if (geomCenter && geomCenter !== lastCenter) {
				setCenterItem(sliderEl, geomCenter);
				lastCenter = geomCenter;
			}
		}

		// Movement end (stable for a few frames)
		if (moving) {
			if (absDelta < 0.1) stableFrames += 1;
			else stableFrames = 0;

			if (stableFrames >= 5) {
				moving = false;
				stableFrames = 0;
				lastCenter = null;
				syncCenter(sliderEl);
			}
		}

		lastX = x;
	};

	// Prevent double watchers on same element
	if (sliderEl.__hikashopCarouselWatcherStarted) return;
	sliderEl.__hikashopCarouselWatcherStarted = true;

	tick();

	// Cleanup if needed
	window.addEventListener('beforeunload', () => {
		if (rafId) window.cancelAnimationFrame(rafId);
	});
}

function initHikashopCarouselSlider(sliderEl) {
	sliderEl.classList.add('hikashop-slider-managed');

	// Initial state
	syncCenter(sliderEl);
	startMovementWatcher(sliderEl);

	const bindDomEvents = (eventNames, handler) => {
		eventNames.forEach((name) => {
			try { sliderEl.addEventListener(name, handler, true); } catch (e) { /* ignore */ }
		});
	};

	const scheduleSync = () => {
		// Try a few times across frames: UIkit updates classes during the transition.
		syncCenter(sliderEl);
		requestAnimationFrame(() => syncCenter(sliderEl));
		setTimeout(() => syncCenter(sliderEl), 0);
		setTimeout(() => syncCenter(sliderEl), 50);
	};

	const earlyCenterSwitch = (e) => {
		const candidate = getCenterCandidateFromEvent(e);
		if (candidate) setCenterItem(sliderEl, candidate);
		scheduleSync();
	};

	// Start of transition
	bindDomEvents(['beforeitemshow', 'beforeitemchange', 'beforeshow', 'beforeshow.uk.slider'], earlyCenterSwitch);
	bindDomEvents(['itemshow', 'itemshown', 'show', 'shown', 'show.uk.slider', 'shown.uk.slider'], scheduleSync);

	// UIkit 3 (no-jQuery)
	const util = window.UIkit && window.UIkit.util;
	if (util && util.on) {
		util.on(sliderEl, 'beforeitemshow', earlyCenterSwitch);
		util.on(sliderEl, 'itemshown', scheduleSync);
		util.on(sliderEl, 'itemshow', scheduleSync);
		util.on(sliderEl, 'beforeitemchange', earlyCenterSwitch);
	}

	// UIkit 2 (jQuery-like)
	const uikit = window.UIkit;
	if (uikit && uikit.$) {
		try {
			uikit.$(sliderEl)
				.on('beforeshow.uk.slider', (e) => earlyCenterSwitch(e))
				.on('show.uk.slider shown.uk.slider', () => scheduleSync());
		} catch (e) { /* ignore */ }
	}

	// Immediate switch on nav click (works even when slider events are missing)
	sliderEl.addEventListener('click', (e) => {
		const target = e.target && e.target.closest
			? e.target.closest('[data-uk-slider-item],[uk-slider-item]')
			: null;
		if (!target) return;

		const dir = target.getAttribute('data-uk-slider-item') || target.getAttribute('uk-slider-item');
		if (dir !== 'next' && dir !== 'previous') return;

		const items = Array.from(sliderEl.querySelectorAll('.uk-slider-items > .hikashop-card-carousel'));
		if (!items.length) return;
		const current = sliderEl.querySelector('.uk-slider-items > .hikashop-card-carousel.is-center') || resolveCenterItem(sliderEl);
		const idx = Math.max(0, items.indexOf(current));
		const nextIdx = dir === 'next'
			? (idx + 1) % items.length
			: (idx - 1 + items.length) % items.length;
		setCenterItem(sliderEl, items[nextIdx]);
		scheduleSync();
	}, true);
}

document.addEventListener('DOMContentLoaded', () => {
	const sliders = document.querySelectorAll('.hikashop-carousel-section [data-uk-slider], .hikashop-carousel-section [uk-slider]');
	sliders.forEach(initHikashopCarouselSlider);
});







