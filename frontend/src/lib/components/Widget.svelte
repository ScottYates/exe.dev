<script lang="ts">
	import { updateWidget, getFaviconUrl } from '$lib/api/client.js';
	import { parseWidgetConfig, snapToGrid } from '$lib/utils.js';
	import type { Widget, WidgetConfig } from '$lib/api/types.js';
	import RssFeed from './RssFeed.svelte';
	import IframeWidget from './IframeWidget.svelte';

	let {
		widget,
		isOwner,
		gridSize,
		visitedLinks,
		proxyUrl = '',
		proxyUser = '',
		proxyPass = '',
		onSettings,
		onHtmlEdit,
		onMarkVisited,
		onBoundsChanged
	}: {
		widget: Widget;
		isOwner: boolean;
		gridSize: number;
		visitedLinks: Set<string>;
		proxyUrl?: string;
		proxyUser?: string;
		proxyPass?: string;
		onSettings: (widgetId: string) => void;
		onHtmlEdit: (widgetId: string) => void;
		onMarkVisited: (url: string) => void;
		onBoundsChanged: () => void;
	} = $props();

	let config = $derived<WidgetConfig>(parseWidgetConfig(widget.config) as WidgetConfig);
	let isRss = $derived(widget.widget_type === 'rss');
	let isIframe = $derived(widget.widget_type === 'iframe');
	let isHtml = $derived(widget.widget_type === 'html');
	let isLocked = $derived(config.locked || false);

	// Local position/size state for drag/resize
	let posX = $state(widget.pos_x);
	let posY = $state(widget.pos_y);
	let width = $state(widget.width);
	let height = $state(widget.height);
	let isDragging = $state(false);
	let isResizing = $state(false);

	// Favicon
	let faviconSrc = $state('');
	let faviconVisible = $state(false);

	// RSS feed key to force re-render on refresh
	let feedKey = $state(0);

	// Sync from widget prop changes
	$effect(() => {
		if (!isDragging && !isResizing) {
			posX = widget.pos_x;
			posY = widget.pos_y;
			width = widget.width;
			height = widget.height;
		}
	});

	// Load favicon
	$effect(() => {
		const url = isRss ? config.feed_url : isIframe ? config.iframe_url : null;
		if (url) {
			const img = new Image();
			img.onload = () => {
				faviconSrc = img.src;
				faviconVisible = true;
			};
			img.onerror = () => {
				faviconVisible = false;
			};
			img.src = getFaviconUrl(url);
		} else {
			faviconVisible = false;
		}
	});

	// --- Drag ---
	function startDrag(e: MouseEvent) {
		if ((e.target as HTMLElement).closest('.widget-btn')) return;
		if (isLocked || !isOwner) return;

		e.preventDefault();
		isDragging = true;

		const startX = e.clientX;
		const startY = e.clientY;
		const startLeft = posX;
		const startTop = posY;

		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			const minTop = gridSize > 0 ? 50 : 60;
			posX = snapToGrid(Math.max(0, startLeft + dx), gridSize);
			posY = snapToGrid(Math.max(minTop, startTop + dy), gridSize);
		}

		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			isDragging = false;
			updateWidget(widget.id, { pos_x: Math.round(posX), pos_y: Math.round(posY) });
			onBoundsChanged();
		}

		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	// --- Resize ---
	function startResize(e: MouseEvent) {
		if (isLocked || !isOwner) return;

		const dir = (e.currentTarget as HTMLElement).dataset.resize!;
		e.preventDefault();
		e.stopPropagation();
		isResizing = true;

		const startX = e.clientX;
		const startY = e.clientY;
		const startW = width;
		const startH = height;
		const startLeft = posX;
		const startTop = posY;

		function onMove(ev: MouseEvent) {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;

			let newW = startW;
			let newH = startH;
			let newL = startLeft;
			let newT = startTop;

			if (dir.includes('e')) newW = Math.max(100, startW + dx);
			if (dir.includes('w')) {
				newW = Math.max(100, startW - dx);
				newL = startLeft + (startW - newW);
			}
			if (dir.includes('s')) newH = Math.max(50, startH + dy);
			if (dir.includes('n')) {
				newH = Math.max(50, startH - dy);
				newT = startTop + (startH - newH);
			}

			if (gridSize > 0) {
				newW = snapToGrid(newW, gridSize) || newW;
				newH = snapToGrid(newH, gridSize) || newH;
				newL = snapToGrid(newL, gridSize);
				newT = snapToGrid(newT, gridSize);
			}

			width = newW;
			height = newH;
			posX = newL;
			posY = newT;
		}

		function onUp() {
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			isResizing = false;
			updateWidget(widget.id, {
				pos_x: Math.round(posX),
				pos_y: Math.round(posY),
				width: Math.round(width),
				height: Math.round(height)
			});
			onBoundsChanged();
		}

		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
	}

	// --- Actions ---
	async function toggleLock() {
		const newConfig = { ...config, locked: !config.locked };
		await updateWidget(widget.id, {
			config: JSON.stringify(newConfig),
			pos_x: Math.round(posX),
			pos_y: Math.round(posY),
			width: Math.round(width),
			height: Math.round(height)
		});
	}

	function handleRefresh() {
		feedKey++;
	}

	function openAllLinks() {
		const el = document.getElementById(`widget-${widget.id}`);
		if (!el) return;
		const links = Array.from(el.querySelectorAll('.feed-item a')) as HTMLAnchorElement[];
		if (links.length === 0) {
			alert('No links to open.');
			return;
		}
		if (!confirm(`Open all ${links.length} links in new tabs?`)) return;
		links.forEach((link) => {
			const a = document.createElement('a');
			a.href = link.href;
			a.target = '_blank';
			a.rel = 'noopener';
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		});
		// Mark all as visited
		links.forEach((link) => {
			const item = link.closest('.feed-item') as HTMLElement | null;
			if (item?.dataset.link) {
				item.classList.add('visited');
				onMarkVisited(item.dataset.link);
			}
		});
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	id="widget-{widget.id}"
	class="widget"
	class:dragging={isDragging}
	class:resizing={isResizing}
	class:locked={isLocked}
	style="left: {posX}px; top: {posY}px; width: {width}px; height: {height}px; background-color: {widget.bg_color || '#16213e'}; color: {widget.text_color || '#ffffff'};"
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="widget-header"
		style="background-color: {widget.header_color || '#0f3460'}"
		onmousedown={startDrag}
	>
		{#if faviconVisible}
			<img class="widget-favicon" src={faviconSrc} alt="" />
		{/if}
		<span class="widget-title">{widget.title}</span>
		<div class="widget-actions">
			{#if isOwner}
				<button class="widget-btn lock-btn" title={isLocked ? 'Unlock widget' : 'Lock widget'} onclick={toggleLock}>
					{isLocked ? '🔒' : '🔓'}
				</button>
			{/if}
			{#if isRss}
				<button class="widget-btn refresh-btn" title="Refresh" onclick={handleRefresh}>🔄</button>
				<button class="widget-btn open-all-btn" title="Open all links in new tabs" onclick={openAllLinks}>📑</button>
			{/if}
			{#if isHtml && isOwner}
				<button class="widget-btn edit-btn" title="Edit" onclick={() => onHtmlEdit(widget.id)}>✏️</button>
			{/if}
			{#if isOwner}
				<button class="widget-btn settings-btn" title="Settings" onclick={() => onSettings(widget.id)}>⚙️</button>
			{/if}
		</div>
	</div>

	<div class="widget-body" class:hide-scrollbars={config.hide_scrollbars}>
		{#if isRss}
			{#if config.feed_url}
				{#key feedKey}
					<RssFeed
						widgetId={widget.id}
						feedUrl={config.feed_url}
						showPreview={config.show_preview !== false}
						maxItems={config.max_items || 0}
						{visitedLinks}
						{proxyUrl}
						{proxyUser}
						{proxyPass}
						{onMarkVisited}
					/>
				{/key}
			{:else}
				<div class="feed-empty">No feed configured. Click ⚙️ to add one.</div>
			{/if}
		{:else if isIframe}
			<IframeWidget {config} widgetId={widget.id} />
		{:else if isHtml}
			{#if config.html_content}
				{@html config.html_content}
			{:else}
				<div class="feed-empty">No content. Click ✏️ to edit.</div>
			{/if}
		{/if}
	</div>

	{#if isOwner}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-edge resize-n" data-resize="n" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-edge resize-s" data-resize="s" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-edge resize-e" data-resize="e" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-edge resize-w" data-resize="w" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-corner resize-nw" data-resize="nw" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-corner resize-ne" data-resize="ne" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-corner resize-sw" data-resize="sw" onmousedown={startResize}></div>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resize-corner resize-se" data-resize="se" onmousedown={startResize}></div>
	{/if}
</div>
